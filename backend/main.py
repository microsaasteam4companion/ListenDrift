# -*- coding: utf-8 -*-
from fastapi import FastAPI, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import asyncio
import uuid
import os
import shutil
import logging
from typing import Dict, Any, List
import whisper
import librosa
import numpy as np
import textstat
import re
import imageio_ffmpeg
import shutil
from pdf_generator import generate_detailed_report

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure FFMPEG path
system_ffmpeg = shutil.which("ffmpeg")

if system_ffmpeg:
    ffmpeg_path = system_ffmpeg
    logger.info(f"Using system FFMPEG at: {ffmpeg_path}")
else:
    # Copy to local directory fallback (mostly for Windows local dev)
    original_ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    ffmpeg_path = os.path.abspath("ffmpeg.exe")
    
    if not os.path.exists(ffmpeg_path):
        try:
            shutil.copy(original_ffmpeg, ffmpeg_path)
        except Exception as e:
            logger.warning(f"Could not copy ffmpeg: {e}")
            ffmpeg_path = original_ffmpeg # Fallback
    
    logger.info(f"Using FFMPEG binary at: {ffmpeg_path}")

# Load Whisper model globally to speed up requests
logger.info("Loading Whisper model...")
# Switch to "tiny" model for 5x-10x speedup on CPU vs "base"
model = whisper.load_model("tiny", device="cpu")
logger.info("Whisper model loaded.")


app = FastAPI()

# Configure CORS
origins = [
    "http://localhost:8080", 
    "http://localhost:5173", # Vite default
    "http://localhost:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for jobs
jobs: Dict[str, Dict[str, Any]] = {}

class AnalysisResult(BaseModel):
    drop_risks: List[Dict[str, Any]]
    timeline: List[Dict[str, Any]]
    summary: Dict[str, Any]

import subprocess

def convert_to_wav(input_path: str, output_path: str):
    """Converts input audio to WAV using the bundled FFMPEG binary."""
    try:
        command = [
            ffmpeg_path,
            "-y", # Overwrite output
            "-i", input_path,
            "-ar", "16000", # Convert to 16k Hz (good for Whisper/Analysis)
            "-ac", "1", # Mono
            output_path
        ]
        # Run ffmpeg command, suppressing output unless error
        subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"FFMPEG failed: {e.stderr.decode()}")
        raise Exception(f"Audio conversion failed: {e.stderr.decode()}")

def analyze_audio_sync(job_id: str, file_path: str):
    """
    Performs the heavy lifting of audio/text analysis.
    """
    wav_path = file_path + ".wav"
    try:
        logger.info(f"Starting analysis for job {job_id}")
        jobs[job_id]["status"] = "processing"
        jobs[job_id]["progress"] = 5
        
        # --- 0. Pre-processing: Convert to WAV ---
        # Librosa and Whisper can accept WAV reliably without complex backend detection
        logger.info(f"Converting {file_path} to WAV...")
        convert_to_wav(file_path, wav_path)
        
        jobs[job_id]["progress"] = 10

        # --- 1. Audio Processing (Librosa) ---
        # Load the WAV file
        y, sr = librosa.load(wav_path, sr=16000) # We forced 16k in conversion
        duration = librosa.get_duration(y=y, sr=sr)
        
        jobs[job_id]["progress"] = 15
        
        # Analyze RMS energy (volume/pacing indicators)
        hop_length = 512
        rms = librosa.feature.rms(y=y, hop_length=hop_length)[0]
        times = librosa.times_like(rms, sr=sr, hop_length=hop_length)
        
        # Detect "Monotone" or "Low Energy" sections
        # We'll normalize RMS and look for extended periods of low variance or low energy
        rms_mean = np.mean(rms)
        rms_std = np.std(rms)
        # Threshold for "quiet/boring" could be refined
        
        jobs[job_id]["progress"] = 30

        # --- 2. Transcription (Whisper) ---
        # Model is now loaded globally
        jobs[job_id]["progress"] = 35
        logger.info("Transcribing...")
        
        # fp16=False is crucial for CPU execution
        # language='en' and greedy decoding (beam_size=1) significantly speeds up CPU inference
        # condition_on_previous_text=False speeds up processing further
        result = model.transcribe(
            wav_path, 
            fp16=False, 
            language='en', 
            beam_size=1, 
            best_of=1, 
            temperature=0.0,
            condition_on_previous_text=False,  # Faster processing
            verbose=False  # Reduce logging overhead
        )
        transcript_text = result["text"]
        segments = result.get("segments", [])
        
        jobs[job_id]["progress"] = 60
        logger.info("Transcription complete. Analyzing text...")
        
        # --- 3. Text Analysis ---
        # Filler words detection
        filler_pattern = r'\b(um|uh|like|you know|so|actually|basically|literally)\b'
        filler_matches = re.findall(filler_pattern, transcript_text.lower())
        filler_count = len(filler_matches)
        
        # Jargon/complexity analysis
        # Using Flesch Reading Ease - lower score = harder to read
        reading_ease = textstat.flesch_reading_ease(transcript_text)
        if reading_ease < 30:
            jargon_density = "Very High"
        elif reading_ease < 50:
            jargon_density = "High"
        elif reading_ease < 70:
            jargon_density = "Medium"
        else:
            jargon_density = "Low"
        
        jobs[job_id]["progress"] = 75
        
        
        # --- 4. Build Timeline with Enhanced Analysis ---
        # Create evenly-spaced timeline covering ENTIRE audio duration
        # This ensures timeline matches exact audio length (e.g., 0:00 to 2:00 for 2-min audio)
        
        timeline = []
        drop_risks = []
        
        # Determine number of timeline points (aim for ~5-10 second intervals)
        num_timeline_points = max(20, min(60, int(duration / 5)))  # 20-60 points, ~5 sec apart
        
        # Calculate overall speech rate for comparison
        total_words = len(transcript_text.split())
        overall_speech_rate = (total_words / duration) * 60 if duration > 0 else 0
        
        # Detect silence/pause sections using librosa
        # Get intervals where audio is below a threshold (silence detection)
        non_silent_intervals = librosa.effects.split(y, top_db=30)  # 30dB threshold for silence
        
        # Create silence map for quick lookup
        silence_sections = []
        prev_end = 0
        for interval in non_silent_intervals:
            start_sample, end_sample = interval
            start_time = librosa.samples_to_time(start_sample, sr=sr)
            end_time = librosa.samples_to_time(end_sample, sr=sr)
            
            # Check if there's a gap (silence) before this interval
            if start_time - prev_end > 2.0:  # Silence longer than 2 seconds
                silence_sections.append({
                    "start": prev_end,
                    "end": start_time,
                    "duration": start_time - prev_end
                })
            prev_end = end_time
        
        # Generate evenly-spaced timeline points with enhanced analysis
        for i in range(num_timeline_points):
            # Calculate time for this point
            time_sec = (i / (num_timeline_points - 1)) * duration if num_timeline_points > 1 else 0
            minutes = int(time_sec // 60)
            seconds = int(time_sec % 60)
            time_str = f"{minutes}:{seconds:02d}"
            
            # Calculate risk for this time point
            base_risk = 20
            risk_reasons = []
            detailed_problems = []  # Store detailed problem descriptions
            
            # Find corresponding audio segment (if any)
            current_segment = None
            segment_start_time = 0
            segment_end_time = 0
            for seg in segments:
                if seg.get("start", 0) <= time_sec <= seg.get("end", 0):
                    current_segment = seg
                    segment_start_time = seg.get("start", 0)
                    segment_end_time = seg.get("end", 0)
                    break
            
            # Analyze segment content if available
            if current_segment:
                text = current_segment.get("text", "").strip()
                segment_duration = segment_end_time - segment_start_time
                
                # 1. SPEECH RATE ANALYSIS (per segment)
                # Only flag SERIOUS speech rate issues
                if len(text) > 0 and segment_duration > 0.5:  # Ignore very short segments
                    segment_words = len(text.split())
                    segment_speech_rate = (segment_words / segment_duration) * 60
                    
                    # Speaking TOO FAST (serious comprehension issue)
                    # Only flag if SIGNIFICANTLY too fast (>220 wpm = serious problem)
                    if segment_speech_rate > 220:
                        base_risk += 35
                        risk_reasons.append(f"speaking way too fast")
                        detailed_problems.append(f"You spoke way too fast here ({segment_speech_rate:.0f} words/min). Listeners cannot keep up with this speed.")
                    elif segment_speech_rate > 190:
                        base_risk += 20
                        risk_reasons.append(f"speaking too fast")
                        detailed_problems.append(f"You spoke too fast here ({segment_speech_rate:.0f} words/min). It is hard to follow your points.")
                    
                    # Speaking TOO SLOW (serious boredom issue)
                    # Only flag if SIGNIFICANTLY too slow (<90 wpm = serious problem)
                    elif segment_speech_rate < 90:
                        base_risk += 30
                        risk_reasons.append(f"speaking way too slow")
                        detailed_problems.append(f"You spoke way too slowly here (only {segment_speech_rate:.0f} words/min). The audience will get bored waiting for your next word.")
                    elif segment_speech_rate < 110:
                        base_risk += 15
                        risk_reasons.append(f"speaking too slow")
                        detailed_problems.append(f"You spoke a bit too slowly here ({segment_speech_rate:.0f} words/min). You risk losing the audience's interest.")
                
                # 2. FILLER WORDS ANALYSIS
                # Only flag if SERIOUSLY excessive (5+ fillers in one segment = real problem)
                segment_fillers = len(re.findall(filler_pattern, text.lower()))
                if segment_fillers >= 5:
                    base_risk += 30
                    risk_reasons.append(f"too many filler words")
                    detailed_problems.append(f"You used {segment_fillers} filler words ('um', 'uh', 'like') in this short clip. This makes you sound unsure of yourself.")
                elif segment_fillers >= 3:
                    base_risk += 15
                    risk_reasons.append(f"several filler words")
                    detailed_problems.append(f"You used {segment_fillers} filler words here. Try to pause silently instead of saying 'um' or 'uh'.")
                
                # 3. SENTENCE LENGTH ANALYSIS
                # Only flag if SERIOUSLY too long (50+ words = real cognitive overload)
                word_count = len(text.split())
                if word_count > 50:
                    base_risk += 30
                    risk_reasons.append(f"extremely long section")
                    detailed_problems.append(f"You spoke {word_count} words without a single pause. Listeners need a break to process this much information.")
                elif word_count > 40:
                    base_risk += 15
                    risk_reasons.append(f"very long section")
                    detailed_problems.append(f"This section is too long ({word_count} words) without a break. You need to pause to let your audience digest what you said.")
                
                # 4. LANGUAGE COMPLEXITY ANALYSIS
                # Only flag if SERIOUSLY complex (reading ease < 30 = college level)
                if len(text) > 20:  # Need enough text to analyze
                    segment_reading_ease = textstat.flesch_reading_ease(text)
                    if segment_reading_ease < 20:
                        base_risk += 30
                        risk_reasons.append("very difficult language")
                        detailed_problems.append(f"You used very complicated words here. The audience likely didn't understand what you meant.")
                    elif segment_reading_ease < 30:
                        base_risk += 15
                        risk_reasons.append("complex language")
                        detailed_problems.append(f"The language here is dense and hard to follow. Try simpler words.")
            
            # 5. ENERGY/MONOTONE ANALYSIS
            # Only flag if SERIOUSLY low energy
            rms_idx = int((time_sec / duration) * len(rms)) if duration > 0 else 0
            rms_idx = min(rms_idx, len(rms) - 1)
            
            if rms_idx < len(rms):
                segment_rms = rms[rms_idx]
                # Only flag SERIOUS energy drops
                if segment_rms < rms_mean - (2.0 * rms_std):  # Very extreme drop
                    base_risk += 35
                    risk_reasons.append("extremely low energy")
                    detailed_problems.append("Your voice became completely flat here. You stopped varying your pitch and volume, which sounds robotic.")
                elif segment_rms < rms_mean - (1.5 * rms_std):
                    base_risk += 20
                    risk_reasons.append("low energy")
                    detailed_problems.append("Your voice got much quieter and flatter here. It sounds like you lost interest in what you were saying.")
            
            # 6. SILENCE/PAUSE ANALYSIS
            # Only flag SERIOUSLY long pauses (4+ seconds = awkward silence)
            for silence in silence_sections:
                if silence["start"] <= time_sec <= silence["end"]:
                    silence_duration = silence["duration"]
                    if silence_duration > 6:
                        # Calculate time range for silence
                        silence_start_min = int(silence["start"] // 60)
                        silence_start_sec = int(silence["start"] % 60)
                        silence_end_min = int(silence["end"] // 60)
                        silence_end_sec = int(silence["end"] % 60)
                        silence_time_range = f"{silence_start_min}:{silence_start_sec:02d} - {silence_end_min}:{silence_end_sec:02d}"
                        
                        base_risk += 65 # CRITICAL penalty for dead air
                        risk_reasons.append(f"no speech detected ({silence_duration:.1f}s)")
                        detailed_problems.append(f"⚠️ Long silence detected ({silence_duration:.1f}s). This dead air kills the momentum of your speech.")
                    elif silence_duration > 4:
                        # Calculate time range for silence
                        silence_start_min = int(silence["start"] // 60)
                        silence_start_sec = int(silence["start"] % 60)
                        silence_end_min = int(silence["end"] // 60)
                        silence_end_sec = int(silence["end"] % 60)
                        silence_time_range = f"{silence_start_min}:{silence_start_sec:02d} - {silence_end_min}:{silence_end_sec:02d}"
                        
                        base_risk += 40 # HIGH penalty for long pauses
                        risk_reasons.append(f"long silence ({silence_duration:.1f}s)")
                        detailed_problems.append(f"🔇 Awkward pause ({silence_duration:.1f}s). This break is too long and feels unnatural.")
                    break
            
            
            # Cap at 100
            risk = min(base_risk, 100)
            
            timeline_entry = {
                "time": time_str,
                "risk": risk,
                "reasons": risk_reasons,
                "detailed_problems": detailed_problems,
                "segment_text": current_segment.get("text", "") if current_segment else ""
            }
            
            # Track all high-risk sections (>70%) for analysis
            # But we'll only show the HIGHEST risk one as the critical moment
            if risk > 70:
                # Build detailed description with exact problems
                if current_segment:
                    text = current_segment.get("text", "")
                    transcript_preview = text[:100] + "..." if len(text) > 100 else text
                    
                    # Create comprehensive problem description
                    if detailed_problems:
                        issue_description = " ".join(detailed_problems)
                        issue_description += f"\n\nTranscript: \"{transcript_preview}\""
                    else:
                        issue_description = f"Multiple issues detected. Transcript: \"{transcript_preview}\""
                else:
                    issue_description = " ".join(detailed_problems) if detailed_problems else "Critical attention drop detected."
                
                # Calculate end time (next 5-10 seconds)
                end_time_sec = min(time_sec + 10, duration)
                end_minutes = int(end_time_sec // 60)
                end_seconds = int(end_time_sec % 60)
                
                drop_risks.append({
                    "start": time_str,
                    "end": f"{end_minutes}:{end_seconds:02d}",
                    "risk": f"{risk}%",
                    "description": issue_description,
                    "reasons": risk_reasons,
                    "detailed_problems": detailed_problems,
                    "risk_value": risk,  # Store numeric value for comparison
                    "segment_text": current_segment.get("text", "") if current_segment else ""
                })
            
            timeline.append(timeline_entry)
        
        # After generating all timeline points, mark ONLY the highest risk point as critical
        if drop_risks:
            # Find the single most critical moment (highest risk)
            most_critical = max(drop_risks, key=lambda x: x["risk_value"])
            
            # Update timeline to mark only this point as critical
            for entry in timeline:
                if entry["time"] == most_critical["start"]:
                    entry["label"] = "CRITICAL MOMENT - Maximum attention drop"
                    break

        
        jobs[job_id]["progress"] = 90
        
        # --- 5. Generate Summary & Insights ---
        # ALWAYS find the highest risk section from the ENTIRE timeline
        # Even if no section exceeds 70%, we still want to show the worst moment
        
        max_risk_entry = None
        if timeline:
            # Find the timeline entry with the highest risk
            max_timeline_entry = max(timeline, key=lambda x: x["risk"])
            max_risk_value = max_timeline_entry["risk"]
            max_risk_time = max_timeline_entry["time"]
            
            # Check if this point exists in drop_risks (>70%)
            # If yes, use the detailed drop_risks entry
            # If no, create an entry from the timeline data
            if drop_risks:
                max_risk_entry = max(drop_risks, key=lambda x: int(x["risk"].rstrip("%")))
            else:
                # No sections >70%, but we still want to show the highest risk point
                # Use the detailed analysis from the timeline entry
                
                # Calculate end time (10 seconds after start)
                time_parts = max_risk_time.split(":")
                start_minutes = int(time_parts[0])
                start_seconds = int(time_parts[1])
                start_time_sec = start_minutes * 60 + start_seconds
                end_time_sec = min(start_time_sec + 10, duration)
                end_minutes = int(end_time_sec // 60)
                end_seconds = int(end_time_sec % 60)
                
                # Use the DATA tied to this timeline point
                max_risk_entry = {
                    "start": max_risk_time,
                    "end": f"{end_minutes}:{end_seconds:02d}",
                    "risk": f"{int(max_risk_value)}%",
                    "description": max_timeline_entry.get("detailed_problems", ["This is the highest risk point in your speech."])[0] if max_timeline_entry.get("detailed_problems") else "This is your weakest moment, but still acceptable.",
                    "reasons": max_timeline_entry.get("reasons", []),
                    "detailed_problems": max_timeline_entry.get("detailed_problems", []),
                    "segment_text": max_timeline_entry.get("segment_text", ""),
                    "risk_value": max_risk_value
                }
        
        # --- 5.1 Enforce Specific Reasons for "Soft" Critical Moments ---
        # If we have a max_risk_entry but NO reasons (because it didn't cross the high thresholds),
        # we MUST find the "soft" reason why it was the highest risk point.
        if max_risk_entry and not max_risk_entry.get("reasons"):
            # Get the segment text if we don't have it
            if not max_risk_entry.get("segment_text"):
                # Find segment matching time
                time_parts = max_risk_entry["start"].split(":")
                start_sec = int(time_parts[0]) * 60 + int(time_parts[1])
                for seg in segments:
                    if seg.get("start", 0) <= start_sec <= seg.get("end", 0):
                        max_risk_entry["segment_text"] = seg.get("text", "")
                        break
            
            segment_text = max_risk_entry.get("segment_text", "")
            # Calculate local metrics for this specific segment to find deviation
            if len(segment_text) > 5:
                # Estimate duration (default 10s if not precise)
                seg_duration = 10 
                # Calculate simple WPM
                words = len(segment_text.split())
                local_wpm = (words / seg_duration) * 60
                
                new_reasons = []
                new_problems = []
                
                # Check for "Soft" deviations
                if local_wpm < 130:
                    new_reasons.append("speaking too slow")
                    new_problems.append(f"This section is a bit slow ({int(local_wpm)} words/min). Ideally, pick up the pace slightly.")
                elif local_wpm > 170:
                    new_reasons.append("speaking too fast") 
                    new_problems.append(f"You create a small speed spike here ({int(local_wpm)} words/min). Make sure to enunciate clearly.")
                
                # Check for silence using the timeline data we already have? 
                # If we can't easily check silence here, rely on WPM and length.
                
                if len(segment_text.split()) > 40:
                    new_reasons.append("long explanation")
                    new_problems.append("This is a long sentence. A small pause would help here.")
                
                # If still no reason, default to energy/monotone as safe bet if it's the "worst" part
                if not new_reasons:
                    new_reasons.append("energy dips")
                    new_problems.append("Your energy dips slightly here compared to the rest of your speech. Keep the energy up!")
                
                # FORCE update the entry
                max_risk_entry["reasons"] = new_reasons
                max_risk_entry["detailed_problems"] = new_problems
                max_risk_entry["description"] = new_problems[0]
        
        # Build detailed problematic section description in SIMPLE LANGUAGE
        if max_risk_entry:
            reasons = max_risk_entry.get("reasons", [])
            detailed_problems = max_risk_entry.get("detailed_problems", [])
            risk_value = int(max_risk_entry["risk"].rstrip("%"))
            
            # Create a simple, clear title based on the main problem
            if any("too fast" in r for r in reasons):
                section_title = "You're Speaking Too Fast"
            elif any("too slow" in r for r in reasons):
                section_title = "You're Speaking Too Slow"
            elif any("silence" in r or "pause" in r for r in reasons):
                section_title = "Long Awkward Silence"
            elif any("energy" in r for r in reasons):
                section_title = "Your Voice Sounds Flat and Boring"
            elif any("filler" in r for r in reasons):
                section_title = "Too Many 'Um' and 'Uh' Words"
            elif any("difficult" in r or "complex" in r for r in reasons):
                section_title = "Using Words That Are Too Complicated"
            elif any("long" in r for r in reasons):
                section_title = "Talking Too Long Without a Break"
            else:
                section_title = "Attention Risk Detected"
            
            # Use the detailed problems (already in simple language) if available
            if detailed_problems:
                # Join all problems with clear separation
                problematic_description = " ".join(detailed_problems)
                # Add simple summary
                problematic_description += f"\n\nThis is the biggest problem in your speech - fix this first to keep your audience engaged."
            else:
                # Fallback: Create simple description from reasons
                if any("too fast" in r for r in reasons):
                    problematic_description = "You're talking too quickly here. When you speak this fast, people can't keep up with what you're saying and they'll miss your important points."
                
                elif any("too slow" in r for r in reasons):
                    problematic_description = "You're talking too slowly here. When the pace is this slow, people get bored and their minds start to wander."
                
                elif any("silence" in r or "pause" in r for r in reasons):
                    problematic_description = "There's a long silence here. Pauses this long make people uncomfortable and break your flow."
                
                elif any("energy" in r for r in reasons):
                    problematic_description = "Your voice became quiet and flat here. When you lose vocal energy, your audience stops listening."
                
                elif any("filler" in r for r in reasons):
                    problematic_description = "You are saying 'um', 'uh', and 'like' too many times here. It breaks your flow."
                
                elif any("difficult" in r or "complex" in r for r in reasons):
                    problematic_description = "You're using complicated words here. Use simpler, everyday language so everyone understands."
                
                elif any("long" in r for r in reasons):
                    problematic_description = "This section is too long without a pause. Listeners can't absorb all this info at once."
                
                else:
                    problematic_description = max_risk_entry.get("description", "There's a problem here that needs attention.")
                
                problematic_description += f"\n\nThis is the biggest improvement area in your recording."
        else:
            section_title = "No Serious Problems Found"
            problematic_description = "Your speech looks good! No major issues that would cause your audience to lose attention."
        
        # --- ADVANCED ANALYSIS FOR SUGGESTIONS ---
        
        # Calculate speech rate (words per minute)
        total_words = len(transcript_text.split())
        speech_rate = (total_words / duration) * 60 if duration > 0 else 0
        
        # Calculate filler word density (fillers per minute)
        filler_density = (filler_count / duration) * 60 if duration > 0 else 0
        
        # Analyze energy patterns
        energy_variation_ratio = rms_std / rms_mean if rms_mean > 0 else 0
        low_energy_sections = sum(1 for r in rms if r < rms_mean - rms_std)
        low_energy_percentage = (low_energy_sections / len(rms)) * 100 if len(rms) > 0 else 0
        
        # Find patterns in high-risk sections
        high_risk_count = len(drop_risks)
        common_issues = []
        if drop_risks:
            all_reasons = []
            for dr in drop_risks:
                all_reasons.extend(dr.get("reasons", []))
            
            # Count issue frequency
            issue_counts = {}
            for reason in all_reasons:
                if "filler" in reason:
                    issue_counts["filler"] = issue_counts.get("filler", 0) + 1
                elif "complex" in reason:
                    issue_counts["complex"] = issue_counts.get("complex", 0) + 1
                elif "long explanation" in reason:
                    issue_counts["long"] = issue_counts.get("long", 0) + 1
                elif "monotone" in reason or "energy" in reason:
                    issue_counts["energy"] = issue_counts.get("energy", 0) + 1
            
            # Identify most common issues
            if issue_counts:
                common_issues = sorted(issue_counts.items(), key=lambda x: x[1], reverse=True)
        
        # --- GENERATE INTELLIGENT SUGGESTIONS ---
        suggestions = []
        
        # Priority 1: Address the CRITICAL MOMENT first with SPECIFIC, ACTIONABLE suggestions
        if max_risk_entry:
            reasons = max_risk_entry.get("reasons", [])
            detailed_problems = max_risk_entry.get("detailed_problems", [])
            critical_time = max_risk_entry["start"]
            risk_value = int(max_risk_entry["risk"].rstrip("%"))
            segment_text = max_risk_entry.get("segment_text", "")
            
            # Build specific recommendation for the critical moment based on exact issues
            critical_title = f"🚨 Fix Critical Moment at {critical_time}"
            
            # Extract specific metrics from detailed_problems to give precise advice
            # Determine primary issue and create targeted recommendation with EXACT STEPS
            if any("too fast" in r or "way too fast" in r for r in reasons):
                # Extract WPM if available
                wpm_match = re.search(r'(\d+)\s+words per minute', detailed_problems[0] if detailed_problems else "")
                current_wpm = wpm_match.group(1) if wpm_match else "high"
                
                critical_description = (
                    f"🎯 PROBLEM: {detailed_problems[0] if detailed_problems else 'You are speaking too fast here.'}\n\n"
                    f"✅ SOLUTION: Slow Down.\n"
                    f"1. Breathe after every sentence.\n"
                    f"2. Aim for 140-160 words per minute (you are much faster).\n"
                    f"3. Pause for 0.5 seconds between phrases."
                )
            
            elif any("too slow" in r or "way too slow" in r for r in reasons):
                wpm_match = re.search(r'(\d+)\s+words per minute', detailed_problems[0] if detailed_problems else "")
                current_wpm = wpm_match.group(1) if wpm_match else "low"
                
                critical_description = (
                    f"🎯 PROBLEM: {detailed_problems[0] if detailed_problems else 'You are speaking too slowly here.'}\n\n"
                    f"✅ SOLUTION: Speed Up and Add Energy.\n"
                    f"1. Remove unnecessary pauses between words.\n"
                    f"2. Stand up while recording to boost energy naturally.\n"
                    f"3. Imagine you are excitedly telling a friend about this."
                )
            
            elif any("pause" in r or "silence" in r or "no speech" in r for r in reasons):
                # Extract silence duration
                silence_match = re.search(r'(\d+\.?\d*)\s+second', detailed_problems[0] if detailed_problems else "")
                silence_duration = silence_match.group(1) if silence_match else "several"
                
                critical_description = (
                    f"🎯 PROBLEM: {detailed_problems[0] if detailed_problems else 'There is a long awkward silence here.'}\n\n"
                    f"✅ SOLUTION: Remove the Dead Air.\n"
                    f"1. Edit out the silence using your audio editor.\n"
                    f"2. Or re-record and fill the gap with a transition phrase like 'Let me explain...'\n"
                    f"3. Keep pauses under 2 seconds."
                )
            
            elif any("energy" in r or "monotone" in r or "flat" in r for r in reasons):
                critical_description = (
                    f"🎯 PROBLEM: {detailed_problems[0] if detailed_problems else 'Your voice sounds flat and boring here.'}\n\n"
                    f"✅ SOLUTION: Boost Your Vocal Energy.\n"
                    f"1. Stand up and smile while recording (this automatically changes your tone).\n"
                    f"2. Vary your pitch: Go higher on questions, lower on statements.\n"
                    f"3. Emphasize key words by saying them slightly louder."
                )
            
            elif any("filler" in r for r in reasons):
                # Extract filler count
                filler_match = re.search(r'(\d+)\s+times', detailed_problems[0] if detailed_problems else "")
                filler_count_segment = filler_match.group(1) if filler_match else "multiple"
                
                critical_description = (
                    f"🎯 PROBLEM: {detailed_problems[0] if detailed_problems else 'You are saying um, uh, and like too many times.'}\n\n"
                    f"✅ SOLUTION: Pause Instead of Filler Words.\n"
                    f"1. When you need to think, just stay silent for 1-2 seconds.\n"
                    f"2. Silence sounds confident. 'Um' sounds unsure.\n"
                    f"3. Re-record this section until you have zero filler words."
                )
            
            elif any("difficult" in r or "complex" in r or "complicated" in r for r in reasons):
                critical_description = (
                    f"🎯 PROBLEM: {detailed_problems[0] if detailed_problems else 'You are using words that are too complicated.'}\n\n"
                    f"✅ SOLUTION: Use Simpler Words.\n"
                    f"1. Replace complex terms with everyday language.\n"
                    f"2. Use shorter sentences.\n"
                    f"3. Testing rule: Identify the hardest word and remove it."
                )
            
            elif any("long" in r for r in reasons):
                # Extract word count
                word_match = re.search(r'(\d+)\s+word', detailed_problems[0] if detailed_problems else "")
                word_count_segment = word_match.group(1) if word_match else "many"
                
                critical_description = (
                    f"🎯 PROBLEM: {detailed_problems[0] if detailed_problems else 'This section is too long without any breaks.'}\n\n"
                    f"✅ SOLUTION: Break It Down.\n"
                    f"1. Add a pause after every main point.\n"
                    f"2. Split long sentences into two shorter ones.\n"
                    f"3. Give the audience 2 seconds to digest information before moving on."
                )
            
            else:
                # Multiple issues combined - give comprehensive advice
                critical_description = (
                    f"🎯 PROBLEM: {detailed_problems[0] if detailed_problems else 'Multiple issues detected here.'}\n\n"
                    f"✅ SOLUTION: Simplify and Re-record.\n"
                    f"1. Stand up and smile to fix energy.\n"
                    f"2. Use simpler words to fix clarity.\n"
                    f"3. Pause more often to fix pacing."
                )
            
            suggestions.append({
                "title": critical_title,
                "description": critical_description
            })
        
        
        # Priority 2: Speech Rate Analysis
        if speech_rate < 110:
            suggestions.append({
                "title": "⚡ Increase Your Speaking Pace",
                "description": f"You're speaking at {speech_rate:.0f} words/minute (optimal: 140-160 wpm). Slow pace causes attention drift. TIP: Practice with a metronome app, aim for 150 wpm. Mark your script to speed up boring sections."
            })
        elif speech_rate > 180:
            suggestions.append({
                "title": "🐌 Slow Down Your Delivery",
                "description": f"You're speaking at {speech_rate:.0f} words/minute (optimal: 140-160 wpm). Too fast makes comprehension difficult. TIP: Add deliberate pauses after key points. Breathe between sentences."
            })
        elif 140 <= speech_rate <= 160:
            suggestions.append({
                "title": "✅ Perfect Speaking Pace",
                "description": f"Your {speech_rate:.0f} wpm is in the optimal range (140-160 wpm). This pace maximizes comprehension and engagement. Keep it up!"
            })
        
        # Priority 3: Filler Word Analysis
        if filler_density > 3:
            suggestions.append({
                "title": "🚫 Eliminate Filler Words",
                "description": f"You're using {filler_density:.1f} filler words per minute ({filler_count} total). This screams nervousness. SOLUTION: (1) Record yourself daily for 2 minutes, (2) Count fillers, (3) Replace with 1-second silence. Goal: Under 2 fillers/minute."
            })
        elif filler_density > 1.5:
            suggestions.append({
                "title": "⚠️ Reduce Filler Words",
                "description": f"Detected {filler_density:.1f} fillers/minute ({filler_count} total). Noticeable but fixable. TIP: When you feel 'um' coming, pause instead. Silence is powerful. Practice the 'pause technique' for 5 minutes daily."
            })
        elif filler_count > 0:
            suggestions.append({
                "title": "👍 Minimal Filler Words",
                "description": f"Only {filler_count} filler words in {duration:.0f} seconds. Excellent control! You sound confident and prepared."
            })
        
        # Priority 4: Energy & Vocal Variety
        if energy_variation_ratio < 0.25:
            suggestions.append({
                "title": "🎤 Add Vocal Variety & Energy",
                "description": f"Your vocal energy is too flat ({low_energy_percentage:.0f}% of speech is monotone). EXERCISE: Read your script aloud, marking words to EMPHASIZE, whisper, or shout. Vary pitch every 15 seconds. Record and compare."
            })
        elif low_energy_percentage > 40:
            suggestions.append({
                "title": "⚡ Boost Energy Levels",
                "description": f"{low_energy_percentage:.0f}% of your speech has low energy. Audience hears this as boredom. QUICK FIX: Stand up while recording, smile (it changes your voice), and imagine you're talking to an excited friend."
            })
        
        # Priority 5: Language Complexity
        if jargon_density == "Very High":
            suggestions.append({
                "title": "📚 Drastically Simplify Language",
                "description": f"PROBLEM: Your words are too complicated (Score: {reading_ease:.0f}/100).\nSOLUTION: Use Everyday Words.\n1. Replace technical terms with simple words.\n2. Explain it like you're talking to a 12-year-old.\n3. Use examples for every hard concept."
            })
        elif jargon_density == "High":
            suggestions.append({
                "title": "📖 Simplify Your Language",
                "description": f"PROBLEM: Your language is hard to follow (Score: {reading_ease:.0f}/100).\nSOLUTION: Define Hard Terms.\n1. If a word has 4+ syllables, avoid it.\n2. When using a technical term, explain it immediately.\n3. Use analogies: 'It's like...'"
            })
        elif jargon_density == "Medium":
            suggestions.append({
                "title": "✓ Good Language Balance",
                "description": f"Your complexity is balanced (Score: {reading_ease:.0f}/100). You are easy to understand but still sound professional. tip: Keep clear specific examples."
            })
        
        # Priority 6: Pattern-Based Suggestions
        if common_issues:
            top_issue = common_issues[0][0]
            
            if top_issue == "long" and common_issues[0][1] >= 2:
                suggestions.append({
                    "title": "✂️ Break Up Long Explanations",
                    "description": f"You have {common_issues[0][1]} sections with 30+ word explanations. FORMULA: Explain (15 sec) → Example (10 sec) → Pause (2 sec) → Repeat. Use 'For instance...' to transition to examples."
                })
            
            if top_issue == "energy" and common_issues[0][1] >= 3:
                suggestions.append({
                    "title": "🔋 Energy Drops Repeatedly",
                    "description": f"Your energy drops {common_issues[0][1]} times. Pattern detected: You lose energy during explanations. FIX: Mark your script with 'ENERGY!' reminders before complex sections. Take a breath and amp up."
                })
        
        # Priority 7: Overall Performance Summary
        if not max_risk_entry and filler_count < 3 and 140 <= speech_rate <= 160:
            suggestions.append({
                "title": "🌟 Excellent Overall Performance",
                "description": f"Strong fundamentals: Good pace ({speech_rate:.0f} wpm), minimal fillers, clear language. To reach expert level: Add more vocal variety and strategic pauses for emphasis."
            })
        
        # Ensure we have 3-5 suggestions (most actionable ones)
        if len(suggestions) < 3:
            suggestions.append({
                "title": "📈 Keep Practicing",
                "description": "Your speech shows good fundamentals. Focus on consistency: Record yourself weekly, track your filler count and speaking pace, and gradually increase vocal variety."
            })

        
        summary = {
            "drop_risk": max_risk_entry["risk"] if max_risk_entry else "Low",
            "jargon_density": jargon_density,
            "filler_words": str(filler_count),
            "speech_rate": overall_speech_rate,
            "reading_ease": reading_ease,
            "suggestions": suggestions[:5],  # Limit to top 5 suggestions
            "problematic_section": {
                "range": f"{max_risk_entry['start']} - {max_risk_entry['end']}" if max_risk_entry else "N/A",
                "title": section_title,
                "description": problematic_description
            },
            "insights": {
                "jargon": {
                    "title": f"{jargon_density} Jargon Density",
                    "desc": f"Readability score: {reading_ease:.1f}. " + 
                           ("Consider simplifying." if reading_ease < 50 else "Good clarity!")
                },
                "explanation": {
                    "title": "Speech Duration",
                    "desc": f"Total duration: {int(duration // 60)}:{int(duration % 60):02d}"
                },
                "monotone": {
                    "title": "Energy Analysis",
                    "desc": f"Average energy: {rms_mean:.3f}, variation: {rms_std:.3f}"
                },
                "fillers": {
                    "title": f"{filler_count} Filler Words",
                    "desc": "Great job!" if filler_count < 5 else f"Try to reduce usage of 'um', 'like', etc."
                }
            }
        }
        
        
        # --- 6. Store Result ---
        # Send ONLY the single most critical moment (highest risk), not all high-risk sections
        # This ensures "Critical Moment Detected" shows the exact short window, not entire timeline
        critical_moments = []
        if max_risk_entry:
            # Send only the HIGHEST risk moment
            critical_moments = [max_risk_entry]
        else:
            # No critical moment found
            critical_moments = [{
                "start": "0:00",
                "end": "0:00",
                "risk": "Low",
                "description": "No critical sections detected. Your speech maintains good audience attention throughout."
            }]
        
        jobs[job_id]["result"] = {
            "drop_risks": critical_moments,  # Only the SINGLE most critical moment
            "timeline": timeline,
            "summary": summary,
            # Store detailed data for PDF generation
            "segments": segments,  # For filler word and complex language analysis
            "transcript": transcript_text,  # Full transcript
            "duration": duration,  # Total duration
            "filler_pattern": filler_pattern  # Filler word regex pattern
        }

        
        jobs[job_id]["status"] = "done"
        jobs[job_id]["progress"] = 100
        logger.info(f"Analysis complete for job {job_id}")

    except Exception as e:
        logger.error(f"Error processing job {job_id}: {e}", exc_info=True)
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(e)
    finally:
        # Cleanup temp file
        if os.path.exists(file_path):
            os.remove(file_path)
        if os.path.exists(wav_path):
            os.remove(wav_path)

@app.post("/api/upload")
async def upload_audio(file: UploadFile = File(...), background_tasks: BackgroundTasks = None):
    job_id = str(uuid.uuid4())
    
    # Save UploadFile to a temporary file locally
    # Ensure 'temp' directory exists
    os.makedirs("temp", exist_ok=True)
    temp_file_path = f"temp/{job_id}_{file.filename}"
    
    with open(temp_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    jobs[job_id] = {
        "status": "queued",
        "progress": 0,
        "filename": file.filename,
        "result": None
    }
    
    # Start processing in background (FastAPI runs this in a threadpool)
    background_tasks.add_task(analyze_audio_sync, job_id, temp_file_path)
    
    return {"job_id": job_id}

@app.get("/api/status/{job_id}")
async def get_status(job_id: str):
    if job_id not in jobs:
        return {"status": "failed", "error": "Job not found"}
    
    return {
        "status": jobs[job_id]["status"],
        "progress": jobs[job_id]["progress"]
    }

def generate_audience_analysis(job_id: str, audience: str) -> Dict[str, Any]:
    """Generate audience-specific analysis"""
    result = jobs[job_id]["result"]
    summary = result.get("summary", {})
    transcript = result.get("transcript", "")
    duration = result.get("duration", 0)
    
    # Get speech rate from summary or calculate if missing (legacy support)
    speech_rate = summary.get("speech_rate", 0)
    words_count = len(transcript.split())
    if not speech_rate or speech_rate == 0:
        speech_rate = (words_count / duration) * 60 if duration > 0 else 0
        
    filler_count = int(summary.get("filler_words", "0"))
    filler_density = (filler_count / duration * 60) if duration > 0 else 0
    
    # Get reading ease from summary or calculate if missing
    reading_ease = summary.get("reading_ease", 0)
    if not reading_ease or reading_ease == 0:
        reading_ease = textstat.flesch_reading_ease(transcript) if transcript else 50
        
    avg_response_length = duration / max(len(transcript.split('.')), 1) if transcript else 0
    
    configs = {
        "students": {"wpm": (120, 150), "complexity": (60, 100), "length": (10, 20)},
        "professionals": {"wpm": (140, 170), "complexity": (40, 70), "length": (15, 30)},
        "interviews": {"wpm": (130, 160), "complexity": (50, 80), "length": (20, 45)},
        "marketing": {"wpm": (150, 180), "complexity": (60, 90), "length": (5, 15)},
        "general": {"wpm": (140, 160), "complexity": (60, 80), "length": (10, 25)}
    }
    config = configs.get(audience, configs["general"])
    fit_score = 100
    mismatches = []
    suggestions = []
    
    # Speech rate check - ALWAYS generate feedback based on audience
    wpm_min, wpm_max = config["wpm"]
    if speech_rate < wpm_min:
        fit_score -= 20
        mismatches.append(f"Speaking too slowly ({speech_rate:.1f} WPM) for {audience} audience")
        suggestions.append(f"Increase pace to {wpm_min}-{wpm_max} words per minute")
    elif speech_rate > wpm_max:
        fit_score -= 20
        mismatches.append(f"Speaking too fast ({speech_rate:.1f} WPM) for {audience} audience")
        suggestions.append(f"Slow down to {wpm_min}-{wpm_max} words per minute")
    else:
        # Even if in range, give audience-specific positive feedback
        suggestions.append(f"Good pace for {audience} ({speech_rate:.1f} WPM is in the ideal range)")
    
    # Complexity check
    complexity_min, complexity_max = config["complexity"]
    if reading_ease < complexity_min:
        fit_score -= 15
        mismatches.append(f"Language too complex for {audience} (Readability: {reading_ease:.1f})")
        suggestions.append("Simplify vocabulary and use shorter sentences")
    elif reading_ease > complexity_max and audience in ["professionals", "interviews"]:
        fit_score -= 10
        mismatches.append(f"Language may be too simple for {audience} audience")
        suggestions.append("Use more precise, professional terminology")
    
    # Filler words
    if filler_density > 3:
        fit_score -= 15
        mismatches.append(f"Too many filler words ({filler_count} total, {filler_density:.1f} per minute)")
        suggestions.append("Practice pausing silently instead of using 'um', 'uh', 'like'")
    
    # AUDIENCE-SPECIFIC CHECKS - Make each audience unique
    if audience == "students":
        if reading_ease < 60:
            fit_score -= 10
            mismatches.append("Content may be too difficult for students to follow")
            suggestions.append("Add examples and analogies to explain complex ideas")
        if speech_rate > 140:
            mismatches.append("Students need slower pace to absorb information")
            suggestions.append("Add pauses between key concepts")
        # Always add student-specific suggestion
        suggestions.append("Use relatable examples and avoid jargon")
        
    elif audience == "professionals":
        if speech_rate < 140:
            fit_score -= 10
            mismatches.append("Pace is too slow for professional audience")
            suggestions.append("Professionals prefer efficient, direct communication")
        if avg_response_length > 40:
            mismatches.append("Responses could be more concise for busy professionals")
            suggestions.append("Lead with conclusions, then provide supporting details")
        # Always add professional-specific suggestion
        suggestions.append("Focus on ROI and actionable insights")
        
    elif audience == "interviews":
        if avg_response_length > 60:
            fit_score -= 15
            mismatches.append("Answers are too long for interview format")
            suggestions.append("Use STAR method: Situation, Task, Action, Result")
        if avg_response_length < 15:
            mismatches.append("Answers may be too brief for interviews")
            suggestions.append("Provide more context and specific examples")
        # Always add interview-specific suggestion
        suggestions.append("Start with direct answers, then elaborate")
        suggestions.append("Use 'I' statements to show personal ownership")
        
    elif audience == "marketing":
        if speech_rate < 150:
            fit_score -= 10
            mismatches.append("Pace too slow for marketing/sales pitch")
            suggestions.append("Increase energy and pace to maintain excitement")
        if avg_response_length > 20:
            fit_score -= 10
            mismatches.append("Messages too long - lose audience attention")
            suggestions.append("Keep key messages under 15 seconds")
        # Always add marketing-specific suggestion
        suggestions.append("Use power words and create urgency")
        suggestions.append("Focus on benefits, not features")
        
    else:  # general
        # Always add general suggestions
        suggestions.append("Maintain consistent energy throughout")
        suggestions.append("Use clear transitions between topics")
    
    fit_score = max(0, min(100, fit_score))
    
    # NEW: Dynamic Audience-Specific Structural Insights
    # Evaluate pace relative to audience ideal
    pace_eval = "Ideal"
    if speech_rate < config["wpm"][0]:
        pace_eval = "Too Slow"
    elif speech_rate > config["wpm"][1]:
        pace_eval = "Too Fast"
        
    # Evaluate complexity relative to audience
    complexity_eval = "Balanced"
    if reading_ease < config["complexity"][0]:
        complexity_eval = "Highly Complex"
    elif reading_ease > config["complexity"][1]:
        complexity_eval = "Too Simple"

    # Audience Style Label
    style_label = {
        "students": "Educational / Explanatory",
        "professionals": "Efficient / Results-Oriented",
        "interviews": "Structured / STAR-Focused",
        "marketing": "High-Impact / Persuasive",
        "general": "Accessible / Conversational"
    }.get(audience, "Standard")

    # Debug logging for calculation verification
    print(f"DEBUG: Job={job_id}, Audience={audience}, Duration={duration:.2f}s, Words={words_count}, Rate={speech_rate:.2f}")

    return {
        "audience": audience,
        "fit_score": int(fit_score),
        "mismatches": mismatches,
        "suggestions": suggestions,
        "structural_insights": {
            "Analysis Style": style_label,
            "Your Actual Pace": round(speech_rate, 1),
            "Target Pace": f"{config['wpm'][0]}-{config['wpm'][1]} WPM",
            "Pace Assessment": pace_eval,
            "Complexity Match": complexity_eval,
            "Readability Score": round(reading_ease, 1),
            "Directness": "Direct" if speech_rate > 150 else ("Measured" if speech_rate > 120 else "Deliberate"),
            "Filler Word Rate": f"{filler_density:.1f} per min"
        }
    }

@app.get("/api/result/{job_id}")
async def get_result(job_id: str, audience: str = None):
    if job_id not in jobs:
        return {"error": "Job not found"}
    
    if jobs[job_id]["status"] == "failed":
        return {"status": "failed", "error": jobs[job_id].get("error", "Unknown error")}

    if jobs[job_id]["status"] != "done":
        return {"status": jobs[job_id]["status"], "error": "Analysis not complete"}
    
    if audience:
        return generate_audience_analysis(job_id, audience)
        
    return jobs[job_id]["result"]

@app.get("/api/download-report/{job_id}")
async def download_report(job_id: str, audience: str = None):
    """Generate and download detailed PDF report"""
    if job_id not in jobs:
        return {"error": "Job not found"}
    
    if jobs[job_id]["status"] != "done":
        return {"error": "Analysis not complete"}
    
    try:
        # Get analysis result
        result = jobs[job_id]["result"]
        filename = jobs[job_id].get("filename", "audio.mp3")
        
        logger.info(f"Generating PDF report for job {job_id}, filename: {filename}, audience: {audience}")
        
        # Create reports directory if it doesn't exist
        os.makedirs("reports", exist_ok=True)
        
        # Generate PDF
        pdf_path = f"reports/report_{job_id}.pdf"
        
        # Update PDF generator to use detailed data
        from pdf_generator import PDFReportGenerator
        
        pdf = PDFReportGenerator(pdf_path)
        
        # Add header
        pdf.add_header(filename)
        
        # Add audience analysis if provided
        if audience:
            audience_analysis = generate_audience_analysis(job_id, audience)
            pdf.add_audience_analysis(audience_analysis)
        
        # Add critical moment
        drop_risks = result.get('drop_risks', [])
        critical_moment = drop_risks[0] if drop_risks else None
        pdf.add_critical_moment(critical_moment)
        
        # Add detailed filler words analysis
        segments = result.get('segments', [])
        filler_pattern = result.get('filler_pattern', r'\b(um|uh|like|you know|so|actually|basically|literally)\b')
        if segments:
            pdf.add_filler_words_detail(segments, filler_pattern)
        
        # Add complex words analysis
        if segments:
            pdf.add_complex_words_detail(segments)
        
        # Add speech rate analysis
        duration = result.get('duration', 0)
        if segments and duration > 0:
            pdf.add_speech_rate_analysis(segments, duration)
        
        # Add suggestions
        summary = result.get('summary', {})
        suggestions = summary.get('suggestions', [])
        pdf.add_suggestions(suggestions)
        
        # Add summary insights
        pdf.add_summary_insights(summary)
        
        # Generate PDF
        pdf.generate()
        
        logger.info(f"PDF generated successfully at {pdf_path}")
        
        # Check if file exists
        if not os.path.exists(pdf_path):
            raise Exception(f"PDF file was not created at {pdf_path}")
        
        # Return file for download with proper headers
        # Return file for download with proper headers
        base_name = os.path.splitext(filename)[0]
        # Sanitize filename to ensure it is valid
        safe_name = re.sub(r'[^a-zA-Z0-9_\-]', '_', base_name)
        download_name = f"{safe_name}_Analysis.pdf"
        
        return FileResponse(
            path=pdf_path,
            media_type='application/pdf',
            filename=download_name,
            headers={
                "Content-Disposition": f"attachment; filename={download_name}"
            }
        )
    
    except Exception as e:
        logger.error(f"Error generating PDF for job {job_id}: {e}", exc_info=True)
        return {"error": f"Failed to generate PDF: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    # Create temp dir if it doesn't exist
    os.makedirs("temp", exist_ok=True)
    uvicorn.run(app, host="0.0.0.0", port=8000)

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
# Copy to local directory to avoid path issues with spaces/long paths
original_ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
ffmpeg_path = os.path.abspath("ffmpeg.exe")

if not os.path.exists(ffmpeg_path):
    try:
        shutil.copy(original_ffmpeg, ffmpeg_path)
    except Exception as e:
        logger.warning(f"Could not copy ffmpeg: {e}")
        ffmpeg_path = original_ffmpeg # Fallback

logger.info(f"Using FFMPEG at: {ffmpeg_path}")

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
                        detailed_problems.append(f"You're speaking at {segment_speech_rate:.0f} words per minute. This is too fast - your audience can't keep up and will miss important points.")
                    elif segment_speech_rate > 190:
                        base_risk += 20
                        risk_reasons.append(f"speaking too fast")
                        detailed_problems.append(f"You're speaking at {segment_speech_rate:.0f} words per minute. Slow down a bit so people can understand you better.")
                    
                    # Speaking TOO SLOW (serious boredom issue)
                    # Only flag if SIGNIFICANTLY too slow (<90 wpm = serious problem)
                    elif segment_speech_rate < 90:
                        base_risk += 30
                        risk_reasons.append(f"speaking way too slow")
                        detailed_problems.append(f"You're speaking at only {segment_speech_rate:.0f} words per minute. This is too slow - people will get bored and lose focus.")
                    elif segment_speech_rate < 110:
                        base_risk += 15
                        risk_reasons.append(f"speaking too slow")
                        detailed_problems.append(f"You're speaking at {segment_speech_rate:.0f} words per minute. Speed up a little to keep your audience engaged.")
                
                # 2. FILLER WORDS ANALYSIS
                # Only flag if SERIOUSLY excessive (5+ fillers in one segment = real problem)
                segment_fillers = len(re.findall(filler_pattern, text.lower()))
                if segment_fillers >= 5:
                    base_risk += 30
                    risk_reasons.append(f"too many filler words")
                    detailed_problems.append(f"You said 'um', 'uh', or 'like' {segment_fillers} times in this short section. This makes you sound unprepared and nervous.")
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
                    detailed_problems.append(f"This section has {word_count} words without any break. People can't process this much information at once - they'll tune out.")
                elif word_count > 40:
                    base_risk += 15
                    risk_reasons.append(f"very long section")
                    detailed_problems.append(f"This {word_count}-word section is too long. Break it into smaller parts with pauses in between.")
                
                # 4. LANGUAGE COMPLEXITY ANALYSIS
                # Only flag if SERIOUSLY complex (reading ease < 30 = college level)
                if len(text) > 20:  # Need enough text to analyze
                    segment_reading_ease = textstat.flesch_reading_ease(text)
                    if segment_reading_ease < 20:
                        base_risk += 30
                        risk_reasons.append("very difficult language")
                        detailed_problems.append(f"The words you're using here are too complicated. Most people won't understand this - use simpler, everyday language.")
                    elif segment_reading_ease < 30:
                        base_risk += 15
                        risk_reasons.append("complex language")
                        detailed_problems.append(f"This section uses complex words that might confuse your audience. Try to explain things more simply.")
            
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
                    detailed_problems.append("Your voice becomes very flat and monotone here. You sound bored, so your audience will feel bored too.")
                elif segment_rms < rms_mean - (1.5 * rms_std):
                    base_risk += 20
                    risk_reasons.append("low energy")
                    detailed_problems.append("Your energy drops noticeably here. Try to sound more enthusiastic and vary your tone.")
            
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
                        
                        base_risk += 45
                        risk_reasons.append(f"no speech detected ({silence_duration:.1f}s)")
                        detailed_problems.append(f"⚠️ No speech detected from {silence_time_range} ({silence_duration:.1f} seconds of silence). This is way too long - your audience will think something went wrong or lose complete focus.")
                    elif silence_duration > 4:
                        # Calculate time range for silence
                        silence_start_min = int(silence["start"] // 60)
                        silence_start_sec = int(silence["start"] % 60)
                        silence_end_min = int(silence["end"] // 60)
                        silence_end_sec = int(silence["end"] % 60)
                        silence_time_range = f"{silence_start_min}:{silence_start_sec:02d} - {silence_end_min}:{silence_end_sec:02d}"
                        
                        base_risk += 30
                        risk_reasons.append(f"long silence ({silence_duration:.1f}s)")
                        detailed_problems.append(f"🔇 No speech detected from {silence_time_range} ({silence_duration:.1f} seconds). This pause is too long and breaks the flow - people will start checking their phones.")
                    break
            
            
            # Cap at 100
            risk = min(base_risk, 100)
            
            timeline_entry = {
                "time": time_str,
                "risk": risk
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
                # Calculate end time (10 seconds after start)
                time_parts = max_risk_time.split(":")
                start_minutes = int(time_parts[0])
                start_seconds = int(time_parts[1])
                start_time_sec = start_minutes * 60 + start_seconds
                end_time_sec = min(start_time_sec + 10, duration)
                end_minutes = int(end_time_sec // 60)
                end_seconds = int(end_time_sec % 60)
                
                max_risk_entry = {
                    "start": max_risk_time,
                    "end": f"{end_minutes}:{end_seconds:02d}",
                    "risk": f"{int(max_risk_value)}%",
                    "description": f"This is the highest risk point in your speech, though overall your speech maintains good attention.",
                    "reasons": ["This is your weakest moment, but still acceptable"],
                    "risk_value": max_risk_value
                }
        
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
                    problematic_description = "Your voice becomes flat and monotone here. When you sound bored, your audience feels bored too."
                
                elif any("filler" in r for r in reasons):
                    problematic_description = "You're saying 'um', 'uh', and 'like' too many times here. This makes you sound nervous and unprepared."
                
                elif any("difficult" in r or "complex" in r for r in reasons):
                    problematic_description = "You're using complicated words here. Most people won't understand what you mean - use simpler, everyday language instead."
                
                elif any("long" in r for r in reasons):
                    problematic_description = "This section goes on too long without any breaks. People can't process this much information at once and they'll tune out."
                
                else:
                    problematic_description = max_risk_entry.get("description", "There's a problem here that might cause your audience to lose attention.")
                
                problematic_description += f"\n\nThis is your biggest problem - fix this to improve your speech."
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
        
        # Priority 1: Address the CRITICAL MOMENT first
        if max_risk_entry:
            reasons = max_risk_entry.get("reasons", [])
            detailed_problems = max_risk_entry.get("detailed_problems", [])
            critical_time = max_risk_entry["start"]
            risk_value = int(max_risk_entry["risk"].rstrip("%"))
            
            # Build specific recommendation for the critical moment based on exact issues
            critical_title = f"🚨 Fix Critical Moment at {critical_time}"
            
            # Determine primary issue and create targeted recommendation in SIMPLE LANGUAGE
            if any("too fast" in r for r in reasons):
                critical_description = f"This is your BIGGEST PROBLEM: {detailed_problems[0] if detailed_problems else 'You are speaking too fast here.'}\n\nWhat to do: Re-record this 10-second section. Speak slower - aim for about 2-3 words per second. Take a breath after each important point."
            
            elif any("too slow" in r for r in reasons):
                critical_description = f"This is your BIGGEST PROBLEM: {detailed_problems[0] if detailed_problems else 'You are speaking too slowly here.'}\n\nWhat to do: Re-record this section with more energy. Speed up your talking - don't drag out your words. Remove long pauses."
            
            elif any("pause" in r or "silence" in r for r in reasons):
                critical_description = f"This is your BIGGEST PROBLEM: {detailed_problems[0] if detailed_problems else 'There is a long awkward silence here.'}\n\nWhat to do: Edit out this silence, OR fill it by saying something like 'Now, here's the important part...' or 'Let me explain...'"
            
            elif any("energy" in r for r in reasons):
                critical_description = f"This is your BIGGEST PROBLEM: {detailed_problems[0] if detailed_problems else 'Your voice sounds flat and boring here.'}\n\nWhat to do: Re-record this part. Stand up while recording, smile (it changes your voice!), and emphasize your important words by saying them louder or higher."
            
            elif any("filler" in r for r in reasons):
                critical_description = f"This is your BIGGEST PROBLEM: {detailed_problems[0] if detailed_problems else 'You are saying um, uh, and like too many times.'}\n\nWhat to do: Write out exactly what you want to say. Practice it 5 times. When you feel 'um' coming, just pause silently instead. Keep recording until you get zero filler words."
            
            elif any("difficult" in r or "complex" in r for r in reasons):
                critical_description = f"This is your BIGGEST PROBLEM: {detailed_problems[0] if detailed_problems else 'You are using words that are too complicated.'}\n\nWhat to do: Rewrite this part using simple, everyday words. Add an example that people can relate to. If a 12-year-old wouldn't understand it, make it simpler."
            
            elif any("long" in r for r in reasons):
                critical_description = f"This is your BIGGEST PROBLEM: {detailed_problems[0] if detailed_problems else 'This section is too long without any breaks.'}\n\nWhat to do: Break this into smaller pieces. Say your main point (15 seconds), give an example (10 seconds), then pause for 2 seconds. Repeat."
            
            else:
                # Multiple issues combined
                critical_description = f"This is your BIGGEST PROBLEM: {detailed_problems[0] if detailed_problems else 'Multiple issues detected here.'}\n\nWhat to do: Re-record this 10-second section. Focus on: (1) More energy in your voice, (2) Simpler words, (3) Pausing between ideas. Fixing this will make the biggest difference."
            
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
                "description": f"Readability score: {reading_ease:.0f}/100 (Very Hard). You're losing 80% of listeners. ACTION: (1) Replace jargon with everyday words, (2) Use the 'explain to a 12-year-old' test, (3) Add analogies for complex ideas."
            })
        elif jargon_density == "High":
            suggestions.append({
                "title": "📖 Simplify Your Language",
                "description": f"Readability score: {reading_ease:.0f}/100 (Hard). Define technical terms when first used. RULE: If a word has 4+ syllables, explain it or replace it. Add real-world examples."
            })
        elif jargon_density == "Medium":
            suggestions.append({
                "title": "✓ Good Language Balance",
                "description": f"Readability score: {reading_ease:.0f}/100 (Moderate). Good balance of clarity and depth. Consider adding one concrete example for each abstract concept."
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

@app.get("/api/result/{job_id}")
async def get_result(job_id: str):
    if job_id not in jobs:
        return {"error": "Job not found"}
    
    if jobs[job_id]["status"] == "failed":
        return {"status": "failed", "error": jobs[job_id].get("error", "Unknown error")}

    if jobs[job_id]["status"] != "done":
        return {"status": jobs[job_id]["status"], "error": "Analysis not complete"}
        
    return jobs[job_id]["result"]

@app.get("/api/download-report/{job_id}")
async def download_report(job_id: str):
    """Generate and download detailed PDF report"""
    if job_id not in jobs:
        return {"error": "Job not found"}
    
    if jobs[job_id]["status"] != "done":
        return {"error": "Analysis not complete"}
    
    try:
        # Get analysis result
        result = jobs[job_id]["result"]
        filename = jobs[job_id].get("filename", "audio.mp3")
        
        logger.info(f"Generating PDF report for job {job_id}, filename: {filename}")
        
        # Create reports directory if it doesn't exist
        os.makedirs("reports", exist_ok=True)
        
        # Generate PDF
        pdf_path = f"reports/report_{job_id}.pdf"
        
        # Update PDF generator to use detailed data
        from pdf_generator import PDFReportGenerator
        
        pdf = PDFReportGenerator(pdf_path)
        
        # Add header
        pdf.add_header(filename)
        
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
        return FileResponse(
            path=pdf_path,
            media_type='application/pdf',
            filename=f'speech_analysis_report.pdf',
            headers={
                "Content-Disposition": f"attachment; filename=speech_analysis_report.pdf"
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

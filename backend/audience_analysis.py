# Audience-Specific Analysis Function
# Add this to main.py

def generate_audience_analysis(job_id: str, audience: str) -> Dict[str, Any]:
    """Generate audience-specific analysis based on the transcript and audio data"""
    
    result = jobs[job_id]["result"]
    summary = result.get("summary", {})
    
    # Get transcript and metrics
    transcript = jobs[job_id].get("transcript", "")
    speech_rate = summary.get("speech_rate", 0)
    filler_count = int(summary.get("filler_words", "0"))
    reading_ease = summary.get("reading_ease", 50)
    duration = jobs[job_id].get("duration", 0)
    
    # Calculate average response length
    avg_response_length = duration / max(len(transcript.split('.')), 1) if transcript else 0
    
    # Audience-specific analysis
    audience_configs = {
        "students": {
            "ideal_wpm": (120, 150),
            "ideal_complexity": (60, 100),  # Flesch score - higher is simpler
            "ideal_response_length": (10, 20),
            "focus": "clarity and engagement"
        },
        "professionals": {
            "ideal_wpm": (140, 170),
            "ideal_complexity": (40, 70),
            "ideal_response_length": (15, 30),
            "focus": "efficiency and precision"
        },
        "interviews": {
            "ideal_wpm": (130, 160),
            "ideal_complexity": (50, 80),
            "ideal_response_length": (20, 45),
            "focus": "conciseness and structure"
        },
        "marketing": {
            "ideal_wpm": (150, 180),
            "ideal_complexity": (60, 90),
            "ideal_response_length": (5, 15),
            "focus": "impact and persuasion"
        },
        "general": {
            "ideal_wpm": (140, 160),
            "ideal_complexity": (60, 80),
            "ideal_response_length": (10, 25),
            "focus": "accessibility and engagement"
        }
    }
    
    config = audience_configs.get(audience, audience_configs["general"])
    
    # Calculate fit score (0-100)
    fit_score = 100
    mismatches = []
    suggestions = []
    
    # Check speech rate
    ideal_wpm_min, ideal_wpm_max = config["ideal_wpm"]
    if speech_rate < ideal_wpm_min:
        fit_score -= 20
        mismatches.append(f"Speaking too slowly ({speech_rate:.0f} WPM) for {audience} audience")
        suggestions.append(f"Increase pace to {ideal_wpm_min}-{ideal_wpm_max} words per minute")
    elif speech_rate > ideal_wpm_max:
        fit_score -= 20
        mismatches.append(f"Speaking too fast ({speech_rate:.0f} WPM) for {audience} audience")
        suggestions.append(f"Slow down to {ideal_wpm_min}-{ideal_wpm_max} words per minute")
    
    # Check language complexity
    ideal_complexity_min, ideal_complexity_max = config["ideal_complexity"]
    if reading_ease < ideal_complexity_min:
        fit_score -= 15
        mismatches.append(f"Language too complex for {audience} audience")
        suggestions.append("Simplify vocabulary and use shorter sentences")
    elif reading_ease > ideal_complexity_max and audience in ["professionals", "interviews"]:
        fit_score -= 10
        mismatches.append(f"Language may be too simple for {audience} audience")
        suggestions.append("Use more precise, professional terminology")
    
    # Check filler words
    filler_density = (filler_count / duration * 60) if duration > 0 else 0
    if filler_density > 3:
        fit_score -= 15
        mismatches.append(f"Too many filler words ({filler_count} total)")
        suggestions.append("Practice pausing silently instead of using 'um', 'uh', 'like'")
    
    # Audience-specific checks
    if audience == "students":
        if reading_ease < 60:
            fit_score -= 10
            mismatches.append("Content may be too difficult for students to follow")
            suggestions.append("Add examples and analogies to explain complex ideas")
    
    elif audience == "professionals":
        if speech_rate < 140:
            fit_score -= 10
            mismatches.append("Pace is too slow for professional audience")
            suggestions.append("Professionals prefer efficient, direct communication")
    
    elif audience == "interviews":
        if avg_response_length > 60:
            fit_score -= 15
            mismatches.append("Answers are too long for interview format")
            suggestions.append("Use STAR method: Situation, Task, Action, Result")
        if "I" not in transcript[:100]:
            mismatches.append("Responses should be more personal in interviews")
            suggestions.append("Start with 'I' statements to show ownership")
    
    elif audience == "marketing":
        if speech_rate < 150:
            fit_score -= 10
            mismatches.append("Pace too slow for marketing/sales pitch")
            suggestions.append("Increase energy and pace to maintain excitement")
        if avg_response_length > 20:
            fit_score -= 10
            mismatches.append("Messages too long - lose audience attention")
            suggestions.append("Keep key messages under 15 seconds")
    
    # Ensure fit_score is between 0 and 100
    fit_score = max(0, min(100, fit_score))
    
    # Determine directness
    directness = "high" if speech_rate > 150 else "medium" if speech_rate > 130 else "low"
    
    # Determine explanation ratio
    explanation_ratio = "high" if avg_response_length > 30 else "medium" if avg_response_length > 15 else "low"
    
    return {
        "audience": audience,
        "fit_score": int(fit_score),
        "mismatches": mismatches,
        "suggestions": suggestions,
        "structural_insights": {
            "avg_response_length_sec": round(avg_response_length, 1),
            "directness": directness,
            "explanation_ratio": explanation_ratio,
            "speech_rate_wpm": round(speech_rate, 1),
            "filler_density": round(filler_density, 1)
        }
    }


# Modified endpoint - replace the existing @app.get("/api/result/{job_id}") with this:

@app.get("/api/result/{job_id}")
async def get_result(job_id: str, audience: str = None):
    if job_id not in jobs:
        return {"error": "Job not found"}
    
    if jobs[job_id]["status"] == "failed":
        return {"status": "failed", "error": jobs[job_id].get("error", "Unknown error")}

    if jobs[job_id]["status"] != "done":
        return {"status": jobs[job_id]["status"], "error": "Analysis not complete"}
    
    # If audience parameter is provided, return audience-specific analysis
    if audience:
        return generate_audience_analysis(job_id, audience)
    
    # Otherwise return the full analysis result
    return jobs[job_id]["result"]

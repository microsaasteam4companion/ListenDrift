from fastapi import FastAPI, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import uuid
import random
from typing import Dict, Any, List

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

async def process_audio(job_id: str):
    """Simulates audio processing"""
    try:
        jobs[job_id]["status"] = "processing"
        for i in range(0, 101, 10):
            jobs[job_id]["progress"] = i
            await asyncio.sleep(0.5) # Simulate processing time
        
        jobs[job_id]["status"] = "done"
        jobs[job_id]["progress"] = 100
        
        # Mock result data (consistent with frontend expectations)
        jobs[job_id]["result"] = {
            "drop_risks": [
                {"start": "1:30", "end": "2:00", "risk": "82%", "description": "High drop risk due to monotone delivery"}
            ],
            "timeline": [
                { "time": "0:00", "risk": 10 },
                { "time": "0:30", "risk": 20 },
                { "time": "1:00", "risk": 45 },
                { "time": "1:30", "risk": 82, "label": "Engagement lost" },
                { "time": "2:00", "risk": 60 },
                { "time": "2:30", "risk": 40 },
                { "time": "3:00", "risk": 20 }
            ],
            "summary": {
                "drop_risk": "82%", # Updated to match frontend percentage expectation
                "jargon_density": "Low",
                "filler_words": "3", # Updated to match numeric string expectation
                "stats": {
                    "dropRisk": "82%",
                    "jargonDensity": "Low",
                    "fillerWords": "3"
                },
                "suggestions": [
                    {
                        "title": "Vary your tone",
                        "description": "Try to modulate your pitch to keep the audience engaged."
                    },
                    {
                        "title": "Pause more effectively",
                        "description": "Use pauses to let key points sink in."
                    }
                ],
                "problematic_section": {
                     "range": "1:30 - 2:00",
                     "title": "Monotone Delivery",
                     "description": "Pitch variation dropped significantly."
                },
                "insights": {
                    "jargon": { "title": "Good Clarity", "desc": "Low jargon usage." },
                    "explanation": { "title": "Pacing", "desc": "Good pacing overall." },
                    "monotone": { "title": "Flat Spot", "desc": "Monotone detected at 1:30." },
                    "fillers": { "title": "Clean Speech", "desc": "Few fillers used." }
                }
            }
        }
    except Exception as e:
        print(f"Job {job_id} failed: {e}")
        jobs[job_id]["status"] = "failed"

@app.post("/api/upload")
async def upload_audio(file: UploadFile = File(...), background_tasks: BackgroundTasks = None):
    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "status": "queued",
        "progress": 0,
        "filename": file.filename,
        "result": None
    }
    
    # Start processing in background
    background_tasks.add_task(process_audio, job_id)
    
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
    
    if jobs[job_id]["status"] != "done":
        return {"error": "Analysis not complete"}
        
    return jobs[job_id]["result"]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

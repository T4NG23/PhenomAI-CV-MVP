# VLM Service - Vision Language Model for Post-Processing
# Generates natural language explanations and reports

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from datetime import datetime
import json

app = FastAPI(title="VLM Service", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection
def get_db():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "5432")),
        database=os.getenv("DB_NAME", "interview_integrity"),
        user=os.getenv("DB_USER", "interview_user"),
        password=os.getenv("DB_PASSWORD", "dev_password"),
        cursor_factory=RealDictCursor
    )

# Models
class VQARequest(BaseModel):
    session_id: str
    question: str
    frame_ids: Optional[List[str]] = None

class ExplanationRequest(BaseModel):
    anomaly_type: str
    metrics: Dict
    detected_at: str

class ReportRequest(BaseModel):
    session_id: str

# Prompt templates for VLM
SCENE_DESCRIPTION_PROMPT = """
Analyze this interview frame and describe observable behaviors:
- Person's position and orientation
- Visible objects in the scene
- Any other people visible
- Environmental context

Focus on objective observations only. Do not infer intent or emotion.
"""

VQA_PROMPTS = {
    "other_person": "Is there another person visible in this frame besides the main candidate?",
    "phone_visible": "Is there a phone or mobile device visible in the candidate's hands or on the desk?",
    "looking_away": "Is the candidate looking away from the camera/screen?",
    "objects_on_desk": "What objects are visible on the desk or in the immediate area?"
}

ANOMALY_EXPLANATIONS = {
    "off_screen_gaze": "The candidate was looking away from the screen for {rate:.0%} of the last {window}. "
                       "This may indicate they were reading from notes, looking at another device, or distracted.",
    
    "object_phone": "A phone or mobile device was detected in the candidate's hands or nearby for {duration:.1f} seconds. "
                    "This could indicate they were using the device during the interview.",
    
    "object_paper": "Printed materials (paper or book) were visible for {duration:.1f} seconds. "
                    "This may indicate the candidate was referencing notes or documents.",
    
    "multi_person": "Another person was detected entering the frame {count} times. "
                    "This could be someone assisting the candidate or an environmental factor.",
    
    "face_absence": "The candidate left the frame for {duration:.1f} seconds. "
                    "This could indicate they stood up, moved away, or there was a technical issue.",
    
    "excessive_head_movement": "Unusual head movement patterns were detected (yaw σ={yaw:.1f}°, pitch σ={pitch:.1f}°). "
                               "This may indicate nervousness, reading from multiple sources, or restlessness."
}

@app.get("/")
async def root():
    return {
        "service": "VLM Service",
        "version": "1.0.0",
        "status": "operational",
        "note": "This is a template implementation. Production requires actual VLM model (LLaVA/Qwen-VL)"
    }

@app.post("/describe")
async def describe_scene(request: dict):
    """
    Generate scene description from frame
    NOTE: This is a template. Production needs actual VLM model.
    """
    # TODO: Integrate actual VLM model (LLaVA, Qwen-VL, BLIP, etc.)
    # For now, return templated response
    
    return {
        "description": "Candidate visible in center frame, looking forward. Desktop environment with laptop visible. "
                      "No other people detected. Standard interview setup.",
        "confidence": 0.85,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/vqa")
async def visual_question_answering(request: VQARequest):
    """
    Answer questions about specific frames
    NOTE: This is a template. Production needs actual VLM model.
    """
    # TODO: Load frames from storage and run VLM VQA
    
    # Template responses based on question type
    if "person" in request.question.lower():
        answer = "No, only one person is visible in the analyzed frames."
        confidence = 0.92
    elif "phone" in request.question.lower():
        answer = "A rectangular device consistent with a phone was detected in frame f-003452."
        confidence = 0.78
    elif "looking" in request.question.lower():
        answer = "The candidate appears to be looking to the right and downward in multiple frames."
        confidence = 0.85
    else:
        answer = "Unable to determine from available frames."
        confidence = 0.5
    
    return {
        "question": request.question,
        "answer": answer,
        "confidence": confidence,
        "frame_references": request.frame_ids or []
    }

@app.post("/explain")
async def explain_anomaly(request: ExplanationRequest):
    """
    Generate natural language explanation for an anomaly
    """
    anomaly_type = request.anomaly_type
    metrics = request.metrics
    
    # Get explanation template
    template = ANOMALY_EXPLANATIONS.get(
        anomaly_type,
        "An anomaly of type '{type}' was detected. Please review the session data."
    )
    
    # Format with metrics
    try:
        if anomaly_type == "off_screen_gaze":
            explanation = template.format(
                rate=metrics.get('off_screen_rate', 0),
                window=metrics.get('window', '1min')
            )
        elif anomaly_type in ["object_phone", "object_paper", "face_absence"]:
            explanation = template.format(
                duration=metrics.get('duration_sec', 0)
            )
        elif anomaly_type == "multi_person":
            explanation = template.format(
                count=metrics.get('detection_count', 0)
            )
        elif anomaly_type == "excessive_head_movement":
            explanation = template.format(
                yaw=metrics.get('yaw_std', 0),
                pitch=metrics.get('pitch_std', 0)
            )
        else:
            explanation = template.format(type=anomaly_type)
    except Exception as e:
        explanation = f"Anomaly detected: {anomaly_type}"
    
    return {
        "anomaly_type": anomaly_type,
        "explanation": explanation,
        "confidence": 0.85,
        "evidence_bullets": [
            f"Detected at {request.detected_at}",
            f"Metrics: {json.dumps(metrics)}"
        ],
        "suggested_followup": get_followup_questions(anomaly_type)
    }

@app.post("/generate_report")
async def generate_report(request: ReportRequest):
    """
    Generate comprehensive post-interview report
    """
    session_id = request.session_id
    
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Get session data
        cursor.execute("""
            SELECT s.*, 
                   c.full_name as candidate_name,
                   u.full_name as interviewer_name
            FROM sessions s
            LEFT JOIN candidates c ON s.candidate_id = c.id
            LEFT JOIN users u ON s.interviewer_id = u.id
            WHERE s.id = %s
        """, (session_id,))
        session = cursor.fetchone()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get anomalies
        cursor.execute("""
            SELECT * FROM anomalies
            WHERE session_id = %s
            ORDER BY detected_at ASC
        """, (session_id,))
        anomalies = cursor.fetchall()
        
        # Get event summary
        cursor.execute("""
            SELECT COUNT(*) as event_count,
                   MIN(timestamp) as first_event,
                   MAX(timestamp) as last_event
            FROM events
            WHERE session_id = %s
        """, (session_id,))
        event_summary = cursor.fetchone()
        
        # Generate report summary
        report_summary = generate_report_summary(session, anomalies, event_summary)
        
        # Store report
        cursor.execute("""
            INSERT INTO reports (session_id, generated_at, vlm_summary, metrics, report_type)
            VALUES (%s, NOW(), %s, %s, 'standard')
            RETURNING id
        """, (session_id, report_summary['summary'], json.dumps(report_summary['metrics'])))
        
        report_id = cursor.fetchone()['id']
        conn.commit()
        conn.close()
        
        return {
            "report_id": report_id,
            "session_id": session_id,
            "generated_at": datetime.utcnow().isoformat(),
            "summary": report_summary
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")

def generate_report_summary(session: dict, anomalies: list, event_summary: dict) -> dict:
    """Generate human-readable report summary"""
    
    # Duration calculation
    if session['ended_at'] and session['started_at']:
        duration = (session['ended_at'] - session['started_at']).total_seconds() / 60
    else:
        duration = 0
    
    # Categorize anomalies
    anomaly_counts = {}
    high_severity = []
    for anomaly in anomalies:
        atype = anomaly['anomaly_type']
        anomaly_counts[atype] = anomaly_counts.get(atype, 0) + 1
        if anomaly['severity'] == 'high':
            high_severity.append(anomaly)
    
    # Generate summary text
    summary_parts = []
    summary_parts.append(f"Interview session completed with duration of {duration:.1f} minutes.")
    summary_parts.append(f"Total of {len(anomalies)} behavioral flags detected during the session.")
    
    if high_severity:
        summary_parts.append(f"\n⚠️  {len(high_severity)} high-severity flags require attention:")
        for anomaly in high_severity[:3]:  # Top 3
            summary_parts.append(f"  - {anomaly['description']}")
    
    if anomaly_counts:
        summary_parts.append("\nAnomaly breakdown:")
        for atype, count in anomaly_counts.items():
            summary_parts.append(f"  - {atype}: {count} occurrences")
    else:
        summary_parts.append("\n✓ No significant anomalies detected. Session appeared normal.")
    
    summary_parts.append("\n📝 Recommendation: " + get_overall_recommendation(anomalies, duration))
    
    return {
        "summary": "\n".join(summary_parts),
        "metrics": {
            "duration_minutes": duration,
            "total_anomalies": len(anomalies),
            "high_severity_count": len(high_severity),
            "anomaly_breakdown": anomaly_counts,
            "event_count": event_summary['event_count']
        },
        "high_priority_flags": [
            {
                "type": a['anomaly_type'],
                "description": a['description'],
                "detected_at": a['detected_at'].isoformat()
            }
            for a in high_severity
        ]
    }

def get_followup_questions(anomaly_type: str) -> List[str]:
    """Suggest follow-up questions for interviewers"""
    questions = {
        "off_screen_gaze": [
            "Can you describe your workspace setup?",
            "Were you referencing any materials during the interview?",
            "Did you experience any technical difficulties?"
        ],
        "object_phone": [
            "Were you using your phone for anything during the interview?",
            "Do you recall checking your phone at any point?",
            "Was there an emergency or important notification?"
        ],
        "object_paper": [
            "Were you referencing notes or documentation during the interview?",
            "Can you describe what materials you had with you?",
            "Did you prepare written notes beforehand?"
        ],
        "multi_person": [
            "Was anyone else present during your interview?",
            "Did anyone enter your space during the session?",
            "Can you describe your interview environment?"
        ],
        "face_absence": [
            "Did you need to step away at any point?",
            "Were there any technical issues with your camera?",
            "Did you experience any interruptions?"
        ]
    }
    return questions.get(anomaly_type, ["Can you provide context for this flag?"])

def get_overall_recommendation(anomalies: list, duration: float) -> str:
    """Generate overall recommendation"""
    high_severity = [a for a in anomalies if a['severity'] == 'high']
    
    if not anomalies:
        return "Session appeared normal. Candidate can proceed to next stage."
    elif len(high_severity) >= 3:
        return "Multiple high-severity flags detected. Recommend follow-up discussion with candidate."
    elif len(high_severity) > 0:
        return "Some concerns noted. Suggest brief follow-up to clarify flagged behaviors."
    else:
        return "Minor flags detected but likely not concerning. Candidate can proceed with note of minor observations."

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "vlm-service"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
import os
from datetime import datetime, timedelta

from backend.database import get_db, init_db
from backend.api.routes import router as entries_router
from backend.models import JournalEntry, AIFeedbackRequest, AIFeedbackResponse
from backend.services.openai_service import OpenAIService
from backend.services.export_service import ExportService

# Initialize FastAPI app
app = FastAPI(
    title="ChroniCompanion API",
    description="A gentle journaling API for people with chronic illness and mental health conditions",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8080", "*"],  # In production, be more specific
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
openai_service = OpenAIService()
export_service = ExportService()

# Include routers
app.include_router(entries_router, prefix="/api", tags=["entries"])

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    init_db()
    print("Database initialized successfully")

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Welcome to ChroniCompanion API",
        "description": "A gentle journaling API for chronic illness and mental health support",
        "version": "1.0.0",
        "endpoints": {
            "entries": "/api/entries",
            "ai_feedback": "/api/ai/feedback",
            "export": "/api/export",
            "docs": "/docs"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "database": "connected"
    }

# AI Integration Endpoints
@app.post("/api/ai/feedback", response_model=AIFeedbackResponse)
async def generate_ai_feedback(
    request: AIFeedbackRequest,
    db: Session = Depends(get_db)
):
    """Generate AI feedback for a journal entry"""
    try:
        # Get the entry
        entry = db.query(JournalEntry).filter(JournalEntry.id == request.entry_id).first()
        if not entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Entry not found"
            )
        
        # Convert entry to dict for AI service
        entry_data = {
            "entry_type": entry.entry_type,
            "date": entry.date,
            "morning_feeling": entry.morning_feeling,
            "morning_hopes": entry.morning_hopes,
            "morning_symptoms": entry.morning_symptoms,
            "evening_day_review": entry.evening_day_review,
            "evening_gratitude": entry.evening_gratitude,
            "evening_symptoms": entry.evening_symptoms,
            "mood_overall": entry.mood_overall,
            "energy_level": entry.energy_level,
            "anxiety_level": entry.anxiety_level,
            "pain_level": entry.pain_level,
            "fatigue_level": entry.fatigue_level,
            "sleep_quality": entry.sleep_quality,
            "additional_notes": entry.additional_notes
        }
        
        response = AIFeedbackResponse()
        
        # Generate summary if requested
        if request.generate_summary:
            summary = openai_service.generate_entry_summary(entry_data)
            response.summary = summary
            
            # Save to database
            if summary:
                entry.ai_summary = summary
        
        # Generate insights if requested
        if request.generate_insights:
            insights = openai_service.generate_insights_and_encouragement(entry_data)
            response.insights = insights
            
            # Save to database
            if insights:
                entry.ai_insights = insights
        
        # Commit changes to database
        db.commit()
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate AI feedback: {str(e)}"
        )

@app.get("/api/ai/weekly-reflection")
async def generate_weekly_reflection(db: Session = Depends(get_db)):
    """Generate a weekly reflection based on recent entries"""
    try:
        # Get entries from the last 7 days
        week_ago = datetime.now() - timedelta(days=7)
        entries = db.query(JournalEntry).filter(
            JournalEntry.timestamp >= week_ago
        ).order_by(JournalEntry.timestamp.desc()).all()
        
        if not entries:
            return {"reflection": "No entries found in the past week to reflect on."}
        
        # Convert entries to dict format
        entries_data = []
        for entry in entries:
            entry_data = {
                "entry_type": entry.entry_type,
                "date": entry.date,
                "morning_feeling": entry.morning_feeling,
                "morning_hopes": entry.morning_hopes,
                "morning_symptoms": entry.morning_symptoms,
                "evening_day_review": entry.evening_day_review,
                "evening_gratitude": entry.evening_gratitude,
                "evening_symptoms": entry.evening_symptoms,
                "mood_overall": entry.mood_overall,
                "energy_level": entry.energy_level,
                "anxiety_level": entry.anxiety_level,
                "pain_level": entry.pain_level,
                "fatigue_level": entry.fatigue_level,
                "sleep_quality": entry.sleep_quality,
                "additional_notes": entry.additional_notes
            }
            entries_data.append(entry_data)
        
        reflection = openai_service.generate_weekly_reflection(entries_data)
        
        return {
            "reflection": reflection,
            "entries_count": len(entries),
            "date_range": f"{entries[-1].date} to {entries[0].date}"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate weekly reflection: {str(e)}"
        )

# Export Endpoints
@app.get("/api/export")
async def export_entries(
    report_type: str = "comprehensive",
    days: int = 30,
    db: Session = Depends(get_db)
):
    """Export journal entries as PDF"""
    try:
        # Get entries for the specified period
        start_date = datetime.now() - timedelta(days=days)
        entries = db.query(JournalEntry).filter(
            JournalEntry.timestamp >= start_date
        ).order_by(JournalEntry.timestamp.desc()).all()
        
        if not entries:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No entries found for the specified period"
            )
        
        # Convert to dict format for export service
        entries_data = []
        for entry in entries:
            entry_data = {
                "id": entry.id,
                "entry_type": entry.entry_type,
                "date": entry.date,
                "timestamp": entry.timestamp.isoformat() if entry.timestamp else None,
                "morning_feeling": entry.morning_feeling,
                "morning_hopes": entry.morning_hopes,
                "morning_symptoms": entry.morning_symptoms,
                "evening_day_review": entry.evening_day_review,
                "evening_gratitude": entry.evening_gratitude,
                "evening_symptoms": entry.evening_symptoms,
                "mood_overall": entry.mood_overall,
                "energy_level": entry.energy_level,
                "anxiety_level": entry.anxiety_level,
                "pain_level": entry.pain_level,
                "fatigue_level": entry.fatigue_level,
                "sleep_quality": entry.sleep_quality,
                "additional_notes": entry.additional_notes,
                "ai_summary": entry.ai_summary,
                "ai_insights": entry.ai_insights
            }
            entries_data.append(entry_data)
        
        # Generate PDF
        pdf_buffer = export_service.generate_pdf_report(entries_data, report_type)
        
        # Create filename
        filename = f"chroni_companion_{report_type}_{datetime.now().strftime('%Y%m%d')}.pdf"
        
        # Return as streaming response
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export entries: {str(e)}"
        )

@app.get("/api/export/doctor-summary")
async def export_doctor_summary(
    days: int = 30,
    db: Session = Depends(get_db)
):
    """Export a medical summary for doctors"""
    return await export_entries(report_type="doctor_summary", days=days, db=db)

# Analytics Endpoints
@app.get("/api/analytics/trends")
async def get_trends(
    days: int = 30,
    db: Session = Depends(get_db)
):
    """Get trend analytics for mood, pain, energy, etc."""
    try:
        start_date = datetime.now() - timedelta(days=days)
        entries = db.query(JournalEntry).filter(
            JournalEntry.timestamp >= start_date
        ).order_by(JournalEntry.timestamp.asc()).all()
        
        if not entries:
            return {"message": "No entries found for trend analysis"}
        
        # Prepare trend data
        trends = {
            "dates": [],
            "mood": [],
            "energy": [],
            "pain": [],
            "anxiety": [],
            "fatigue": []
        }
        
        for entry in entries:
            trends["dates"].append(entry.date)
            trends["mood"].append(entry.mood_overall)
            trends["energy"].append(entry.energy_level)
            trends["pain"].append(entry.pain_level)
            trends["anxiety"].append(entry.anxiety_level)
            trends["fatigue"].append(entry.fatigue_level)
        
        return {
            "trends": trends,
            "period_days": days,
            "total_entries": len(entries)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get trends: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 
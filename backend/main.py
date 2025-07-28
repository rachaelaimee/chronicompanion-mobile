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

# Advanced AI Endpoints
@app.get("/api/ai/predictive-insights")
async def get_predictive_insights(
    days: int = 7,
    db: Session = Depends(get_db)
):
    """Generate predictive insights based on recent patterns"""
    try:
        # Get recent entries
        start_date = datetime.now() - timedelta(days=days)
        entries = db.query(JournalEntry).filter(
            JournalEntry.timestamp >= start_date
        ).order_by(JournalEntry.timestamp.desc()).all()
        
        if not entries:
            return {"message": "Not enough data for predictive insights. Add more journal entries."}
        
        # Convert entries to dict format
        entries_data = [{
            'entry_type': entry.entry_type,
            'date': entry.date,
            'mood_overall': entry.mood_overall,
            'energy_level': entry.energy_level,
            'pain_level': entry.pain_level,
            'anxiety_level': entry.anxiety_level,
            'fatigue_level': entry.fatigue_level,
            'additional_notes': entry.additional_notes
        } for entry in entries]
        
        # Generate predictive insights
        insights = openai_service.generate_predictive_insights(entries_data)
        
        return {
            "insights": insights or {"prediction": "Unable to generate insights at this time."},
            "based_on_entries": len(entries),
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate predictive insights: {str(e)}"
        )

@app.post("/api/ai/coping-strategies")
async def get_coping_strategies(
    current_symptoms: dict,
    db: Session = Depends(get_db)
):
    """Generate personalized coping strategies based on current symptoms"""
    try:
        # Get recent entries for context
        recent_entries = db.query(JournalEntry).order_by(
            JournalEntry.timestamp.desc()
        ).limit(14).all()
        
        entries_data = [{
            'mood_overall': entry.mood_overall,
            'energy_level': entry.energy_level,
            'pain_level': entry.pain_level,
            'anxiety_level': entry.anxiety_level,
            'fatigue_level': entry.fatigue_level,
            'additional_notes': entry.additional_notes
        } for entry in recent_entries]
        
        # Generate coping strategies
        strategies = openai_service.generate_coping_strategies(current_symptoms, entries_data)
        
        return {
            "strategies": strategies or {"immediate_strategies": ["Take a moment to breathe deeply"]},
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate coping strategies: {str(e)}"
        )

@app.get("/api/ai/crisis-check")
async def crisis_pattern_check(
    db: Session = Depends(get_db)
):
    """Check for concerning patterns and provide gentle support"""
    try:
        # Get recent entries
        recent_entries = db.query(JournalEntry).order_by(
            JournalEntry.timestamp.desc()
        ).limit(10).all()
        
        if not recent_entries:
            return {"risk_level": "none", "message": "No recent entries to analyze."}
        
        entries_data = [{
            'mood_overall': entry.mood_overall,
            'energy_level': entry.energy_level,
            'pain_level': entry.pain_level,
            'anxiety_level': entry.anxiety_level,
            'fatigue_level': entry.fatigue_level,
            'additional_notes': entry.additional_notes,
            'date': entry.date
        } for entry in recent_entries]
        
        # Perform crisis pattern detection
        crisis_analysis = openai_service.detect_crisis_patterns(entries_data)
        
        return {
            "analysis": crisis_analysis or {"risk_level": "none", "supportive_message": "You're doing well by tracking your health."},
            "analyzed_entries": len(recent_entries),
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to perform crisis check: {str(e)}"
        )

@app.get("/api/ai/weekly-coaching")
async def get_weekly_coaching(
    db: Session = Depends(get_db)
):
    """Generate comprehensive weekly wellness coaching"""
    try:
        # Get past week's entries
        start_date = datetime.now() - timedelta(days=7)
        entries = db.query(JournalEntry).filter(
            JournalEntry.timestamp >= start_date
        ).order_by(JournalEntry.timestamp.asc()).all()
        
        if not entries:
            return {"message": "Not enough recent entries for weekly coaching. Add more journal entries this week."}
        
        entries_data = [{
            'entry_type': entry.entry_type,
            'date': entry.date,
            'mood_overall': entry.mood_overall,
            'energy_level': entry.energy_level,
            'pain_level': entry.pain_level,
            'anxiety_level': entry.anxiety_level,
            'fatigue_level': entry.fatigue_level,
            'morning_hopes': entry.morning_hopes,
            'evening_gratitude': entry.evening_gratitude,
            'additional_notes': entry.additional_notes
        } for entry in entries]
        
        # Generate weekly coaching
        coaching = openai_service.generate_weekly_coaching(entries_data)
        
        return {
            "coaching": coaching or {"weekly_summary": "You've shown strength by continuing to track your health this week."},
            "entries_analyzed": len(entries),
            "week_period": f"{start_date.strftime('%Y-%m-%d')} to {datetime.now().strftime('%Y-%m-%d')}",
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate weekly coaching: {str(e)}"
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

@app.get("/api/analytics/chart-data")
async def get_chart_data(
    days: int = 30,
    metric: str = "all",
    db: Session = Depends(get_db)
):
    """Get chart-ready data for visualization"""
    try:
        start_date = datetime.now() - timedelta(days=days)
        entries = db.query(JournalEntry).filter(
            JournalEntry.timestamp >= start_date
        ).order_by(JournalEntry.timestamp.asc()).all()
        
        if not entries:
            return {"labels": [], "datasets": []}
        
        # Group entries by date and calculate averages for multiple entries per day
        daily_data = {}
        for entry in entries:
            date_key = entry.date
            if date_key not in daily_data:
                daily_data[date_key] = {
                    "mood": [], "energy": [], "pain": [], 
                    "anxiety": [], "fatigue": [], "count": 0
                }
            
            daily_data[date_key]["count"] += 1
            if entry.mood_overall is not None:
                daily_data[date_key]["mood"].append(entry.mood_overall)
            if entry.energy_level is not None:
                daily_data[date_key]["energy"].append(entry.energy_level)
            if entry.pain_level is not None:
                daily_data[date_key]["pain"].append(entry.pain_level)
            if entry.anxiety_level is not None:
                daily_data[date_key]["anxiety"].append(entry.anxiety_level)
            if entry.fatigue_level is not None:
                daily_data[date_key]["fatigue"].append(entry.fatigue_level)
        
        # Calculate daily averages
        labels = sorted(daily_data.keys())
        datasets = []
        
        if metric == "all" or metric == "mood":
            mood_data = []
            for date in labels:
                mood_values = daily_data[date]["mood"]
                avg_mood = sum(mood_values) / len(mood_values) if mood_values else None
                mood_data.append(avg_mood)
            
            datasets.append({
                "label": "Mood",
                "data": mood_data,
                "borderColor": "#5a6e5a",
                "backgroundColor": "rgba(90, 110, 90, 0.1)",
                "tension": 0.4,
                "fill": True
            })
        
        if metric == "all" or metric == "energy":
            energy_data = []
            for date in labels:
                energy_values = daily_data[date]["energy"]
                avg_energy = sum(energy_values) / len(energy_values) if energy_values else None
                energy_data.append(avg_energy)
            
            datasets.append({
                "label": "Energy",
                "data": energy_data,
                "borderColor": "#a593c2",
                "backgroundColor": "rgba(165, 147, 194, 0.1)",
                "tension": 0.4,
                "fill": True
            })
        
        if metric == "all" or metric == "pain":
            pain_data = []
            for date in labels:
                pain_values = daily_data[date]["pain"]
                avg_pain = sum(pain_values) / len(pain_values) if pain_values else None
                pain_data.append(avg_pain)
            
            datasets.append({
                "label": "Pain",
                "data": pain_data,
                "borderColor": "#dc2626",
                "backgroundColor": "rgba(220, 38, 38, 0.1)",
                "tension": 0.4,
                "fill": True
            })
        
        if metric == "all" or metric == "anxiety":
            anxiety_data = []
            for date in labels:
                anxiety_values = daily_data[date]["anxiety"]
                avg_anxiety = sum(anxiety_values) / len(anxiety_values) if anxiety_values else None
                anxiety_data.append(avg_anxiety)
            
            datasets.append({
                "label": "Anxiety",
                "data": anxiety_data,
                "borderColor": "#f59e0b",
                "backgroundColor": "rgba(245, 158, 11, 0.1)",
                "tension": 0.4,
                "fill": True
            })
        
        if metric == "all" or metric == "fatigue":
            fatigue_data = []
            for date in labels:
                fatigue_values = daily_data[date]["fatigue"]
                avg_fatigue = sum(fatigue_values) / len(fatigue_values) if fatigue_values else None
                fatigue_data.append(avg_fatigue)
            
            datasets.append({
                "label": "Fatigue",
                "data": fatigue_data,
                "borderColor": "#6366f1",
                "backgroundColor": "rgba(99, 102, 241, 0.1)",
                "tension": 0.4,
                "fill": True
            })
        
        return {
            "labels": labels,
            "datasets": datasets,
            "period_days": days,
            "total_entries": len(entries)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get chart data: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 
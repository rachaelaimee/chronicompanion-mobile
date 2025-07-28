from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from datetime import datetime
from pydantic import BaseModel
from typing import Optional

Base = declarative_base()

class JournalEntry(Base):
    __tablename__ = "journal_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    entry_type = Column(String(10), nullable=False)  # 'morning' or 'evening'
    date = Column(String(10), nullable=False)  # YYYY-MM-DD format
    timestamp = Column(DateTime, default=func.now())
    
    # Morning questions
    morning_feeling = Column(Text, nullable=True)
    morning_hopes = Column(Text, nullable=True)
    morning_symptoms = Column(Text, nullable=True)
    
    # Evening questions
    evening_day_review = Column(Text, nullable=True)
    evening_gratitude = Column(Text, nullable=True)
    evening_symptoms = Column(Text, nullable=True)
    
    # Mood tracking (1-10 scale)
    mood_overall = Column(Integer, nullable=True)
    energy_level = Column(Integer, nullable=True)
    anxiety_level = Column(Integer, nullable=True)
    
    # Symptom tracking
    pain_level = Column(Integer, nullable=True, default=0)  # 0-10 scale
    fatigue_level = Column(Integer, nullable=True, default=0)  # 0-10 scale
    sleep_quality = Column(String(20), nullable=True)  # excellent, good, fair, poor, very_poor
    
    # Additional notes
    additional_notes = Column(Text, nullable=True)
    
    # AI generated fields (for future use)
    ai_summary = Column(Text, nullable=True)
    ai_insights = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

# Pydantic models for API validation
class JournalEntryBase(BaseModel):
    entry_type: str
    date: str
    morning_feeling: Optional[str] = None
    morning_hopes: Optional[str] = None
    morning_symptoms: Optional[str] = None
    evening_day_review: Optional[str] = None
    evening_gratitude: Optional[str] = None
    evening_symptoms: Optional[str] = None
    mood_overall: Optional[int] = None
    energy_level: Optional[int] = None
    anxiety_level: Optional[int] = None
    pain_level: Optional[int] = 0
    fatigue_level: Optional[int] = 0
    sleep_quality: Optional[str] = None
    additional_notes: Optional[str] = None

class JournalEntryCreate(JournalEntryBase):
    pass

class JournalEntryUpdate(JournalEntryBase):
    entry_type: Optional[str] = None
    date: Optional[str] = None

class JournalEntryResponse(JournalEntryBase):
    id: int
    timestamp: datetime
    ai_summary: Optional[str] = None
    ai_insights: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class AIFeedbackRequest(BaseModel):
    entry_id: int
    generate_summary: bool = True
    generate_insights: bool = True

class AIFeedbackResponse(BaseModel):
    summary: Optional[str] = None
    insights: Optional[str] = None
    encouragement: Optional[str] = None 
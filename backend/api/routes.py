from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, date

from database import get_db
from models import JournalEntry, JournalEntryCreate, JournalEntryUpdate, JournalEntryResponse

router = APIRouter()

@router.post("/entries", response_model=JournalEntryResponse)
def create_entry(entry: JournalEntryCreate, db: Session = Depends(get_db)):
    """Create a new journal entry"""
    try:
        # Create new entry instance
        db_entry = JournalEntry(**entry.dict())
        
        # Add timestamp if not provided
        if not hasattr(db_entry, 'timestamp') or db_entry.timestamp is None:
            db_entry.timestamp = datetime.now()
        
        db.add(db_entry)
        db.commit()
        db.refresh(db_entry)
        
        return db_entry
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create entry: {str(e)}"
        )

@router.get("/entries", response_model=List[JournalEntryResponse])
def get_entries(
    skip: int = 0, 
    limit: int = 100, 
    entry_type: str = None,
    date_from: str = None,
    date_to: str = None,
    db: Session = Depends(get_db)
):
    """Get journal entries with optional filtering"""
    try:
        query = db.query(JournalEntry)
        
        # Filter by entry type if provided
        if entry_type:
            query = query.filter(JournalEntry.entry_type == entry_type)
        
        # Filter by date range if provided
        if date_from:
            query = query.filter(JournalEntry.date >= date_from)
        if date_to:
            query = query.filter(JournalEntry.date <= date_to)
        
        # Order by date descending (most recent first)
        query = query.order_by(JournalEntry.timestamp.desc())
        
        entries = query.offset(skip).limit(limit).all()
        return entries
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve entries: {str(e)}"
        )

@router.get("/entries/{entry_id}", response_model=JournalEntryResponse)
def get_entry(entry_id: int, db: Session = Depends(get_db)):
    """Get a specific journal entry by ID"""
    entry = db.query(JournalEntry).filter(JournalEntry.id == entry_id).first()
    if entry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Entry not found"
        )
    return entry

@router.put("/entries/{entry_id}", response_model=JournalEntryResponse)
def update_entry(entry_id: int, entry_update: JournalEntryUpdate, db: Session = Depends(get_db)):
    """Update a specific journal entry"""
    try:
        db_entry = db.query(JournalEntry).filter(JournalEntry.id == entry_id).first()
        if db_entry is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Entry not found"
            )
        
        # Update only provided fields
        update_data = entry_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_entry, field, value)
        
        db.commit()
        db.refresh(db_entry)
        return db_entry
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update entry: {str(e)}"
        )

@router.delete("/entries/{entry_id}")
def delete_entry(entry_id: int, db: Session = Depends(get_db)):
    """Delete a specific journal entry"""
    try:
        db_entry = db.query(JournalEntry).filter(JournalEntry.id == entry_id).first()
        if db_entry is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Entry not found"
            )
        
        db.delete(db_entry)
        db.commit()
        return {"message": "Entry deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete entry: {str(e)}"
        )

@router.get("/entries/stats/summary")
def get_entries_summary(db: Session = Depends(get_db)):
    """Get summary statistics for journal entries"""
    try:
        total_entries = db.query(JournalEntry).count()
        morning_entries = db.query(JournalEntry).filter(JournalEntry.entry_type == "morning").count()
        evening_entries = db.query(JournalEntry).filter(JournalEntry.entry_type == "evening").count()
        
        # Get recent entries for quick stats
        recent_entries = db.query(JournalEntry).order_by(JournalEntry.timestamp.desc()).limit(10).all()
        
        # Calculate average mood/energy if we have data
        avg_mood = None
        avg_energy = None
        avg_pain = None
        
        if recent_entries:
            mood_values = [e.mood_overall for e in recent_entries if e.mood_overall is not None]
            energy_values = [e.energy_level for e in recent_entries if e.energy_level is not None]
            pain_values = [e.pain_level for e in recent_entries if e.pain_level is not None]
            
            if mood_values:
                avg_mood = sum(mood_values) / len(mood_values)
            if energy_values:
                avg_energy = sum(energy_values) / len(energy_values)
            if pain_values:
                avg_pain = sum(pain_values) / len(pain_values)
        
        return {
            "total_entries": total_entries,
            "morning_entries": morning_entries,
            "evening_entries": evening_entries,
            "recent_averages": {
                "mood": round(avg_mood, 1) if avg_mood else None,
                "energy": round(avg_energy, 1) if avg_energy else None,
                "pain": round(avg_pain, 1) if avg_pain else None
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get summary: {str(e)}"
        ) 
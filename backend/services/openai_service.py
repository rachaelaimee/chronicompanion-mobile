import openai
import os
from typing import Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()

class OpenAIService:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            self.client = openai.OpenAI(api_key=api_key)
            self.model = "gpt-3.5-turbo"
            self.enabled = True
        else:
            self.client = None
            self.model = None
            self.enabled = False
            print("⚠️  OpenAI API key not found. AI features will be disabled.")
    
    def generate_entry_summary(self, entry_data: Dict[str, Any]) -> Optional[str]:
        """Generate a gentle summary of a journal entry"""
        if not self.enabled:
            return None
        
        try:
            # Build the context from the entry
            context = self._build_entry_context(entry_data)
            
            prompt = f"""
            You are a compassionate AI assistant helping someone with chronic illness and mental health challenges. 
            Please provide a gentle, supportive summary of their journal entry. 
            Focus on:
            - Acknowledging their feelings and experiences
            - Highlighting any positive moments or progress
            - Being encouraging and non-judgmental
            - Keeping the tone warm and understanding
            
            Entry details:
            {context}
            
            Please provide a brief, caring summary (2-3 sentences):
            """
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a gentle, supportive AI companion for people with chronic illness and mental health challenges. Always be kind, non-judgmental, and encouraging."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=150,
                temperature=0.7
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            print(f"Error generating summary: {e}")
            return None
    
    def generate_insights_and_encouragement(self, entry_data: Dict[str, Any]) -> Optional[str]:
        """Generate gentle insights and encouragement"""
        if not self.enabled:
            return None
        
        try:
            context = self._build_entry_context(entry_data)
            
            prompt = f"""
            Based on this journal entry from someone managing chronic illness and mental health challenges, 
            please provide gentle insights and encouragement. Focus on:
            - Patterns you notice that might be helpful to acknowledge
            - Gentle suggestions for self-care or coping
            - Validation of their experiences
            - Hope and encouragement for tomorrow
            
            Entry details:
            {context}
            
            Please provide supportive insights (3-4 sentences):
            """
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a supportive mental health companion. Provide gentle, non-clinical insights and encouragement. Never diagnose or give medical advice."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=200,
                temperature=0.8
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            print(f"Error generating insights: {e}")
            return None
    
    def generate_weekly_reflection(self, entries_data: list) -> Optional[str]:
        """Generate a weekly reflection based on multiple entries"""
        if not self.enabled:
            return None
        
        try:
            if not entries_data:
                return None
            
            # Build weekly context
            weekly_context = self._build_weekly_context(entries_data)
            
            prompt = f"""
            Based on a week of journal entries from someone managing chronic illness and mental health, 
            please provide a gentle weekly reflection. Focus on:
            - Overall patterns in mood, energy, and symptoms
            - Progress and positive moments from the week
            - Areas of strength and resilience shown
            - Gentle encouragement for the week ahead
            
            Weekly summary:
            {weekly_context}
            
            Please provide a caring weekly reflection (4-5 sentences):
            """
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a compassionate weekly reflection companion. Highlight progress, resilience, and provide gentle encouragement."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=250,
                temperature=0.7
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            print(f"Error generating weekly reflection: {e}")
            return None
    
    def _build_entry_context(self, entry_data: Dict[str, Any]) -> str:
        """Build context string from entry data"""
        context_parts = []
        
        # Entry type and timing
        entry_type = entry_data.get('entry_type', 'unknown')
        context_parts.append(f"Entry Type: {entry_type.title()}")
        
        # Text responses based on entry type
        if entry_type == 'morning':
            if entry_data.get('morning_feeling'):
                context_parts.append(f"Morning feeling: {entry_data['morning_feeling']}")
            if entry_data.get('morning_hopes'):
                context_parts.append(f"Hopes for today: {entry_data['morning_hopes']}")
            if entry_data.get('morning_symptoms'):
                context_parts.append(f"Morning symptoms: {entry_data['morning_symptoms']}")
        elif entry_type == 'evening':
            if entry_data.get('evening_day_review'):
                context_parts.append(f"Day review: {entry_data['evening_day_review']}")
            if entry_data.get('evening_gratitude'):
                context_parts.append(f"Gratitude: {entry_data['evening_gratitude']}")
            if entry_data.get('evening_symptoms'):
                context_parts.append(f"Evening symptoms: {entry_data['evening_symptoms']}")
        
        # Mood and symptom data
        mood_data = []
        if entry_data.get('mood_overall'):
            mood_data.append(f"Mood: {entry_data['mood_overall']}/10")
        if entry_data.get('energy_level'):
            mood_data.append(f"Energy: {entry_data['energy_level']}/10")
        if entry_data.get('anxiety_level'):
            mood_data.append(f"Anxiety: {entry_data['anxiety_level']}/10")
        if entry_data.get('pain_level'):
            mood_data.append(f"Pain: {entry_data['pain_level']}/10")
        if entry_data.get('fatigue_level'):
            mood_data.append(f"Fatigue: {entry_data['fatigue_level']}/10")
        
        if mood_data:
            context_parts.append("Ratings: " + ", ".join(mood_data))
        
        if entry_data.get('sleep_quality'):
            context_parts.append(f"Sleep quality: {entry_data['sleep_quality']}")
        
        if entry_data.get('additional_notes'):
            context_parts.append(f"Additional notes: {entry_data['additional_notes']}")
        
        return "\n".join(context_parts)
    
    def _build_weekly_context(self, entries_data: list) -> str:
        """Build weekly context from multiple entries"""
        context_parts = []
        context_parts.append(f"Number of entries this week: {len(entries_data)}")
        
        # Calculate averages
        mood_values = [e.get('mood_overall') for e in entries_data if e.get('mood_overall')]
        energy_values = [e.get('energy_level') for e in entries_data if e.get('energy_level')]
        pain_values = [e.get('pain_level') for e in entries_data if e.get('pain_level')]
        
        if mood_values:
            avg_mood = sum(mood_values) / len(mood_values)
            context_parts.append(f"Average mood: {avg_mood:.1f}/10")
        
        if energy_values:
            avg_energy = sum(energy_values) / len(energy_values)
            context_parts.append(f"Average energy: {avg_energy:.1f}/10")
        
        if pain_values:
            avg_pain = sum(pain_values) / len(pain_values)
            context_parts.append(f"Average pain: {avg_pain:.1f}/10")
        
        # Include some key moments from entries
        highlights = []
        for entry in entries_data[:3]:  # Take first 3 entries
            if entry.get('evening_gratitude'):
                highlights.append(f"Gratitude: {entry['evening_gratitude'][:100]}...")
            elif entry.get('morning_hopes'):
                highlights.append(f"Hope: {entry['morning_hopes'][:100]}...")
        
        if highlights:
            context_parts.append("Key moments:")
            context_parts.extend(highlights)
        
        return "\n".join(context_parts) 
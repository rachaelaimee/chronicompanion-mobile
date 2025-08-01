import openai
import os
from typing import Optional, Dict, Any, List
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

    def generate_predictive_insights(self, entries_data: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Generate predictive insights based on patterns"""
        if not self.enabled:
            print("🚫 DEBUG: OpenAI service disabled - no API key")
            return None
            
        print(f"🤖 DEBUG: Generating predictive insights for {len(entries_data)} entries")
        try:
            # Analyze recent patterns
            recent_entries = entries_data[-7:] if len(entries_data) >= 7 else entries_data
            context = self._build_pattern_context(recent_entries)
            
            prompt = f"""You are an AI health pattern analyst for someone with chronic illness.
            
Analyze these recent journal entries for patterns and provide gentle predictive insights:

{context}

Based on these patterns, provide insights in JSON format:
{{
    "prediction": "Brief prediction about upcoming days (1-2 sentences)",
    "confidence": "low/medium/high", 
    "suggestions": ["suggestion1", "suggestion2", "suggestion3"],
    "warning_signs": ["sign1", "sign2"],
    "positive_trends": ["trend1", "trend2"]
}}

Be gentle, trauma-informed, and focus on empowerment rather than alarm."""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=400,
                temperature=0.6
            )
            
            import json
            try:
                return json.loads(response.choices[0].message.content.strip())
            except json.JSONDecodeError:
                # Fallback if JSON parsing fails
                return {
                    "prediction": response.choices[0].message.content.strip(),
                    "confidence": "medium",
                    "suggestions": [],
                    "warning_signs": [],
                    "positive_trends": []
                }
            
        except Exception as e:
            print(f"🚨 ERROR generating predictive insights: {type(e).__name__}: {e}")
            print(f"🚨 Full error details: {str(e)}")
            import traceback
            print(f"🚨 Traceback: {traceback.format_exc()}")
            return None

    def generate_coping_strategies(self, current_symptoms: Dict[str, Any], entries_data: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Generate personalized coping strategy suggestions"""
        if not self.enabled:
            print("🚫 DEBUG: OpenAI service disabled for coping strategies")
            return None
            
        print(f"🤖 DEBUG: Generating coping strategies for symptoms: {current_symptoms}")
        try:
            # Build context about current state
            current_context = f"""
Current Status:
- Mood: {current_symptoms.get('mood', 'Not specified')}/10
- Energy: {current_symptoms.get('energy', 'Not specified')}/10
- Pain: {current_symptoms.get('pain', 'Not specified')}/10
- Anxiety: {current_symptoms.get('anxiety', 'Not specified')}/10
- Fatigue: {current_symptoms.get('fatigue', 'Not specified')}/10
"""
            
            prompt = f"""You are a compassionate chronic illness coach. Based on current symptoms, provide personalized coping strategies.

{current_context}

Provide coping strategies in JSON format:
{{
    "immediate_strategies": ["strategy1", "strategy2", "strategy3"],
    "energy_management": ["tip1", "tip2"],
    "pain_relief": ["technique1", "technique2"],
    "mood_support": ["activity1", "activity2"],
    "self_care": ["selfcare1", "selfcare2"],
    "when_to_seek_help": "gentle guidance about seeking professional support"
}}

Focus on evidence-based, gentle, and accessible strategies. Consider spoon theory and chronic illness limitations."""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=500,
                temperature=0.7
            )
            
            import json  
            try:
                return json.loads(response.choices[0].message.content.strip())
            except json.JSONDecodeError:
                return {"immediate_strategies": ["Take gentle, deep breaths", "Rest in a comfortable position", "Reach out to a trusted friend"]}
                
        except Exception as e:
            print(f"🚨 ERROR generating coping strategies: {type(e).__name__}: {e}")
            print(f"🚨 Full error details: {str(e)}")
            import traceback
            print(f"🚨 Traceback: {traceback.format_exc()}")
            return None

    def detect_crisis_patterns(self, entries_data: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Detect concerning patterns and provide gentle support"""
        if not self.enabled:
            print("🚫 DEBUG: OpenAI service disabled for crisis patterns")
            return None
            
        try:
            # Analyze recent entries for concerning patterns
            recent_entries = entries_data[-5:] if len(entries_data) >= 5 else entries_data
            context = self._build_crisis_context(recent_entries)
            
            prompt = f"""You are a trauma-informed mental health AI assistant. Analyze these journal entries for concerning patterns that might indicate someone needs extra support.

{context}

Analyze for patterns like:
- Consistently low mood/energy
- Increasing pain/anxiety
- Social isolation mentions
- Hopelessness indicators
- Major life stressors

Respond in JSON format:
{{
    "risk_level": "none/low/medium/high",
    "concerning_patterns": ["pattern1", "pattern2"],
    "supportive_message": "Gentle, caring message acknowledging their struggle",
    "gentle_suggestions": ["suggestion1", "suggestion2"],
    "resources": ["resource1", "resource2"],
    "check_in_frequency": "none/daily/twice_daily"
}}

Be gentle, never alarmist. Focus on support and empowerment."""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=400,
                temperature=0.5
            )
            
            import json
            try:
                return json.loads(response.choices[0].message.content.strip())
            except json.JSONDecodeError:
                return {"risk_level": "none", "concerning_patterns": [], "supportive_message": "You're doing great by tracking your health."}
                
        except Exception as e:
            print(f"Error in crisis detection: {e}")
            return None

    def generate_weekly_coaching(self, entries_data: List[Dict[str, Any]], goals: List[str] = None) -> Optional[Dict[str, Any]]:
        """Generate comprehensive weekly wellness coaching"""
        if not self.enabled:
            return None
            
        try:
            weekly_context = self._build_weekly_context(entries_data[-7:] if len(entries_data) >= 7 else entries_data)
            goals_context = f"User goals: {', '.join(goals)}" if goals else "No specific goals set"
            
            prompt = f"""You are an AI wellness coach specializing in chronic illness support. Provide comprehensive weekly coaching based on this data.

{weekly_context}
{goals_context}

Provide coaching in JSON format:
{{
    "weekly_summary": "Compassionate summary of their week",
    "achievements": ["achievement1", "achievement2"],
    "areas_for_growth": ["gentle area1", "gentle area2"],
    "next_week_focus": "One main focus area for next week",
    "specific_goals": ["achievable goal1", "achievable goal2"],
    "motivational_message": "Encouraging message for the week ahead",
    "self_care_prescription": ["selfcare1", "selfcare2", "selfcare3"]
}}

Use chronic illness-informed language. Celebrate small wins. Be realistic about limitations."""

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=500,
                temperature=0.7
            )
            
            import json
            try:
                return json.loads(response.choices[0].message.content.strip())
            except json.JSONDecodeError:
                return {"weekly_summary": "You've shown incredible strength this week.", "achievements": ["Continued tracking your health"], "motivational_message": "Keep being gentle with yourself."}
                
        except Exception as e:
            print(f"Error generating weekly coaching: {e}")
            return None

    def _build_pattern_context(self, entries_data: List[Dict[str, Any]]) -> str:
        """Build context for pattern analysis"""
        if not entries_data:
            return "No recent entries available for analysis."
        
        context_parts = []
        context_parts.append(f"Analyzing {len(entries_data)} recent entries:")
        
        # Extract trends
        mood_values = [e.get('mood_overall') for e in entries_data if e.get('mood_overall') is not None]
        energy_values = [e.get('energy_level') for e in entries_data if e.get('energy_level') is not None]
        pain_values = [e.get('pain_level') for e in entries_data if e.get('pain_level') is not None]
        
        if mood_values:
            trend = "increasing" if mood_values[-1] > mood_values[0] else "decreasing" if mood_values[-1] < mood_values[0] else "stable"
            context_parts.append(f"Mood trend: {trend} (recent: {mood_values[-3:]})")
        
        if energy_values:
            trend = "increasing" if energy_values[-1] > energy_values[0] else "decreasing" if energy_values[-1] < energy_values[0] else "stable"
            context_parts.append(f"Energy trend: {trend} (recent: {energy_values[-3:]})")
        
        if pain_values:
            trend = "increasing" if pain_values[-1] > pain_values[0] else "decreasing" if pain_values[-1] < pain_values[0] else "stable"
            context_parts.append(f"Pain trend: {trend} (recent: {pain_values[-3:]})")
        
        return "\n".join(context_parts)

    def _build_crisis_context(self, entries_data: List[Dict[str, Any]]) -> str:
        """Build context for crisis pattern detection"""
        if not entries_data:
            return "No recent entries available for analysis."
        
        context_parts = []
        context_parts.append(f"Analyzing {len(entries_data)} recent entries for concerning patterns:")
        
        # Look for concerning patterns
        low_mood_count = sum(1 for e in entries_data if e.get('mood_overall', 10) <= 3)
        high_pain_count = sum(1 for e in entries_data if e.get('pain_level', 0) >= 7)
        high_anxiety_count = sum(1 for e in entries_data if e.get('anxiety_level', 0) >= 7)
        
        context_parts.append(f"Low mood entries (≤3): {low_mood_count}/{len(entries_data)}")
        context_parts.append(f"High pain entries (≥7): {high_pain_count}/{len(entries_data)}")
        context_parts.append(f"High anxiety entries (≥7): {high_anxiety_count}/{len(entries_data)}")
        
        # Include recent text entries for context
        for entry in entries_data[-2:]:
            if entry.get('additional_notes'):
                context_parts.append(f"Recent note: {entry['additional_notes'][:150]}...")
        
        return "\n".join(context_parts) 
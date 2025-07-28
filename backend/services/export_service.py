from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.lib.colors import HexColor
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.units import inch
from reportlab.lib import colors
from io import BytesIO
from datetime import datetime
from typing import List, Dict, Any
import os

class ExportService:
    def __init__(self):
        self.sage_green = HexColor("#5a6e5a")
        self.lavender = HexColor("#a593c2")
        self.light_gray = HexColor("#f6f7f6")
        
    def generate_pdf_report(self, entries: List[Dict[str, Any]], report_type: str = "comprehensive") -> BytesIO:
        """Generate a PDF report from journal entries"""
        buffer = BytesIO()
        
        # Create the PDF document
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18
        )
        
        # Build the story (content)
        story = []
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            textColor=self.sage_green,
            alignment=TA_CENTER
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=16,
            spaceAfter=12,
            textColor=self.sage_green,
            borderWidth=1,
            borderColor=self.sage_green,
            borderPadding=5
        )
        
        # Title page
        story.append(Paragraph("ChroniCompanion", title_style))
        story.append(Paragraph("Journal Report", title_style))
        story.append(Spacer(1, 20))
        
        # Report metadata
        report_date = datetime.now().strftime("%B %d, %Y")
        story.append(Paragraph(f"<b>Report Generated:</b> {report_date}", styles['Normal']))
        story.append(Paragraph(f"<b>Total Entries:</b> {len(entries)}", styles['Normal']))
        
        if entries:
            date_range = self._get_date_range(entries)
            story.append(Paragraph(f"<b>Date Range:</b> {date_range}", styles['Normal']))
        
        story.append(Spacer(1, 30))
        
        if report_type == "comprehensive":
            # Summary statistics
            story.extend(self._create_summary_section(entries, heading_style, styles))
            
            # Individual entries
            story.extend(self._create_entries_section(entries, heading_style, styles))
            
        elif report_type == "doctor_summary":
            # Medical-focused summary
            story.extend(self._create_medical_summary(entries, heading_style, styles))
            
        # Build the PDF
        doc.build(story)
        buffer.seek(0)
        return buffer
    
    def _create_summary_section(self, entries: List[Dict[str, Any]], heading_style, styles) -> List:
        """Create summary statistics section"""
        story = []
        story.append(Paragraph("Summary Statistics", heading_style))
        
        if not entries:
            story.append(Paragraph("No entries to analyze.", styles['Normal']))
            return story
        
        # Calculate statistics
        stats = self._calculate_statistics(entries)
        
        # Create statistics table
        data = [
            ['Metric', 'Average', 'Range'],
            ['Mood Level', f"{stats['avg_mood']:.1f}/10" if stats['avg_mood'] else 'N/A', 
             f"{stats['mood_range']}" if stats['mood_range'] else 'N/A'],
            ['Energy Level', f"{stats['avg_energy']:.1f}/10" if stats['avg_energy'] else 'N/A',
             f"{stats['energy_range']}" if stats['energy_range'] else 'N/A'],
            ['Pain Level', f"{stats['avg_pain']:.1f}/10" if stats['avg_pain'] else 'N/A',
             f"{stats['pain_range']}" if stats['pain_range'] else 'N/A'],
            ['Anxiety Level', f"{stats['avg_anxiety']:.1f}/10" if stats['avg_anxiety'] else 'N/A',
             f"{stats['anxiety_range']}" if stats['anxiety_range'] else 'N/A'],
        ]
        
        table = Table(data, colWidths=[2*inch, 1.5*inch, 1.5*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), self.light_gray),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        
        story.append(table)
        story.append(Spacer(1, 20))
        
        # Entry type breakdown
        morning_count = len([e for e in entries if e.get('entry_type') == 'morning'])
        evening_count = len([e for e in entries if e.get('entry_type') == 'evening'])
        
        story.append(Paragraph(f"<b>Entry Types:</b> {morning_count} Morning, {evening_count} Evening", styles['Normal']))
        story.append(Spacer(1, 20))
        
        return story
    
    def _create_entries_section(self, entries: List[Dict[str, Any]], heading_style, styles) -> List:
        """Create individual entries section"""
        story = []
        story.append(PageBreak())
        story.append(Paragraph("Journal Entries", heading_style))
        
        for i, entry in enumerate(entries):
            if i > 0:
                story.append(Spacer(1, 20))
            
            story.extend(self._format_single_entry(entry, styles))
            
            # Page break every 3 entries to keep readability
            if (i + 1) % 3 == 0 and i < len(entries) - 1:
                story.append(PageBreak())
        
        return story
    
    def _create_medical_summary(self, entries: List[Dict[str, Any]], heading_style, styles) -> List:
        """Create medical-focused summary for doctors"""
        story = []
        story.append(Paragraph("Medical Summary Report", heading_style))
        
        # Patient tracking overview
        stats = self._calculate_statistics(entries)
        
        story.append(Paragraph("<b>Symptom Tracking Summary</b>", styles['Heading3']))
        
        # Symptom trends
        symptom_text = f"""
        <b>Pain Levels:</b> Average {stats['avg_pain']:.1f}/10, Range: {stats['pain_range']}<br/>
        <b>Fatigue Levels:</b> Average {stats['avg_fatigue']:.1f}/10, Range: {stats['fatigue_range']}<br/>
        <b>Sleep Quality:</b> {self._analyze_sleep_patterns(entries)}<br/>
        <b>Mood Tracking:</b> Average {stats['avg_mood']:.1f}/10, Range: {stats['mood_range']}<br/>
        <b>Energy Levels:</b> Average {stats['avg_energy']:.1f}/10, Range: {stats['energy_range']}<br/>
        """
        
        story.append(Paragraph(symptom_text, styles['Normal']))
        story.append(Spacer(1, 15))
        
        # Notable patterns
        story.append(Paragraph("<b>Notable Patterns & Concerns</b>", styles['Heading3']))
        patterns = self._identify_medical_patterns(entries)
        for pattern in patterns:
            story.append(Paragraph(f"• {pattern}", styles['Normal']))
        
        story.append(Spacer(1, 15))
        
        # Recent entries summary
        story.append(Paragraph("<b>Recent Entries (Last 7 Days)</b>", styles['Heading3']))
        
        recent_entries = entries[:7]  # Assuming entries are sorted by date desc
        for entry in recent_entries:
            entry_date = entry.get('date', 'Unknown date')
            entry_type = entry.get('entry_type', 'Unknown').title()
            
            # Extract key medical info
            pain = entry.get('pain_level', 'N/A')
            fatigue = entry.get('fatigue_level', 'N/A')
            sleep = entry.get('sleep_quality', 'N/A')
            mood = entry.get('mood_overall', 'N/A')
            
            entry_summary = f"<b>{entry_date} ({entry_type}):</b> Pain: {pain}/10, Fatigue: {fatigue}/10, Sleep: {sleep}, Mood: {mood}/10"
            story.append(Paragraph(entry_summary, styles['Normal']))
        
        return story
    
    def _format_single_entry(self, entry: Dict[str, Any], styles) -> List:
        """Format a single journal entry"""
        story = []
        
        # Entry header
        entry_date = entry.get('date', 'Unknown date')
        entry_type = entry.get('entry_type', 'Unknown').title()
        timestamp = entry.get('timestamp', '')
        
        if isinstance(timestamp, str):
            try:
                dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                time_str = dt.strftime("%I:%M %p")
            except:
                time_str = ''
        else:
            time_str = ''
        
        header_text = f"<b>{entry_date} - {entry_type} Entry</b>"
        if time_str:
            header_text += f" <i>({time_str})</i>"
        
        story.append(Paragraph(header_text, styles['Heading3']))
        
        # Entry content based on type
        if entry.get('entry_type') == 'morning':
            if entry.get('morning_feeling'):
                story.append(Paragraph(f"<b>Morning Feeling:</b> {entry['morning_feeling']}", styles['Normal']))
            if entry.get('morning_hopes'):
                story.append(Paragraph(f"<b>Hopes for Today:</b> {entry['morning_hopes']}", styles['Normal']))
            if entry.get('morning_symptoms'):
                story.append(Paragraph(f"<b>Morning Symptoms:</b> {entry['morning_symptoms']}", styles['Normal']))
        
        elif entry.get('entry_type') == 'evening':
            if entry.get('evening_day_review'):
                story.append(Paragraph(f"<b>Day Review:</b> {entry['evening_day_review']}", styles['Normal']))
            if entry.get('evening_gratitude'):
                story.append(Paragraph(f"<b>Gratitude:</b> {entry['evening_gratitude']}", styles['Normal']))
            if entry.get('evening_symptoms'):
                story.append(Paragraph(f"<b>Evening Symptoms:</b> {entry['evening_symptoms']}", styles['Normal']))
        
        # Ratings
        ratings = []
        if entry.get('mood_overall'):
            ratings.append(f"Mood: {entry['mood_overall']}/10")
        if entry.get('energy_level'):
            ratings.append(f"Energy: {entry['energy_level']}/10")
        if entry.get('anxiety_level'):
            ratings.append(f"Anxiety: {entry['anxiety_level']}/10")
        if entry.get('pain_level'):
            ratings.append(f"Pain: {entry['pain_level']}/10")
        if entry.get('fatigue_level'):
            ratings.append(f"Fatigue: {entry['fatigue_level']}/10")
        
        if ratings:
            story.append(Paragraph(f"<b>Ratings:</b> {' | '.join(ratings)}", styles['Normal']))
        
        if entry.get('sleep_quality'):
            story.append(Paragraph(f"<b>Sleep Quality:</b> {entry['sleep_quality'].replace('_', ' ').title()}", styles['Normal']))
        
        if entry.get('additional_notes'):
            story.append(Paragraph(f"<b>Additional Notes:</b> {entry['additional_notes']}", styles['Normal']))
        
        return story
    
    def _calculate_statistics(self, entries: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate statistical summaries"""
        stats = {}
        
        # Mood statistics
        mood_values = [e.get('mood_overall') for e in entries if e.get('mood_overall') is not None]
        if mood_values:
            stats['avg_mood'] = sum(mood_values) / len(mood_values)
            stats['mood_range'] = f"{min(mood_values)}-{max(mood_values)}"
        else:
            stats['avg_mood'] = None
            stats['mood_range'] = None
        
        # Energy statistics
        energy_values = [e.get('energy_level') for e in entries if e.get('energy_level') is not None]
        if energy_values:
            stats['avg_energy'] = sum(energy_values) / len(energy_values)
            stats['energy_range'] = f"{min(energy_values)}-{max(energy_values)}"
        else:
            stats['avg_energy'] = None
            stats['energy_range'] = None
        
        # Pain statistics
        pain_values = [e.get('pain_level') for e in entries if e.get('pain_level') is not None]
        if pain_values:
            stats['avg_pain'] = sum(pain_values) / len(pain_values)
            stats['pain_range'] = f"{min(pain_values)}-{max(pain_values)}"
        else:
            stats['avg_pain'] = None
            stats['pain_range'] = None
        
        # Anxiety statistics
        anxiety_values = [e.get('anxiety_level') for e in entries if e.get('anxiety_level') is not None]
        if anxiety_values:
            stats['avg_anxiety'] = sum(anxiety_values) / len(anxiety_values)
            stats['anxiety_range'] = f"{min(anxiety_values)}-{max(anxiety_values)}"
        else:
            stats['avg_anxiety'] = None
            stats['anxiety_range'] = None
        
        # Fatigue statistics
        fatigue_values = [e.get('fatigue_level') for e in entries if e.get('fatigue_level') is not None]
        if fatigue_values:
            stats['avg_fatigue'] = sum(fatigue_values) / len(fatigue_values)
            stats['fatigue_range'] = f"{min(fatigue_values)}-{max(fatigue_values)}"
        else:
            stats['avg_fatigue'] = None
            stats['fatigue_range'] = None
        
        return stats
    
    def _get_date_range(self, entries: List[Dict[str, Any]]) -> str:
        """Get the date range of entries"""
        dates = [e.get('date') for e in entries if e.get('date')]
        if not dates:
            return "No dates available"
        
        dates.sort()
        if len(dates) == 1:
            return dates[0]
        return f"{dates[0]} to {dates[-1]}"
    
    def _analyze_sleep_patterns(self, entries: List[Dict[str, Any]]) -> str:
        """Analyze sleep quality patterns"""
        sleep_values = [e.get('sleep_quality') for e in entries if e.get('sleep_quality')]
        if not sleep_values:
            return "No sleep data recorded"
        
        sleep_counts = {}
        for sleep in sleep_values:
            sleep_counts[sleep] = sleep_counts.get(sleep, 0) + 1
        
        most_common = max(sleep_counts, key=sleep_counts.get)
        return f"Most common: {most_common.replace('_', ' ').title()} ({sleep_counts[most_common]}/{len(sleep_values)} entries)"
    
    def _identify_medical_patterns(self, entries: List[Dict[str, Any]]) -> List[str]:
        """Identify notable medical patterns"""
        patterns = []
        
        # High pain frequency
        high_pain_count = len([e for e in entries if e.get('pain_level', 0) >= 7])
        if high_pain_count > len(entries) * 0.3:
            patterns.append(f"Frequent high pain levels (7+/10) in {high_pain_count} of {len(entries)} entries")
        
        # Sleep issues
        poor_sleep_count = len([e for e in entries if e.get('sleep_quality') in ['poor', 'very_poor']])
        if poor_sleep_count > len(entries) * 0.4:
            patterns.append(f"Persistent sleep difficulties in {poor_sleep_count} of {len(entries)} entries")
        
        # Low energy patterns
        low_energy_count = len([e for e in entries if e.get('energy_level', 10) <= 3])
        if low_energy_count > len(entries) * 0.3:
            patterns.append(f"Frequently low energy levels (≤3/10) in {low_energy_count} of {len(entries)} entries")
        
        # High anxiety
        high_anxiety_count = len([e for e in entries if e.get('anxiety_level', 0) >= 7])
        if high_anxiety_count > len(entries) * 0.3:
            patterns.append(f"Elevated anxiety levels (7+/10) in {high_anxiety_count} of {len(entries)} entries")
        
        if not patterns:
            patterns.append("No significant concerning patterns identified in current data range")
        
        return patterns 
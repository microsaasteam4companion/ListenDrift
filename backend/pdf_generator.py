# -*- coding: utf-8 -*-
"""
PDF Report Generator for Speech Analysis
Generates detailed, structured PDF reports with all analysis details
"""

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, black, white
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.pdfgen import canvas
from datetime import datetime
import os

class PDFReportGenerator:
    def __init__(self, output_path):
        self.output_path = output_path
        self.doc = SimpleDocTemplate(
            output_path,
            pagesize=letter,
            rightMargin=0.75*inch,
            leftMargin=0.75*inch,
            topMargin=0.75*inch,
            bottomMargin=0.75*inch
        )
        self.story = []
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Create custom paragraph styles"""
        # Check if style exists before adding to avoid duplicate errors
        
        # Title style
        try:
            self.styles['CustomTitle']
        except KeyError:
            self.styles.add(ParagraphStyle(
                name='CustomTitle',
                parent=self.styles['Heading1'],
                fontSize=24,
                textColor=HexColor('#1a1a1a'),
                spaceAfter=30,
                alignment=TA_CENTER,
                fontName='Helvetica-Bold'
            ))
        
        # Section header
        try:
            self.styles['SectionHeader']
        except KeyError:
            self.styles.add(ParagraphStyle(
                name='SectionHeader',
                parent=self.styles['Heading2'],
                fontSize=16,
                textColor=HexColor('#2563eb'),
                spaceAfter=12,
                spaceBefore=20,
                fontName='Helvetica-Bold'
            ))
        
        # Subsection header
        try:
            self.styles['SubsectionHeader']
        except KeyError:
            self.styles.add(ParagraphStyle(
                name='SubsectionHeader',
                parent=self.styles['Heading3'],
                fontSize=13,
                textColor=HexColor('#1e40af'),
                spaceAfter=8,
                spaceBefore=12,
                fontName='Helvetica-Bold'
            ))
        
        # Body text
        try:
            self.styles['BodyText']
        except KeyError:
            self.styles.add(ParagraphStyle(
                name='BodyText',
                parent=self.styles['Normal'],
                fontSize=11,
                textColor=HexColor('#374151'),
                spaceAfter=8,
                alignment=TA_JUSTIFY,
                leading=14
            ))
        
        # Highlight box
        try:
            self.styles['HighlightBox']
        except KeyError:
            self.styles.add(ParagraphStyle(
                name='HighlightBox',
                parent=self.styles['Normal'],
                fontSize=11,
                textColor=HexColor('#991b1b'),
                spaceAfter=10,
                spaceBefore=10,
                leftIndent=20,
                rightIndent=20,
                fontName='Helvetica-Bold'
            ))
        
        # Timestamp style
        try:
            self.styles['Timestamp']
        except KeyError:
            self.styles.add(ParagraphStyle(
                name='Timestamp',
                parent=self.styles['Normal'],
                fontSize=10,
                textColor=HexColor('#6b7280'),
                fontName='Courier'
            ))
    
    def add_header(self, filename):
        """Add report header"""
        # Title
        title = Paragraph("Speech Analysis Report", self.styles['CustomTitle'])
        self.story.append(title)
        self.story.append(Spacer(1, 0.2*inch))
        
        # Metadata
        date_str = datetime.now().strftime("%B %d, %Y at %I:%M %p")
        metadata = f"<b>File:</b> {filename}<br/><b>Generated:</b> {date_str}"
        self.story.append(Paragraph(metadata, self.styles['BodyText']))
        self.story.append(Spacer(1, 0.3*inch))
        
        # Divider line
        self._add_divider()
    
    def _add_divider(self):
        """Add a horizontal divider line"""
        self.story.append(Spacer(1, 0.1*inch))
    
    def add_critical_moment(self, critical_moment_data):
        """Add critical moment section with detailed explanation"""
        self.story.append(Paragraph("🚨 Critical Moment Detected", self.styles['SectionHeader']))
        
        if not critical_moment_data or critical_moment_data.get('risk') == 'Low':
            self.story.append(Paragraph(
                "Great news! No critical moments detected in your speech. Your audience should stay engaged throughout.",
                self.styles['BodyText']
            ))
            self.story.append(Spacer(1, 0.2*inch))
            return
        
        # Time range
        time_range = f"<b>Time:</b> {critical_moment_data.get('start', 'N/A')} - {critical_moment_data.get('end', 'N/A')}"
        self.story.append(Paragraph(time_range, self.styles['BodyText']))
        self.story.append(Spacer(1, 0.1*inch))
        
        # Risk level
        risk = critical_moment_data.get('risk', 'Unknown')
        risk_text = f"<b>Attention Drop Risk:</b> <font color='#dc2626'>{risk}</font>"
        self.story.append(Paragraph(risk_text, self.styles['BodyText']))
        self.story.append(Spacer(1, 0.15*inch))
        
        # Problem description
        description = critical_moment_data.get('description', 'No description available')
        self.story.append(Paragraph("<b>What's Wrong:</b>", self.styles['SubsectionHeader']))
        self.story.append(Paragraph(description, self.styles['BodyText']))
        self.story.append(Spacer(1, 0.15*inch))
        
        # Transcript excerpt if available
        if 'segment_text' in critical_moment_data and critical_moment_data['segment_text']:
            self.story.append(Paragraph("<b>What You Said:</b>", self.styles['SubsectionHeader']))
            transcript = critical_moment_data['segment_text'][:200]
            if len(critical_moment_data['segment_text']) > 200:
                transcript += "..."
            self.story.append(Paragraph(f'"{transcript}"', self.styles['BodyText']))
        
        self.story.append(Spacer(1, 0.3*inch))
    
    def add_filler_words_detail(self, segments, filler_pattern):
        """Add detailed filler words analysis with timestamps"""
        import re
        
        self.story.append(Paragraph("Filler Words Analysis", self.styles['SectionHeader']))
        
        # Collect all filler words with timestamps
        filler_instances = []
        for seg in segments:
            text = seg.get('text', '')
            start_time = seg.get('start', 0)
            
            # Find all filler words in this segment using the passed pattern
            # Use the pattern string directly if it's a string, or compile it
            try:
                matches = re.finditer(filler_pattern, text.lower(), re.IGNORECASE)
                for match in matches:
                    filler_word = match.group()
                    minutes = int(start_time // 60)
                    seconds = int(start_time % 60)
                    time_str = f"{minutes}:{seconds:02d}"
                    filler_instances.append({
                        'word': filler_word,
                        'time': time_str,
                        'context': text.strip()
                    })
            except Exception as e:
                print(f"Regex error: {e}")
                continue
        
        if not filler_instances:
            self.story.append(Paragraph(
                "Excellent! No filler words detected. You sound confident and well-prepared.",
                self.styles['BodyText']
            ))
            self.story.append(Spacer(1, 0.2*inch))
            return
        
        # Summary
        total_fillers = len(filler_instances)
        summary = f"Found <b>{total_fillers} filler word(s)</b> in your speech. Here's where each one appears:"
        self.story.append(Paragraph(summary, self.styles['BodyText']))
        self.story.append(Spacer(1, 0.15*inch))
        
        # Create table of filler words
        table_data = [['#', 'Time', 'Filler Word', 'Context']]
        for idx, filler in enumerate(filler_instances, 1):
            context = filler['context'][:60] + "..." if len(filler['context']) > 60 else filler['context']
            table_data.append([
                str(idx),
                filler['time'],
                filler['word'],
                context
            ])
        
        # Create table
        if len(table_data) > 1:
            table = Table(table_data, colWidths=[0.4*inch, 0.8*inch, 1.2*inch, 4*inch])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HexColor('#2563eb')),
                ('TEXTCOLOR', (0, 0), (-1, 0), white),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), HexColor('#f3f4f6')),
                ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#d1d5db')),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
                ('TOPPADDING', (0, 1), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
            ]))
            
            self.story.append(table)
        self.story.append(Spacer(1, 0.3*inch))
    
    def add_complex_words_detail(self, segments):
        """Add detailed analysis of complex/jargon words"""
        import textstat
        
        self.story.append(Paragraph("Complex Language Analysis", self.styles['SectionHeader']))
        
        # Collect complex words (words with 3+ syllables or technical terms)
        complex_instances = []
        for seg in segments:
            text = seg.get('text', '')
            start_time = seg.get('start', 0)
            
            # Check if segment is complex
            if len(text) > 20:
                reading_ease = textstat.flesch_reading_ease(text)
                if reading_ease < 50:  # Difficult to read
                    minutes = int(start_time // 60)
                    seconds = int(start_time % 60)
                    time_str = f"{minutes}:{seconds:02d}"
                    
                    # Find long/complex words (3+ syllables)
                    words = text.split()
                    complex_words = [w for w in words if textstat.syllable_count(w) >= 3]
                    
                    if complex_words:
                        complex_instances.append({
                            'time': time_str,
                            'score': reading_ease,
                            'words': complex_words[:5],  # First 5 complex words
                            'context': text.strip()
                        })
        
        if not complex_instances:
            self.story.append(Paragraph(
                "Great! Your language is clear and easy to understand. No overly complex sections detected.",
                self.styles['BodyText']
            ))
            self.story.append(Spacer(1, 0.2*inch))
            return
        
        # Summary
        summary = f"Found <b>{len(complex_instances)} section(s)</b> with complex language that might confuse your audience:"
        self.story.append(Paragraph(summary, self.styles['BodyText']))
        self.story.append(Spacer(1, 0.15*inch))
        
        # List each complex section
        for idx, instance in enumerate(complex_instances, 1):
            self.story.append(Paragraph(f"<b>{idx}. At {instance['time']}</b>", self.styles['SubsectionHeader']))
            
            # Readability score
            score_text = f"Readability Score: {instance['score']:.0f}/100 (Lower = Harder to understand)"
            self.story.append(Paragraph(score_text, self.styles['BodyText']))
            
            # Complex words found
            words_text = f"Complex words: {', '.join(instance['words'])}"
            self.story.append(Paragraph(words_text, self.styles['BodyText']))
            
            # Context
            context = instance['context'][:150] + "..." if len(instance['context']) > 150 else instance['context']
            self.story.append(Paragraph(f'What you said: "{context}"', self.styles['BodyText']))
            self.story.append(Spacer(1, 0.1*inch))
        
        self.story.append(Spacer(1, 0.2*inch))
    
    def add_speech_rate_analysis(self, segments, duration):
        """Add detailed speech rate analysis per segment"""
        self.story.append(Paragraph("Speaking Pace Analysis", self.styles['SectionHeader']))
        
        # Analyze each segment
        pace_issues = []
        for seg in segments:
            text = seg.get('text', '').strip()
            start_time = seg.get('start', 0)
            end_time = seg.get('end', start_time + 1)
            segment_duration = end_time - start_time
            
            if len(text) > 0 and segment_duration > 0.5:
                words = len(text.split())
                wpm = (words / segment_duration) * 60
                
                minutes = int(start_time // 60)
                seconds = int(start_time % 60)
                time_str = f"{minutes}:{seconds:02d}"
                
                # Flag if too fast or too slow
                if wpm > 190 or wpm < 110:
                    issue_type = "Too Fast" if wpm > 190 else "Too Slow"
                    pace_issues.append({
                        'time': time_str,
                        'wpm': wpm,
                        'type': issue_type,
                        'text': text
                    })
        
        if not pace_issues:
            self.story.append(Paragraph(
                "Perfect! Your speaking pace is consistent and in the optimal range (140-160 words per minute).",
                self.styles['BodyText']
            ))
            self.story.append(Spacer(1, 0.2*inch))
            return
        
        # Summary
        summary = f"Found <b>{len(pace_issues)} section(s)</b> where your speaking pace needs adjustment:"
        self.story.append(Paragraph(summary, self.styles['BodyText']))
        self.story.append(Spacer(1, 0.15*inch))
        
        # List each issue
        for idx, issue in enumerate(pace_issues, 1):
            self.story.append(Paragraph(f"<b>{idx}. At {issue['time']} - {issue['type']}</b>", self.styles['SubsectionHeader']))
            
            # WPM
            wpm_text = f"Speaking at: {issue['wpm']:.0f} words/minute (Optimal: 140-160 wpm)"
            self.story.append(Paragraph(wpm_text, self.styles['BodyText']))
            
            # Explanation
            if issue['type'] == "Too Fast":
                explanation = "When you speak this fast, your audience can't keep up and will miss important points."
            else:
                explanation = "When you speak this slowly, people get bored and their minds start to wander."
            self.story.append(Paragraph(explanation, self.styles['BodyText']))
            
            # Context
            context = issue['text'][:100] + "..." if len(issue['text']) > 100 else issue['text']
            self.story.append(Paragraph(f'What you said: "{context}"', self.styles['BodyText']))
            self.story.append(Spacer(1, 0.1*inch))
        
        self.story.append(Spacer(1, 0.2*inch))
    
    def add_suggestions(self, suggestions):
        """Add actionable suggestions"""
        self.story.append(Paragraph("💡 How to Improve Your Speech", self.styles['SectionHeader']))
        
        if not suggestions:
            self.story.append(Paragraph("No specific suggestions at this time.", self.styles['BodyText']))
            return
        
        for idx, suggestion in enumerate(suggestions, 1):
            # Suggestion title
            title = suggestion.get('title', f'Suggestion {idx}')
            # Remove emoji from title for PDF
            title_clean = title.replace('🚨', '').replace('⚡', '').replace('🐌', '').replace('✅', '').replace('🚫', '').replace('⚠️', '').replace('👍', '').replace('🎤', '').replace('📚', '').replace('📖', '').replace('✓', '').replace('✂️', '').replace('🔋', '').replace('🌟', '').replace('📈', '').strip()
            
            self.story.append(Paragraph(f"<b>{idx}. {title_clean}</b>", self.styles['SubsectionHeader']))
            
            # Suggestion description
            description = suggestion.get('description', '')
            
            # Split by newlines to preserve formatting
            lines = description.split('\n')
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                    
                # Handle special formatting for lists or labels
                if line.startswith('🎯') or line.startswith('✅') or line.startswith('💡'):
                   self.story.append(Paragraph(f"<b>{line}</b>", self.styles['BodyText']))
                elif line.startswith('1.') or line.startswith('2.') or line.startswith('3.') or line.startswith('4.') or line.startswith('5.'):
                    # Indent numbered lists
                    style = ParagraphStyle('List', parent=self.styles['BodyText'], leftIndent=20)
                    self.story.append(Paragraph(line, style))
                elif line.startswith('•') or line.startswith('-') or line.startswith('✓'):
                     # Indent bullet lists
                    style = ParagraphStyle('Bullet', parent=self.styles['BodyText'], leftIndent=30)
                    self.story.append(Paragraph(line, style))
                else:
                    self.story.append(Paragraph(line, self.styles['BodyText']))
                    
            self.story.append(Spacer(1, 0.15*inch))
        
        self.story.append(Spacer(1, 0.2*inch))
    
    def add_summary_insights(self, summary):
        """Add summary insights"""
        self.story.append(Paragraph("📊 Summary Insights", self.styles['SectionHeader']))
        
        insights = summary.get('insights', {})
        
        # Create summary table
        table_data = [['Metric', 'Result', 'Assessment']]
        
        # Filler words
        filler_count = summary.get('filler_words', '0')
        filler_insight = insights.get('fillers', {})
        table_data.append([
            'Filler Words',
            filler_count,
            filler_insight.get('desc', 'N/A')
        ])
        
        # Jargon density
        jargon = summary.get('jargon_density', 'Unknown')
        jargon_insight = insights.get('jargon', {})
        table_data.append([
            'Language Complexity',
            jargon,
            jargon_insight.get('desc', 'N/A')
        ])
        
        # Duration
        duration_insight = insights.get('explanation', {})
        table_data.append([
            'Speech Duration',
            duration_insight.get('desc', 'N/A'),
            'Total length of your speech'
        ])
        
        # Energy
        energy_insight = insights.get('monotone', {})
        table_data.append([
            'Vocal Energy',
            energy_insight.get('title', 'N/A'),
            energy_insight.get('desc', 'N/A')
        ])
        
        # Create table
        table = Table(table_data, colWidths=[2*inch, 1.5*inch, 3*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#2563eb')),
            ('TEXTCOLOR', (0, 0), (-1, 0), white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), HexColor('#f3f4f6')),
            ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#d1d5db')),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        
        self.story.append(table)
        self.story.append(Spacer(1, 0.3*inch))
    
    def add_audience_analysis(self, audience_data):
        """Add audience-specific analysis section"""
        if not audience_data:
            return

        audience = audience_data.get('audience', 'General').capitalize()
        fit_score = audience_data.get('fit_score', 0)
        
        self.story.append(Paragraph(f"Target Audience: {audience}", self.styles['SectionHeader']))
        
        # Fit score with color
        score_color = '#16a34a' if fit_score >= 80 else '#d97706' if fit_score >= 60 else '#dc2626'
        score_text = f"<b>Fit Score:</b> <font color='{score_color}'>{fit_score}/100</font>"
        self.story.append(Paragraph(score_text, self.styles['BodyText']))
        self.story.append(Spacer(1, 0.15*inch))
        
        # Mismatches
        mismatches = audience_data.get('mismatches', [])
        if mismatches:
            self.story.append(Paragraph("<b>Mismatches Identified:</b>", self.styles['SubsectionHeader']))
            for mismatch in mismatches:
                self.story.append(Paragraph(f"• {mismatch}", self.styles['BodyText']))
            self.story.append(Spacer(1, 0.15*inch))
            
        # Specific Suggestions
        suggestions = audience_data.get('suggestions', [])
        if suggestions:
            self.story.append(Paragraph("<b>Audience-Specific Suggestions:</b>", self.styles['SubsectionHeader']))
            for suggestion in suggestions:
                self.story.append(Paragraph(f"• {suggestion}", self.styles['BodyText']))
            self.story.append(Spacer(1, 0.15*inch))
            
        # Structural Insights Table
        insights = audience_data.get('structural_insights', {})
        if insights:
            self.story.append(Paragraph("<b>Structural Insights:</b>", self.styles['SubsectionHeader']))
            
            table_data = [['Metric', 'Evaluation']]
            for key, value in insights.items():
                label = key.replace('_', ' ').capitalize()
                table_data.append([label, str(value)])
                
            table = Table(table_data, colWidths=[2.5*inch, 4*inch])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HexColor('#2563eb')),
                ('TEXTCOLOR', (0, 0), (-1, 0), white),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BACKGROUND', (0, 1), (-1, -1), HexColor('#f3f4f6')),
                ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#d1d5db')),
                ('FONTSIZE', (0, 1), (-1, -1), 10),
                ('TOPPADDING', (0, 1), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
            ]))
            self.story.append(table)
            
        self.story.append(Spacer(1, 0.3*inch))

    def generate(self):
        """Generate the PDF file"""
        self.doc.build(self.story)
        return self.output_path


def generate_detailed_report(analysis_result, filename, output_path):
    """
    Generate a detailed PDF report from analysis results
    
    Args:
        analysis_result: Dictionary containing analysis results
        filename: Original audio filename
        output_path: Path where PDF should be saved
    
    Returns:
        Path to generated PDF file
    """
    pdf = PDFReportGenerator(output_path)
    
    # Add header
    pdf.add_header(filename)
    
    # Add critical moment
    drop_risks = analysis_result.get('drop_risks', [])
    critical_moment = drop_risks[0] if drop_risks else None
    pdf.add_critical_moment(critical_moment)
    
    # Add detailed analyses
    summary = analysis_result.get('summary', {})
    
    # We need segments for detailed analysis - these should be stored in the job
    # For now, we'll work with what we have
    
    # Add suggestions
    suggestions = summary.get('suggestions', [])
    pdf.add_suggestions(suggestions)
    
    # Add summary insights
    pdf.add_summary_insights(summary)
    
    # Generate PDF
    return pdf.generate()

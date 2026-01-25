"""
Test PDF generation to debug the issue
"""

import sys
sys.path.insert(0, 'c:/Users/Surya Pranav/Downloads/speaking/attention-archaeologist-main/backend')

from pdf_generator import PDFReportGenerator

# Create a simple test PDF
pdf = PDFReportGenerator("test_report.pdf")

# Add header
pdf.add_header("test_audio.mp3")

# Add a simple critical moment
critical_moment = {
    "start": "1:23",
    "end": "1:33",
    "risk": "85%",
    "description": "You're speaking too fast. This is a test.",
    "segment_text": "This is a test transcript."
}

pdf.add_critical_moment(critical_moment)

# Generate
try:
    pdf.generate()
    print("✅ PDF generated successfully!")
    print("Check test_report.pdf")
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()

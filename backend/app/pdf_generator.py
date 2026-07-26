import io
import json
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def generate_report_pdf(structured_json: dict, filename: str = "Medical_Report_Summary.pdf") -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#1E3A8A"),
        alignment=0,
        spaceAfter=10
    )
    
    section_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#1E40AF"),
        spaceBefore=12,
        spaceAfter=6
    )
    
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#1F2937")
    )
    
    disclaimer_style = ParagraphStyle(
        'DisclaimerText',
        parent=styles['Italic'],
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#6B7280"),
        alignment=1,
        spaceBefore=15
    )

    story = []
    
    # Title Header
    story.append(Paragraph("MediAssist AI — Medical Report Summary", title_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#2563EB"), spaceAfter=15))
    
    # Patient Info & Overview
    p_name = structured_json.get("patient_name", "Patient")
    p_age = structured_json.get("patient_age", "N/A")
    p_gender = structured_json.get("patient_gender", "N/A")
    r_type = structured_json.get("report_type", "Medical Report")
    health_score = structured_json.get("health_score", "N/A")
    risk = structured_json.get("risk_level", "Low")

    info_data = [
        [Paragraph(f"<b>Patient Name:</b> {p_name}", body_style), Paragraph(f"<b>Age / Gender:</b> {p_age} / {p_gender}", body_style)],
        [Paragraph(f"<b>Report Type:</b> {r_type}", body_style), Paragraph(f"<b>Health Score:</b> {health_score}/100 ({risk} Risk)", body_style)]
    ]
    info_table = Table(info_data, colWidths=[270, 270])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F3F4F6")),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 10))

    # Diagnosis & Key Findings
    story.append(Paragraph("Diagnosis", section_style))
    story.append(Paragraph(structured_json.get("diagnosis", "N/A"), body_style))
    
    story.append(Paragraph("Key Findings", section_style))
    story.append(Paragraph(structured_json.get("key_findings", "N/A"), body_style))

    # Parameters Table
    params = structured_json.get("parameters", [])
    if params:
        story.append(Paragraph("Structured Parameters", section_style))
        param_table_data = [["Parameter Name", "Value", "Unit", "Ref Range", "Status"]]
        for p in params:
            status_text = p.get("status", "Normal")
            color_hex = "#DC2626" if status_text.lower() == "abnormal" else "#16A34A"
            param_table_data.append([
                Paragraph(str(p.get("name", "")), body_style),
                Paragraph(str(p.get("value", "")), body_style),
                Paragraph(str(p.get("unit", "")), body_style),
                Paragraph(str(p.get("reference_range", "")), body_style),
                Paragraph(f"<font color='{color_hex}'><b>{status_text}</b></font>", body_style)
            ])
        p_table = Table(param_table_data, colWidths=[150, 80, 70, 140, 100])
        p_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#E5E7EB")),
            ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor("#1F2937")),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#D1D5DB")),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(p_table)

    # Doctor Recommendations & Layperson Explanation
    story.append(Paragraph("Doctor Recommendations", section_style))
    story.append(Paragraph(structured_json.get("recommendations", "N/A"), body_style))

    story.append(Paragraph("Simple Explanation", section_style))
    story.append(Paragraph(structured_json.get("simple_explanation", "N/A"), body_style))

    # Questions & Suggested Tests
    s_tests = structured_json.get("suggested_tests", [])
    if s_tests:
        story.append(Paragraph("Suggested Follow-up Tests", section_style))
        for t in s_tests:
            story.append(Paragraph(f"• {t}", body_style))

    q_doc = structured_json.get("questions_for_doctor", [])
    if q_doc:
        story.append(Paragraph("Questions to Ask Your Doctor", section_style))
        for q in q_doc:
            story.append(Paragraph(f"• {q}", body_style))

    # Medical Disclaimer
    story.append(Spacer(1, 15))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#9CA3AF")))
    story.append(Paragraph("MediAssist AI provides educational information only and is not a substitute for professional medical advice. Always consult a qualified doctor.", disclaimer_style))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes

import io
import sys
import json
import time
import requests
from reportlab.platypus import SimpleDocTemplate, Paragraph
from reportlab.lib.styles import getSampleStyleSheet

BASE_URL = "http://127.0.0.1:8080"

def log(msg, status="INFO"):
    print(f"[{status}] {msg}")

def create_sample_pdf_bytes():
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer)
    styles = getSampleStyleSheet()
    story = [
        Paragraph("COMPLETE BLOOD COUNT (CBC) LAB REPORT", styles['Heading1']),
        Paragraph("Patient Name: John Doe | Age: 42 | Gender: Male", styles['Normal']),
        Paragraph("Hemoglobin: 11.2 g/dL (Low, Ref: 13.5-17.5 g/dL)", styles['Normal']),
        Paragraph("White Blood Cell (WBC): 6.8 x10^3 / uL (Normal, Ref: 4.5-11.0)", styles['Normal']),
        Paragraph("Platelet Count: 250 x10^3 / uL (Normal, Ref: 150-450)", styles['Normal']),
        Paragraph("Diagnosis: Mild Iron Deficiency Anemia", styles['Normal']),
        Paragraph("Recommendations: Increase dietary iron intake or take iron supplements under supervision.", styles['Normal'])
    ]
    doc.build(story)
    pdf_data = buffer.getvalue()
    buffer.close()
    return pdf_data

def run_smoke_test():
    log("Starting MediAssist AI Smoke Test Suite...", "START")
    session = requests.Session()

    # 1. Register / Login
    email = f"testuser_{int(time.time())}@example.com"
    pwd = "TestPassword123!"
    log(f"1. Registering user {email}...")
    res = session.post(f"{BASE_URL}/api/auth/register", json={
        "email": email,
        "name": "Test User",
        "password": pwd
    })
    assert res.status_code == 200, f"Register failed: {res.text}"

    log("2. Logging in...")
    res = session.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": pwd})
    assert res.status_code == 200, f"Login failed: {res.text}"
    token = res.json()["access_token"]
    session.headers.update({"Authorization": f"Bearer {token}"})
    log("User authenticated successfully.")

    # 3. Upload Sample PDF
    log("3. Uploading sample PDF medical report...")
    pdf_bytes = create_sample_pdf_bytes()
    files = {"file": ("sample_cbc_report.pdf", pdf_bytes, "application/pdf")}
    res = session.post(f"{BASE_URL}/api/reports/upload", files=files)
    assert res.status_code == 200, f"Upload report failed: {res.text}"
    report_data = res.json()
    report_id = report_data["id"]
    log(f"Report uploaded successfully! Report ID: {report_id}, Type: {report_data['report_type']}")

    # 4. Fetch Report Details & List
    log("4. Fetching user reports list and detail...")
    res = session.get(f"{BASE_URL}/api/reports")
    assert res.status_code == 200 and len(res.json()) >= 1, "Get reports list failed"
    
    res = session.get(f"{BASE_URL}/api/reports/{report_id}")
    assert res.status_code == 200, f"Get report detail failed: {res.text}"

    # 5. Translation
    log("5. Testing translation endpoint (Hindi)...")
    res = session.post(f"{BASE_URL}/api/reports/{report_id}/translate", json={"language": "hindi"})
    assert res.status_code == 200, f"Translation failed: {res.text}"
    translated = res.json()
    assert "translated_json" in translated, "Missing translated_json in response"
    log("Translation endpoint returned valid data.")

    # 6. TTS Endpoint
    log("6. Testing Text-to-Speech (TTS) audio endpoint...")
    res = session.post(f"{BASE_URL}/api/reports/{report_id}/tts", json={"text": "Your report shows mild anemia.", "language": "english"})
    assert res.status_code == 200 and len(res.content) > 0, "TTS failed or empty response"
    log(f"TTS endpoint returned {len(res.content)} bytes of audio data.")

    # 7. RAG Chat Endpoint
    log("7. Testing RAG Chat endpoint...")
    res = session.post(f"{BASE_URL}/api/reports/{report_id}/chat", json={"message": "What should I eat to improve my hemoglobin?"})
    assert res.status_code == 200, f"Chat failed: {res.text}"
    chat_out = res.json()
    assert "content" in chat_out and len(chat_out["content"]) > 0, "Empty chat response"
    log("RAG Chat answer received: " + chat_out["content"][:80] + "...")

    # 8. Voice Chat Endpoint
    log("8. Testing Voice Chat endpoint with audio upload...")
    dummy_wav = b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xAC\x00\x00\x88\x58\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00"
    v_files = {"file": ("voice_input.wav", dummy_wav, "audio/wav")}
    res = session.post(f"{BASE_URL}/api/reports/{report_id}/voice-chat", files=v_files)
    assert res.status_code == 200, f"Voice chat failed: {res.text}"
    vc_out = res.json()
    assert "user_transcript" in vc_out and "ai_response" in vc_out, "Voice chat response structure missing"
    log("Voice chat successfully processed audio transcription & answer.")

    # 9. Health Insights
    log("9. Testing Health Insights endpoint...")
    res = session.get(f"{BASE_URL}/api/reports/{report_id}/insights")
    assert res.status_code == 200, f"Insights failed: {res.text}"
    insights = res.json()
    log(f"Health score: {insights['health_score']}, Risk level: {insights['risk_level']}")

    # 10. Downloads (PDF, Audio, JSON)
    log("10. Testing Downloads (PDF, Audio, JSON)...")
    pdf_res = session.get(f"{BASE_URL}/api/reports/{report_id}/download/pdf")
    assert pdf_res.status_code == 200 and len(pdf_res.content) > 100, "PDF download failed"

    audio_res = session.get(f"{BASE_URL}/api/reports/{report_id}/download/audio")
    assert audio_res.status_code == 200 and len(audio_res.content) > 0, "Audio download failed"

    json_res = session.get(f"{BASE_URL}/api/reports/{report_id}/download/json")
    assert json_res.status_code == 200 and len(json_res.content) > 0, "JSON download failed"

    log("ALL SMOKE TESTS PASSED SUCCESSFULLY! (100% End-to-End Verification)", "SUCCESS")

if __name__ == "__main__":
    try:
        run_smoke_test()
    except Exception as e:
        log(f"SMOKE TEST FAILED: {e}", "FAIL")
        sys.exit(1)

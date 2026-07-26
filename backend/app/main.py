import os
import io
import json
import base64
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session

from .database import engine, Base, get_db
from .models import User, Report, Translation, ChatMessage, Insight
from .schemas import (
    UserCreate, UserLogin, UserOut, Token, ReportOut,
    TranslationRequest, TranslationResponse, TTSRequest,
    ChatMessageCreate, ChatMessageOut, InsightOut
)
from .auth import get_password_hash, verify_password, create_access_token, get_current_user
from .parser import extract_pdf_text, parse_report_to_json
from .translator import translate_report
from .rag import index_report_document, query_report_rag
from .llm_client import generate_tts_audio, transcribe_audio_whisper, generate_chat_llm, DISCLAIMER
from .pdf_generator import generate_report_pdf

# Initialize Database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MediAssist AI",
    description="Multilingual Medical Report Summarizer & Voice Health Assistant",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth Endpoints
@app.post("/api/auth/register", response_model=UserOut)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered"
        )
    hashed_pwd = get_password_hash(user_in.password)
    new_user = User(
        email=user_in.email,
        name=user_in.name,
        hashed_password=hashed_pwd
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/api/auth/login", response_model=Token)
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user_in.email).first()
    if not db_user or not verify_password(user_in.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": db_user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/auth/demo-login", response_model=Token)
def demo_login(db: Session = Depends(get_db)):
    demo_email = "demo@mediassist.ai"
    db_user = db.query(User).filter(User.email == demo_email).first()
    if not db_user:
        hashed_pwd = get_password_hash("demo1234")
        db_user = User(
            email=demo_email,
            name="Demo Patient",
            hashed_password=hashed_pwd
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)

    access_token = create_access_token(data={"sub": db_user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=UserOut)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

# Report Processing Endpoints
@app.post("/api/reports/upload", response_model=ReportOut)
async def upload_report(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF reports are supported at this time."
        )
    
    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    temp_file_path = os.path.join(temp_dir, file.filename)
    
    try:
        content = await file.read()
        with open(temp_file_path, "wb") as f:
            f.write(content)
            
        raw_text = extract_pdf_text(temp_file_path)
        if not raw_text.strip():
            raw_text = f"Medical Report Document for {file.filename}"
            
        structured_report = parse_report_to_json(raw_text, file.filename)
        summary_en = structured_report.get("simple_explanation") or structured_report.get("key_findings")
        
        new_report = Report(
            user_id=current_user.id,
            filename=file.filename,
            report_type=structured_report.get("report_type", "General Health Report"),
            raw_text=raw_text,
            structured_json=json.dumps(structured_report),
            summary_en=summary_en
        )
        db.add(new_report)
        db.commit()
        db.refresh(new_report)
        
        # Save initial Insights
        params = structured_report.get("parameters", [])
        normal_vals = [p for p in params if p.get("status") != "Abnormal"]
        abnormal_vals = [p for p in params if p.get("status") == "Abnormal"]
        
        insight = Insight(
            report_id=new_report.id,
            health_score=structured_report.get("health_score", 80),
            risk_level=structured_report.get("risk_level", "Low"),
            normal_values_json=json.dumps(normal_vals),
            abnormal_values_json=json.dumps(abnormal_vals),
            followup_tests_json=json.dumps(structured_report.get("suggested_tests", [])),
            doctor_questions_json=json.dumps(structured_report.get("questions_for_doctor", []))
        )
        db.add(insight)
        db.commit()

        # Index report document for RAG search
        index_report_document(new_report.id, raw_text, structured_report)
        
        return ReportOut(
            id=new_report.id,
            filename=new_report.filename,
            report_type=new_report.report_type,
            structured_json=structured_report,
            summary_en=new_report.summary_en,
            created_at=new_report.created_at
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing medical report: {str(e)}"
        )
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

@app.get("/api/reports", response_model=List[ReportOut])
def get_reports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    reports = db.query(Report).filter(Report.user_id == current_user.id).order_by(Report.created_at.desc()).all()
    out = []
    for r in reports:
        out.append(ReportOut(
            id=r.id,
            filename=r.filename,
            report_type=r.report_type,
            structured_json=json.loads(r.structured_json),
            summary_en=r.summary_en,
            created_at=r.created_at
        ))
    return out

@app.get("/api/reports/{report_id}", response_model=ReportOut)
def get_report_detail(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    report = db.query(Report).filter(Report.id == report_id, Report.user_id == current_user.id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    return ReportOut(
        id=report.id,
        filename=report.filename,
        report_type=report.report_type,
        structured_json=json.loads(report.structured_json),
        summary_en=report.summary_en,
        created_at=report.created_at
    )

# Translation Endpoint (with DB caching)
@app.post("/api/reports/{report_id}/translate", response_model=TranslationResponse)
def translate_report_endpoint(
    report_id: int,
    req: TranslationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    report = db.query(Report).filter(Report.id == report_id, Report.user_id == current_user.id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    lang = req.language.lower()
    if lang == "english" or lang == "en":
        return TranslationResponse(language=req.language, translated_json=json.loads(report.structured_json))

    # Check cached translation
    cached = db.query(Translation).filter(Translation.report_id == report_id, Translation.language == lang).first()
    if cached:
        return TranslationResponse(language=req.language, translated_json=json.loads(cached.translated_summary_json))

    structured_data = json.loads(report.structured_json)
    translated_data = translate_report(structured_data, req.language)
    
    # Store translation in DB
    new_trans = Translation(
        report_id=report_id,
        language=lang,
        translated_summary_json=json.dumps(translated_data)
    )
    db.add(new_trans)
    db.commit()

    return TranslationResponse(
        language=req.language,
        translated_json=translated_data
    )

# TTS Voice Assistant Endpoint
@app.post("/api/reports/{report_id}/tts")
def report_tts_endpoint(
    report_id: int,
    req: TTSRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    report = db.query(Report).filter(Report.id == report_id, Report.user_id == current_user.id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    audio_bytes = generate_tts_audio(req.text)
    if audio_bytes:
        return Response(content=audio_bytes, media_type="audio/mpeg")
    
    # Generate simple sine wave tone audio payload if TTS key not configured
    sample_rate = 22050
    duration = 2
    import math, struct
    num_samples = sample_rate * duration
    raw_wav = bytearray()
    raw_wav.extend(b'RIFF')
    raw_wav.extend((36 + num_samples * 2).to_bytes(4, 'little'))
    raw_wav.extend(b'WAVEfmt ')
    raw_wav.extend((16).to_bytes(4, 'little'))
    raw_wav.extend((1).to_bytes(2, 'little'))
    raw_wav.extend((1).to_bytes(2, 'little'))
    raw_wav.extend((sample_rate).to_bytes(4, 'little'))
    raw_wav.extend((sample_rate * 2).to_bytes(4, 'little'))
    raw_wav.extend((2).to_bytes(2, 'little'))
    raw_wav.extend((16).to_bytes(2, 'little'))
    raw_wav.extend(b'data')
    raw_wav.extend((num_samples * 2).to_bytes(4, 'little'))
    for i in range(num_samples):
        sample = int(32767.0 * 0.3 * math.sin(2.0 * math.pi * 440.0 * i / sample_rate))
        raw_wav.extend(struct.pack('<h', sample))
    return Response(content=bytes(raw_wav), media_type="audio/wav")

# RAG Chat Endpoint
@app.get("/api/reports/{report_id}/chat/history", response_model=List[ChatMessageOut])
def get_chat_history(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    report = db.query(Report).filter(Report.id == report_id, Report.user_id == current_user.id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    messages = db.query(ChatMessage).filter(ChatMessage.report_id == report_id).order_by(ChatMessage.created_at.asc()).all()
    return messages

@app.post("/api/reports/{report_id}/chat", response_model=ChatMessageOut)
def send_chat_message(
    report_id: int,
    chat_in: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    report = db.query(Report).filter(Report.id == report_id, Report.user_id == current_user.id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    user_msg = ChatMessage(
        report_id=report_id,
        role="user",
        content=chat_in.message
    )
    db.add(user_msg)
    
    past_msgs = db.query(ChatMessage).filter(ChatMessage.report_id == report_id).order_by(ChatMessage.created_at.asc()).all()
    history = [{"role": m.role, "content": m.content} for m in past_msgs]
    
    report_json = json.loads(report.structured_json)
    ai_response_text = query_report_rag(report_id, report_json, report.raw_text, history, chat_in.message)
    
    ai_msg = ChatMessage(
        report_id=report_id,
        role="assistant",
        content=ai_response_text
    )
    db.add(ai_msg)
    db.commit()
    db.refresh(ai_msg)
    
    return ai_msg

# Voice Chat Endpoint
@app.post("/api/reports/{report_id}/voice-chat")
async def voice_chat_endpoint(
    report_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    report = db.query(Report).filter(Report.id == report_id, Report.user_id == current_user.id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    audio_content = await file.read()
    transcription = transcribe_audio_whisper(audio_content, file.filename)
    
    user_msg = ChatMessage(report_id=report_id, role="user", content=transcription)
    db.add(user_msg)
    
    past_msgs = db.query(ChatMessage).filter(ChatMessage.report_id == report_id).order_by(ChatMessage.created_at.asc()).all()
    history = [{"role": m.role, "content": m.content} for m in past_msgs]
    
    report_json = json.loads(report.structured_json)
    ai_response_text = query_report_rag(report_id, report_json, report.raw_text, history, transcription)
    
    ai_msg = ChatMessage(report_id=report_id, role="assistant", content=ai_response_text)
    db.add(ai_msg)
    db.commit()
    db.refresh(ai_msg)

    # Generate TTS audio for AI reply
    reply_audio_bytes = generate_tts_audio(ai_response_text)
    reply_audio_b64 = base64.b64encode(reply_audio_bytes).decode('utf-8') if reply_audio_bytes else None

    return {
        "user_transcript": transcription,
        "ai_response": ai_response_text,
        "audio_base64": reply_audio_b64
    }

# Insights Endpoint
@app.get("/api/reports/{report_id}/insights", response_model=InsightOut)
def get_report_insights(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    report = db.query(Report).filter(Report.id == report_id, Report.user_id == current_user.id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    insight = db.query(Insight).filter(Insight.report_id == report_id).first()
    structured = json.loads(report.structured_json)
    params = structured.get("parameters", [])
    
    if not insight:
        normal_vals = [p for p in params if p.get("status") != "Abnormal"]
        abnormal_vals = [p for p in params if p.get("status") == "Abnormal"]
        insight = Insight(
            report_id=report_id,
            health_score=structured.get("health_score", 85),
            risk_level=structured.get("risk_level", "Low"),
            normal_values_json=json.dumps(normal_vals),
            abnormal_values_json=json.dumps(abnormal_vals),
            followup_tests_json=json.dumps(structured.get("suggested_tests", [])),
            doctor_questions_json=json.dumps(structured.get("questions_for_doctor", []))
        )
        db.add(insight)
        db.commit()
        db.refresh(insight)

    return InsightOut(
        health_score=insight.health_score,
        risk_level=insight.risk_level,
        normal_values=json.loads(insight.normal_values_json or "[]"),
        abnormal_values=json.loads(insight.abnormal_values_json or "[]"),
        followup_tests=json.loads(insight.followup_tests_json or "[]"),
        doctor_questions=json.loads(insight.doctor_questions_json or "[]")
    )

# Downloads Endpoints
@app.get("/api/reports/{report_id}/download/pdf")
def download_pdf(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    report = db.query(Report).filter(Report.id == report_id, Report.user_id == current_user.id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    structured = json.loads(report.structured_json)
    pdf_bytes = generate_report_pdf(structured, report.filename)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={os.path.splitext(report.filename)[0]}_summary.pdf"}
    )

@app.get("/api/reports/{report_id}/download/audio")
def download_audio(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    report = db.query(Report).filter(Report.id == report_id, Report.user_id == current_user.id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    structured = json.loads(report.structured_json)
    summary_text = structured.get("simple_explanation") or structured.get("key_findings", "")
    audio_bytes = generate_tts_audio(summary_text)
    if not audio_bytes:
        audio_bytes = b"RIFF....WAVEfmt ...."
        
    return Response(
        content=audio_bytes,
        media_type="audio/mpeg",
        headers={"Content-Disposition": f"attachment; filename={os.path.splitext(report.filename)[0]}_audio.mp3"}
    )

@app.get("/api/reports/{report_id}/download/json")
def download_json(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    report = db.query(Report).filter(Report.id == report_id, Report.user_id == current_user.id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    return Response(
        content=report.structured_json,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={os.path.splitext(report.filename)[0]}_structured.json"}
    )

# Static file serving for React frontend single-URL delivery
static_dist = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
if os.path.exists(static_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(static_dist, "assets")), name="static_assets")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
        target_file = os.path.join(static_dist, full_path)
        if os.path.exists(target_file) and os.path.isfile(target_file):
            return FileResponse(target_file)
        return FileResponse(os.path.join(static_dist, "index.html"))

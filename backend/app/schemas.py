from pydantic import BaseModel, EmailStr
from typing import List, Optional, Any, Dict
from datetime import datetime

# User Schemas
class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    email: str
    name: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

# Medical Findings Schemas
class ParameterItem(BaseModel):
    name: str
    value: Any
    unit: Optional[str] = ""
    reference_range: Optional[str] = ""
    status: str  # "Normal" or "Abnormal"

class StructuredReportSchema(BaseModel):
    patient_name: Optional[str] = "Patient"
    patient_age: Optional[int] = 30
    patient_gender: Optional[str] = "Unknown"
    report_type: str
    diagnosis: str
    health_score: int
    risk_level: str  # "Low", "Moderate", "High", "Critical"
    key_findings: str
    parameters: List[ParameterItem] = []
    recommendations: str
    simple_explanation: str
    suggested_tests: List[str] = []
    questions_for_doctor: List[str] = []

# Report Schemas
class ReportOut(BaseModel):
    id: int
    filename: str
    report_type: str
    structured_json: Dict[str, Any]
    summary_en: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Translation Schemas
class TranslationRequest(BaseModel):
    language: str

class TranslationResponse(BaseModel):
    language: str
    translated_json: Dict[str, Any]

# Speech / TTS Schemas
class TTSRequest(BaseModel):
    text: str
    language: Optional[str] = "english"

# Chat Schemas
class ChatMessageCreate(BaseModel):
    message: str

class ChatMessageOut(BaseModel):
    id: int
    report_id: int
    role: str  # 'user' or 'assistant'
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

# Insight Schemas
class InsightOut(BaseModel):
    health_score: int
    risk_level: str
    normal_values: List[Dict[str, Any]] = []
    abnormal_values: List[Dict[str, Any]] = []
    followup_tests: List[str] = []
    doctor_questions: List[str] = []

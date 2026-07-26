import datetime
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    reports = relationship("Report", back_populates="user", cascade="all, delete-orphan")

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)
    report_type = Column(String, nullable=False)
    raw_text = Column(Text, nullable=False)
    structured_json = Column(Text, nullable=False)  # JSON representation stored as string
    summary_en = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="reports")
    chat_messages = relationship("ChatMessage", back_populates="report", cascade="all, delete-orphan")
    translations = relationship("Translation", back_populates="report", cascade="all, delete-orphan")
    insights = relationship("Insight", back_populates="report", uselist=False, cascade="all, delete-orphan")

class Translation(Base):
    __tablename__ = "translations"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False)
    language = Column(String, nullable=False)
    translated_summary_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    report = relationship("Report", back_populates="translations")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False)
    role = Column(String, nullable=False)  # 'user' or 'assistant' / 'ai'
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    report = relationship("Report", back_populates="chat_messages")

class Insight(Base):
    __tablename__ = "insights"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False, unique=True)
    health_score = Column(Integer, nullable=False, default=80)
    risk_level = Column(String, nullable=False, default="Low")
    normal_values_json = Column(Text, nullable=True)
    abnormal_values_json = Column(Text, nullable=True)
    followup_tests_json = Column(Text, nullable=True)
    doctor_questions_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    report = relationship("Report", back_populates="insights")

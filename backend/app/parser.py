import fitz  # PyMuPDF
import re
import logging
from typing import Dict, Any
from .llm_client import parse_medical_report_llm

logger = logging.getLogger("mediassist.parser")

def clean_extracted_text(text: str) -> str:
    """Strips excessive whitespace, OCR artifacts, and noise."""
    if not text:
        return ""
    # Normalize line breaks and multiple spaces
    text = re.sub(r'\r\n|\r', '\n', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'[ \t]{2,}', ' ', text)
    return text.strip()

def extract_pdf_text(file_path: str) -> str:
    """Extracts raw text content from a PDF file using PyMuPDF."""
    text = ""
    try:
        doc = fitz.open(file_path)
        for page in doc:
            page_text = page.get_text("text")
            if page_text:
                text += page_text + "\n"
        doc.close()
    except Exception as e:
        logger.error(f"PyMuPDF extraction failed for {file_path}: {e}")
        # Try fallback pypdf if available
        try:
            from pypdf import PdfReader
            reader = PdfReader(file_path)
            for page in reader.pages:
                t = page.extract_text()
                if t:
                    text += t + "\n"
        except Exception as ex:
            logger.error(f"pypdf fallback extraction failed: {ex}")

    return clean_extracted_text(text)

def parse_report_to_json(raw_text: str, filename: str) -> Dict[str, Any]:
    """Parses raw extracted text into structured JSON findings."""
    cleaned_text = clean_extracted_text(raw_text)
    if not cleaned_text:
        cleaned_text = f"Medical Report Document: {filename}"
        
    return parse_medical_report_llm(cleaned_text, filename)

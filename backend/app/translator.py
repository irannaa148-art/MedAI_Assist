from deep_translator import GoogleTranslator
import copy
import logging

logger = logging.getLogger("mediassist.translator")

LANGUAGE_MAP = {
    "english": "en",
    "hindi": "hi",
    "kannada": "kn",
    "tamil": "ta",
    "telugu": "te",
    "malayalam": "ml",
    "marathi": "mr",
    "bengali": "bn"
}

def translate_text(text: str, target_lang: str) -> str:
    """Translates a string block to the target language."""
    if not text or not text.strip():
        return text
    lang_code = LANGUAGE_MAP.get(target_lang.lower(), target_lang.lower())
    if lang_code == "en" or target_lang.lower() == "english":
        return text
    
    try:
        translated = GoogleTranslator(source='auto', target=lang_code).translate(text)
        return translated
    except Exception as e:
        logger.warning(f"GoogleTranslator error for '{target_lang}': {e}")
        return text

def translate_report(report_dict: dict, target_lang: str) -> dict:
    """Translates all text fields in a structured JSON report."""
    lang_code = LANGUAGE_MAP.get(target_lang.lower(), target_lang.lower())
    if lang_code == "en" or target_lang.lower() == "english":
        return report_dict
    
    translated_report = copy.deepcopy(report_dict)
    
    for field in ["diagnosis", "key_findings", "recommendations", "simple_explanation", "report_type"]:
        if field in translated_report and isinstance(translated_report[field], str):
            translated_report[field] = translate_text(translated_report[field], target_lang)
            
    if "parameters" in translated_report and isinstance(translated_report["parameters"], list):
        for param in translated_report["parameters"]:
            if "name" in param and isinstance(param["name"], str):
                param["name"] = translate_text(param["name"], target_lang)
            if "status" in param and isinstance(param["status"], str):
                param["status"] = translate_text(param["status"], target_lang)
                
    for list_field in ["suggested_tests", "questions_for_doctor"]:
        if list_field in translated_report and isinstance(translated_report[list_field], list):
            translated_report[list_field] = [
                translate_text(item, target_lang) if isinstance(item, str) else item
                for item in translated_report[list_field]
            ]
            
    return translated_report

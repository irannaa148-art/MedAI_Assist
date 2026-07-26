import os
import json
import logging
from typing import List, Dict, Any
from .llm_client import generate_chat_llm

logger = logging.getLogger("mediassist.rag")

# In-memory vector chunk storage fallback for lightweight RAG per report
_REPORT_CHUNKS: Dict[int, List[str]] = {}

def index_report_document(report_id: int, raw_text: str, structured_json: Dict[str, Any]):
    """Chunks and indexes the report for RAG querying."""
    chunks = []
    
    # Add structured summary fields as high-priority chunks
    chunks.append(f"Report Type: {structured_json.get('report_type')}. Diagnosis: {structured_json.get('diagnosis')}.")
    chunks.append(f"Key Findings: {structured_json.get('key_findings')}")
    chunks.append(f"Doctor Recommendations: {structured_json.get('recommendations')}")
    chunks.append(f"Simple Explanation: {structured_json.get('simple_explanation')}")
    
    params = structured_json.get("parameters", [])
    if params:
        param_strs = [f"{p.get('name')}: {p.get('value')} {p.get('unit')} (Range: {p.get('reference_range')}, Status: {p.get('status')})" for p in params]
        chunks.append("Parameters: " + "; ".join(param_strs))
        
    # Split raw text into chunks of ~500 chars
    lines = [line.strip() for line in raw_text.split('\n') if line.strip()]
    current_chunk = ""
    for line in lines:
        if len(current_chunk) + len(line) < 500:
            current_chunk += " " + line
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = line
    if current_chunk:
        chunks.append(current_chunk.strip())

    # Try ChromaDB indexing if available
    try:
        import chromadb
        chroma_client = chromadb.Client()
        collection_name = f"report_{report_id}"
        try:
            chroma_client.delete_collection(collection_name)
        except Exception:
            pass
        collection = chroma_client.create_collection(collection_name)
        ids = [f"chunk_{i}" for i in range(len(chunks))]
        collection.add(documents=chunks, ids=ids)
        logger.info(f"Indexed {len(chunks)} chunks in ChromaDB collection {collection_name}")
    except Exception as e:
        logger.info(f"Using in-memory fallback RAG store: {e}")

    _REPORT_CHUNKS[report_id] = chunks

def query_report_rag(report_id: int, structured_json: Dict[str, Any], raw_text: str, history: List[dict], user_question: str) -> str:
    """Queries RAG index or chunk store and generates LLM answer."""
    relevant_chunks = []
    
    # Try ChromaDB retrieval
    try:
        import chromadb
        chroma_client = chromadb.Client()
        collection_name = f"report_{report_id}"
        collection = chroma_client.get_collection(collection_name)
        results = collection.query(query_texts=[user_question], n_results=3)
        if results and "documents" in results and results["documents"]:
            relevant_chunks = results["documents"][0]
    except Exception as e:
        logger.info(f"ChromaDB retrieval fallback to keyword matching: {e}")

    if not relevant_chunks:
        all_chunks = _REPORT_CHUNKS.get(report_id, [])
        if not all_chunks:
            index_report_document(report_id, raw_text, structured_json)
            all_chunks = _REPORT_CHUNKS.get(report_id, [])
            
        q_words = set(user_question.lower().split())
        scored_chunks = []
        for chunk in all_chunks:
            c_words = set(chunk.lower().split())
            score = len(q_words.intersection(c_words))
            scored_chunks.append((score, chunk))
        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        relevant_chunks = [c[1] for c in scored_chunks[:3]]

    return generate_chat_llm(structured_json, relevant_chunks, history, user_question)

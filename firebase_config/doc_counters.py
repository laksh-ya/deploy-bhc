from firebase_config.config import db
from google.cloud import firestore
from typing import Dict, Optional, List
from llama_index.core import Document

# --- Business Logic Accessors ---

def get_all_doc_counters() -> list:
    docs = db.collection("doc_counters").stream()
    return [doc.to_dict() | {"id": doc.id} for doc in docs]
def get_monthly_summary(month: str) -> Dict:
    """
    Fetches the doc counter summary for a specific month.
    :param month: Format 'YYYY-MM' (e.g., '2025-06')
    """
    doc = db.collection("doc_counters").document(month).get()
    return doc.to_dict() if doc.exists else {}

def get_overall_stats() -> Dict:
    """
    Returns total stats from doc_counters like total_clients, total_sales, etc.
    """
    overall_doc = db.collection("doc_counters").document("orders").get()
    return overall_doc.to_dict() if overall_doc.exists else {}

# Optional helper
def get_counter_by_section(section: str) -> Dict:
    """
    Fetch counters from a subcategory like 'clients', 'suppliers', etc.
    """
    doc = db.collection("doc_counters").document(section).get()
    return doc.to_dict() if doc.exists else {}

# --- Semantic Search Index Builder ---

def build_doc_counter_documents() -> list[Document]:
    """
    Builds a list of Document objects from the doc_counters collection.
    """
    documents = []
    docs = db.collection("doc_counters").stream()

    for doc in docs:
        data = doc.to_dict()
        if not data:
            continue

        text = f"Document ID: {doc.id}\n"
        for key, value in data.items():
            text += f"{key}: {value}\n"

        documents.append(Document(
            text=text.strip(),
            doc_id=doc.id,
            metadata={"doc_id": doc.id}
        ))

    return documents

import os
from llama_index.core import Document, Settings
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from firebase_config.llama_index_configs import global_settings 
from firebase_config.employess import get_all_employees  # you must create this function
from .employee_index import build_employees_index  # you must create this builder

# Set embedding model globally
Settings.embed_model = HuggingFaceEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")

def build_employee_documents():
    employees = get_all_employees()
    docs = []
    for emp in employees:
        text = f"""
        Name: {emp.get("name")}
        Employee ID: {emp.get("id")}
        Collected : {emp.get("collected", 0)}
        Paid: {emp.get("paid", 0)}
        Phone: {emp.get('phone')}
        """
        docs.append(Document(text=text.strip()))
    return docs

if __name__ == "__main__":
    docs = build_employee_documents()
    if not docs:
        print("❌ No employees found. Index not built.")
    else:
        build_employees_index(docs)
        print("✅ Employees index built and saved.")

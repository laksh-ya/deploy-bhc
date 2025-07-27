import os
from llama_index.core import Document, Settings
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from firebase_config.llama_index_configs import global_settings

from firebase_config.suppliers import get_all_suppliers
from .supplier_index import build_suppliers_index

# Set embedding model globally
Settings.embed_model = HuggingFaceEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")

def build_supplier_documents():
    suppliers = get_all_suppliers()
    docs = []
    for supplier in suppliers:
        text = f"""
        Supplier ID: {supplier.get("id")}
        Name: {supplier.get("name")}
        Contact: {supplier.get("contact")}
        Address: {supplier.get("address")}
        Due Amount: ₹{supplier.get("due")}
        """
        docs.append(Document(text=text.strip()))
    return docs

if __name__ == "__main__":
    docs = build_supplier_documents()
    if not docs:
        print("❌ No suppliers found. Index not built.")
    else:
        build_suppliers_index(docs)
        print("✅ Supplier index built and saved.")

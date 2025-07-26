import os
from llama_index.core import Document, Settings
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from firebase_config.llama_index_configs import global_settings 
from firebase_config.clients import get_all_clients
from .client_index import build_clients_index

# Set embedding model globally
Settings.embed_model = HuggingFaceEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")

def build_client_documents():
    clients = get_all_clients()
    docs = []
    for client in clients:
        text = f"""
        Name: {client.get("name")}
        Client ID: {client.get("id")}
        PAN: {client.get("pan", "N/A")}
        GST: {client.get("gst", "N/A")}
        Point of Contact Name: {client.get("poc_name", "")}
        Point of Contact Contact: {client.get("poc_contact", "")}
        Due Amount: ₹{client.get("due_amount", 0)}
        Address: {client.get("address", "")}
        """
        docs.append(Document(text=text.strip()))
    return docs

if __name__ == "__main__":
    docs = build_client_documents()
    if not docs:
        print("❌ No clients found. Index not built.")
    else:
        build_clients_index(docs)
        print("✅ Clients index built and saved.")

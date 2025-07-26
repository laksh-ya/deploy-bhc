# llama_index_configs/build_doc_counter_documents.py

from llama_index.core import Document, Settings
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from firebase_config.doc_counters import get_all_doc_counters
from .doc_counter_index import build_doc_counter_index

Settings.embed_model = HuggingFaceEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")

def build_doc_counter_documents():
    counters = get_all_doc_counters()
    docs = []

    for doc in counters:
        month = doc.get("month") or "overall"
        text = f"""
        Month: {month}
        Sales Orders: {doc.get("sales_orders_count", 0)} worth ₹{doc.get("sales_orders_amount", 0)}
        Purchase Orders: {doc.get("purchase_orders_count", 0)} worth ₹{doc.get("purchase_orders_amount", 0)}
        Delivery Challans: {doc.get("delivery_challan_count", 0)} worth ₹{doc.get("delivery_challan_amount", 0)}
        Total Revenue: ₹{doc.get("total_revenue", 0)}
        Total Expenses: ₹{doc.get("total_expenses", 0)}
        Net Profit: ₹{doc.get("net_profit", 0)}
        Updated At: {doc.get("updated_at", "")}
        """
        docs.append(Document(text=text.strip(), metadata={"month": month}))
    
    return docs

if __name__ == "__main__":
    docs = build_doc_counter_documents()
    if not docs:
        print("❌ No doc counters found.")
    else:
        build_doc_counter_index(docs)
        print("✅ Doc counter index built and saved.")

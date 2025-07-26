import os
from llama_index.core import Document, Settings
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from firebase_config.llama_index_configs import global_settings
from firebase_config.inventory import get_all_inventory_items
from .item_index import build_items_index

# Set embedding model globally
Settings.embed_model = HuggingFaceEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")

def build_item_documents():
    items = get_all_inventory_items()
    docs = []
    for item in items:
        batches = item.get("batches", [])
        batch_info_text = ""
        for batch in batches:
            batch_info_text += f"\n    Batch No: {batch.get('batch_number')}, Expiry: {batch.get('Expiry')}, Qty: {batch.get('quantity')}"

        text = f"""
        Item Name: {item.get("name")}
        Item ID: {item.get("id")}
        Category: {item.get("category")}
        Total Quantity: {item.get("stock_quantity")}
        Low Stock Threshold: {item.get("low_stock")}
        Batches: {batch_info_text.strip()}
        """
        docs.append(Document(text=text.strip()))
    return docs

if __name__ == "__main__":
    docs = build_item_documents()
    if not docs:
        print("❌ No items found. Index not built.")
    else:
        build_items_index(docs)
        print("✅ Items index built and saved.")

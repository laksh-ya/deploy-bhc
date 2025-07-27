from llama_index.core import Document, Settings
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from firebase_config.llama_index_configs import global_settings
from firebase_config.orders import get_all_orders
from .order_index import build_orders_index
from datetime import datetime

# Set global embedding model
Settings.embed_model = HuggingFaceEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")

def format_items(items):
    lines = []
    for idx, item in enumerate(items):
        lines.append(
            f"""Item {idx+1}:
  - Name: {item.get("item")}
  - Quantity: {item.get("quantity")}
  - Price: ₹{item.get("price")}
  - Batch: {item.get("batch_number")}
  - Expiry: {item.get("expiry")}"""
        )
    return "\n".join(lines)

def build_order_documents():
    orders = get_all_orders()
    print(f"Fetched {len(orders)} orders")

    docs = []
    for order in orders:
        text = f"""
Order Type: {order.get('order_type')}
Invoice/Challan Number: {order.get('invoice_number') or order.get('challan_number')}
Order Date: {order.get('order_date')}
Client: {order.get('client_name')}
Supplier: {order.get('supplier_name')}
Total Amount: ₹{order.get('total_amount')}
Amount Paid: ₹{order.get('amount_paid')}
Payment Status: {order.get('payment_status')}
Payment Method: {order.get('payment_method')}
Collected By: {order.get('amount_collected_by')}
Link: {order.get('link')}
Discount Type: {order.get('discount_type')}
Discount: {order.get("discount")}
Status: {order.get('status')}
Draft: {"Yes" if order.get('draft') else "No"}
Updated By: {order.get('updated_by')}
Created By: {order.get('created_by')}
Remarks: {order.get('remarks', '')}
Items:\n{format_items(order.get("items", []))}
"""
        docs.append(Document(text=text.strip()))
    return docs

if __name__ == "__main__":
    docs = build_order_documents()
    if not docs:
        print("❌ No orders found. Index not built.")
    else:
        build_orders_index(docs)
        print("✅ Orders index built and saved.")

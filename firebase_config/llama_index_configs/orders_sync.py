# orders_qdrant_sync.py

import logging, os, time
from google.cloud import firestore
from google.oauth2 import service_account
from llama_index.core import Document
from firebase_config.llama_index_configs.global_settings import global_settings
from firebase_config.llama_index_configs.order_index import load_orders_index
from qdrant_client.http.models import VectorParams, Distance

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = r"C:\Users\thebe\ML\Codes\Balaji Health Care Assisstant\balaji-health-care-assistant\firebase_config\firebase_key.json"

def create_document(order_data: dict, doc_id: str) -> Document:
    items_text = "\n".join([
        f"- {item.get('item', '')} | Qty: {item.get('quantity', '')} | Price: ₹{item.get('price', '')} | Batch: {item.get('batch_number', '')} | Expiry: {item.get('expiry', '')}"
        for item in order_data.get("items", [])
    ])
    text = f"""
    Order ID: {doc_id}
    Order Type: {order_data.get("order_type", "")}
    Invoice Number: {order_data.get("invoice_number", "")}
    Challan Number: {order_data.get("challan_number", "")}
    Order Date: {order_data.get("order_date", "")}
    Client: {order_data.get("client_name", "")}
    Supplier: {order_data.get("supplier_name", "")}
    Total Amount: ₹{order_data.get("total_amount", 0)}
    Amount Paid: ₹{order_data.get("amount_paid", 0)}
    Payment Status: {order_data.get("payment_status", "")}
    Payment Method: {order_data.get("payment_method", "")}
    Collected By: {order_data.get("amount_collected_by", "")}
    Discount: {order_data.get("discount")} ({order_data.get("discount_type")})
    Status: {order_data.get("status")}
    Draft: {"Yes" if order_data.get("draft") else "No"}
    Created By: {order_data.get("created_by")}
    Updated By: {order_data.get("updated_by")}
    Remarks: {order_data.get("remarks", "")}
    Items:\n{items_text}
    """.strip()

    return Document(
        text=text,
        doc_id=doc_id,
        metadata={
            "order_id": doc_id,
            "client": order_data.get("client_name", ""),
            "order_type": order_data.get("order_type", ""),
            "status": order_data.get("status", "")
        }
    )

def sync_orders_to_qdrant(docs, changes, read_time):
    from firebase_config.llama_index_configs.global_settings import global_settings
    index = load_orders_index()
    qdrant = global_settings()["order_vector_store"].client

    for doc in docs:
        doc_id = doc.id
        if not doc.exists:
            try:
                qdrant.delete(collection_name="orders", points_selector=[doc_id])
                logger.info(f"🗑️ Deleted order {doc_id} from Qdrant")
            except Exception as e:
                logger.error(f"❌ Deletion error: {e}")
            continue

        order_data = doc.to_dict()
        document = create_document(order_data, doc_id)
        index.insert([document])
        logger.info(f"✅ Synced order {doc_id} to Qdrant")

def listen_for_order_changes():
    credentials_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if not os.path.exists(credentials_path):
        raise FileNotFoundError("Firebase key file not found.")

    credentials = service_account.Credentials.from_service_account_file(credentials_path)
    db = firestore.Client(credentials=credentials, project=os.getenv("FIRESTORE_PROJECT_ID"))
    ref = db.collection("Orders")

    qdrant = global_settings()["order_vector_store"].client
    try:
        qdrant.get_collection("orders")
    except Exception:
        qdrant.create_collection("orders", vectors_config=VectorParams(size=384, distance=Distance.COSINE))
        logger.info("📦 Created Qdrant 'orders' collection")

    ref.on_snapshot(sync_orders_to_qdrant)
    logger.info("📡 Listening for Order changes...")

    while True:
        time.sleep(1)

if __name__ == "__main__":
    listen_for_order_changes()

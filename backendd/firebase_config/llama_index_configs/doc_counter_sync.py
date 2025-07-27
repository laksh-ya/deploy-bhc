import os, time, logging
from google.cloud import firestore
from google.oauth2 import service_account
from llama_index.core import Document
from firebase_config.llama_index_configs.global_settings import global_settings
from firebase_config.llama_index_configs.doc_counter_index import load_doc_counter_index
from qdrant_client.http.models import VectorParams, Distance

# Setup
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = r"your/path/firebase_key.json"
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_document(doc_data: dict, doc_id: str) -> Document:
    text = f"""
    Month: {doc_id}
    Sales Orders: {doc_data.get("sales_orders_count", 0)} worth ₹{doc_data.get("sales_orders_amount", 0)}
    Purchase Orders: {doc_data.get("purchase_orders_count", 0)} worth ₹{doc_data.get("purchase_orders_amount", 0)}
    Delivery Challans: {doc_data.get("delivery_challan_count", 0)} worth ₹{doc_data.get("delivery_challan_amount", 0)}
    Total Revenue: ₹{doc_data.get("total_revenue", 0)}
    Total Expenses: ₹{doc_data.get("total_expenses", 0)}
    Net Profit: ₹{doc_data.get("net_profit", 0)}
    Updated At: {doc_data.get("updated_at", "")}
    """.strip()

    return Document(text=text, doc_id=doc_id, metadata={"month": doc_id})

def sync_doc_counter_to_qdrant(docs, changes, read_time):
    index = load_doc_counter_index()
    qdrant = global_settings()["doc_counter_vector_store"].client

    for doc in docs:
        doc_id = doc.id
        if not doc.exists:
            try:
                qdrant.delete(collection_name="doc_counter", points_selector=[doc_id])
                logger.info(f"🗑️ Deleted doc_counter {doc_id} from Qdrant")
            except Exception as e:
                logger.error(f"❌ Deletion error: {e}")
            continue

        doc_data = doc.to_dict()
        document = create_document(doc_data, doc_id)
        index.insert([document])
        logger.info(f"✅ Synced doc_counter {doc_id} to Qdrant")

def listen_for_doc_counter_changes():
    credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if not os.path.exists(credentials_path):
        raise FileNotFoundError("Firebase credentials file not found.")

    credentials = service_account.Credentials.from_service_account_file(credentials_path)
    db = firestore.Client(credentials=credentials, project=os.getenv("FIRESTORE_PROJECT_ID"))
    ref = db.collection("doc_counter")

    qdrant = global_settings()["doc_counter_vector_store"].client
    try:
        qdrant.get_collection("doc_counter")
    except Exception:
        qdrant.create_collection("doc_counter", vectors_config=VectorParams(size=384, distance=Distance.COSINE))
        logger.info("📦 Created Qdrant 'doc_counter' collection")

    ref.on_snapshot(sync_doc_counter_to_qdrant)
    logger.info("📡 Listening for doc_counter changes...")

    while True:
        time.sleep(1)

if __name__ == "__main__":
    listen_for_doc_counter_changes()

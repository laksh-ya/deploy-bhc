# items_qdrant_sync.py

import os, time, logging
from google.cloud import firestore
from google.oauth2 import service_account
from llama_index.core import Document
from firebase_config.llama_index_configs.global_settings import global_settings
from firebase_config.llama_index_configs.item_index import load_items_index
from qdrant_client.http.models import VectorParams, Distance

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = r"C:\Users\thebe\ML\Codes\Balaji Health Care Assisstant\balaji-health-care-assistant\firebase_config\firebase_key.json"

def create_document(item_data: dict, item_id: str) -> Document:
    batches_text = "\n".join([
        f"- Batch: {batch.get('batch_number', '')}, Exp: {batch.get('exp', '')}, Qty: {batch.get('quantity', 0)}"
        for batch in item_data.get("batch", [])
    ])
    text = f"""
    Name: {item_data.get("name", "")}
    Category: {item_data.get("category", "")}
    Quantity: {item_data.get("quantity", 0)}
    Low Stock: {item_data.get("low_stock", False)}
    Batches:
    {batches_text}
    """.strip()

    return Document(
        text=text,
        doc_id=item_id,
        metadata={"item_id": item_id, "name": item_data.get("name", "")}
    )

def sync_items_to_qdrant(docs, changes, read_time):
    index = load_items_index()
    qdrant = global_settings()["item_vector_store"].client

    for doc in docs:
        doc_id = doc.id
        if not doc.exists:
            try:
                qdrant.delete(collection_name="items", points_selector=[doc_id])
                logger.info(f"🗑️ Deleted item {doc_id} from Qdrant")
            except Exception as e:
                logger.error(f"❌ Deletion error: {e}")
            continue

        item_data = doc.to_dict()
        document = create_document(item_data, doc_id)
        index.insert([document])
        logger.info(f"✅ Synced item {doc_id} to Qdrant")

def listen_for_item_changes():
    credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if not os.path.exists(credentials_path):
        raise FileNotFoundError("Firebase key file not found.")

    credentials = service_account.Credentials.from_service_account_file(credentials_path)
    db = firestore.Client(credentials=credentials, project=os.getenv("FIRESTORE_PROJECT_ID"))
    ref = db.collection("Inventory Items")

    qdrant = global_settings()["item_vector_store"].client
    try:
        qdrant.get_collection("items")
    except Exception:
        qdrant.create_collection("items", vectors_config=VectorParams(size=384, distance=Distance.COSINE))
        logger.info("📦 Created Qdrant 'items' collection")

    ref.on_snapshot(sync_items_to_qdrant)
    logger.info("📡 Listening for Item changes...")

    while True:
        time.sleep(1)

if __name__ == "__main__":
    listen_for_item_changes()

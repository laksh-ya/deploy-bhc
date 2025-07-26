import logging
import os
import time
from google.cloud import firestore
from google.oauth2 import service_account
from llama_index.core import Document
from firebase_config.llama_index_configs.global_settings import global_settings
from firebase_config.llama_index_configs.client_index import load_clients_index
from qdrant_client.http.models import VectorParams, Distance

# Set credentials path for Firestore
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = r"C:\Users\thebe\ML\Codes\Balaji Health Care Assisstant\balaji-health-care-assistant\firebase_config\firebase_key.json"

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

def create_document(item_data: dict, item_id: str) -> Document:
    batches_text = "\n".join([
        f"- Batch: {batch.get('batch_number', '')}, Exp: {batch.get('Expiry', '')}, Qty: {batch.get('quantity', 0)}"
        for batch in item_data.get("batches", [])
    ])
    text = f"""
    Name: {item_data.get("name", "")}
    Category: {item_data.get("category", "")}
    Quantity: {item_data.get("stock_quantity", 0)}
    Low Stock: {item_data.get("low_stock", False)}
    Batches:
    {batches_text}
    """.strip()

    return Document(
        text=text,
        doc_id=item_id,
        metadata={"item_id": item_id, "name": item_data.get("name", "")}
    )


def sync_client_to_qdrant(docs, changes, read_time):
    """Push Firestore changes to Qdrant vector index."""
    for doc in docs:
        try:
            client_id = doc.id
            settings = global_settings()
            qdrant_client = settings["client_vector_store"].client
            index = load_clients_index()

            if not doc.exists:
                try:
                    qdrant_client.delete(
                        collection_name="clients",
                        points_selector=[client_id]
                    )
                    logger.info(f"🗑️ Deleted client {client_id} from Qdrant")
                except Exception as e:
                    logger.error(f"Error deleting client {client_id} from Qdrant: {e}")
                continue

            client_data = doc.to_dict()
            document = create_document(client_data, client_id)
            index.insert([document])
            logger.info(f"📥 Synced client {client_id} to Qdrant")

        except Exception as e:
            logger.error(f"❌ Error syncing client {doc.id} to Qdrant: {e}")

def listen_for_client_changes():
    """Continuously listen for changes in Firestore `clients` collection."""
    try:
        credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if not credentials_path or not os.path.exists(credentials_path):
            raise ValueError("GOOGLE_APPLICATION_CREDENTIALS not set or file not found")

        credentials = service_account.Credentials.from_service_account_file(credentials_path)
        db = firestore.Client(credentials=credentials, project=os.getenv("FIRESTORE_PROJECT_ID"))
        clients_ref = db.collection("clients")

        settings = global_settings()
        qdrant_client = settings["client_vector_store"].client

        try:
            qdrant_client.get_collection("clients")
        except Exception:
            qdrant_client.create_collection(
                collection_name="clients",
                vectors_config=VectorParams(size=384, distance=Distance.COSINE)
            )
            logger.info("✅ Created Qdrant `clients` collection")

        clients_ref.on_snapshot(sync_client_to_qdrant)
        logger.info("👂 Started listening to Firestore `clients` collection...")

        while True:
            time.sleep(1)

    except Exception as e:
        logger.error(f"🚨 Error in Firestore client sync listener: {e}")
        raise

if __name__ == "__main__":
    listen_for_client_changes()

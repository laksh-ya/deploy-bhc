import logging
import os
from google.cloud import firestore
from google.oauth2 import service_account
from llama_index.core import Document
from firebase_config.llama_index_configs.global_settings import global_settings
from firebase_config.llama_index_configs.supplier_index import load_suppliers_index
from qdrant_client.http.models import VectorParams, Distance

# Set environment
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = r"C:\Users\thebe\ML\Codes\Balaji Health Care Assisstant\balaji-health-care-assistant\firebase_config\firebase_key.json"

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

def create_document(supplier: dict, supplier_id: str) -> Document:
    text = f"""
    Supplier ID: {supplier_id}
    Name: {supplier.get("name")}
    Contact: {supplier.get("contact")}
    Due Amount: ₹{supplier.get("due")}
    Address: {supplier.get("address")}
    """.strip()

    return Document(
        text=text,
        doc_id=supplier_id,
        metadata={
            "supplier_id": supplier_id,
            "name": supplier.get("name"),
            "contact": supplier.get("contact"),
            "due": supplier.get("due", 0)
        }
    )

def sync_supplier_to_qdrant(docs, changes, read_time):
    for doc in docs:
        try:
            supplier_id = doc.id
            settings = global_settings()
            qdrant_client = settings["supplier_vector_store"].client
            index = load_suppliers_index()

            if not doc.exists:
                qdrant_client.delete(collection_name="suppliers", points_selector=[supplier_id])
                logger.info(f"Deleted supplier {supplier_id} from Qdrant")
                continue

            supplier_data = doc.to_dict()
            document = create_document(supplier_data, supplier_id)
            index.insert([document])
            logger.info(f"Synced supplier {supplier_id} to Qdrant")

        except Exception as e:
            logger.error(f"Error syncing supplier {doc.id} to Qdrant: {e}")

def listen_for_supplier_changes():
    try:
        credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        credentials = service_account.Credentials.from_service_account_file(credentials_path)
        db = firestore.Client(credentials=credentials, project=os.getenv("FIRESTORE_PROJECT_ID"))
        suppliers_ref = db.collection("suppliers")

        settings = global_settings()
        qdrant_client = settings["supplier_vector_store"].client

        try:
            qdrant_client.get_collection("suppliers")
        except Exception:
            qdrant_client.create_collection(
                collection_name="suppliers",
                vectors_config=VectorParams(size=384, distance=Distance.COSINE)
            )
            logger.info("Created Qdrant suppliers collection")

        suppliers_ref.on_snapshot(sync_supplier_to_qdrant)
        logger.info("Started supplier sync listener")

        import time
        while True:
            time.sleep(1)

    except Exception as e:
        logger.error(f"Error in supplier sync listener: {e}")
        raise

if __name__ == "__main__":
    listen_for_supplier_changes()

import os
import time
import logging
from google.cloud import firestore
from google.oauth2 import service_account
from llama_index.core import Document
from firebase_config.llama_index_configs.global_settings import global_settings
from firebase_config.llama_index_configs.expense_index import load_expenses_index
from qdrant_client.http.models import VectorParams, Distance

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set Firebase credentials path
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = r"C:\Users\thebe\ML\Codes\Balaji Health Care Assisstant\balaji-health-care-assistant\firebase_config\firebase_key.json"

def create_document(expense_data: dict, expense_id: str) -> Document:
    text = f"""
    Amount: ₹{expense_data.get("amount", 0)}
    Category: {expense_data.get("category", "")}
    Paid By: {expense_data.get("paid_by", "")}
    Remarks: {expense_data.get("remarks", "")}
    Expense Date: {expense_data.get("created_at", "")}
    Updated Date: {expense_data.get("updated_at", "")}
    """.strip()

    return Document(
        text=text,
        doc_id=expense_id,
        metadata={"expense_id": expense_id, "category": expense_data.get("category", "")}
    )

def sync_expenses_to_qdrant(docs, changes, read_time):
    index = load_expenses_index()
    qdrant = global_settings()["expense_vector_store"].client

    for doc in docs:
        expense_id = doc.id
        if not doc.exists:
            try:
                qdrant.delete(collection_name="expenses", points_selector=[expense_id])
                logger.info(f"🗑️ Deleted expense {expense_id} from Qdrant")
            except Exception as e:
                logger.error(f"❌ Error deleting expense {expense_id}: {e}")
            continue

        expense_data = doc.to_dict()
        document = create_document(expense_data, expense_id)
        index.insert([document])
        logger.info(f"✅ Synced expense {expense_id} to Qdrant")

def listen_for_expense_changes():
    credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if not os.path.exists(credentials_path):
        raise FileNotFoundError("Firebase credentials file not found.")

    credentials = service_account.Credentials.from_service_account_file(credentials_path)
    db = firestore.Client(credentials=credentials, project=os.getenv("FIRESTORE_PROJECT_ID"))
    ref = db.collection("Expenses")

    qdrant = global_settings()["expense_vector_store"].client
    try:
        qdrant.get_collection("expenses")
    except Exception:
        qdrant.create_collection("expenses", vectors_config=VectorParams(size=384, distance=Distance.COSINE))
        logger.info("📦 Created Qdrant 'expenses' collection")

    ref.on_snapshot(sync_expenses_to_qdrant)
    logger.info("📡 Listening for Expense changes...")

    while True:
        time.sleep(1)

if __name__ == "__main__":
    listen_for_expense_changes()

import os, time, logging
from google.cloud import firestore
from google.oauth2 import service_account
from llama_index.core import Document
from firebase_config.llama_index_configs.global_settings import global_settings
from firebase_config.llama_index_configs.employee_index import load_employees_index
from qdrant_client.http.models import VectorParams, Distance

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set Firebase credential path
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = r"C:\Users\thebe\ML\Codes\Balaji Health Care Assisstant\balaji-health-care-assistant\firebase_config\firebase_key.json"

def create_document(emp_data: dict, emp_id: str) -> Document:
    text = f"""
    Name: {emp_data.get("name", "")}
    Collected: ₹{emp_data.get("collected", 0)}
    Paid: ₹{emp_data.get("paid", 0)}
    Phone: {emp_data.get("phone", "")}
    Updated At: {emp_data.get("updated_at", "")}
    """.strip()

    return Document(
        text=text,
        doc_id=emp_id,
        metadata={"employee_id": emp_id, "name": emp_data.get("name", "")}
    )


def sync_employees_to_qdrant(docs, changes, read_time):
    index = load_employees_index()
    qdrant = global_settings()["employee_vector_store"].client

    for doc in docs:
        emp_id = doc.id
        if not doc.exists:
            try:
                qdrant.delete(collection_name="employees", points_selector=[emp_id])
                logger.info(f"🗑️ Deleted employee {emp_id} from Qdrant")
            except Exception as e:
                logger.error(f"❌ Deletion error: {e}")
            continue

        emp_data = doc.to_dict()
        document = create_document(emp_data, emp_id)
        index.insert([document])
        logger.info(f"✅ Synced employee {emp_id} to Qdrant")

def listen_for_employee_changes():
    credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if not os.path.exists(credentials_path):
        raise FileNotFoundError("Firebase credentials file not found.")

    credentials = service_account.Credentials.from_service_account_file(credentials_path)
    db = firestore.Client(credentials=credentials, project=os.getenv("FIRESTORE_PROJECT_ID"))
    ref = db.collection("employees")

    qdrant = global_settings()["employee_vector_store"].client
    try:
        qdrant.get_collection("employees")
    except Exception:
        qdrant.create_collection("employees", vectors_config=VectorParams(size=384, distance=Distance.COSINE))
        logger.info("📦 Created Qdrant 'employees' collection")

    ref.on_snapshot(sync_employees_to_qdrant)
    logger.info("📡 Listening for Employee changes...")

    while True:
        time.sleep(1)

if __name__ == "__main__":
    listen_for_employee_changes()

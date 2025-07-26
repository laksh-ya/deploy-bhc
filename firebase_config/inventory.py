from firebase_config.config import db
from google.cloud import firestore
from google.cloud.firestore import DocumentSnapshot
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from google.cloud.firestore_v1 import FieldFilter
# ---------------- Inventory CRUD ----------------
def get_next_id(prefix: str, counter_name: str) -> str:
    counter_ref = db.collection("doc_counters").document(counter_name)
    counter_doc = counter_ref.get()

    if not counter_doc.exists:
        counter_ref.set({"last_id": 1})
        next_id = 1
    else:
        counter_ref.update({"last_id": firestore.Increment(1)})
        next_id = counter_doc.to_dict()["last_id"] + 1

    return f"{prefix}{next_id:04d}"


def add_inventory_item(item_data: Dict) -> str:
    item_id = get_next_id("I", "items")

    # Normalize batches
    raw_batches = item_data.get("batches", [])
    structured_batches = []
    total_quantity = 0

    for batch in raw_batches:
        batch_number = batch.get("batch_number", "")
        exp = batch.get("exp", "")  # can convert to datetime if needed
        quantity = float(batch.get("quantity", 0))
        total_quantity += quantity

        structured_batches.append({
            "batch_number": batch_number,
            "exp": exp,
            "quantity": quantity
        })

    item_doc = {
        "id": item_id,
        "name": item_data.get("name", ""),
        "category": item_data.get("category", ""),
        "low_stock": float(item_data.get("low_stock", 0)),
        "quantity": total_quantity,
        "stock_quantity": total_quantity,
        "batches": structured_batches,
        "created_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP
    }

    db.collection("Inventory Items").document(item_id).set(item_doc)
    return item_id



def get_inventory_item_by_name(name: str) -> List[Dict]:
    docs = db.collection("Inventory Items").where(filter=FieldFilter("name", "==", name)).stream()
    return [doc.to_dict() | {"id": doc.id} for doc in docs]

def get_inventory_item_by_id(doc_id: str) -> Optional[Dict]:
    doc: DocumentSnapshot = db.collection("Inventory Items").document(doc_id).get()
    return doc.to_dict() | {"id": doc.id} if doc.exists else None

def update_inventory_item(doc_id: str, updated_data: Dict):
    updated_data["updated_at"] = firestore.SERVER_TIMESTAMP
    db.collection("Inventory Items").document(doc_id).update(updated_data)

def delete_inventory_item(doc_id: str):
    db.collection("Inventory Items").document(doc_id).delete()

def get_all_inventory_items() -> List[Dict]:
    docs = db.collection("Inventory Items").stream()
    return [doc.to_dict() | {"id": doc.id} for doc in docs]

# ---------------- Filtering & Helpers ----------------

def get_items_by_category(category: str) -> List[Dict]:
    docs = db.collection("Inventory Items").where(filter=FieldFilter("category", "==", category)).stream()
    return [doc.to_dict() | {"id": doc.id} for doc in docs]

def get_low_stock_items(threshold: int = 10) -> List[Dict]:
    docs = db.collection("Inventory Items").where(filter=FieldFilter("stock_quantity", "<=", threshold)).stream()
    return [doc.to_dict() | {"id": doc.id} for doc in docs]

def update_stock_quantity(doc_id: str, change: int):
    db.collection("Inventory Items").document(doc_id).update({
        "stock_quantity": firestore.Increment(change),
        "updated_at": firestore.SERVER_TIMESTAMP
    })

def search_inventory_by_partial_name(partial: str) -> List[Dict]:
    docs = db.collection("Inventory Items").stream()
    return [
        doc.to_dict() | {"id": doc.id}
        for doc in docs
        if partial.lower() in doc.to_dict().get("name", "").lower()
    ]

def get_items_expiring_soon(days: int = 30) -> List[Dict]:
    now = datetime.utcnow()
    future = now + timedelta(days=days)
    docs = db.collection("Inventory Items")\
             .where(filter=FieldFilter("expiry_date", "<=", future))\
             .stream()
    return [doc.to_dict() | {"id": doc.id} for doc in docs]

def resolve_inventory_item_id_by_name(name: str) -> Optional[str]:
    docs = db.collection("Inventory Items").where(filter=FieldFilter("name", "==", name)).limit(1).stream()
    for doc in docs:
        return doc.id
    return None

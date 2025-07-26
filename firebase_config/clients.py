from firebase_config.config import db
from google.cloud import firestore
from datetime import datetime
from typing import List, Dict
from google.cloud.firestore_v1 import FieldFilter
# ------------------------ Clients ------------------------

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


def add_client(client_data: Dict) -> str:
    client_id = get_next_id("C", "clients")
    client_doc = {
        "id": client_id,
        "name": client_data.get("name", ""),
        "PAN": client_data.get("PAN", ""),
        "GST": client_data.get("GST", ""),
        "POC_name": client_data.get("POC_name", ""),
        "POC_contact": client_data.get("POC_contact", ""),
        "due_amount": 0,
        "address": client_data.get("address", ""),
        "created_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP
    }
    db.collection("Clients").document(client_id).set(client_doc)
    return client_id


def get_client_by_name(name: str) -> list:
    docs = db.collection("Clients").where(filter=FieldFilter("name", "==", name)).stream()
    return [doc.to_dict() | {"id": doc.id} for doc in docs]

def get_client_by_id(client_id: str):
    doc = db.collection("Clients").document(client_id).get()
    return doc.to_dict() | {"id": doc.id} if doc.exists else None

def update_client(client_id: str, updated_data: dict):
    updated_data["updated_at"] = firestore.SERVER_TIMESTAMP
    db.collection("Clients").document(client_id).update(updated_data)

def delete_client(client_id: str):
    db.collection("Clients").document(client_id).delete()

def get_all_clients() -> list:
    docs = db.collection("Clients").stream()
    return [doc.to_dict() | {"id": doc.id} for doc in docs]

def search_clients_by_partial_name(partial_name: str) -> list:
    docs = db.collection("Clients").stream()
    return [
        doc.to_dict() | {"id": doc.id}
        for doc in docs
        if partial_name.lower() in doc.to_dict().get("name", "").lower()
    ]

def get_client_order_history(client_id: str) -> list:
    orders = (
        db.collection("Orders")
        .where(filter=FieldFilter("client_id", "==", client_id))
        .where(filter=FieldFilter("type", "==", "sell"))
        .stream()
    )
    return [doc.to_dict() | {"id": doc.id} for doc in orders]


def update_client_due(client_id: str, change_amount: float):
    doc_ref = db.collection("Clients").document(client_id)
    doc_ref.update({
        "total_due": firestore.Increment(change_amount),
        "updated_at": firestore.SERVER_TIMESTAMP
    })

def get_client_payments(client_id: str) -> list:
    docs = db.collection("Payments").where(filter=FieldFilter("client_id", "==", client_id)).stream()
    return [doc.to_dict() | {"id": doc.id} for doc in docs]

# ------------------------ Utilities ------------------------

def resolve_client_id_by_name(name: str) :
    docs = db.collection("Clients").where(filter=FieldFilter("name", "==", name)).limit(1).stream()
    for doc in docs:
        return doc.id
    return None

# Add a new invoice and return its document ID
from firebase_config.config import db
from google.cloud import firestore
from typing import Dict, List
from datetime import datetime
from google.cloud.firestore_v1 import FieldFilter

def add_invoice(invoice_data: Dict) -> str:
    """
    Adds an invoice to Firestore. Expects:
    {
        "invoice_number": str,
        "order_id": str,
        "client_id": str,
        "invoice_date": datetime,
        "due_date": datetime,
        "items": [
            {
                "item_name": str,
                "quantity": int,
                "price": float,
                "discount": float,
                "tax": float,
                "total": float
            }
        ],
        "total_amount": float,
        "amount_paid": float,
        "due_amount": float,
        "payment_status": "partial" | "paid" | "due",
        "updated_by": str
    }
    """
    now = firestore.SERVER_TIMESTAMP
    invoice_doc = {
        **invoice_data,
        "created_at": now,
        "updated_at": now,
    }

    doc_ref = db.collection("nIvoices").add(invoice_doc)
    return doc_ref[1].id


# Get invoice(s) by exact invoice number
def get_invoice_by_number(invoice_number):
    docs = db.collection("Invoices").where(filter=FieldFilter("invoice_number", "==", invoice_number)).stream()
    return [doc.to_dict() | {"id": doc.id} for doc in docs]

# Get invoice by document ID
def get_invoice_by_id(invoice_id):
    doc = db.collection("Invoices").document(invoice_id).get()
    return doc.to_dict() | {"id": doc.id} if doc.exists else None

# Get all invoices
def get_all_invoices():
    docs = db.collection("Invoices").stream()
    return [doc.to_dict() | {"id": doc.id} for doc in docs]

# Update invoice data by document ID

def update_invoice(invoice_id: str, updated_data: Dict):
    updated_data["updated_at"] = firestore.SERVER_TIMESTAMP
    db.collection("Invoices").document(invoice_id).update(updated_data)


# Delete invoice by document ID
def delete_invoice(invoice_id):
    db.collection("Invoices").document(invoice_id).delete()

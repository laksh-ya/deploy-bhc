from firebase_config.config import db
from google.cloud import firestore
from datetime import datetime
from typing import List, Dict
from google.cloud.firestore_v1 import FieldFilter
# ------------------------ Payments ------------------------

def add_payment(payment_data: dict) -> str:
    payment_data["date"] = payment_data.get("date", firestore.SERVER_TIMESTAMP)
    doc_ref = db.collection("Payments").add(payment_data)
    return doc_ref[1].id

def get_payments(client_id=None, start_date=None, end_date=None) -> list:
    query = db.collection("Payments")
    if client_id:
        query = query.where(filter=FieldFilter("client_id", "==", client_id))
    if start_date:
        query = query.where(filter=FieldFilter("date", ">=", start_date))
    if end_date:
        query = query.where(filter=FieldFilter("date", "<=", end_date))
    docs = query.stream()
    return [doc.to_dict() | {"id": doc.id} for doc in docs]

def get_total_payments(client_id=None, start_date=None, end_date=None) -> float:
    payments = get_payments(client_id, start_date, end_date)
    return sum(p.get("amount", 0) for p in payments)

def get_all_dues() -> list:
    docs = db.collection("clients").where(filter=FieldFilter("total_due", ">", 0)).stream()
    return [doc.to_dict() | {"id": doc.id} for doc in docs]

# ------------------------ Expenses ------------------------

def add_expense(expense_data: Dict) -> str:
    expense_doc = {
        "amount": float(expense_data.get("amount", 0)),
        "category": expense_data.get("category", ""),
        "paid_by": expense_data.get("paid_by", ""),
        "remarks": expense_data.get("remarks", ""),
        "created_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP
    }
    doc_ref = db.collection("Expenses").add(expense_doc)
    return doc_ref[1].id

def get_expenses(category=None, start_date=None, end_date=None) -> list:
    query = db.collection("Expenses")
    if category:
        query = query.where(filter=FieldFilter("category", "==", category))
    if start_date:
        query = query.where(filter=FieldFilter("date", ">=", start_date))
    if end_date:
        query = query.where(filter=FieldFilter("date", "<=", end_date))
    docs = query.stream()
    return [doc.to_dict() | {"id": doc.id} for doc in docs]

def update_expense(expense_id: str, updated_data: dict):
    updated_data["updated_at"] = firestore.SERVER_TIMESTAMP
    db.collection("Expenses").document(expense_id).update(updated_data)

def delete_expense(expense_id: str):
    db.collection("Expenses").document(expense_id).delete()

def get_total_expenses(category=None, start_date=None, end_date=None) -> float:
    expenses = get_expenses(category, start_date, end_date)
    return sum(e.get("amount", 0) for e in expenses)

# ------------------------ Supplier Payments ------------------------
from typing import List
def get_supplier_payments(supplier_id=None, start_date=None, end_date=None) -> List[dict]:
    query = db.collection("supplier_payments")
    
    if supplier_id:
        query = query.where(filter=FieldFilter("supplier_id", "==", supplier_id))
    if start_date:
        query = query.where(filter=FieldFilter("date", ">=", start_date))
    if end_date:
        query = query.where(filter=FieldFilter("date", "<=", end_date))
    
    docs = query.stream()
    return [doc.to_dict() | {"id": doc.id} for doc in docs]




def add_supplier_payment(payment_data: dict) -> str:
    supplier_id = payment_data.get("supplier_id")
    amount = payment_data.get("amount", 0)
    if not supplier_id or amount <= 0:
        raise ValueError("supplier_id and positive amount are required")
    
    payment_data["date"] = payment_data.get("date", firestore.SERVER_TIMESTAMP)
    
    # Add to `supplier_payments` collection
    payment_ref = db.collection("supplier_payments").add(payment_data)
    
    # Update supplier's due_amount
    supplier_ref = db.collection("suppliers").document(supplier_id)
    
    def update_due(transaction):
        snapshot = transaction.get(supplier_ref)
        current_due = snapshot.get("due_amount") or 0
        new_due = max(0, current_due - amount)
        transaction.update(supplier_ref, {
            "due_amount": new_due,
            "updated_at": firestore.SERVER_TIMESTAMP,
            "updated_by": payment_data.get("added_by")
        })
    
    db.run_transaction(update_due)
    
    return payment_ref[1].id


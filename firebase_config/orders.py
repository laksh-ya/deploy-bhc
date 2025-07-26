from firebase_config.config import db
from google.cloud import firestore
from typing import List, Dict, Optional
from datetime import datetime, timezone

# ---------------- Order Handling ----------------
from firebase_config.config import db
from google.cloud import firestore
from typing import Dict, List, Optional
from datetime import datetime
from google.cloud.firestore_v1 import FieldFilter

from firebase_config.config import db
from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from typing import Dict

def add_order(order_data: Dict) -> str:
    from firebase_config.config import db
    from google.cloud import firestore
    from google.cloud.firestore_v1.base_query import FieldFilter

    # Core fields
    client_id = order_data.get("client_id", "")
    client_name = order_data.get("client_name", "")
    supplier_id = order_data.get("supplier_id", "")
    supplier_name = order_data.get("supplier_name", "")
    order_type = order_data.get("order_type", "").lower().strip()

    # Validate required fields based on order type
    if order_type in ["sell", "sales", "delivery_challan"]:
        if not client_id or not client_name:
            raise ValueError("❌ Client ID and Name are required for sales or delivery orders.")
    elif order_type == "purchase":
        if not supplier_id or not supplier_name:
            raise ValueError("❌ Supplier ID and Name are required for purchase orders.")
    else:
        raise ValueError("❌ Invalid order_type.")

    status = order_data.get("status", "pending")
    updated_by = order_data.get("updated_by", "system")
    created_by = order_data.get("created_by", updated_by)
    total_amount = float(order_data.get("total_amount", 0))
    payment_method = order_data.get("payment_method", "unpaid")
    amount_paid = float(order_data.get("amount_paid", 0))
    remarks = order_data.get("remarks", "")
    draft = order_data.get("draft", False)
    amount_collected_by = order_data.get("amount_collected_by", "")
    payment_status = order_data.get("payment_status", "unpaid")
    link = order_data.get("link", "")
    discount_type = order_data.get("discount_type","percentage")
    discount = order_data.gete("dicount", 0)

    invoice_number = order_data.get("invoice_number") if order_type != "delivery_challan" else None
    challan_number = order_data.get("challan_number") if order_type == "delivery_challan" else None

    # Set order_id based on invoice/challan number
    order_id = invoice_number or challan_number
    if not order_id:
        raise ValueError("❌ Order must have an invoice_number or challan_number to be used as Order ID.")

    processed_items = []
    total_quantity = 0
    total_tax = 0

    for item in order_data["items"]:
        item_name = item["item_name"]
        quantity = float(item["quantity"])
        price = float(item["price"])
        tax = float(item.get("tax", 0))
        discount = float(item.get("discount", 0))
        batch_number = item.get("batch_number", "")
        expiry = item.get("expiry", "")

        # Get inventory item
        query = db.collection("Inventory Items").where(filter=FieldFilter("name", "==", item_name)).limit(1).stream()
        item_doc = next(query, None)
        if not item_doc:
            raise ValueError(f"❌ Inventory item '{item_name}' not found.")

        item_id = item_doc.id
        item_data = item_doc.to_dict()
        batches = item_data.get("batches", [])
        updated_batches = []
        batch_found = False

        for batch in batches:
            batch_qty = float(batch.get("quantity", 0))
            if batch.get("batch_number") == batch_number:
                batch_found = True
                if order_type == "purchase":
                    batch["quantity"] = batch_qty + quantity
                elif order_type in ["sell", "sales", "delivery_challan"]:
                    if batch_qty < quantity:
                        raise ValueError(f"❌ Not enough stock in batch {batch_number} of item '{item_name}'.")
                    batch["quantity"] = batch_qty - quantity
            updated_batches.append(batch)

        if not batch_found:
            if order_type == "purchase":
                updated_batches.append({
                    "batch_number": batch_number,
                    "Expiry": expiry,
                    "quantity": quantity
                })
            else:
                raise ValueError(f"❌ Batch {batch_number} not found for item '{item_name}'.")

        total_item_quantity = sum(batch["quantity"] for batch in updated_batches)

        db.collection("Inventory Items").document(item_id).update({
            "stock_quantity": total_item_quantity,
            "batches": updated_batches
        })

        processed_items.append({
            "item_id": item_id,
            "item_name": item_name,
            "quantity": quantity,
            "price": price,
            "discount": discount,
            "tax": tax,
            "batch_number": batch_number,
            "expiry": expiry
        })

        total_quantity += quantity
        total_tax += tax

    timestamp = firestore.SERVER_TIMESTAMP

    order_doc = {
        "client_id": client_id,
        "client_name": client_name,
        "supplier_id": supplier_id,
        "supplier_name": supplier_name,
        "order_type": order_type,
        "order_date": timestamp,
        "status": status,
        "items": processed_items,
        "total_quantity": total_quantity,
        "total_tax": total_tax,
        "total_amount": total_amount,
        "invoice_number": invoice_number,
        "challan_number": challan_number,
        "payment_method": payment_method,
        "amount_paid": amount_paid,
        "payment_status": payment_status,
        "remarks": remarks,
        "draft": draft,
        "link": link,
        "discount type":discount_type,
        "discount": discount,
        "amount_collected_by": amount_collected_by,
        "created_by": created_by,
        "updated_by": updated_by,
        "created_at": timestamp,
        "updated_at": timestamp
    }

    # Save using custom ID
    db.collection("Orders").document(order_id).set(order_doc)
    print(f"[✔] Order added with ID: {order_id} (type: {order_type})")

    # -------------------- Due Logic --------------------
    due = total_amount - amount_paid

    if order_type in ["delivery_challan", "sales"] and due > 0 and client_id:
        if not client_id and order_type in ["delivery_challan", "sales"]:
            raise ValueError("❌ client_id is empty!")
        db.collection("Clients").document(client_id).update({
            "due_amount": firestore.Increment(due)
        })
        print(f"[✔] Updated client due: ₹{due}")

    elif order_type == "purchase" and due > 0 and supplier_id:
        if not supplier_id and order_type == "purchase":
            raise ValueError("❌ supplier_id is empty!")
        db.collection("Suppliers").document(supplier_id).update({
            "due": firestore.Increment(due)
        })
        print(f"[✔] Updated supplier due: ₹{due}")

    if amount_collected_by and amount_paid > 0:
        if not amount_collected_by and amount_paid > 0:
            raise ValueError("❌ amount_collected_by is empty despite amount being paid!")
        db.collection("Employees").document(amount_collected_by).update({
            "collected": firestore.Increment(amount_paid)
        })
        print(f"[✔] Updated collected for employee {amount_collected_by}: ₹{amount_paid}")

    return order_id






def get_order_by_id(order_id: str) -> Optional[Dict]:
    doc = db.collection("Orders").document(order_id).get()
    return doc.to_dict() | {"id": doc.id} if doc.exists else None

def GetAllOrders():
    """Fetch all orders from Firestore."""
    orders_ref = db.collection("Orders").stream()
    orders = []
    for doc in orders_ref:
        data = doc.to_dict()
        data["id"] = doc.id
        orders.append(data)
    return orders



import firebase_admin
from firebase_admin import firestore

db = firestore.client()

def get_all_orders():
    orders_ref = db.collection('orders')
    docs = orders_ref.stream()

    orders = []
    for doc in docs:
        data = doc.to_dict()
        if data:  # Ensure the doc is not empty
            data['order_id'] = doc.id  # Add Firestore doc ID if needed
            orders.append(data)
    return orders
def get_all_orders():
    docs = db.collection("Orders").stream()
    return [doc.to_dict() | {"id": doc.id} for doc in docs]

# ---------------- Filtering ----------------

def get_orders_by_client(client_id: str) -> List[Dict]:
    docs = db.collection("Orders").where(filter=FieldFilter("client_id", "==", client_id)).stream()
    return [doc.to_dict() | {"id": doc.id} for doc in docs]

def get_orders_by_supplier(supplier_id: str) -> List[Dict]:
    docs = db.collection("Orders").where(filter=FieldFilter("supplier_id", "==", supplier_id)).stream()
    return [doc.to_dict() | {"id": doc.id} for doc in docs]

def get_orders_by_status(status: str) -> List[Dict]:
    docs = db.collection("Orders").where(filter=FieldFilter("status", "==", status)).stream()
    return [doc.to_dict() | {"id": doc.id} for doc in docs]

def get_orders_by_date_range(start_date: datetime, end_date: datetime) -> List[Dict]:
    docs = db.collection("Orders")\
        .where(filter=FieldFilter("date", ">=", start_date))\
        .where(filter=FieldFilter("date", "<=", end_date))\
        .stream()
    return [doc.to_dict() | {"id": doc.id} for doc in docs]

def get_total_sales_in_period(start_date: datetime, end_date: datetime) -> float:
    orders = get_orders_by_date_range(start_date, end_date)
    return sum(o.get("total_amount", 0) for o in orders)

# ---------------- Update/Delete ----------------

def update_order(order_id: str, update_data: Dict):
    update_data["updated_at"] = firestore.SERVER_TIMESTAMP
    db.collection("Orders").document(order_id).update(update_data)

def delete_order(order_id: str):
    db.collection("Orders").document(order_id).delete()

# ---------------- Invoice Support ----------------

def search_orders_by_invoice_number(invoice_number: str) -> List[Dict]:
    docs = db.collection("Orders").where(filter=FieldFilter("invoice_number", "==", invoice_number)).stream()
    return [doc.to_dict() | {"id": doc.id} for doc in docs]

def get_invoice_by_order_id(order_id: str) -> Optional[Dict]:
    doc = db.collection("Orders").document(order_id).get()
    if doc.exists:
        data = doc.to_dict()
        return {
            "invoice_number": data.get("invoice_number"),
            "due_date": data.get("due_date"),
            "payment_status": data.get("payment_status"),
            "amount_paid": data.get("amount_paid"),
            "total_amount": data.get("total_amount"),
            "client_id": data.get("client_id"),
            "client_name": data.get("client_name"),
            "items": data.get("items", []),
            "order_id": doc.id
        }
    return None

def search_orders_by_invoice_number(invoice_number: str) -> List[Dict]:
    docs = db.collection("Orders").where(filter=FieldFilter("invoice_number", "==", invoice_number)).stream()
    return [doc.to_dict() | {"id": doc.id} for doc in docs]


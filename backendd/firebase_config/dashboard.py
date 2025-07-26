from firebase_config.config import db
from google.cloud import firestore
from datetime import datetime
from typing import List, Dict
from google.cloud.firestore_v1 import FieldFilter
from firebase_config.finance import *
import re

def get_total_revenue(start_date=None, end_date=None) -> float:
    query = db.collection("Orders").where(filter=FieldFilter("order_type", "in", ["sales", "delivery_challan"]))
    if start_date:
        query = query.where(filter=FieldFilter("order_date", ">=", start_date))
    if end_date:
        query = query.where(filter=FieldFilter("order_date", "<=", end_date))
    docs = query.stream()
    return sum(doc.to_dict().get("total_amount", 0) for doc in docs)

def get_net_profit(start_date=None, end_date=None) -> float:
    revenue = get_total_revenue(start_date, end_date)
    expenses = get_total_expenses(None, start_date, end_date)
    return revenue - expenses

def get_total_orders(start_date=None, end_date=None) -> int:
    query = db.collection("Orders")
    if start_date:
        query = query.where(filter=FieldFilter("order_date", ">=", start_date))
    if end_date:
        query = query.where(filter=FieldFilter("order_date", "<=", end_date))
    return len(list(query.stream()))


from collections import defaultdict

def get_order_trend(start_date, end_date, group_by="day") -> List[Dict]:
    import datetime
    from dateutil import parser

    query = db.collection("Orders").where(filter=FieldFilter("order_date", ">=", start_date)).where(filter=FieldFilter("order_date", "<=", end_date))
    docs = query.stream()

    data = defaultdict(int)
    for doc in docs:
        order = doc.to_dict()
        ts = order.get("order_date")
        if isinstance(ts, datetime.datetime):
            key = ts.strftime("%Y-%m-%d") if group_by == "day" else ts.strftime("%Y-%m")
            data[key] += 1

    return [{"date": k, "orders": v} for k, v in sorted(data.items())]


def get_top_selling_items(start_date=None, end_date=None, limit=5) -> List[Dict]:
    query = db.collection("Orders").where(filter=FieldFilter("order_type", "in", ["sales", "delivery_challan"]))
    if start_date:
        query = query.where(filter=FieldFilter("order_date", ">=", start_date))
    if end_date:
        query = query.where(filter=FieldFilter("order_date", "<=", end_date))

    sales = defaultdict(lambda: {"quantity": 0, "total_amount": 0, "item_name": ""})
    for doc in query.stream():
        items = doc.to_dict().get("items", [])
        for item in items:
            name = item.get("item_name", "")
            qty = float(item.get("quantity", 0))
            amt = float(item.get("price", 0)) * qty
            sales[name]["item_name"] = name
            sales[name]["quantity"] += qty
            sales[name]["total_amount"] += amt

    sorted_items = sorted(sales.values(), key=lambda x: x["quantity"], reverse=True)
    return sorted_items[:limit]


def get_inventory_distribution_by_category() -> List[Dict]:
    docs = db.collection("Inventory Items").stream()
    category_counts = defaultdict(float)
    for doc in docs:
        item = doc.to_dict()
        category = item.get("category", "uncategorized")
        quantity = float(item.get("stock_quantity", 0))
        category_counts[category] += quantity

    return [{"category": cat, "quantity": qty} for cat, qty in category_counts.items()]

def get_low_stock_items_dashboard(threshold=10) -> List[Dict]:
    docs = db.collection("Inventory Items").where(filter=FieldFilter("stock_quantity", "<=", threshold)).stream()
    return [doc.to_dict() | {"id": doc.id} for doc in docs]  ##Already present in inventory.py

def get_overdue_payments(days_overdue=0) -> List[Dict]:
    from datetime import datetime, timedelta
    today = datetime.utcnow()
    docs = db.collection("clients").where(filter=FieldFilter("total_due", ">", 0)).stream()

    overdue = []
    for doc in docs:
        data = doc.to_dict()
        last_payment_date = data.get("last_payment_date")
        if isinstance(last_payment_date, datetime):
            overdue_days = (today - last_payment_date).days
            if overdue_days > days_overdue:
                data["overdue_days"] = overdue_days
                data["id"] = doc.id
                overdue.append(data)
    return sorted(overdue, key=lambda x: x["overdue_days"], reverse=True) ## Check if it is anywhere


from datetime import datetime, timedelta

def get_date_range(period="monthly"):
    today = datetime.utcnow()
    if period == "weekly":
        start = today - timedelta(days=today.weekday())  # Monday
        end = start + timedelta(days=6)
    elif period == "monthly":
        start = today.replace(day=1)
        end = (start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
    else:
        start = end = today
    return start, end

def get_available_months() -> List[str]:
    """Return list of YYYY-MM strings that exist as documents in Firestore `doc_counters`.

    The dashboard month dropdown can use this to show only months that have data.
    """
    pattern = re.compile(r"^\d{4}-\d{2}$")  # simple YYYY-MM
    docs = db.collection("doc_counters").stream()
    months: List[str] = []
    for doc in docs:
        doc_id = doc.id
        if pattern.match(doc_id):
            months.append(doc_id)

    # Sort descending so latest month first
    months.sort(reverse=True)
    return months

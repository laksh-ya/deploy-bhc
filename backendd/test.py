# main.py - Complete Business Management API with Full Business Logic
import os
import logging
import time
import uuid
import re
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any, Optional, Union
from contextlib import asynccontextmanager
from enum import Enum
# FastAPI imports
from fastapi import FastAPI, HTTPException, Query, Request, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.routing import APIRoute
# Pydantic imports
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel, Field, validator, ValidationError
from dateutil.relativedelta import relativedelta
# Firebase imports
import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore import Increment
import tempfile
import pdfplumber
# Other imports
from dotenv import load_dotenv
import json
import base64
from passlib.context import CryptContext
from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.responses import StreamingResponse
from firebase_admin import auth as firebase_auth
from langchain.agents import AgentExecutor
from log_config import loggerr
import traceback
from firebase_config.agent import run_agent_streaming
  # your initialized LangChain agent
import asyncio



import os
import io
import json
import pytz
import requests
from datetime import datetime
from dotenv import load_dotenv

from fastapi import UploadFile, File, Form, Request, HTTPException, Depends
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleAuthRequest
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

# Load environment variables
load_dotenv()

# ================================
# LOGGING CONFIGURATION
# ================================

# Create logs directory if it doesn't exist
os.makedirs("logs", exist_ok=True)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("logs/app.log"),
        logging.StreamHandler()
    ]
)

# Global caches


# Create specific loggers
app_logger = logging.getLogger("app")
api_logger = logging.getLogger("api")
db_logger = logging.getLogger("database")
auth_logger = logging.getLogger("auth")

# ================================
# CONFIGURATION
# ================================

class Settings:
    FIREBASE_CREDENTIALS_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH", "./firebase-credentials.json")
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this")
    ALGORITHM = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

settings = Settings()

# ================================
# FIREBASE DATABASE SETUP
# ================================

class FirebaseDB:
    def __init__(self):
        try:
            if not firebase_admin._apps:
                if os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
                    cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
                    firebase_admin.initialize_app(cred)
                    db_logger.info("Firebase initialized with credentials file")
                else:
                    # Try to initialize with default credentials (for production)
                    firebase_admin.initialize_app()
                    db_logger.info("Firebase initialized with default credentials")
            
            self.db = firestore.client()
            db_logger.info("Firestore client created successfully")
        except Exception as e:
            db_logger.error(f"Failed to initialize Firebase: {e}")
            raise
    
    def get_collection(self, collection_name: str):
        return self.db.collection(collection_name)
    
    def get_document(self, collection_name: str, doc_id: str):
        return self.db.collection(collection_name).document(doc_id)
    def collection(self, name: str):
        return self.db.collection(name)

# Global database instance
firebase_db = FirebaseDB()

# ================================
# LOGGING UTILITIES
# ================================



async def lifespan(app: FastAPI):
    app_logger.info("Starting Business Management API with Complete Business Logic")
    await preload_dropdown_data()

    
    print("\n🔍 Registered Routes:")
    for route in app.routes:
        if isinstance(route, APIRoute):
            print(f"{route.path} → {route.name}")

    yield

    app_logger.info("Shutting down Business Management API")

app = FastAPI(
    title="Business Management API - Complete Business Logic",
    description="Complete order management system with inventory updates and employee tracking",
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Security middleware
app.add_middleware(
      CORSMiddleware,
      allow_origins=["*"],  # Adjust to your frontend URL
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )

# CORS middleware


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Get user info
    user = request.headers.get("X-User-ID", "anonymous")
    
    # Log request start
    api_logger.info(
        f"REQUEST START: {user} - {request.method} {request.url.path} - "
        f"IP: {request.client.host} - UA: {request.headers.get('user-agent', 'Unknown')[:50]}"
    )
    
    response = await call_next(request)
    process_time = time.time() - start_time
    
    # Log request completion
    api_logger.info(
        f"REQUEST END: {user} - {request.method} {request.url.path} - "
        f"Status: {response.status_code} - Time: {process_time:.4f}s"
    )
    
    return response

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    user = request.headers.get("X-User-ID", "anonymous")
    
    
    
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error_id": str(uuid.uuid4())}
    )


CLIENTS_CACHE = []
SUPPLIERS_CACHE = []
INVENTORY_CACHE = []

@app.on_event("startup")
async def show_registered_routes():
    print("\n🔍 Registered Routes:")
    for route in app.routes:
        if isinstance(route, APIRoute):
            print(f"{route.path} → {route.name}")


async def preload_dropdown_data():
    global CLIENTS_CACHE, SUPPLIERS_CACHE, INVENTORY_CACHE

    CLIENTS_CACHE = [
        {"id": doc.id, "name": data.get("name", "")}
        for doc in firebase_db.collection("Clients").order_by("name").limit(10).stream()
        if (data := doc.to_dict())
    ]

    SUPPLIERS_CACHE = [
        {"id": doc.id, "name": data.get("name", "")}
        for doc in firebase_db.collection("Suppliers").order_by("name").limit(10).stream()
        if (data := doc.to_dict())
    ]

    INVENTORY_CACHE = [
        {
            "id": doc.id,
            "name": data.get("name", ""),
            "rate": data.get("rate", 0),
            "tax_percent": data.get("tax_percent", 0),
            "category": data.get("category", "")
        }
        for doc in firebase_db.collection("Inventory Items").order_by("name").limit(10).stream()
        if (data := doc.to_dict())
    ]



@app.get("/debug/cache")
def debug_cache():
    return {
        "clients_len": len(CLIENTS_CACHE),
        "suppliers_len": len(SUPPLIERS_CACHE),
        "inventory_len": len(INVENTORY_CACHE)
    }

class LoginRequest(BaseModel):
    email: str
    password: str

security = HTTPBearer(auto_error=False)

class TimestampMixin():
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class PaginationResponse(BaseModel):
    current_page: int
    total_pages: int
    total_items: int
    items_per_page: int
    has_next: bool
    has_prev: bool


app_logger = logging.getLogger("app")

class OffsetPaginator:
    @staticmethod
    async def optimized_paginate_orders(
        collection_ref,
        page: int = 1,
        limit: int = 10,
        filters: Dict[str, Any] = None,
        order_by: str = "created_at",
        order_direction: str = "desc",
        lightweight_search: Optional[str] = None,
        search_fields: Optional[List[str]] = None
    ) -> dict:
        try:
            query = collection_ref

            # Apply filters
            if filters:
                for field, value in filters.items():
                    if value is not None:
                        query = query.where(field, "==", value)

            # Apply ordering
            direction = firestore.Query.DESCENDING if order_direction == "desc" else firestore.Query.ASCENDING
            query = query.order_by(order_by, direction=direction)

            # Offset pagination
            offset = (page - 1) * limit
            query = query.offset(offset).limit(limit)

            docs = list(query.stream())
            items = []

            for doc in docs:
                data = doc.to_dict()

                if lightweight_search and search_fields:
                    # Create searchable text by combining all specified fields
                    search_text = " ".join(str(data.get(field, "")).lower() for field in search_fields)
                    if lightweight_search.lower() not in search_text:
                        continue

                items.append(data)

            # Get total count (fallback)
            total_items = None
            try:
                total_query = collection_ref
                if filters:
                    for field, value in filters.items():
                        if value is not None:
                            total_query = total_query.where(field, "==", value)
                total_items = len(list(total_query.stream()))
            except Exception as e:
                app_logger.warning(f"Could not fetch total count: {e}")
                total_items = None

            total_pages = (total_items + limit - 1) // limit if total_items is not None else None

            return {
                "items": items,
                "pagination": {
                    "current_page": page,
                    "items_per_page": limit,
                    "total_items": total_items,
                    "total_pages": total_pages,
                    "has_next": total_pages is not None and page < total_pages,
                    "has_prev": page > 1
                }
            }

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Optimized pagination error: {str(e)}")

    @staticmethod
    async def get_total_count(
        collection_ref,
        order_type: Optional[str] = None,
        payment_status: Optional[str] = None,
        status: Optional[str] = None,
        client_id: Optional[str] = None,
        supplier_id: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> int:
        try:
            query = collection_ref

            if order_type:
                query = query.where("order_type", "==", order_type)
            if payment_status:
                query = query.where("payment_status", "==", payment_status)
            if status:
                query = query.where("status", "==", status)
            if client_id:
                query = query.where("client_id", "==", client_id)
            if supplier_id:
                query = query.where("supplier_id", "==", supplier_id)
            if date_from:
                query = query.where("created_at", ">=", date_from)
            if date_to:
                query = query.where("created_at", "<=", date_to)

            # Try Firebase aggregation query
            try:
                count_query = query.count()
                count_result = count_query.get()
                return count_result[0][0].value
            except:
                # Fallback: fetch minimal data
                docs = query.select([]).stream()
                return len(list(docs))

        except Exception as e:
            app_logger.error(f"Error getting total count: {e}")
            return 0


class OrderItem(BaseModel):
    item_id: str = Field(..., min_length=1)
    item_name: str = Field(..., min_length=1, max_length=100)
    batch_number: Optional[str] = Field(None, description="Batch number (optional)")
    Expiry: Optional[str] = Field(None, description="Expiry in MM/YYYY format (optional)")
    quantity: float = Field(..., gt=0)
    price: float = Field(..., gt=0)
    tax: float = Field(default=0, ge=0, le=100)
    discount: float = Field(default=0, ge=0)


class OrderBase(BaseModel):
    # Common fields for all order types
    amount_paid: float = Field(default=0, ge=0, description="Amount paid")
    discount: float = Field(default=0, ge=0, description="Total discount")
    discount_type: str = Field(default="percentage", pattern=r'^(percentage|fixed)$', description="Discount type")
    draft: bool = Field(default=False, description="Is this a draft order")
    items: List[OrderItem] = Field(..., min_items=1, description="List of order items")
    order_date: datetime = Field(default_factory=datetime.utcnow, description="Order date")
    order_type: str = Field(..., pattern=r'^(sale|purchase|delivery_challan)$', description="Type of order")
    payment_method: str = Field(..., min_length=1, max_length=50, description="Payment method")
    payment_status: str = Field(default="pending", pattern=r'^(pending|paid|partial)$', description="Payment status")
    remarks: str = Field(default="", max_length=500, description="Additional remarks")
    status: str = Field(default="pending", pattern=r'^(pending|processing|completed|cancelled)$', description="Order status")
    total_amount: float = Field(..., gt=0, description="Total order amount")
    total_quantity: float = Field(..., gt=0, description="Total quantity of items")
    total_tax: float = Field(default=0, ge=0, description="Total tax amount")


class SaleOrderCreate(OrderBase):
    invoice_number: str = Field(..., min_length=1, max_length=50, description="Invoice number (will be used as Firebase doc ID)")
    client_id: Optional[str] = Field(None, description="Client ID")
    client_name: Optional[str] = Field(None, min_length=1, max_length=100, description="Client name")
    
    @validator('order_type')
    def validate_order_type(cls, v):
        if v != 'sale':
            raise ValueError('Order type must be "sale" for sale orders')
        return v
    



class PurchaseOrderCreate(OrderBase):
    invoice_number: str = Field(..., min_length=1, max_length=50, description="Invoice number (will be used as Firebase doc ID)")
    supplier_id: Optional[str] = Field(None, description="Supplier ID")
    supplier_name: Optional[str] = Field(None, min_length=1, max_length=100, description="Supplier name")
    
    @validator('order_type')
    def validate_order_type(cls, v):
        if v != 'purchase':
            raise ValueError('Order type must be "purchase" for purchase orders')
        return v
    
class DeliveryChallanCreate(OrderBase):
    challan_number: str = Field(..., min_length=1, max_length=50, description="Challan number (will be used as Firebase doc ID)")
    client_id: Optional[str] = Field(None, description="Client ID")
    client_name: Optional[str] = Field(None, min_length=1, max_length=100, description="Client name")
    amount_collected_by: Optional[str] = Field(None, min_length=1, max_length=100, description="Employee who collected amount")
    link: Optional[str] = Field(default="", max_length=500, description="Related link or reference")
    
    @validator('order_type')
    def validate_order_type(cls, v):
        if v != 'delivery_challan':
            raise ValueError('Order type must be "delivery_challan" for delivery challan orders')
        return v


class Order(BaseModel, TimestampMixin):
    # All possible fields
    invoice_number: Optional[str] = None
    challan_number: Optional[str] = None
    order_type: str
    client_id: Optional[str] = None
    client_name: Optional[str] = None
    supplier_id: Optional[str] = None
    supplier_name: Optional[str] = None
    items: List[OrderItem]
    total_quantity: float
    total_tax: float
    total_amount: float
    discount: float
    discount_type: str
    payment_status: str
    payment_method: str
    amount_paid: float
    amount_collected_by: Optional[str] = None
    status: str
    remarks: Optional[str]
    order_date: datetime
    link: Optional[str] = None
    draft: bool
    created_by: str
    updated_by: str



class OrderUpdate(BaseModel):
    payment_status: Optional[str] = Field(None, pattern=r'^(pending|paid|partial)$')
    status: Optional[str] = Field(None, pattern=r'^(pending|processing|completed|cancelled)$')
    amount_paid: Optional[float] = Field(None, ge=0)
    remarks: Optional[str] = Field(None, max_length=500)
    discount: Optional[float] = Field(None, ge=0)
    payment_method: Optional[str] = Field(None, min_length=1, max_length=50)
    amount_collected_by: Optional[str] = Field(None, min_length=1, max_length=100)
    link: Optional[str] = Field(None, max_length=500)


class OrderItemSummary(BaseModel):
    item_id: Optional[str] = None
    item_name: Optional[str] = None
    quantity: float
    batch_number: Optional[str] = None

class OrderSummary(BaseModel):
    invoice_number: Optional[str] = None
    challan_number: Optional[str] = None
    order_type: str  # "sale" or "delivery_challan"
    order_date: datetime
    total_amount: float
    amount_paid: float
    payment_status: str
    items: List[OrderItemSummary]
    link: Optional[str] = None

class OrderListResponse(BaseModel):
    orders: List[Order]
    pagination: PaginationResponse 
class OrderType(str, Enum):
    sale = "sale"
    purchase = "purchase"
    delivery_challan = "delivery_challan"
   
class OrderType(str, Enum):
    sale = "sale"
    purchase = "purchase"
    delivery_challan = "delivery_challan"



class SupplierBase(BaseModel):

    name: str = Field(..., min_length=1, max_length=100)
    contact: Optional[str] = Field(None, max_length=15)
    address: Optional[str] = Field(None, max_length=500)
    due: int = Field(default=0, ge=0)

class SupplierCreate(SupplierBase):
    pass
class SupplierUpdate(BaseModel):

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    contact: Optional[str] = Field(None, max_length=15)
    address: Optional[str] = Field(None, max_length=500)
    due: Optional[int] = Field(None, ge=0)


class Supplier(SupplierBase, TimestampMixin):
    id: str



class SupplierPaginatedResponse(BaseModel):
    items: List[Supplier]
    pagination: Dict[str,Any]

    
class BatchInfo(BaseModel):
    batch_number: str
    expiry_date: Optional[str] = None



class InventoryBatch(BaseModel):
    batch_number: str
    Expiry: datetime
    quantity: float

    @validator("Expiry", pre=True)
    def parse_expiry_date(cls, v):
        if isinstance(v, datetime):
            # If already a datetime object, ensure it's UTC-aware
            if v.tzinfo is None:
                # Assume naive datetimes from DB are UTC if no tzinfo
                return v.replace(tzinfo=timezone.utc)
            return v.astimezone(timezone.utc) # Convert to UTC if it has a different timezone

        if isinstance(v, str):
            # Try parsing YYYY-MM (from frontend type="month")
            try:
                # Parse as naive, then make UTC-aware
                return datetime.strptime(v, "%Y-%m").replace(tzinfo=timezone.utc)
            except ValueError:
                pass
            # Try parsing MM/YYYY (for existing data or other sources)
            try:
                # Parse as naive, then make UTC-aware
                return datetime.strptime(v, "%m/%Y").replace(tzinfo=timezone.utc)
            except ValueError:
                pass
            # Try parsing ISO format (e.g., from Firebase direct timestamp strings)
            try:
                # fromisoformat handles tzinfo if present. Ensure it's UTC.
                dt = datetime.fromisoformat(v.replace('Z', '+00:00')) # Handles 'Z' as UTC
                return dt.astimezone(timezone.utc) # Convert to UTC if it's in another timezone or already UTC
            except ValueError:
                pass

        raise ValueError("Expiry must be in YYYY-MM, MM/YYYY, ISO format, or datetime object.")
# --- Inventory Create Model ---
class InventoryItemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    category: str = Field(..., min_length=1, max_length=50)
    low_stock_threshold: float = Field(..., gt=0)
    stock_quantity: float = Field(default=0, ge=0)
    batches: Optional[List[InventoryBatch]] = Field(default_factory=list)

# --- Inventory Base Model with Timestamps ---
class TimestampMixin(BaseModel):
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# --- Inventory Read Model ---
class InventoryItem(InventoryItemCreate, TimestampMixin):
    id: str
    
    class Config:
            from_attributes = True # no need to redefine `id`

# --- Inventory Update Model ---
class InventoryItemUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    category: Optional[str] = Field(None, min_length=1, max_length=50)
    low_stock_threshold: Optional[float] = Field(None, gt=0)
    stock_quantity: Optional[float] = Field(None, ge=0)
    batches: Optional[List[InventoryBatch]] = None

class InventoryListResponse(BaseModel):
    items: List[InventoryItem]
    pagination: PaginationResponse



class ClientBase(BaseModel):

    name: str = Field(..., min_length=1, max_length=100)
    PAN: Optional[str] = Field(default=None, max_length=10)
    GST: Optional[str] = Field(default=None, max_length=15)
    POC_name: Optional[str] = Field(default=None, max_length=100)
    POC_contact: Optional[str] = Field(default=None, max_length=15)
    address: Optional[str] = Field(default=None, max_length=500)
    due_amount: int = Field(default=0, ge=0)

class ClientCreate(ClientBase):
    pass

class ClientUpdate(BaseModel):

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    PAN: Optional[str] = Field(None, max_length=10)
    GST: Optional[str] = Field(None, max_length=15)
    POC_name: Optional[str] = Field(None, max_length=100)
    POC_contact: Optional[str] = Field(None, max_length=15)
    address: Optional[str] = Field(None, max_length=500)
    due_amount: Optional[int] = Field(None,ge=0)

class Client(ClientBase, TimestampMixin):
    id: str

# Client Dues Report Model
class ClientDueReport(BaseModel):
    name: str = Field(..., alias="client name")
    poc_name: str = Field(..., alias="person of contact")
    poc_contact: str = Field(..., alias="contact number")
    due_amount: int = Field(..., alias="due")

    class Config:
        populate_by_name = True # Allows mapping of aliases during validation/serialization

class Pagination(BaseModel):
    current_page: int
    total_pages: Optional[int]
    total_items: Optional[int]
    items_per_page: int
    has_next: bool
    has_prev: bool


class ClientListResponse(BaseModel):
    items: List[Client]
    pagination: Dict[str, Any]

class ClientDueReportPaginatedResponse(BaseModel):
    items: List[ClientDueReport]
    pagination: Dict[str, Any]

class ClientHistoryResponse(BaseModel):
    orders: List[OrderSummary]
    pagination: Pagination

# ========


class ExpenseBase(BaseModel):
    
    amount: float
    category: str
    paid_by: str
    remarks: Optional[str] = ""
    created_at: datetime  # or datetime if you’re parsing it earlier
    

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    category: Optional[str] = Field(None, min_length=1, max_length=50)
    remarks: Optional[str] = Field(None, min_length=0, max_length=500)
    paid_by: Optional[str] = Field(None, min_length=1, max_length=100)

class Expense(ExpenseBase, TimestampMixin):
    id: str

class PaymentStatusUpdate(BaseModel):
    payment_status: str = Field(..., pattern=r'^(pending|paid|partial)$')
    amount_paid: Optional[float] = Field(None, ge=0)
    payment_method: Optional[str] = Field(None, min_length=1, max_length=50)
    amount_collected_by: Optional[str] = Field(None, min_length=1, max_length=100, description="Employee who collected (for delivery challans)")

class PaymentRecord(BaseModel):
    id: str
    order_type: str
    invoice_number: Optional[str] = None # <-- Added
    challan_number: Optional[str] = None
    payment_type: str  # "received" or "paid"
    client_name: Optional[str] = None
    supplier_name: Optional[str] = None
    amount_paid: float
    payment_status: str
    amount_collected_by: Optional[str] = None
    paid_by: Optional[str] = None
    created_at: datetime
    payment_type: Optional[str] = None


class PaymentListResponse(BaseModel):
    payments: List[PaymentRecord]
    pagination: PaginationResponse

class EmployeeBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    # Standardized phone validation for 10 digits for consistency
    phone: Optional[int] = Field( default=0) 
    paid: Optional[int] = Field(default=0, ge=0)
    collected: Optional[int] = Field(default=0, ge=0)

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone: Optional[int] = Field(default=0)
    paid: Optional[int] = Field(None, ge=0)
    collected: Optional[int] = Field(None, ge=0)

class Employee(EmployeeBase, TimestampMixin):
    id: str
# --- End User-Provided Pydantic Models ---

# REMOVED PaginationResponse as it's no longer used for employees list

# Simplified EmployeeListResponse (no pagination metadata)
class EmployeeListResponse(BaseModel):
    items: List[Employee]

class OrderTypeEnum(str, Enum): # Renamed to avoid conflict with potential variable 'OrderType'
    sale = "sale"
    purchase = "purchase"
    delivery_challan = "delivery_challan"




class EmployeeService:
    @staticmethod
    async def update_employee_collection(employee_name: str, amount: float, user: str = "system", order_id: str = ""):
        """
        Update employee's collected amount when they collect payment for delivery challan
        and update doc_counters for employees.
        """
        try:
            employees_ref = firebase_db.get_collection("Employees")
            employee_query = employees_ref.where("name", "==", employee_name).limit(1)
            employee_docs = list(employee_query.stream())
            
            if employee_docs:
                employee_doc = employee_docs[0]
                employee_ref = firebase_db.get_document("Employees", employee_doc.id)
                employee_data = employee_doc.to_dict()
                
                old_collected = employee_data.get("collected", 0)
                new_collected = old_collected + amount
                
                employee_ref.update({
                    "collected": new_collected,
                    "updated_at": datetime.utcnow()
                })

                # Update doc_counters for employees
                firebase_db.get_document("doc_counters", "employees").update({
                    "total_collected": firestore.Increment(amount),
                    "updated_at": datetime.utcnow()
                })
                
                
                
                return True
            else:
                # ActivityLogger.log_warning(f"Employee '{employee_name}' not found for collection update for order {order_id}")
                return False
                
        except Exception as e:
            
            return False

    @staticmethod
    async def revert_employee_collection(employee_name: str, amount: float, user: str = "system", order_id: str = ""):
        """
        Reverts employee's collected amount when a delivery challan is deleted.
        """
        try:
            employees_ref = firebase_db.get_collection("Employees")
            employee_query = employees_ref.where("name", "==", employee_name).limit(1)
            employee_docs = list(employee_query.stream())
            
            if employee_docs:
                employee_doc = employee_docs[0]
                employee_ref = firebase_db.get_document("Employees", employee_doc.id)
                employee_data = employee_doc.to_dict()
                
                old_collected = employee_data.get("collected", 0)
                new_collected = old_collected - amount
                
                employee_ref.update({
                    "collected": new_collected,
                    "updated_at": datetime.utcnow()
                })

                # Update doc_counters for employees
                firebase_db.get_document("doc_counters", "employees").update({
                    "total_collected": firestore.Increment(-amount),
                    "updated_at": datetime.utcnow()
                })
                
                
                return True
            else:
                # ActivityLogger.log_warning(f"Employee '{employee_name}' not found for collection revert for order {order_id}")
                return False
                
        except Exception as e:
            
            return False
    
    @staticmethod
    async def update_employee_collection(employee_name: str, amount: float, user: str = "system", order_id: str = ""):
        """Update employee's collected amount when they collect payment for delivery challan"""
        try:
            # Find employee by name
            employees_ref = firebase_db.get_collection("Employees")
            employee_query = employees_ref.where("name", "==", employee_name).limit(1)
            employee_docs = list(employee_query.stream())
            
            if employee_docs:
                employee_doc = employee_docs[0]
                employee_ref = firebase_db.get_document("Employees", employee_doc.id)
                employee_data = employee_doc.to_dict()
                
                old_collected = employee_data.get("collected", 0)
                new_collected = old_collected + amount
                
                employee_ref.update({
                    "collected": new_collected,
                    "updated_at": datetime.utcnow()
                })
                
                
                
                return True
            else:
                app_logger.warning(f"Employee '{employee_name}' not found for collection update")
                return False
                
        except Exception as e:
            
            return False



class SupplierService:
    @staticmethod
    def update_due(supplier_id: str, delta_due: float, user: str = "system", order_id: str = ""):
        """
        Update the due amount for a specific supplier and also update doc_counters.
        `delta_due` can be positive (increase due) or negative (reduce due on payment).
        """
        supplier_ref = firebase_db.get_document("Suppliers", supplier_id)
        supplier_doc = supplier_ref.get()

        if supplier_doc.exists:
            supplier_data = supplier_doc.to_dict()
            current_due = supplier_data.get("due", 0)
            new_due = current_due + delta_due

            supplier_ref.update({
                "due": new_due,
                "updated_at": datetime.utcnow()
            })

            # Update doc_counters for suppliers
            firebase_db.get_document("doc_counters", "suppliers").update({
                "total_due": firestore.Increment(delta_due), # Assuming 'total_due' is the field for total outstanding due
                "updated_at": datetime.utcnow()
            })

        else:
            pass

class ClientService:
    @staticmethod
    def update_due(client_id: str, delta_due: float, user: str = "system", order_id: str = ""):
        """Update the due amount for a specific client and update doc_counters"""
        client_ref = firebase_db.get_document("Clients", client_id)
        client_doc = client_ref.get()

        if client_doc.exists:
            client_data = client_doc.to_dict()
            new_due = client_data.get("due_amount", 0) + delta_due
            client_ref.update({
                "due_amount": new_due,
                "updated_at": datetime.utcnow()
            })

            # Update global counter
            firebase_db.get_document("doc_counters", "clients").update({
                "total_due": firestore.Increment(delta_due),
                "updated_at": datetime.utcnow()
            })
            
        else:
            pass

class CounterService:
    """
    Service class for managing sequential IDs and associated counters in Firestore.
    This class handles atomic updates to 'doc_counters' collection.
    """
    @staticmethod
    async def get_next_id(collection_name: str, user: str = "system") -> str:
        """
        Generates the next unique ID for a specified collection (e.g., "clients", "orders").
        Atomically updates the 'last_id' and increments the 'total' count for that collection.
        """
        try:
            # Get reference to the specific counter document (e.g., 'doc_counters/clients')
            counter_ref = firebase_db.get_document("doc_counters", collection_name)
            counter_doc = counter_ref.get() # Fetch the current state of the counter

            if counter_doc.exists:
                data = counter_doc.to_dict()
                last_id = data.get("last_id", "")

                if last_id:
                    # Extract prefix (e.g., 'C' from 'C0001') and increment number
                    prefix = last_id[0]
                    number = int(last_id[1:]) + 1
                else:
                    # Initialize if last_id is missing but document exists
                    prefix = collection_name[0].upper() # Use first letter of collection name as prefix
                    number = 1

                new_id = f"{prefix}{number:04d}" # Format new ID (e.g., "C0005")

                # Atomically update 'last_id' and increment 'total' count.
                # This is the primary place where 'total' is incremented for new IDs.
                counter_ref.update({
                    "last_id": new_id,
                    "total": firestore.Increment(1) # Uses firestore.Increment for atomic update
                })

                # Removed ActivityLogger.log_activity as per request
                return new_id
            else:
                # If the counter document does not exist, initialize it
                prefix = collection_name[0].upper()
                new_id = f"{prefix}0001"
                # Create the document with initial values
                counter_ref.set({
                    "last_id": new_id,
                    "total": 1 # Initial total count
                })

                # Removed ActivityLogger.log_activity as per request
                return new_id

        except Exception as e:
            # Removed ActivityLogger.log_error as per request
            raise HTTPException(status_code=500, detail=f"Error generating ID: {str(e)}")

    @staticmethod
    async def update_financial_summary(user: str = "system"):
        """
        Calculates and updates the financial summary counters (total income, total expenses, net profit).
        Note: This method is not called within the provided client routes, but included as per your code.
        """
        try:
            # Get all expenses (assuming 'amount' field)
            expenses_ref = firebase_db.get_collection("Expenses")
            expenses = expenses_ref.stream()
            total_expenses = sum(doc.to_dict().get("amount", 0) for doc in expenses)

            # Get all sales orders (assuming 'sell' order_type and 'total_amount' field)
            orders_ref = firebase_db.get_collection("Orders")
            orders = orders_ref.where("order_type", "==", "sell").stream()
            total_income = sum(doc.to_dict().get("total_amount", 0) for doc in orders)

            # Update the 'financial_summary' document in 'doc_counters'
            financial_ref = firebase_db.get_document("doc_counters", "financial_summary")
            financial_data = {
                "total_income": total_income,
                "total_expense": total_expenses,
                "net_profit": total_income - total_expenses,
                "last_updated_at": datetime.utcnow()
            }
            financial_ref.set(financial_data) # Overwrites with latest calculated values

            # Removed ActivityLogger.log_activity as per request

        except Exception as e:
            # Removed ActivityLogger.log_error as per request
            # For a critical financial summary update, you might want more robust error alerting here.
            pass # Or handle more explicitly if this error needs to be propagated/logged elsewhere

async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security) # Optional dependency if security is not always present
) -> str:
    """
    Extracts the current user ID from request headers (X-User-ID) or a JWT token.
    Defaults to "system" if no user can be identified.
    """
    try:
        # Prioritize custom header for user ID
        user = request.headers.get("X-User-ID") or request.headers.get("x-user-id")

        if user:
            # Removed auth_logger.info as per request
            return user

        # Fallback to Authorization header credentials
        if credentials:
            token = credentials.credentials
            if token:
                # IMPORTANT: In a production app, replace this with proper JWT decoding and validation.
                # This is a placeholder for basic token-based user identification.
                user = f"user_{token[:8]}" # Example: extracts first 8 chars of token as user ID
                # Removed auth_logger.info as per request
                return user

        # Default user if no identification method succeeds
        return "system"

    except Exception as e:
        # Removed auth_logger.error as per request
        # Return default user even on error to prevent blocking other functionalities
        return "system"

# --- API Endpoints ---

@app.get("/api/v1/clients", response_model=ClientListResponse, summary="Get Paginated Clients List")
async def get_clients(
    page: int = Query(1, ge=1),
    limit: int = Query(9, ge=1, le=100),
    search: Optional[str] = None
):
    """
    Retrieves a paginated list of clients with EFFICIENT server-side search.
    """
    try:
        query = firebase_db.get_collection("Clients")

        # FIX: Implement the same efficient search as the suppliers endpoint
        if search:
            query = query.where("name", ">=", search).where("name", "<=", search + u"\uf8ff")

        # Use efficient count for pagination
        count_query = query.count()
        total_items_result = count_query.get()
        total_items = total_items_result[0][0].value if total_items_result else 0
        total_pages = (total_items + limit - 1) // limit if total_items > 0 else 0

        # Fetch the paginated documents
        # Note: Firestore may require a composite index if you order by a different field.
        # Sticking with order_by("name") is simplest for search.
        paginated_query = query.order_by("name").offset((page - 1) * limit).limit(limit)
        docs = paginated_query.stream()
        items = [Client(**doc.to_dict()) for doc in docs]

        return {
            "items": items,
            "pagination": {
                "current_page": page,
                "items_per_page": limit,
                "total_items": total_items,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch clients: {str(e)}")
@app.post("/api/v1/clients", response_model=Client, status_code=201, summary="Create a New Client")
async def create_client(
    client_create: ClientCreate, # Request body validated by ClientCreate Pydantic model
    request: Request, # Request is added back as it was in your working code
    current_user: str = Depends(get_current_user)
):
    """
    Creates a new client document in Firestore.
    Generates a unique client ID and atomically updates global client counters.
    """
    try:
        # ✅ COUNTERS: Generate a unique client ID using CounterService.
        # This function (CounterService.get_next_id) already handles:
        # 1. Generating a new sequential ID (e.g., C0001).
        # 2. Updating 'last_id' in 'doc_counters/clients'.
        # 3. Incrementing the 'total' client count in 'doc_counters/clients' by 1.
        client_id = await CounterService.get_next_id("clients", current_user)

        now = datetime.utcnow() # Get current UTC time for timestamps

        # Convert Pydantic model to dictionary, excluding unset fields
        # Using .model_dump() for Pydantic V2. If using Pydantic V1, change to .dict().
        client_data = client_create.model_dump()

        # Add system-managed fields
        client_data.update({
            "id": client_id,
            "created_at": now,
            "updated_at": now,
            "created_by": current_user,
            "updated_by": current_user,
        })

        # ✅ Write the new client document to the "Clients" collection
        # Uses your `firebase_db.get_document` helper
        firebase_db.get_document("Clients", client_id).set(client_data)

        # ✅ COUNTERS: Atomically update 'total_due' in 'doc_counters/clients'.
        # The 'total' count is NOT incremented here again, as it's handled by CounterService.
        firebase_db.get_document("doc_counters", "clients").update({
            # Removed: "total": firestore.Increment(1), # This was the redundant increment
            "total_due": firestore.Increment(client_create.due_amount), # Increment total_due by new client's due_amount
            "updated_at": now # Update the timestamp on the counter document
        })

        # Removed ActivityLogger.log_activity as per request

        # Return the created client data, validated by the Client Pydantic model
        return Client(**client_data)

    except Exception as e:
        # Removed ActivityLogger.log_error as per request
        raise HTTPException(status_code=500, detail=f"Failed to create client: {str(e)}")

@app.get("/api/v1/clients/{client_id}", response_model=Client, summary="Get Client by ID")
async def get_client(
    client_id: str, # Path parameter for client ID
    request: Request, # Request is added back
    current_user: str = Depends(get_current_user)
):
    """
    Retrieves a single client document by its ID.
    Returns 404 if the client is not found.
    """
    try:
        # Get document reference using your `firebase_db.get_document` helper
        client_doc_ref = firebase_db.get_document("Clients", client_id)
        client_doc = client_doc_ref.get()

        if not client_doc.exists:
            # Raise 404 if the document does not exist
            raise HTTPException(status_code=404, detail="Client not found")

        # Convert Firestore document to dictionary and return it
        client_data = client_doc.to_dict()

        # Removed ActivityLogger.log_activity as per request

        return Client(**client_data) # Ensure proper Pydantic model conversion

    except HTTPException:
        # Re-raise HTTPException if it was already raised (e.g., 404)
        raise
    except Exception as e:
        # Removed ActivityLogger.log_error as per request
        raise HTTPException(status_code=500, detail=f"Failed to fetch client: {str(e)}")

@app.put("/api/v1/clients/{client_id}", response_model=Client, summary="Update Client by ID")
async def update_client(
    client_id: str,
    client_update: ClientUpdate, # Request body for partial updates
    request: Request, # Request is added back
    current_user: str = Depends(get_current_user)
):
    """
    Updates an existing client document in Firestore.
    Atomically syncs changes to the total_due counter if the due_amount is modified.
    """
    try:
        # Get document reference using your `firebase_db.get_document` helper
        client_doc_ref = firebase_db.get_document("Clients", client_id)
        client_doc = client_doc_ref.get()

        if not client_doc.exists:
            raise HTTPException(status_code=404, detail="Client not found")

        old_client_data = client_doc.to_dict() # Get current data for comparison

        # Convert Pydantic model to dictionary, only including fields that were actually set in the request.
        # Using .model_dump(exclude_unset=True) for Pydantic V2. For V1, use .dict(exclude_unset=True).
        update_data = client_update.model_dump(exclude_unset=True)

        # Add update timestamps and user
        update_data["updated_at"] = datetime.utcnow()
        update_data["updated_by"] = current_user

        # ✅ COUNTERS: Update 'total_due' counter if 'due_amount' is being updated
        if "due_amount" in update_data:
            old_due_amount = old_client_data.get("due_amount", 0)
            new_due_amount = update_data["due_amount"]
            delta_due = new_due_amount - old_due_amount # Calculate the change in due amount

            # Atomically increment/decrement 'total_due' by the delta
            firebase_db.get_document("doc_counters", "clients").update({
                "total_due": firestore.Increment(delta_due), # Uses firestore.Increment
                "updated_at": datetime.utcnow()
            })

        # Perform the update on the client document
        client_doc_ref.update(update_data)

        # Fetch the updated document to return the complete, current state
        updated_client_doc = client_doc_ref.get()
        updated_client_data = updated_client_doc.to_dict()
        loggerr.info(
            f"[update_client] Client {client_id} updated by {current_user} | Updated fields: {list(update_data.keys())}"
        )


        # Removed ActivityLogger.log_activity as per request

        return Client(**updated_client_data) # Ensure proper Pydantic model conversion

    except HTTPException:
        raise
    except Exception as e:
        # Removed ActivityLogger.log_error as per request
        raise HTTPException(status_code=500, detail=f"Failed to update client: {str(e)}")

@app.delete("/api/v1/clients/{client_id}", status_code=200, summary="Delete Client by ID")
async def delete_client(
    client_id: str,
    request: Request, # Request is added back
    current_user: str = Depends(get_current_user)
):
    """
    Deletes a client document from Firestore.
    Atomically decrements global client counters (total and total_due).
    """
    try:
        # Get document reference using your `firebase_db.get_document` helper
        client_doc_ref = firebase_db.get_document("Clients", client_id)
        client_doc = client_doc_ref.get()

        if not client_doc.exists:
            raise HTTPException(status_code=404, detail="Client not found")

        client_data_to_delete = client_doc.to_dict() # Get data before deletion for counter adjustment
        client_doc_ref.delete() # Delete the client document

        # ✅ COUNTERS: Atomically decrement 'total' and 'total_due'
        firebase_db.get_document("doc_counters", "clients").update({
            "total": firestore.Increment(-1), # Decrement total client count by 1
            "total_due": firestore.Increment(-client_data_to_delete.get("due_amount", 0)), # Decrement total_due by client's due amount
            "updated_at": datetime.utcnow()
        })

        # Removed ActivityLogger.log_activity as per request
        loggerr.info(
            f"[delete_client] Client {client_id} deleted by {current_user}"
        )

        return {"message": "Client deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        # Removed ActivityLogger.log_error as per request
        raise HTTPException(status_code=500, detail=f"Failed to delete client: {str(e)}")

@app.get("/api/v1/client-dues", response_model=ClientDueReportPaginatedResponse, summary="Get Paginated Client Dues Report")
async def get_client_dues_report(
    request: Request, # Request is added back
    page: int = Query(1, ge=1, description="Page number for pagination (starts at 1)"),
    limit: int = Query(50, ge=1, le=100, description="Number of items per page (maximum 100)"),
    search: Optional[str] = Query(None, description="Search term for client name"),
    current_user: str = Depends(get_current_user)
):
    """
    Retrieves a paginated report of clients with outstanding due amounts.
    Sorted by highest due amount in descending order.
    """
    try:
        # Get collection reference using your `firebase_db.get_collection` helper
        clients_collection_ref = firebase_db.get_collection("Clients")

        # Prepare filters dictionary
        filters = {}
        if search:
            filters["search_query"] = search
            filters["search_fields"] = ["name"] # Search only by client name for this report

        # ✅ PAGINATION: Use OffsetPaginator to get clients for the report
        pagination_result = await OffsetPaginator.optimized_paginate_orders(
            collection_ref=clients_collection_ref,
            page=page,
            limit=limit,
            filters=filters,
            order_by="due_amount", # Order by due_amount
            order_direction="desc", # Highest due amount first
        )

        # ✅ Transform into ClientDueReport format for the response model
        pagination_result["items"] = [
            ClientDueReport(
                # --- START OF CORRECTION ---
                # Ensure 'name' is always a string (default to empty string if None/missing)
                name=client.get("name") or "",
                # Ensure 'poc_name' is always a string (default to empty string if None/missing)
                poc_name=client.get("POC_name") or "",
                # --- END OF CORRECTION ---
                poc_contact=(lambda contact: 
                    f"+91 {contact[:5]} {contact[5:]}"
                    if contact.isdigit() and len(contact) == 10
                    else contact
                )(str(client.get("POC_contact")) if client.get("POC_contact") is not None else ""),
                due_amount=client.get("due_amount", 0)
            )
            for client in pagination_result["items"]
        ]

        return pagination_result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate client dues report: {str(e)}")
@app.get("/api/v1/clients/{client_id}/history", response_model=ClientHistoryResponse, summary="Get Client Order History")
async def get_client_history(
    client_id: str,
    page: int = Query(1, ge=1, description="Page number for pagination (starts at 1)"),
    limit: int = Query(10, ge=1, le=100, description="Number of items per page (maximum 100)"),
    order_type: Optional[str] = Query(None, pattern="^(sale|delivery_challan)$", description="Filter by order type (sale or delivery_challan)"),
    current_user: str = Depends(get_current_user),
    request: Request = None, # Request is added back
):
    """
    Retrieves paginated order history (sales or delivery challans) for a specific client.
    Orders are sorted by creation date, most recent first.
    """
    try:
        # Get collection reference using your `firebase_db.get_collection` helper
        orders_collection_ref = firebase_db.get_collection("Orders")

        # Build filters for the query that will be passed to the paginator
        query_filters = {"client_id": client_id}
        if order_type:
            query_filters["order_type"] = order_type

        # ✅ PAGINATION: Use OffsetPaginator for client order history.
        # This simplifies the pagination logic significantly.
        pagination_result = await OffsetPaginator.optimized_paginate_orders(
            collection_ref=orders_collection_ref,
            page=page,
            limit=limit,
            filters=query_filters, # Apply filters for client_id and optional order_type
            order_by="created_at",
            order_direction="desc" # Most recent orders first
        )

        # Calculate total amount on the current page for summary if needed
        # This line was present in your previous code but not returned/used.
        # total_amount = sum(order.get("total_amount", 0) for order in pagination_result["items"])

        # Removed ActivityLogger.log_activity as per request

        # Return orders and pagination info as per ClientHistoryResponse model
        return {
            "orders": pagination_result["items"],
            "pagination": pagination_result["pagination"]
        }

    except Exception as e:
        # Removed ActivityLogger.log_error as per request
        raise HTTPException(status_code=500, detail=f"Failed to fetch client history: {str(e)}")

@app.get("/api/v1/clients/{client_id}/total-orders", summary="Get Total Orders for a Client")
async def get_total_orders_for_client(
    client_id: str,
    current_user: str = Depends(get_current_user),
    request: Request = None # Request is added back
):
    """
    Gets the total count of 'sale' and 'delivery_challan' orders for a specific client.
    """
    try:
        # Construct the Firestore query to count relevant orders for the client
        query = firebase_db.get_collection("Orders") \
            .where("client_id", "==", client_id) \
            .where("order_type", "in", ["sale", "delivery_challan"]) # Filter by specific order types

        # Stream the results and count them.
        # NOTE: For very large order counts (e.g., millions), streaming all documents
        # to count them (`len(list(query.stream()))`) can be inefficient and costly.
        # Consider using Firestore's aggregate queries (if available and suitable for your plan)
        # or maintaining a separate counter for total client orders if performance is critical for this endpoint.
        total_orders = len(list(query.stream()))

        # Removed ActivityLogger.log_activity as per request

        return {"client_id": client_id, "total_orders": total_orders}
    except Exception as e:
        # Removed ActivityLogger.log_error as per request
        raise HTTPException(status_code=500, detail=f"Failed to fetch client total orders: {str(e)}")


def get_prefix_query(collection_ref, prefix: str, limit: int):
    return (
        collection_ref
        .where("name", ">=", prefix)
        .where("name", "<=", prefix + "\uf8ff")
        .order_by("name")
        .limit(limit)
    )


  

@app.get("/api/v1/dropdown/clients", response_model=dict)
async def get_clients_dropdown(
    search_prefix: str = Query(None, min_length=0),
    limit: int = Query(100, ge=1, le=1000)
):
    if not search_prefix or len(search_prefix) < 3:
        return {"items": CLIENTS_CACHE[:limit]}

    collection_ref = firebase_db.collection("Clients")
    docs = get_prefix_query(collection_ref, search_prefix, limit).stream()
    results = [{"id": doc.id, "name": doc.to_dict().get("name", "")} for doc in docs]
    return {"items": results}

@app.get("/api/v1/dropdown/suppliers", response_model=dict)
async def get_suppliers_dropdown(
    search_prefix: str = Query(None, min_length=0),
    limit: int = Query(100, ge=1, le=1000)
):
    if not search_prefix or len(search_prefix) < 3:
        return {"items": SUPPLIERS_CACHE[:limit]}

    collection_ref = firebase_db.collection("Suppliers")
    docs = get_prefix_query(collection_ref, search_prefix, limit).stream()
    results = [{"id": doc.id, "name": doc.to_dict().get("name", "")} for doc in docs]
    return {"items": results}

@app.get("/api/v1/dropdown/inventory", response_model=dict)
async def get_inventory_dropdown(
    search_prefix: str = Query(None, min_length=0),
    limit: int = Query(100, ge=1, le=1000)
):
    if not search_prefix or len(search_prefix) < 3:
        return {"items": INVENTORY_CACHE[:limit]}

    collection_ref = firebase_db.collection("Inventory Items")
    docs = get_prefix_query(collection_ref, search_prefix, limit).stream()
    results = [
        {
            "id": doc.id,
            "name": data.get("name", ""),
            "rate": data.get("rate", 0),
            "tax_percent": data.get("tax_percent", 0),
            "category": data.get("category", "")
        }
        for doc in docs if (data := doc.to_dict())
    ]
    return {"items": results}



@app.get("/api/v1/dropdown/batches/{item_id}", response_model=Dict[str, List[str]])
def get_batches_dropdown(
    item_id: str,
    limit: int = Query(100, ge=1, le=1000)
):
    if not item_id:
        raise HTTPException(status_code=400, detail="Item ID is required.")

    item_doc_ref = firebase_db.collection("Inventory Items").document(item_id)
    item_doc = item_doc_ref.get()  # ✅ no await here

    if not item_doc.exists:
        return {"batches": []}

    item_data = item_doc.to_dict()
    batches = item_data.get("batches", [])

    batch_numbers = []
    if isinstance(batches, list):
        for batch in batches:
            if isinstance(batch, dict) and "batch_number" in batch:
                batch_numbers.append(batch["batch_number"])
    elif isinstance(batches, dict):
        batch_numbers = list(batches.keys())

    return {"batches": batch_numbers[:limit]}

@app.get("/api/v1/dashboard-expenses/stats")
async def get_expense_stats(
    request: Request,
    month: Optional[str] = Query(None, description="Month in YYYY-MM format"),
    current_user: str = Depends(get_current_user)
):
    try:
        if month:
            # 🔎 Get document like 'doc_counters/2025-06'
            doc = firebase_db.get_document("doc_counters", month).get()
            if not doc.exists:
                raise HTTPException(status_code=404, detail=f"No stats found for month: {month}")

            data = doc.to_dict()
            expenses_map = data.get("expenses", {})  # <-- extract inner expenses map

            return {
                "scope": "monthly",
                "month": month,
                "total_expense_count": expenses_map.get("total", 0),
                "total_expense_amount": expenses_map.get("total_amount", 0),
                "updated_at": data.get("updated_at")
            }

        else:
            # 🔎 Get overall document 'doc_counters/expenses'
            doc = firebase_db.get_document("doc_counters", "expenses").get()
            if not doc.exists:
                raise HTTPException(status_code=404, detail="Overall expense stats not available")

            data = doc.to_dict()

            return {
                "scope": "overall",
                "total_expense_count": data.get("total", 0),
                "total_expense_amount": data.get("total_amount", 0),
            }

    except HTTPException:
        raise

    except Exception as e:
        print(f"[ExpenseStatsError] {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch expense statistics")


@app.get("/api/v1/dashboard/charts")
async def get_dashboard_chart_data(
    request: Request,
    current_user: str = Depends(get_current_user),
):
    try:
        
        now = datetime.now()

        months: List[str] = [
            (now.replace(day=1) - relativedelta(months=i)).strftime("%Y-%m")
            for i in range(6)
        ]
        months.reverse()

        print("📆 months to fetch:", months)

        results = []

        for m in months:
            print(f"➡ checking document: {m}")
            doc_ref = firebase_db.collection("doc_counters").document(m)
            snapshot = doc_ref.get()

            if not snapshot.exists:
                print(f"⛔ document not found for {m}")
                continue

            data = snapshot.to_dict()
            print("✅ data found:", data)

            expenses = data.get("expenses") or {}

            results.append({
                "month": m,
                "sales_orders_count": data.get("sales_orders_count", 0),
                "delivery_challan_count": data.get("delivery_challan_count", 0),
                "sales_orders_amount": data.get("sales_orders_amount", 0),
                "delivery_challan_amount": data.get("delivery_challan_amount", 0),
                "purchase_orders_amount": data.get("purchase_orders_amount", 0),
                "purchase_orders_count": data.get("purchase_orders_count", 0),
                "expense_amount": expenses.get("total_amount", 0),
                "expense_count": expenses.get("total", 0),
            })

        return results

    except Exception as e:
        print("🔥 Chart API error:", e)
        return []
@app.get("/api/v1/dashboard/financial-summary")
async def get_financial_summary():
    try:
        doc_ref = firebase_db.collection("doc_counters").document("financial_summary")
        doc = doc_ref.get()

        if not doc.exists:
            raise HTTPException(status_code=404, detail="Financial summary not found")

        data = doc.to_dict()
        return {
            "net_profit": data.get("net_profit", 0),
            "total_income": data.get("total_income", 0),
            "total_expense": data.get("total_expense", 0),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching financial summary: {str(e)}")

@app.get("/api/v1/dropdown-employees")
async def get_employee_dropdown(
    search_prefix: Optional[str] = Query(None, description="Search by name prefix"),
    limit: int = Query(50, ge=1, le=100, description="Max number of results")
):
    try:
        collection_ref = firebase_db.collection("Employees")
        query_ref = collection_ref.order_by("name").limit(limit)

        if search_prefix:
            # Firestore doesn't support full text search, only prefix match
            end_prefix = search_prefix[:-1] + chr(ord(search_prefix[-1]) + 1)
            query_ref = query_ref.where("name", ">=", search_prefix).where("name", "<", end_prefix)

        docs = query_ref.stream()

        results = [{"id": doc.id, "name": doc.to_dict().get("name", "")} for doc in docs]

        return results

    except Exception as e:
        return {"error": str(e)}



# Placeholder for CounterService, ensure it's imported or defined


@app.get("/api/v1/employees", response_model=EmployeeListResponse, summary="Get Employee List")
async def get_employees(
    request: Request,
    search: Optional[str] = Query(None, min_length=1, description="Search term for employee name"),
    current_user: str = Depends(get_current_user)
):
    """
    Fetches a list of employees with optional search filter.
    """
    try:
        query_ref = firebase_db.get_collection("Employees")

        if search:
            search_lower = search.lower()
            query_ref = query_ref.where("name", ">=", search_lower).where("name", "<=", search_lower + "\uf8ff")
        
        query_ref = query_ref.order_by("created_at", direction=firestore.Query.DESCENDING)

        employees_docs = query_ref.stream() # Synchronously stream all matching documents
        
        normalized_employees = []
        for doc in employees_docs:
            employee_data = doc.to_dict()
            employee_data['id'] = doc.id
            normalized_employees.append(Employee(**employee_data))

        
        return EmployeeListResponse(items=normalized_employees)

    except Exception as e:
        
        raise HTTPException(status_code=500, detail=f"Failed to fetch employees: {str(e)}")

@app.post("/api/v1/employees", response_model=Employee, status_code=201, summary="Create a New Employee")
async def create_employee(
    employee_data_in: EmployeeCreate, # Use EmployeeCreate model for input
    request: Request,
    current_user: str = Depends(get_current_user)
):
    """Create a new employee and update doc_counters."""
    try:
        # Get next ID from CounterService which also handles 'total' and 'last_id' increments
        employee_id = await CounterService.get_next_id('employees', current_user)
        
        employee_data = employee_data_in.dict()
        current_time = datetime.utcnow()
        employee_data.update({
            "id": employee_id,
            "created_at": current_time,
            "updated_at": current_time,
            # No created_by/updated_by as per provided Pydantic models/schema
        })
                
        # Save employee to Firestore
        firebase_db.get_collection('Employees').document(employee_id).set(employee_data) # Synchronous call

        # Update specific employee-related counters (total_paid, total_collected)
        # 'total' is already handled by CounterService.get_next_id
        firebase_db.get_document("doc_counters", "employees").update({
            "total_paid": firestore.Increment(employee_data.get("paid", 0)),
            "total_collected": firestore.Increment(employee_data.get("collected", 0)),
            "updated_at": datetime.utcnow()
        })
        
        loggerr.info(
            f"[employee_create] New employee '{employee_id}' created by '{current_user}' | "
            f"Fields added: {', '.join(employee_data_in.dict().keys())}"
        )



        # Removed: await update_overall_financial_summary_doc()
        
        return Employee(**employee_data) # Return the created employee details
    except HTTPException:
        raise
    except Exception as e:
        loggerr.error(
            f"[employee_create_error] Failed to create employee '{employee_id}' by '{current_user}' | Error: {str(e)}"
        )

        raise HTTPException(status_code=500, detail=f"Failed to create employee: {str(e)}")

@app.get("/api/v1/employees/{employee_id}", response_model=Employee, summary="Get Employee Details by ID")
async def get_employee(
    employee_id: str,
    request: Request,
    current_user: str = Depends(get_current_user)
):
    """Get a specific employee by their ID."""
    try:
        doc = firebase_db.get_document("Employees", employee_id).get() # Synchronous call
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        employee_data = doc.to_dict()
        employee_data['id'] = doc.id # Ensure ID is included for Pydantic model
        
        

        return Employee(**employee_data)
        
    except HTTPException:
        raise
    except Exception as e:
        
        raise HTTPException(status_code=500, detail=f"Failed to get employee: {str(e)}")

@app.put("/api/v1/employees/{employee_id}", response_model=Employee, summary="Update an Existing Employee")
async def update_employee(
    employee_id: str,
    employee_update: EmployeeUpdate,
    request: Request,
    current_user: str = Depends(get_current_user)
):
    """Update an employee and sync doc_counters for paid/collected amounts."""
    try:
        doc_ref = firebase_db.get_document("Employees", employee_id)
        current_doc = doc_ref.get() # Synchronous call

        if not current_doc.exists:
            raise HTTPException(status_code=404, detail="Employee not found")

        old_data = current_doc.to_dict()

        # Extract old values for counter comparison
        old_paid = old_data.get("paid", 0)
        old_collected = old_data.get("collected", 0)

        # Prepare update data from input model
        update_data = employee_update.dict(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()
        # No updated_by as per provided Pydantic models/schema

        # Perform the document update
        doc_ref.update(update_data) # Synchronous call

        # Fetch the updated document to get the new values for counter calculations
        # This is important if fields like 'paid' or 'collected' were not explicitly updated
        # but derive from other operations.
        updated_doc = doc_ref.get() # Synchronous call
        updated_data = updated_doc.to_dict()
        updated_data['id'] = updated_doc.id

        # Extract new values (or fallback to old if not updated in this request)
        new_paid = updated_data.get("paid", old_paid)
        new_collected = updated_data.get("collected", old_collected)

        # Compute deltas for counter updates
        delta_paid = new_paid - old_paid
        delta_collected = new_collected - old_collected

        # Update counters if there are changes
        counter_updates = {}
        if delta_paid != 0:
            counter_updates["total_paid"] = firestore.Increment(delta_paid)
        if delta_collected != 0:
            counter_updates["total_collected"] = firestore.Increment(delta_collected)

        if counter_updates:
            counter_updates["updated_at"] = datetime.utcnow()
            firebase_db.get_document("doc_counters", "employees").update(counter_updates)
        
        updated_fields = employee_update.dict(exclude_unset=True)
        changes = ', '.join(
            f"{field}: '{old_data.get(field)}' → '{new_val}'"
            for field, new_val in updated_fields.items()
        )

        loggerr.info(
            f"[employee_update] Employee '{employee_id}' updated by '{current_user}' | "
            f"Changes: {changes}"
        )



        # Removed: await update_overall_financial_summary_doc()

        return Employee(**updated_data)

    except HTTPException:
        raise
    except Exception as e:
        loggerr.error(
            f"[employee_update_error] Failed to update employee '{employee_id}' by '{current_user}' | Error: {str(e)}"
        )

        raise HTTPException(status_code=500, detail=f"Failed to update employee: {str(e)}")

@app.delete("/api/v1/employees/{employee_id}", summary="Delete an Employee")
async def delete_employee(
    employee_id: str,
    request: Request,
    current_user: str = Depends(get_current_user)
):
    """Delete an employee and update doc_counters."""
    try:
        doc_ref = firebase_db.get_document("Employees", employee_id)
        doc = doc_ref.get() # Synchronous call
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        employee_data = doc.to_dict()
        
        # Delete the employee document
        doc_ref.delete() # Synchronous call
        
        # Update doc_counters: decrement total, total_paid, total_collected
        firebase_db.get_document("doc_counters", "employees").update({
            "total": firestore.Increment(-1),
            "total_paid": firestore.Increment(-employee_data.get("paid", 0)),
            "total_collected": firestore.Increment(-employee_data.get("collected", 0)),
            "updated_at": datetime.utcnow()
        })
        
        loggerr.info(
            f"[delete_employee] Employee {employee_id} deleted by {current_user}"
        )


        # Removed: await update_overall_financial_summary_doc()
        
        return {"message": "Employee deleted successfully", "item_id": employee_id} # Consistent return
    except HTTPException:
        raise
    except Exception as e:
        loggerr.error(
            f"[delete_employee] Error deleting employee {employee_id}: {str(e)}\n{traceback.format_exc()}"
        )

        raise HTTPException(status_code=500, detail=f"Failed to delete employee: {str(e)}")
    


@app.get("/api/v1/expenses")
async def get_expenses(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(50, le=100),
    search: Optional[str] = None,  # Search in category / remarks / paid_by
    current_user: str = Depends(get_current_user)
):
    """
    Get paginated expenses with optional search by category, remarks, or paid_by.
    """
    try:
        collection_ref = firebase_db.get_collection("Expenses")

        result = await OffsetPaginator.optimized_paginate_orders(
            collection_ref=collection_ref,
            page=page,
            limit=limit,
            order_by="created_at",
            order_direction="desc",
            lightweight_search=search  # This will check across text fields
        )

        # Ensure each item has an 'id' field
        for item in result["items"]:
            item.setdefault("id", item.get("id"))

        return result  # Full paginated response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch expenses: {str(e)}")


@app.get("/api/v1/expenses/{expense_id}", response_model=Expense, summary="Get Expense Details by ID")
async def get_expense(
    expense_id: str,
    request: Request,
    current_user: str = Depends(get_current_user)
):
    """Get a specific expense by its ID."""
    try:
        doc = firebase_db.get_document("Expenses", expense_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Expense not found")
        
        expense_data = doc.to_dict()
        expense_data['id'] = doc.id  # ✅ Ensure 'id' is included

        return Expense(**expense_data)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get expense: {str(e)}")


async def get_employee_id_from_paid_by(paid_by_value: Optional[str]) -> Optional[str]:
    """
    Returns the Employee ID from a 'paid_by' value that could be an ID or name.
    """
    if not paid_by_value:
        return None

    if paid_by_value.startswith("E"):  # Already an ID
        return paid_by_value

    try:
        employees_query = firebase_db.get_collection("Employees").where("name", "==", paid_by_value).limit(1)
        employee_docs = employees_query.get()
        for doc in employee_docs:
            return doc.id
        return None
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Employee lookup failed: {str(e)}")

@app.post("/api/v1/expenses", response_model=Expense, status_code=201, summary="Create a New Expense")
async def create_expense(
    expense_data_in: ExpenseCreate,
    request: Request,
    current_user: str = Depends(get_current_user)
):
    try:
        now = datetime.utcnow()

        # 1. Create expense data
        expense_data = expense_data_in.dict()
        expense_data.update({
            "created_at": now,
            "updated_at": now,
        })

        # 2. Add to Expenses with auto-generated ID
        expense_ref = firebase_db.get_collection("Expenses").document()
        expense_data["id"] = expense_ref.id
        expense_ref.set(expense_data)

        # 3. Update doc_counters/expenses using firestore.Increment()
        counter_expenses_ref = firebase_db.get_document("doc_counters", "expenses")
        # Using set with merge=True for initial creation if doc doesn't exist,
        # or update if it does. For existing doc_counters, update is fine.
        counter_expenses_ref.update({
            "total": firestore.Increment(1),
            "total_amount": firestore.Increment(expense_data["amount"]),
            "updated_at": now
        })

        # 4. Handle employee 'paid_by' field (lookup by ID or Name)
        paid_by_value = expense_data.get("paid_by")
        employee_id_to_update = None

        if paid_by_value:
            if paid_by_value.startswith("E"): # It's an Employee ID
                employee_id_to_update = paid_by_value
            else: # Assume it's an Employee Name, so we need to search
                employees_query = firebase_db.get_collection("Employees").where("name", "==", paid_by_value).limit(1)
                employee_docs = employees_query.get() # Synchronous call
                if employee_docs:
                    employee_id_to_update = employee_docs[0].id
                else:
                    # Log a warning if employee name not found, but don't stop the expense creation
                    # ActivityLogger.log_error(
                    #     error=f"Employee with name '{paid_by_value}' not found for expense {expense_data['id']}",
                    #     context="create_expense_employee_lookup",
                    #     user=current_user,
                    #     request=request
                    # )
                    pass # Continue without updating employee/employee_doc_counters if not found

        if employee_id_to_update:
            # Update individual employee's 'paid' field
            emp_ref = firebase_db.get_document("Employees", employee_id_to_update)
            emp_ref.update({
                "paid": firestore.Increment(expense_data["amount"]),
                "updated_at": now
            })

            # Update global doc_counters/employees for total amount paid by employees
            # Assuming 'total_paid' in doc_counters/employees refers to total paid by employees
            # (Note: Your schema snippet showed 'total_paid' at the top level of 'employees' doc_counter)
            counter_employees_ref = firebase_db.get_document("doc_counters", "employees")
            counter_employees_ref.update({
                "total_paid": firestore.Increment(expense_data["amount"]), # Increment total_paid by employees
                "updated_at": now # Update timestamp for this counter
            })

        # 5. Update doc_counters/financial_summary for total_expenses (NEW LOGIC)
        financial_summary_ref = firebase_db.get_document("doc_counters", "financial_summary")
        financial_summary_ref.update({
            "total_expense": firestore.Increment(expense_data["amount"]),
            "last_updated_at": now # Update the timestamp for the financial summary
        })
        month_key = now.strftime("%Y-%m")
        update_monthly_doc_counters(month_key, {
            "expenses.total": firestore.Increment(1),
            "expenses.total_amount": firestore.Increment(expense_data["amount"])
        })
        # Optional: Log activity after all operations are attempted
        fields = expense_data_in.dict()
        field_summary = ', '.join(f"{k}: {v}" for k, v in fields.items())

        loggerr.info(
            f"[expense_create] Expense '{expense_data['id']}' created by '{current_user}' | "
            f"Fields: {', '.join(fields.keys())} | Data: {field_summary}"
        )



        return Expense(**expense_data)

    except Exception as e:
        # Optional: Log error if ActivityLogger is used
        loggerr.error(
            f"[expense_create_error] Failed to create expense by '{current_user}' | Error: {str(e)}"
        )

        raise HTTPException(status_code=500, detail=f"Failed to create expense: {str(e)}")

@app.put("/api/v1/expenses/{expense_id}", response_model=Expense, summary="Update an Existing Expense")
async def update_expense(
    expense_id: str,
    expense_update: ExpenseUpdate,
    request: Request,
    current_user: str = Depends(get_current_user)
):
    """
    Update expense and adjust all related counters (non-transactional).
    """
    try:
        expense_doc_ref = firebase_db.get_document("Expenses", expense_id)
        current_expense_doc = expense_doc_ref.get()
        
        if not current_expense_doc.exists:
            raise HTTPException(status_code=404, detail="Expense not found")
        
        old_expense_data = current_expense_doc.to_dict()
        
        update_data = expense_update.dict(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()
        
        old_amount = old_expense_data.get("amount", 0.0)
        new_amount = update_data.get("amount", old_amount)
        amount_difference = new_amount - old_amount

        old_paid_by_value = old_expense_data.get("paid_by")
        new_paid_by_value = update_data.get("paid_by", old_paid_by_value)

        # 1. Handle complex employee 'paid' updates first
        old_employee_id = await get_employee_id_from_paid_by(old_paid_by_value)
        new_employee_id = await get_employee_id_from_paid_by(new_paid_by_value)

        if old_employee_id != new_employee_id:
            # Revert from old employee if they existed
            if old_employee_id:
                firebase_db.get_document("Employees", old_employee_id).update({
                    "paid": firestore.Increment(-old_amount)
                })
                firebase_db.get_document("doc_counters", "employees").update({
                    "total_paid": firestore.Increment(-old_amount)
                })
            # Apply to new employee if they exist
            if new_employee_id:
                firebase_db.get_document("Employees", new_employee_id).update({
                    "paid": firestore.Increment(new_amount)
                })
                firebase_db.get_document("doc_counters", "employees").update({
                    "total_paid": firestore.Increment(new_amount)
                })
        elif old_employee_id and amount_difference != 0:
            # Same employee, but amount changed
            firebase_db.get_document("Employees", old_employee_id).update({
                "paid": firestore.Increment(amount_difference)
            })
            firebase_db.get_document("doc_counters", "employees").update({
                "total_paid": firestore.Increment(amount_difference)
            })

        # 2. Update the main expense document
        expense_doc_ref.update(update_data)

        # 3. Update all financial counters if the amount changed
        if amount_difference != 0:
            # Update main expense counter
            firebase_db.get_document("doc_counters", "expenses").update({
                "total_amount": firestore.Increment(amount_difference),
                "updated_at": datetime.utcnow()
            })
        
            # Update financial summary
            firebase_db.get_document("doc_counters", "financial_summary").update({
                "total_expense": firestore.Increment(amount_difference),
                "updated_at": datetime.utcnow()
            })

            # Update monthly summary
            month_key = old_expense_data["created_at"].strftime("%Y-%m")
            update_monthly_doc_counters(month_key, {
                "expenses.total_amount": firestore.Increment(amount_difference)
            })
        
        loggerr.info(
            f"[expense_update] Expense '{expense_id}' updated by '{current_user}'"
        )
        
        # Fetch the final state of the document to return
        updated_doc = expense_doc_ref.get()
        return Expense(**updated_doc.to_dict())

    except HTTPException:
        raise
    except Exception as e:
        loggerr.error(
            f"[update_expense_error] Failed to update expense {expense_id} by {current_user} | Error: {str(e)}\n{traceback.format_exc()}"
        )
        raise HTTPException(status_code=500, detail=f"Failed to update expense: {str(e)}")

@app.delete("/api/v1/expenses/{expense_id}", summary="Delete an Expense")
async def delete_expense(
    expense_id: str,
    request: Request,
    current_user: str = Depends(get_current_user)
):
    """
    Delete an expense and adjust all relevant counters, including monthly summaries.
    """
    try:
        # 1. Get expense document
        expense_doc_ref = firebase_db.get_document("Expenses", expense_id)
        expense_doc = expense_doc_ref.get()

        if not expense_doc.exists:
            raise HTTPException(status_code=404, detail="Expense not found")

        expense_data = expense_doc.to_dict()
        deleted_amount = expense_data.get("amount", 0.0)
        paid_by_value = expense_data.get("paid_by")
        # Get the creation date to identify the correct monthly document
        creation_date = expense_data.get("created_at")

        # 2. Delete the expense document first
        expense_doc_ref.delete()

        # 3. Update all related counters
        now = datetime.utcnow()

        # Update main expense counters
        firebase_db.get_document("doc_counters", "expenses").update({
            "total": firestore.Increment(-1),
            "total_amount": firestore.Increment(-deleted_amount),
            "updated_at": now
        })

        # Update financial summary
        firebase_db.get_document("doc_counters", "financial_summary").update({
            "total_expense": firestore.Increment(-deleted_amount),
            "updated_at": now
        })

        # 4. Update monthly summary (NEW LOGIC)
        if creation_date:
            month_key = creation_date.strftime("%Y-%m")
            update_monthly_doc_counters(month_key, {
                "expenses.count": firestore.Increment(-1),
                "expenses.total_amount": firestore.Increment(-deleted_amount)
            })

        # 5. Update employee stats if applicable
        if paid_by_value:
            # This assumes get_employee_id_from_paid_by is available
            employee_id = await get_employee_id_from_paid_by(paid_by_value)
            if employee_id:
                firebase_db.get_document("Employees", employee_id).update({
                    "paid": firestore.Increment(-deleted_amount),
                    "updated_at": now
                })
                firebase_db.get_document("doc_counters", "employees").update({
                    "total_paid": firestore.Increment(-deleted_amount),
                    "updated_at": now
                })
            else:
                loggerr.warning(f"[delete_expense] Employee '{paid_by_value}' not found for expense {expense_id}")

        loggerr.info(
            f"[delete_expense] Expense {expense_id} deleted by {current_user} | Amount: ₹{deleted_amount}"
        )

        return {"message": "Expense deleted successfully", "item_id": expense_id}

    except HTTPException:
        raise
    except Exception as e:
        loggerr.error(
            f"[delete_expense] Failed to delete expense {expense_id} by {current_user} | Error: {str(e)}\n{traceback.format_exc()}"
        )
        raise HTTPException(status_code=500, detail=f"Failed to delete expense: {str(e)}")


@app.get("/api/v1/payments", response_model=PaymentListResponse, summary="Get All Payments")
async def get_all_payments(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_user: str = Depends(get_current_user),
    request: Request = None,
):
    """
    Get a paginated list of all payments from the Orders collection efficiently.
    """
    try:
        collection_ref = firebase_db.get_collection("Orders")
        base_query = collection_ref.where("amount_paid", ">", 0)

        # Use .count() for an efficient total count
        count_query = base_query.count()
        total_items_result = count_query.get()
        total_items = total_items_result[0][0].value if total_items_result else 0
        total_pages = (total_items + limit - 1) // limit if total_items > 0 else 0

        # Apply pagination directly in the database query
        paginated_query = base_query.order_by("created_at", direction=firestore.Query.DESCENDING).offset((page - 1) * limit).limit(limit)
        docs_stream = paginated_query.stream()

        payments = []
        for doc in docs_stream:
            data = doc.to_dict()
            
            payment_record = {
                "id": doc.id,
                "amount_paid": data.get("amount_paid", 0.0),
                "payment_status": data.get("payment_status"),
                "created_at": data.get("created_at"),
                "client_name": data.get("client_name"),
                "supplier_name": data.get("supplier_name"),
                "amount_collected_by": data.get("amount_collected_by"),
                "paid_by": data.get("paid_by"),
                "order_type": data.get("order_type"),
                "payment_type": "received" if data.get("order_type") in ["sale", "delivery_challan"] else "paid",
                "invoice_number": data.get("invoice_number"),
                "challan_number": data.get("challan_number"),
                
            }
            payments.append(PaymentRecord(**payment_record))

        return {
            "payments": payments,
            "pagination": {
                "current_page": page,
                "total_pages": total_pages,
                "total_items": total_items,
                "items_per_page": limit,
                "has_next": page < total_pages,
                "has_prev": page > 1,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch payments: {str(e)}")
    



def normalize_inventory_item(doc_id: str, data: dict) -> dict:
    """
    Normalizes inventory item data, handling field renames and date parsing.
    The doc_id should be the actual Firestore document ID.
    This version processes batches as dictionaries,
    Pydantic validation will handle full parsing later.
    """
    normalized = {
        "id": doc_id,
        "name": data.get("name", ""),
        "category": data.get("category", ""),
        "low_stock_threshold": data.get("low_stock_threshold", 0),
        "stock_quantity": data.get("stock_quantity", 0),
        "created_at": data.get("created_at"),
        "updated_at": data.get("updated_at"),
        "batches": [],
    }

    # Ensure batches are added as raw dictionaries here; Pydantic model will validate later
    for batch_data in data.get("batches", []):
        try:
            # Use the Pydantic model to parse and validate the batch data
            # This ensures 'Expiry' is correctly converted to datetime
            batch_item = InventoryBatch(**batch_data)
            normalized["batches"].append(batch_item.dict())
        except ValidationError as ve:
            # No logging as per user's request, but typically you'd log this
            # print(f"Batch validation failed for item '{doc_id}', batch '{batch_data.get('batch_number')}': {ve.errors()}")
            continue # Skip this malformed batch

    return normalized
@app.get("/api/v1/inventory", response_model=InventoryListResponse, summary="Get Paginated Inventory Items")
async def get_inventory_items(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    current_user: str = Depends(get_current_user)
):
    """
    Fetches paginated inventory items with efficient, server-side search and category filters.
    """
    try:
        query = firebase_db.get_collection("Inventory Items")

        # Apply category filter if provided
        if category:
            query = query.where("category", "==", category)

        # Apply efficient, case-sensitive prefix search on the 'name' field
        if search:
            query = query.where("name", ">=", search).where("name", "<=", search + u"\uf8ff")

        # Use an aggregate query for an efficient total count
        count_query = query.count()
        total_items_result = count_query.get()
        total_items = total_items_result[0][0].value if total_items_result else 0
        total_pages = (total_items + limit - 1) // limit if total_items > 0 else 0

        # Determine the correct field to sort by
        if search:
            paginated_query = query.order_by("name").offset((page - 1) * limit).limit(limit)
        else:
            paginated_query = query.order_by("created_at", direction=firestore.Query.DESCENDING).offset((page - 1) * limit).limit(limit)
        
        docs = paginated_query.stream()
        
        # Process items, safely handling potential validation errors
        items = []
        for doc in docs:
            try:
                item_data = doc.to_dict()
                item_data['id'] = doc.id
                items.append(InventoryItem(**item_data))
            except Exception:
                # Silently skip items that don't match the Pydantic model
                pass

        return InventoryListResponse(
            items=items,
            pagination=PaginationResponse(
                current_page=page,
                total_pages=total_pages,
                total_items=total_items,
                items_per_page=limit,
                has_next=page < total_pages,
                has_prev=page > 1,
            )
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch inventory items: {str(e)}")

@app.get("/api/v1/low-stock/inventory", response_model=InventoryListResponse, summary="Get Low Stock Inventory Items")
async def get_low_stock_items(
    request: Request,
    current_user: str = Depends(get_current_user)
):
    """
    Fetches all inventory items and filters for low stock items in memory.
    Note: This endpoint fetches all items and filters in memory due to complex
    comparison logic (stock_quantity <= low_stock_threshold) not directly supported
    by optimized_paginate_orders for efficient database-level filtering.
    """
    try:
        collection_ref = firebase_db.get_collection("Inventory Items")
        
        # Since low_stock filtering is done in-memory, fetch a large enough limit
        # or fetch all if total items is known and manageable.
        # This call will also be synchronous as per your firebase_db setup.
        raw_result = await OffsetPaginator.optimized_paginate_orders(
            collection_ref=collection_ref,
            page=1, # Fetch all or a very large first page
            limit=30, # Adjust based on expected max inventory items
            order_by="created_at",
            order_direction="desc"
        )

        all_fetched_items = raw_result["items"]
        in_memory_filtered_items: List[InventoryItem] = []
        dropped_count = 0

        for doc_data in all_fetched_items:
            doc_id = doc_data.get("id") or "unknown_id"
            try:
                normalized_item_data = normalize_inventory_item(doc_id, doc_data)
                
                if normalized_item_data["stock_quantity"] <= normalized_item_data["low_stock_threshold"]:
                    in_memory_filtered_items.append(InventoryItem(**normalized_item_data))
            except ValidationError as ve:
                dropped_count += 1
                # No logging as per user's request
                # print(f"Validation failed for doc_id '{doc_id}' during low stock check: {ve.errors()}")
            except Exception as e:
                dropped_count += 1
                # No logging as per user's request
                # print(f"Unexpected error for doc_id '{doc_id}' during low stock check: {e}")


        return InventoryListResponse(
            items=in_memory_filtered_items,
            pagination=PaginationResponse(
                current_page=1,
                total_pages=1,
                total_items=len(in_memory_filtered_items),
                items_per_page=len(in_memory_filtered_items) if in_memory_filtered_items else 1,
                has_next=False,
                has_prev=False
            )
        )

    except Exception as e:
        # No logging as per user's request
        raise HTTPException(status_code=500, detail=f"Failed to fetch low stock items: {str(e)}")


@app.get("/api/v1/expiring-soon/inventory", response_model=InventoryListResponse, summary="Get Expiring Soon Inventory Items")
async def get_expiring_soon_items(
    request: Request,
    expiring_soon_days: int = Query(30, ge=0, description="Number of days for an item to be considered 'expiring soon'"),
    current_user: str = Depends(get_current_user)
):
    """
    Fetches all inventory items and filters for items with batches expiring soon in memory.
    Note: This endpoint fetches all items and filters in memory due to complex
    nested array (batches) and date comparison logic not directly supported
    by optimized_paginate_orders for efficient database-level filtering.
    """
    try:
        collection_ref = firebase_db.get_collection("Inventory Items")
        
        # Fetch a large enough limit or all if total items is known and manageable.
        # This call will also be synchronous as per your firebase_db setup.
        raw_result = await OffsetPaginator.optimized_paginate_orders(
            collection_ref=collection_ref,
            page=1, # Fetch all or a very large first page
            limit=50, # Adjust based on expected max inventory items
            order_by="created_at",
            order_direction="desc"
        )

        all_fetched_items = raw_result["items"]
        in_memory_filtered_items: List[InventoryItem] = []
        dropped_count = 0

        now_utc = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        cutoff_date = now_utc + timedelta(days=expiring_soon_days)

        for doc_data in all_fetched_items:
            doc_id = doc_data.get("id") or "unknown_id"
            try:
                normalized_item_data = normalize_inventory_item(doc_id, doc_data)
                
                found_expiring_batch = False
                for batch in normalized_item_data.get("batches", []):
                    expiry_val = batch.get("Expiry")
                    
                    # Expiry should now be a datetime due to InventoryBatch Pydantic validation
                    if not isinstance(expiry_val, datetime):
                        # No logging as per user's request
                        # print(f"Expiry value for item '{doc_id}' batch '{batch.get('batch_number')}' is not a datetime after normalization: {type(expiry_val)}")
                        continue

                    # Normalize batch expiry date to start of month for consistent comparison
                    # This assumes Expiry stores full date. If only YYYY-MM, adjust parsing.
                    batch_expiry_date = expiry_val.replace(day=1, hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
                    
                    if now_utc <= batch_expiry_date < cutoff_date:
                        in_memory_filtered_items.append(InventoryItem(**normalized_item_data))
                        found_expiring_batch = True
                        break # Only need one batch to trigger "expiring soon" for the item

                if found_expiring_batch:
                    pass # Item was added, continue to next item
            except ValidationError as ve:
                dropped_count += 1
                # No logging as per user's request
                # print(f"Validation failed for doc_id '{doc_id}' during expiring soon check: {ve.errors()}")
            except Exception as e:
                dropped_count += 1
                # No logging as per user's request
                # print(f"Unexpected error for doc_id '{doc_id}' during expiring soon check: {e}")
        
        # Ensure unique items in case an item has multiple expiring batches
        unique_items = {item.id: item for item in in_memory_filtered_items}.values()
        final_filtered_items = list(unique_items)


        return InventoryListResponse(
            items=final_filtered_items,
            pagination=PaginationResponse(
                current_page=1,
                total_pages=1,
                total_items=len(final_filtered_items),
                items_per_page=len(final_filtered_items) if final_filtered_items else 1,
                has_next=False,
                has_prev=False
            )
        )

    except Exception as e:
    
        # No logging as per user's request
        raise HTTPException(status_code=500, detail=f"Failed to fetch expiring soon items: {str(e)}")

@app.post("/api/v1/inventory", response_model=InventoryItem, status_code=201, summary="Create a New Inventory Item")
async def create_inventory_item(
    item: InventoryItemCreate,
    request: Request,
    current_user: str = Depends(get_current_user)
):
    """Create a new inventory item and update doc_counters (non-atomic)."""
    try:
        # NOTE: Without a transaction (due to synchronous client),
        # there's a risk of race conditions if multiple requests hit this endpoint concurrently.
        # For example, two requests might try to get the same `last_id`, generate the same `new_id`,
        # or incorrectly update counters if updates happen out of order.

        # Step 1: Get current counter state (synchronous get)
        counter_ref = firebase_db.get_document("doc_counters", "items")
        counter_doc = counter_ref.get() # Synchronous call

        if counter_doc.exists:
            counter_data = counter_doc.to_dict()
            last_id = counter_data.get("last_id", "I0000")
            prefix = last_id[0]
            number = int(last_id[1:]) + 1
        else:
            prefix = "I"
            number = 1
        
        new_id = f"{prefix}{number:04d}"

        # Step 2: Check if that ID already exists (synchronous get)
        existing_doc = firebase_db.get_collection("Inventory Items").document(new_id).get() # Synchronous call
        if existing_doc.exists:
            # If an ID conflict occurs, this is a race condition.
            # A retry mechanism might be needed in a more robust non-transactional system.
            raise HTTPException(status_code=400, detail=f"Generated Inventory ID '{new_id}' already exists. Please retry.")

        # Step 3: Prepare item data
        item_data = item.dict()
        item_data.update({
            "id": new_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": current_user,
            "updated_by": current_user
        })

        # Step 4: Save item to Firestore (synchronous set)
        doc_ref = firebase_db.get_collection("Inventory Items").document(new_id)
        doc_ref.set(item_data) # Synchronous call

        # Step 5: Update doc_counters/items (last_id, total, total_stock, low_stock_count, expiring_soon_count)
        # Recalculate low_stock and expiring_soon based on the NEW item's data
        current_stock = item_data.get("stock_quantity", 0)
        current_threshold = item_data.get("low_stock_threshold", 0)
        current_batches_normalized = normalize_inventory_item(new_id, item_data).get("batches", [])

        # Determine if the new item is low stock
        is_low_stock = current_stock <= current_threshold

        # Determine if the new item is expiring soon
        now_utc = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        cutoff_date = now_utc + timedelta(days=30) # Using 30 days as default for counter
        is_expiring_soon = False
        for batch in current_batches_normalized:
            expiry_val = batch.get("Expiry")
            if isinstance(expiry_val, datetime):
                batch_expiry_date = expiry_val.replace(day=1, hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
                if now_utc <= batch_expiry_date < cutoff_date:
                    is_expiring_soon = True
                    break

        counter_updates = {
            "last_id": new_id,
            "total": firestore.Increment(1),
            "total_stock": firestore.Increment(current_stock),
            "updated_at": datetime.utcnow()
        }

        if is_low_stock:
            counter_updates["low_stock_count"] = firestore.Increment(1)
        if is_expiring_soon:
            counter_updates["expiring_soon_count"] = firestore.Increment(1)

        if counter_doc.exists:
            counter_ref.update(counter_updates) # Synchronous call
        else:
            # Initialize doc if not exists
            initial_set_data = {
                "last_id": new_id,
                "total": 1,
                "total_stock": current_stock,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            if is_low_stock:
                initial_set_data["low_stock_count"] = 1
            if is_expiring_soon:
                initial_set_data["expiring_soon_count"] = 1
            counter_ref.set(initial_set_data) # Synchronous call
        
        # Step 6: Log activity (REMOVED)

        # Step 7: Return item (ensure it matches InventoryItem Pydantic model)
        created_item_pydantic = InventoryItem(**item_data)
        return created_item_pydantic

    except HTTPException:
        raise
    except Exception as e:
        # No logging as per user's request
        raise HTTPException(status_code=500, detail=f"Failed to create inventory item: {str(e)}")

@app.get("/api/v1/inventory/{item_id}", response_model=InventoryItem, summary="Get Inventory Item Details")
async def get_inventory_item(
    item_id: str,
    request: Request,
    current_user: str = Depends(get_current_user)
):
    """Get a specific inventory item by its ID."""
    try:
        doc = firebase_db.get_document("Inventory Items", item_id).get() # Synchronous call
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Inventory item not found")
        
        item_data = doc.to_dict()
        normalized_item = normalize_inventory_item(doc.id, item_data)
        
        # No logging as per user's request
        
        return InventoryItem(**normalized_item)
        
    except HTTPException:
        raise
    except Exception as e:
        # No logging as per user's request
        raise HTTPException(status_code=500, detail=f"Failed to retrieve inventory item: {str(e)}")

@app.put("/api/v1/inventory/{item_id}", response_model=InventoryItem, summary="Update an Existing Inventory Item")
async def update_inventory_item(
    item_id: str,
    item_update: InventoryItemUpdate,
    request: Request,
    current_user: str = Depends(get_current_user)
):
    """Update an inventory item and sync doc_counters (non-atomic)."""
    try:
        doc_ref = firebase_db.get_document("Inventory Items", item_id)
        doc = doc_ref.get() # Synchronous call

        if not doc.exists:
            raise HTTPException(status_code=404, detail="Inventory item not found")

        old_data = doc.to_dict()
        old_qty = old_data.get("stock_quantity", 0)
        old_threshold = old_data.get("low_stock_threshold", 0)
        old_normalized_data = normalize_inventory_item(doc.id, old_data)
        old_batches = old_normalized_data.get("batches", []) # Normalized batches from old data
        
        update_data = item_update.dict(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()
        update_data["updated_by"] = current_user

        doc_ref.update(update_data) # Synchronous call

        # Fetch updated doc to get new values for counter calculations
        updated_doc = doc_ref.get() # Synchronous call
        updated_data = updated_doc.to_dict()
        updated_normalized_data = normalize_inventory_item(updated_doc.id, updated_data)
        new_batches = updated_normalized_data.get("batches", []) # Normalized batches from new data

        new_qty = updated_data.get("stock_quantity", old_qty)
        new_threshold = updated_data.get("low_stock_threshold", old_threshold)

        # ---------- DOC_COUNTERS LOGIC (non-atomic) ----------
        counter_updates = {}
        counter_ref = firebase_db.get_document("doc_counters", "items") # Assuming 'items' is the correct counter document
        
        # total_stock delta
        if new_qty != old_qty:
            counter_updates["total_stock"] = firestore.Increment(new_qty - old_qty)

        # low_stock_count change
        old_low = old_qty <= old_threshold
        new_low = new_qty <= new_threshold
        if old_low != new_low:
            counter_updates["low_stock_count"] = firestore.Increment(1 if new_low else -1)

        # expiring_soon_count change (within next 30 days)
        # Using a helper function to avoid repetition
        def is_expiring_soon_for_counter(batches: List[dict], days: int = 30) -> bool:
            now_utc = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
            cutoff_date = now_utc + timedelta(days=days)
            for batch in batches:
                expiry_val = batch.get("Expiry")
                if isinstance(expiry_val, datetime): # Expiry is datetime after normalization
                    batch_expiry_date = expiry_val.replace(day=1, hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
                    if now_utc <= batch_expiry_date < cutoff_date:
                        return True
            return False

        old_expiring = is_expiring_soon_for_counter(old_batches)
        new_expiring = is_expiring_soon_for_counter(new_batches)

        if old_expiring != new_expiring:
            counter_updates["expiring_soon_count"] = firestore.Increment(1 if new_expiring else -1)

        if counter_updates:
            counter_updates["updated_at"] = datetime.utcnow()
            counter_ref.update(counter_updates) # Synchronous call

        # No logging as per user's request
        loggerr.info(
            f"[update_inventory_item] Inventory item '{item_id}' updated by '{current_user}' | "
            f"Updated fields: {list(update_data.keys())} | "
            f"Changes: {', '.join([f'{k}: {old_data.get(k)} → {update_data[k]}' for k in update_data if old_data.get(k) != update_data[k]])} | "
            f"Old Data: { {k: old_data.get(k) for k in update_data if old_data.get(k) != update_data[k]} }"
        )


        return InventoryItem(**updated_normalized_data)

    except HTTPException:
        raise
    except Exception as e:
        loggerr.error(
            f"[update_inventory_item] Failed to update inventory item {item_id} by {current_user} | "
            f"Error: {str(e)} | Fields: {list(item_update.dict(exclude_unset=True).keys())}"
        )

        # No logging as per user's request
        raise HTTPException(status_code=500, detail=f"Failed to update inventory item: {str(e)}")

@app.delete("/api/v1/inventory/{item_id}", summary="Delete an Inventory Item")
async def delete_inventory_item(
    item_id: str,
    request: Request,
    current_user: str = Depends(get_current_user)
):
    """Delete an inventory item and update doc_counters (non-atomic)."""
    try:
        doc_ref = firebase_db.get_document("Inventory Items", item_id)
        doc = doc_ref.get() # Synchronous call

        if not doc.exists:
            raise HTTPException(status_code=404, detail="Inventory item not found")

        item_data = doc.to_dict()
        stock_qty = item_data.get("stock_quantity", 0)
        threshold = item_data.get("low_stock_threshold", 0)
        
        normalized_old_data = normalize_inventory_item(doc.id, item_data)
        batches = normalized_old_data.get("batches", []) # Normalized batches

        # Precompute stock and expiry counters BEFORE deletion
        is_low_stock = stock_qty <= threshold
        
        def is_expiring_soon_for_counter(batches: List[dict], days: int = 30) -> bool:
            now_utc = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
            cutoff_date = now_utc + timedelta(days=days)
            for batch in batches:
                expiry_val = batch.get("Expiry")
                if isinstance(expiry_val, datetime): # Expiry is datetime after normalization
                    batch_expiry_date = expiry_val.replace(day=1, hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
                    if now_utc <= batch_expiry_date < cutoff_date:
                        return True
            return False

        expiring_soon = is_expiring_soon_for_counter(batches)

        # Delete the item (synchronous call)
        doc_ref.delete()

        # Update doc_counters (synchronous call - non-atomic)
        counter_ref = firebase_db.get_document("doc_counters", "items") # Assuming 'items' is the correct counter document
        
        updates = {
            "total": firestore.Increment(-1),
            "total_stock": firestore.Increment(-stock_qty),
            "updated_at": datetime.utcnow()
        }
        
        if is_low_stock:
            updates["low_stock_count"] = firestore.Increment(-1)
        
        if expiring_soon:
            updates["expiring_soon_count"] = firestore.Increment(-1)
        
        counter_ref.update(updates)

        # No logging as per user's request
        loggerr.info(
            f"[delete_inventory_item] Inventory item {item_id} deleted by {current_user} | "
            f"Stock removed: {stock_qty}, Low stock: {is_low_stock}, Expiring soon: {expiring_soon}"
        )

        return {"message": "Inventory item deleted successfully", "item_id": item_id}

    except HTTPException:
        raise
    except Exception as e:
        loggerr.error(
            f"[delete_inventory_item] Failed to delete inventory item {item_id} by {current_user} | Error: {str(e)}"
        )

        # No logging as per user's request
        raise HTTPException(status_code=500, detail=f"Failed to delete inventory item: {str(e)}")


class InventoryService:
    @staticmethod
    async def update_inventory_on_sale(items: List[dict], user: str = "system", order_id: str = ""):
        """Update inventory quantities when items are sold (with or without batches)"""
        try:
            for item in items:
                item_id = item["item_id"]
                batch_number = item.get("batch_number", "").strip()

                item_ref = firebase_db.get_document("Inventory Items", item_id)
                item_doc = item_ref.get()

                if not item_doc.exists:
                    app_logger.warning(f"Item {item_id} not found in inventory")
                    continue

                item_data = item_doc.to_dict()
                current_stock = item_data.get("stock_quantity", 0)
                batches = item_data.get("batches", [])

                new_quantity = max(0, current_stock - item["quantity"])
                updated_batches = []
                batch_used = False

                if batch_number:
                    # ✅ Batch-specific deduction
                    for batch in batches:
                        if batch["batch_number"] == batch_number:
                            if batch["quantity"] < item["quantity"]:
                                raise HTTPException(status_code=400, detail=f"[{item['item_name']}] Not enough quantity in batch '{batch_number}'")
                            batch["quantity"] -= item["quantity"]
                            batch_used = True
                        updated_batches.append(batch)

                    if not batch_used:
                        raise HTTPException(status_code=400, detail=f"[{item['item_name']}] Batch '{batch_number}' not found in inventory")

                else:
                    # 🟡 Global deduction (no batch)
                    if current_stock < item["quantity"]:
                        raise HTTPException(status_code=400, detail=f"[{item['item_name']}] Not enough stock to fulfill order")
                    updated_batches = batches  # unchanged

                update_data = {
                    "stock_quantity": new_quantity,
                    "updated_at": datetime.utcnow()
                }
                if batch_number:
                    update_data["batches"] = updated_batches

                item_ref.update(update_data)

        
        except Exception as e:
            
            raise HTTPException(status_code=500, detail=f"Error updating inventory: {str(e)}")

    @staticmethod
    async def update_inventory_on_purchase(items: List[dict], user: str = "system", order_id: str = ""):
        """Update inventory quantities when items are purchased (batch optional)"""
        try:
            for item in items:
                item_id = item["item_id"]
                item_name = item.get("item_name")
                batch_number = item.get("batch_number", "").strip()
                Expiry = item.get("Expiry", None)
                quantity = item["quantity"]

                item_ref = firebase_db.get_document("Inventory Items", item_id)
                item_doc = item_ref.get()

                if item_doc.exists:
                    item_data = item_doc.to_dict()
                    current_stock = item_data.get("stock_quantity", 0)
                    new_quantity = current_stock + quantity
                    update_data = {
                        "stock_quantity": new_quantity,
                        "updated_at": datetime.utcnow()
                    }

                    if batch_number:
                        batches = item_data.get("batches", [])
                        batch_found = False

                        for batch in batches:
                            if batch.get("batch_number") == batch_number:
                                batch["quantity"] += quantity
                                batch_found = True
                                break

                        if not batch_found:
                            batches.append({
                                "batch_number": batch_number,
                                "Expiry": Expiry,
                                "quantity": quantity
                            })

                        update_data["batches"] = batches

                    item_ref.update(update_data)

                    

                else:
                    # Create new item document
                    new_item_data = {
                        "id": item_id,
                        "name": item_name,
                        "category": item.get("category", "General"),
                        "stock_quantity": quantity,
                        "low_stock": 10,
                        "created_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }

                    if batch_number:
                        new_item_data["batches"] = [{
                            "batch_number": batch_number,
                            "Expiry": Expiry,
                            "quantity": quantity
                        }]

                    item_ref.set(new_item_data)

                    

        except Exception as e:
            
            raise HTTPException(status_code=500, detail=f"Error updating inventory: {str(e)}")
        
    @staticmethod
    async def update_inventory_on_sale(items: List[dict], user: str = "system", order_id: str = ""):
        """Update inventory quantities when items are sold (with or without batches) and update doc_counters."""
        try:
            for item in items:
                item_id = item["item_id"]
                batch_number = (item.get("batch_number") or "").strip()

                item_ref = firebase_db.get_document("Inventory Items", item_id)
                item_doc = item_ref.get()

                if not item_doc.exists:
                    # Log or handle case where item is not found, but don't stop the whole order
                    
                    continue

                item_data = item_doc.to_dict()
                current_stock = item_data.get("stock_quantity", 0)
                batches = item_data.get("batches", [])

                new_quantity = max(0, current_stock - item["quantity"])
                updated_batches = []
                batch_used = False

                if batch_number:
                    for batch in batches:
                        if batch.get("batch_number") == batch_number:
                            if batch["quantity"] < item["quantity"]:
                                raise HTTPException(status_code=400, detail=f"[{item.get('item_name', item_id)}] Not enough quantity in batch '{batch_number}'")
                            batch["quantity"] -= item["quantity"]
                            batch_used = True
                        updated_batches.append(batch)

                    if not batch_used:
                        raise HTTPException(status_code=400, detail=f"[{item.get('item_name', item_id)}] Batch '{batch_number}' not found in inventory")
                else:
                    if current_stock < item["quantity"]:
                        raise HTTPException(status_code=400, detail=f"[{item.get('item_name', item_id)}] Not enough stock to fulfill order")
                    updated_batches = batches

                update_data = {
                    "stock_quantity": new_quantity,
                    "updated_at": datetime.utcnow()
                }
                if batch_number:
                    update_data["batches"] = updated_batches

                item_ref.update(update_data)

                # Update doc_counters/items for total_stock, low_stock_count, expiring_soon_count
                # Need to re-evaluate low_stock and expiring_soon status after stock change
                # This requires fetching the item's low_stock_threshold and batch expiry dates again
                # For simplicity and to avoid excessive reads within a loop,
                # we'll assume a separate process or the inventory route itself handles
                # the re-computation of low_stock_count and expiring_soon_count periodically
                # or when inventory items are directly updated.
                # Here, we only update total_stock.
                stock_change = -item["quantity"]
                firebase_db.get_document("doc_counters", "items").update({
                    "total_stock": firestore.Increment(stock_change),
                    "updated_at": datetime.utcnow()
                })

                loggerr.info(
                    f"[inventory_update] Stock reduced for item '{item.get('item_name', item_id)}' "
                    f"(ID: {item_id}) by '{user}' | Order: {order_id} | Batch: {batch_number or 'N/A'} | "
                    f"Qty: {item['quantity']} | Stock: {current_stock} → {new_quantity}"
                )

        except HTTPException:
            raise
        except Exception as e:
            loggerr.error(
                f"[inventory_update_error] Failed to reduce stock for item '{item.get('item_name', item_id)}' "
                f"(ID: {item_id}) during order '{order_id}' by '{user}' | Error: {str(e)}"
            )
            raise HTTPException(status_code=500, detail=f"Error updating inventory: {str(e)}")

    @staticmethod
    async def update_inventory_on_purchase(items: List[dict], user: str = "system", order_id: str = ""):
        """Update inventory quantities when items are purchased (batch optional) and update doc_counters."""
        try:
            for item in items:
                item_id = item["item_id"]
                item_name = item.get("item_name", item_id)
                batch_number = (item.get("batch_number") or "").strip()
                expiry_str = item.get("Expiry", None)
                quantity = item["quantity"]

                item_ref = firebase_db.get_document("Inventory Items", item_id)
                item_doc = item_ref.get()

                if item_doc.exists:
                    item_data = item_doc.to_dict()
                    current_stock = item_data.get("stock_quantity", 0)
                    new_quantity = current_stock + quantity
                    update_data = {
                        "stock_quantity": new_quantity,
                        "updated_at": datetime.utcnow()
                    }

                    if batch_number:
                        batches = item_data.get("batches", [])
                        batch_found = False
                        # Convert expiry string to datetime object for comparison if needed, or store as string
                        # Assuming expiry_str is 'MM/YYYY' or a datetime object if coming from model validation
                        
                        for batch in batches:
                            if batch.get("batch_number") == batch_number:
                                batch["quantity"] += quantity
                                # Update expiry if provided and different, or ensure consistency
                                if expiry_str and batch.get("Expiry") != expiry_str:
                                     batch["Expiry"] = expiry_str # Update if there's a new expiry for existing batch
                                batch_found = True
                                break

                        if not batch_found:
                            batches.append({
                                "batch_number": batch_number,
                                "Expiry": expiry_str, # Store as string
                                "quantity": quantity
                            })
                        update_data["batches"] = batches

                    item_ref.update(update_data)

                    # Update doc_counters/items for total_stock
                    stock_change = quantity
                    firebase_db.get_document("doc_counters", "items").update({
                        "total_stock": firestore.Increment(stock_change),
                        "updated_at": datetime.utcnow()
                    })

                    

                else:
                    # Create new item document and update doc_counters/items
                    new_item_data = {
                        "id": item_id,
                        "name": item_name,
                        "category": item.get("category", "General"),
                        "stock_quantity": quantity,
                        "low_stock_threshold": 10, # Default threshold for new item
                        "created_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }

                    if batch_number:
                        new_item_data["batches"] = [{
                            "batch_number": batch_number,
                            "Expiry": expiry_str,
                            "quantity": quantity
                        }]

                    item_ref.set(new_item_data)

                    # Update doc_counters/items for total and total_stock
                    firebase_db.get_document("doc_counters", "items").update({
                        "total": firestore.Increment(1),
                        "total_stock": firestore.Increment(quantity),
                        "last_id": item_id, # Assuming item_id could be the last_id if it's generated sequentially
                        "updated_at": datetime.utcnow()
                    })

                   

        except HTTPException:
            raise
        except Exception as e:
            
            raise HTTPException(status_code=500, detail=f"Error updating inventory: {str(e)}")
        
    @staticmethod
    async def revert_inventory_on_delete(items: List[dict], order_type: OrderTypeEnum, user: str = "system", order_id: str = ""):
        """
        Reverts inventory quantities when an order is deleted.
        For sale/delivery challan: adds stock back.
        For purchase: reduces stock.
        Also updates doc_counters/items.
        """
        try:
            for item in items:
                item_id = item["item_id"]
                batch_number = (item.get("batch_number") or "").strip()
                quantity = item["quantity"]
                item_name = item.get("item_name", item_id)

                item_ref = firebase_db.get_document("Inventory Items", item_id)
                item_doc = item_ref.get()

                if not item_doc.exists:
                    
                    continue

                item_data = item_doc.to_dict()
                current_stock = item_data.get("stock_quantity", 0)
                batches = item_data.get("batches", [])
                
                stock_change = 0
                updated_batches = []
                batch_updated = False

                if order_type in [OrderTypeEnum.sale, OrderTypeEnum.delivery_challan]:
                    stock_change = quantity # Add back stock
                    if batch_number:
                        for batch in batches:
                            if batch.get("batch_number") == batch_number:
                                batch["quantity"] += quantity
                                batch_updated = True
                            updated_batches.append(batch)
                        if not batch_updated:
                            # If batch was deleted or not found, just add to global stock
                            
                            updated_batches = batches # keep as is if batch not found in list, quantity handled by total stock
                    else:
                        updated_batches = batches # No specific batch, so batches list remains same
                elif order_type == OrderTypeEnum.purchase:
                    stock_change = -quantity # Subtract stock
                    if batch_number:
                        for batch in batches:
                            if batch.get("batch_number") == batch_number:
                                batch["quantity"] -= quantity
                                if batch["quantity"] < 0: # Prevent negative batch quantity
                                    batch["quantity"] = 0
                                
                                batch_updated = True
                            updated_batches.append(batch)
                        if not batch_updated:
                            
                            updated_batches = batches # keep as is if batch not found in list, quantity handled by total stock
                    else:
                        updated_batches = batches # No specific batch, so batches list remains same
                
                new_quantity = current_stock + stock_change
                if new_quantity < 0: # Prevent negative total stock
                    new_quantity = 0
                    

                update_data = {
                    "stock_quantity": new_quantity,
                    "updated_at": datetime.utcnow()
                }
                if batch_number:
                    update_data["batches"] = updated_batches

                item_ref.update(update_data)

                # Update doc_counters/items for total_stock
                firebase_db.get_document("doc_counters", "items").update({
                    "total_stock": firestore.Increment(stock_change),
                    "updated_at": datetime.utcnow()
                })

                
        except HTTPException:
            raise
        except Exception as e:
            
            raise HTTPException(status_code=500, detail=f"Error reverting inventory: {str(e)}")



        
    

class SupplierService:
    @staticmethod
    def update_due(supplier_id: str, delta_due: float):
        """
        Update the due amount for a specific supplier and also update counters.
        `delta_due` can be positive (increase due) or negative (reduce due on payment).
        """
        supplier_ref = firebase_db.get_document("Suppliers", supplier_id)
        supplier_doc = supplier_ref.get()

        if supplier_doc.exists:
            supplier_data = supplier_doc.to_dict()
            current_due = supplier_data.get("due", 0)
            new_due = current_due + delta_due

            supplier_ref.update({
                "due": new_due,
                "updated_at": datetime.utcnow()
            })

            # Update doc_counters for suppliers
            firebase_db.get_document("doc_counters", "suppliers").update({
                "due": firestore.Increment(delta_due)
            })

        

def update_monthly_doc_counters(month_key: str, updates: dict):
    """
    Safely updates or creates a monthly summary document in 'doc_counters' collection.
    Will set initial values to 0 if the document doesn't exist.
    """
    monthly_ref = firebase_db.get_document("doc_counters", month_key)
    monthly_doc = monthly_ref.get()

    if not monthly_doc.exists:
        # First time — set values to 0 or fallback for counters
        initial_data = {}
        for k, v in updates.items():
            if isinstance(v, firestore.Increment):
                initial_data[k] = 1  # assume you're incrementing by 1
            else:
                initial_data[k] = v
        initial_data["updated_at"] = datetime.utcnow()
        monthly_ref.set(initial_data)
    else:
        updates["updated_at"] = datetime.utcnow()
        monthly_ref.update(updates)

def calculate_order_totals(items: List[Dict[str, Any]]) -> Dict[str, float]:
    """Calculate order totals from items"""
    subtotal = 0
    total_tax = 0
    total_quantity = 0
    
    for item in items:
        quantity = item.get("quantity", 0)
        price = item.get("price", 0)
        tax = item.get("tax", 0)
        discount = item.get("discount", 0)
        
        item_total = quantity * price
        item_discount = discount  # Assuming discount is already calculated amount
        item_after_discount = item_total - item_discount
        item_tax = (item_after_discount * tax) / 100
        
        subtotal += item_after_discount
        total_tax += item_tax
        total_quantity += quantity
    
    return {
        "subtotal": subtotal,
        "total_tax": total_tax,
        "total_quantity": total_quantity,
        "total_amount": subtotal + total_tax
    }



@app.post("/api/v1/orders/sale", response_model=Order)
async def create_sale_order(
    order: SaleOrderCreate,
    request: Request,
    current_user: str = Depends(get_current_user)
):
    try:
        invoice_number = order.invoice_number

        # ✅ Check if invoice exists
        if firebase_db.get_document("Orders", invoice_number).get().exists:
            raise HTTPException(status_code=400, detail="Invoice number already exists")

        # ✅ Calculate totals
        calculated_totals = calculate_order_totals([item.dict() for item in order.items])

        # ✅ Prepare order_data
        order_data = order.dict()
        order_data.update({
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": current_user,
            "updated_by": current_user,
            "order_type": "sale"
        })

        # ✅ Validate inventory + update (if not draft)
        if not order.draft:
            await InventoryService.update_inventory_on_sale(
                [item.dict() for item in order.items],
                current_user,
                invoice_number
            )

            # ✅ Update client due
            if order.client_id and order.payment_status in ["pending", "partial"]:
                due_delta = order.total_amount - order.amount_paid
                if due_delta > 0:
                    ClientService.update_due(order.client_id, due_delta)

            # ✅ Update doc_counters/orders
            firebase_db.get_document("doc_counters", "orders").update({
                "total": firestore.Increment(1),
                "total_sales.count": firestore.Increment(1),
                "total_sales.amount": firestore.Increment(order.total_amount),
                "last_id": invoice_number
            })
            
            # 🟡 Optional: Track challans placed by clients
            if order.client_id:
                firebase_db.get_document("doc_counters", "clients").update({
                    "total_orders": firestore.Increment(1)
                })


            # ✅ Update doc_counters/2025-06
            month_key = datetime.utcnow().strftime("%Y-%m")
            update_monthly_doc_counters(month_key, {
                "sales_orders_count": firestore.Increment(1),
                "sales_orders_amount": firestore.Increment(order.total_amount)
            })


        # ✅ ONLY AFTER ALL ABOVE: Save order to Firestore
        firebase_db.get_document("Orders", invoice_number).set(order_data)

        # ✅ Log activity
        loggerr.info(
            f"[create_order] Sale order '{invoice_number}' created by '{current_user}' | "
            f"Total Amount: ₹{order.total_amount} | "
            f"Client: {order.client_name} | "
            f"Items: {len(order.items)} | "
            f"Draft: {order.draft} | "
            f"Inventory Updated: {not order.draft} | "
            f"Client Due Updated: {not order.draft and order.payment_status in ['pending', 'partial']}"
        )


        return order_data

    except HTTPException:
        raise
    except Exception as e:
        loggerr.error(
            f"[create_order][sale] Error creating order '{invoice_number}' by '{current_user}' | "
            f"Client: {order.client_name} | "
            f"Total Amount: ₹{order.total_amount} | "
            f"Draft: {order.draft} | "
            f"Error: {str(e)}"
        )

        raise HTTPException(status_code=500, detail="Failed to create sale order. " + str(e))

# ================================
# PURCHASE ORDER ROUTES
# ================================
@app.post("/api/v1/orders/purchase", response_model=Order)
async def create_purchase_order(
    order: PurchaseOrderCreate,
    request: Request,
    current_user: str = Depends(get_current_user)
):
    try:
        invoice_number = order.invoice_number

        # ✅ 1. Check for duplicate invoice
        if firebase_db.get_document("Orders", invoice_number).get().exists:
            raise HTTPException(status_code=400, detail="Invoice number already exists")

        # ✅ 2. Calculate totals
        calculated_totals = calculate_order_totals([item.dict() for item in order.items])

        # ✅ 3. Prepare order data
        order_data = order.dict()
        order_data.update({
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": current_user,
            "updated_by": current_user,
            "order_type": "purchase"
        })

        # ✅ 4. Inventory & supplier updates only if not draft
        if not order.draft:
            await InventoryService.update_inventory_on_purchase(
                [item.dict() for item in order.items],
                current_user,
                invoice_number
            )

            if order.supplier_id:
                due_delta = order.total_amount - order.amount_paid
                if due_delta != 0:
                    SupplierService.update_due(
                        supplier_id=order.supplier_id,
                        delta_due=due_delta
                    )

            # ✅ 5. Update counters
            firebase_db.get_document("doc_counters", "orders").update({
                "total": firestore.Increment(1),
                "total_purchase.count": firestore.Increment(1),
                "total_purchase.amount": firestore.Increment(order.amount_paid),
                "last_id": invoice_number
            })

                # 🟡 Optional: Increment total orders placed by clients
            # 🟡 Optional: Increment total orders placed with suppliers
            if order.supplier_id:
                firebase_db.get_document("doc_counters", "suppliers").update({
                    "total_orders": firestore.Increment(1)
                })




            # ✅ 6. Monthly summary update
            month_key = datetime.utcnow().strftime("%Y-%m")
            update_monthly_doc_counters(month_key, {
                "purchase_orders_count": firestore.Increment(1),
                "purchase_orders_amount": firestore.Increment(order.amount_paid)
            })

        # ✅ 7. Final step: Save order to Firestore
        firebase_db.get_document("Orders", invoice_number).set(order_data)

        # ✅ 8. Log activity
        # ✅ 8. Log activity
        loggerr.info(
            f"[create_order][purchase] Purchase order '{invoice_number}' created by '{current_user}' | "
            f"Supplier: {order.supplier_name} | Amount: ₹{order.total_amount} | Draft: {order.draft}"
        )


        return order_data

    except HTTPException:
        raise
    except Exception as e:
        loggerr.error(
            f"[create_order][purchase] Failed to create order '{invoice_number}' | Error: {str(e)}",
            exc_info=True
        )

        raise HTTPException(status_code=500, detail="Failed to create purchase order. " + str(e))

# ================================
# DELIVERY CHALLAN ROUTES
# ================================
@app.post("/api/v1/orders/delivery-challan", response_model=Order)
async def create_delivery_challan(
    order: DeliveryChallanCreate,
    request: Request,
    current_user: str = Depends(get_current_user)
):
    """
    Creates a new delivery challan.
    If not a draft, it updates inventory, client due amount, and employee collections.
    """
    try:
        challan_number = order.challan_number

        if firebase_db.get_document("Orders", challan_number).get().exists:
            raise HTTPException(status_code=400, detail="Challan number already exists")

        # Assuming this function correctly calculates and sets order.total_amount
        calculated_totals = calculate_order_totals([item.dict() for item in order.items])
        # It's safer to use the calculated total than relying on the request body
        order.total_amount = calculated_totals.get("total_amount", order.total_amount)

        order_data = order.dict()
        order_data.update({
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "created_by": current_user,
            "updated_by": current_user,
            "order_type": "delivery_challan"
        })

        inventory_updated = False
        employee_updated = False
        client_due_updated = False

        if not order.draft:
            # 1. Update Inventory
            await InventoryService.update_inventory_on_sale(
                [item.dict() for item in order.items],
                challan_number
            )
            inventory_updated = True

            # 2. Update Client's Due Amount
            if order.client_id:
                due_amount = order.total_amount - order.amount_paid
                if due_amount > 0:
                    ClientService.update_due(
                        client_id=order.client_id,
                        delta_due=due_amount
                    )
                    client_due_updated = True

            # 3. Update Employee's Collected Amount and Counter
            if order.amount_collected_by and order.amount_paid > 0:
                await EmployeeService.update_employee_collection(
                    employee_name=order.amount_collected_by,
                    amount=order.amount_paid,
                    order_id=challan_number
                )
                employee_updated = True
                
                # Also update the aggregate total_collected counter
                firebase_db.get_document("doc_counters", "employees").update({
                    "total_collected": firestore.Increment(order.amount_paid)
                })

            # 4. Update Document Counters
            firebase_db.get_document("doc_counters", "orders").update({
                "total": firestore.Increment(1),
                "delivery_challan.count.count": firestore.Increment(1),
                "delivery_challan.amount": firestore.Increment(order.amount_paid),
                "last_id": challan_number
            })
            
            if order.client_id:
                firebase_db.get_document("doc_counters", "clients").update({
                    "total_orders": firestore.Increment(1)
                })

            # 5. Update Monthly Summary
            month_key = datetime.utcnow().strftime("%Y-%m")
            update_monthly_doc_counters(month_key, {
                "delivery_challan_count": firestore.Increment(1),
                "delivery_challan_amount": firestore.Increment(order.amount_paid)
            })

        # Save challan to Firestore
        firebase_db.get_document("Orders", challan_number).set(order_data)

        loggerr.info(
            f"[create_order][delivery_challan] Challan '{challan_number}' created by '{current_user}' | "
            f"Client: {order.client_name} | Amount: ₹{order.total_amount} | "
            f"Draft: {order.draft} | Inventory updated: {inventory_updated} | "
            f"Client due updated: {client_due_updated} | Employee updated: {employee_updated}"
        )

        return order_data

    except HTTPException:
        raise
    except Exception as e:
        loggerr.error(
            f"[create_order][delivery_challan] Failed to create challan '{challan_number}' by '{current_user}' | "
            f"Error: {str(e)}"
        )
        raise HTTPException(status_code=500, detail="Failed to create delivery challan. " + str(e))


@app.get("/api/v1/orders", response_model=OrderListResponse)
async def get_orders(
    request: Request,
    limit: int = Query(10, ge=1, le=100),
    page: int = Query(1, ge=1),
    order_type: Optional[OrderType] = Query(None),
    payment_status: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    client_id: Optional[str] = Query(None),
    supplier_id: Optional[str] = Query(None),
    # ... other dependencies
):
    """
    Get paginated orders with intelligent search based on the order_type filter.
    """
    try:
        base_query = firebase_db.get_collection("Orders")

        # Apply all standard filters first
        if order_type:
            base_query = base_query.where("order_type", "==", order_type.value)
        if payment_status:
            base_query = base_query.where("payment_status", "==", payment_status)
        if status:
            base_query = base_query.where("status", "==", status)
        if client_id:
            base_query = base_query.where("client_id", "==", client_id)
        if supplier_id:
            base_query = base_query.where("supplier_id", "==", supplier_id)

        items = []
        total_items = 0
        final_query = base_query

        if search:
            # --- INTELLIGENT SEARCH LOGIC ---
            if order_type and order_type.value == "delivery_challan":
                # If filter is 'delivery_challan', only search that field
                final_query = base_query.where("challan_number", "==", search)
            
            elif order_type and order_type.value in ["sale", "purchase"]:
                # If filter is 'sale' or 'purchase', only search that field
                final_query = base_query.where("invoice_number", "==", search)
            
            else:
                # Fallback: If no order_type is selected, search both fields (less efficient)
                invoice_query = base_query.where("invoice_number", "==", search)
                challan_query = base_query.where("challan_number", "==", search)
                
                invoice_docs = invoice_query.stream()
                challan_docs = challan_query.stream()
                
                all_docs = {doc.id: doc.to_dict() for doc in invoice_docs}
                all_docs.update({doc.id: doc.to_dict() for doc in challan_docs})
                
                sorted_items = sorted(all_docs.values(), key=lambda x: x.get('created_at'), reverse=True)
                
                total_items = len(sorted_items)
                start_index = (page - 1) * limit
                end_index = start_index + limit
                items = sorted_items[start_index:end_index]
                
                # Since we handled pagination manually, we can return early
                total_pages = (total_items + limit - 1) // limit if total_items > 0 else 0
                return OrderListResponse(
                    orders=items,
                    pagination=PaginationResponse(
                        current_page=page, total_pages=total_pages, total_items=total_items,
                        items_per_page=limit, has_next=page < total_pages, has_prev=page > 1,
                    )
                )

        # --- Standard Pagination for single-query cases ---
        count_query = final_query.count()
        total_items_result = count_query.get()
        total_items = total_items_result[0][0].value if total_items_result else 0
        
        paginated_query = final_query.order_by("created_at", direction=firestore.Query.DESCENDING).offset((page - 1) * limit).limit(limit)
        docs = paginated_query.stream()
        items = [doc.to_dict() for doc in docs]

        total_pages = (total_items + limit - 1) // limit if total_items > 0 else 0

        return OrderListResponse(
            orders=items,
            pagination=PaginationResponse(
                current_page=page, total_pages=total_pages, total_items=total_items,
                items_per_page=limit, has_next=page < total_pages, has_prev=page > 1,
            )
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch orders: {str(e)}")
    

@app.get("/api/v1/orders/{order_id}", response_model=Order)
async def get_order(
    order_id: str,
    request: Request,
    current_user: str = Depends(get_current_user)
):
    """Get a specific order by ID (invoice_number or challan_number)"""
    try:
        doc = firebase_db.get_document("Orders", order_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Order not found")
        
        order_data = doc.to_dict()
        
        # ActivityLogger.log_activity(
        #     action="READ",
        #     resource="orders",
        #     resource_id=order_id,
        #     user=current_user,
        #     request=request,
        #     details={
        #         "order_type": order_data.get("order_type"),
        #         "total_amount": order_data.get("total_amount"),
        #         "firebase_reads": 1  # Only 1 read for this operation
        #     }
        # )
        
        return order_data
    except HTTPException:
        raise
    except Exception as e:
        # ActivityLogger.log_error(
        #     error=str(e),
        #     context="get_order",
        #     user=current_user,
        #     request=request,
        #     exception=e
        # )
        raise HTTPException(status_code=500, detail=str(e))



@app.put("/api/v1/orders/{order_id}", response_model=Order)
async def update_order(

    
    order_id: str,
    order_update: OrderUpdate,
    request: Request,
    current_user: str = Depends(get_current_user)
):
    """Update a specific order with cascading updates to doc_counters and related entities."""
    try:
        doc_ref = firebase_db.get_document("Orders", order_id)
        doc = doc_ref.get()

        if not doc.exists:
            raise HTTPException(status_code=404, detail="Order not found")

        old_data = doc.to_dict()
        order_type = OrderTypeEnum(old_data.get("order_type"))

        # Prepare update data, excluding unset fields
        update_data = order_update.dict(exclude_unset=True)
        update_data.update({
            "updated_at": datetime.utcnow(),
            "updated_by": current_user
        })

        # --- Calculate deltas for doc_counters BEFORE updating the order document ---
        # These deltas are based on old_data vs. proposed update_data

        # 1. Financial Deltas (for total_amount and amount_paid)
        old_total_amount = old_data.get("total_amount", 0)
        new_total_amount = update_data.get("total_amount", old_total_amount)
        total_amount_delta = new_total_amount - old_total_amount

        old_amount_paid = old_data.get("amount_paid", 0)
        new_amount_paid = update_data.get("amount_paid", old_amount_paid)
        amount_paid_delta = new_amount_paid - old_amount_paid

        # 2. Quantity Delta (for total_quantity)
        old_total_quantity = old_data.get("total_quantity", 0)
        new_total_quantity = update_data.get("total_quantity", old_total_quantity)
        total_quantity_delta = new_total_quantity - old_total_quantity

        # 3. Due Amount Delta (for Client/Supplier Services)
        # This needs to be calculated based on the *change* in total_amount AND amount_paid
        old_net_due = old_total_amount - old_amount_paid
        new_net_due = new_total_amount - new_amount_paid
        due_delta_for_entity = old_net_due - new_net_due # How much the entity's due changes (positive means due decreased)

        # Apply update to the Order document
        doc_ref.update(update_data)

        # ---------- SYNC DEPENDENT COLLECTIONS AND DOC_COUNTERS ---------- #

        # Update doc_counters/orders (total_sales.amount, total_purchase.amount, delivery_challan.amount)
        # These reflect the *total value* of the order, so update if total_amount changed.
        if total_amount_delta != 0:
            orders_counter_updates = {}
            if order_type == OrderTypeEnum.sale:
                orders_counter_updates["total_sales.amount"] = firestore.Increment(total_amount_delta)
            elif order_type == OrderTypeEnum.purchase:
                orders_counter_updates["total_purchase.amount"] = firestore.Increment(total_amount_delta)
            elif order_type == OrderTypeEnum.delivery_challan:
                orders_counter_updates["delivery_challan.amount"] = firestore.Increment(total_amount_delta)
            
            if orders_counter_updates:
                firebase_db.get_document("doc_counters", "orders").update(orders_counter_updates)

        # Update doc_counters/orders.total_revenue and financial_summary (based on amount_paid)
        if amount_paid_delta != 0:
            if order_type == OrderTypeEnum.sale or order_type == OrderTypeEnum.delivery_challan:
                firebase_db.get_document("doc_counters", "orders").update({
                    "total_revenue": firestore.Increment(amount_paid_delta),
                    "updated_at": datetime.utcnow()
                })
                firebase_db.get_document("doc_counters", "financial_summary").update({
                    "total_income": firestore.Increment(total_amount_delta),
                    "updated_at": datetime.utcnow()
                })
            elif order_type == OrderTypeEnum.purchase:
                firebase_db.get_document("doc_counters", "financial_summary").update({
                    "total_expense": firestore.Increment(amount_paid_delta),
                    "updated_at": datetime.utcnow()
                })

        # Update monthly doc_counters (based on amount_paid or total_amount if only total_amount changes)
        # Prioritize amount_paid_delta for monthly cash flow tracking.
        monthly_updates = {}
        if amount_paid_delta != 0:
            if order_type == OrderTypeEnum.sale:
                monthly_updates["sales_orders_amount"] = firestore.Increment(amount_paid_delta)
            elif order_type == OrderTypeEnum.purchase:
                monthly_updates["purchase_orders_amount"] = firestore.Increment(amount_paid_delta)
            elif order_type == OrderTypeEnum.delivery_challan:
                monthly_updates["delivery_challan_amount"] = firestore.Increment(amount_paid_delta)
        elif total_amount_delta != 0: # If amount_paid didn't change but total_amount did
            if order_type == OrderTypeEnum.sale:
                monthly_updates["sales_orders_amount"] = firestore.Increment(total_amount_delta)
            elif order_type == OrderTypeEnum.purchase:
                monthly_updates["purchase_orders_amount"] = firestore.Increment(total_amount_delta)
            elif order_type == OrderTypeEnum.delivery_challan:
                monthly_updates["delivery_challan_amount"] = firestore.Increment(total_amount_delta)

        if monthly_updates:
            month_key = old_data["created_at"].strftime("%Y-%m")
            update_monthly_doc_counters(month_key, monthly_updates)


        # Update Client/Supplier due amounts (if relevant fields changed)
        # Only update if due_delta_for_entity is non-zero
        if due_delta_for_entity != 0:
            if order_type == OrderTypeEnum.sale and old_data.get("client_id"):
                ClientService.update_due(
                    client_id=old_data["client_id"],
                    delta_due=-due_delta_for_entity, # Negative delta_due reduces client's due
                    user=current_user,
                    order_id=order_id
                )
            elif order_type == OrderTypeEnum.purchase and old_data.get("supplier_id"):
                SupplierService.update_due(
                    supplier_id=old_data["supplier_id"],
                    delta_due=-due_delta_for_entity, # Negative delta_due reduces supplier's due
                    user=current_user,
                    order_id=order_id
                )

        # Update Employee Collection if amount paid increased (only for delivery challan)
        employee_collection_updated = False
        if (order_type == OrderTypeEnum.delivery_challan
                and "amount_paid" in update_data
                and old_data.get("amount_collected_by")): # Ensure there was an employee assigned
            
            # If amount_collected_by is also being updated, use the new one, else use old
            employee_to_update = update_data.get("amount_collected_by", old_data.get("amount_collected_by"))
            
            if amount_paid_delta != 0 and employee_to_update:
                employee_collection_updated = await EmployeeService.update_employee_collection(
                    employee_to_update,
                    amount_paid_delta, # Pass the delta, not the absolute amount
                    current_user,
                    order_id
                )

        # Update Client name if changed
        if "client_name" in update_data and old_data.get("client_id"):
            firebase_db.get_document("Clients", old_data["client_id"]).update({
                "name": update_data["client_name"],
                "updated_at": datetime.utcnow()
            })

        # Update Supplier name if changed
        if "supplier_name" in update_data and old_data.get("supplier_id"):
            firebase_db.get_document("Suppliers", old_data["supplier_id"]).update({
                "name": update_data["supplier_name"],
                "updated_at": datetime.utcnow()
            })

        # Inventory Adjustment if items changed
        if "items" in update_data:
            await InventoryService.reconcile_inventory_on_order_update(
                old_items=old_data.get("items", []),
                new_items=update_data["items"],
                order_type=order_type,
                order_id=order_id,
                user=current_user
            )

        # ---------- GET FINAL DATA ---------- #
        updated_doc = doc_ref.get()
        updated_data = updated_doc.to_dict()

        # ---------- LOG ACTIVITY ---------- #
        # Identify changed fields with old and new values
        changed_fields = {
            key: {"old": old_data.get(key), "new": update_data[key]}
            for key in update_data
            if old_data.get(key) != update_data[key]
        }

        loggerr.info(
            f"[update_order] Order '{order_id}' updated by '{current_user}' | "
            f"Type: {order_type.value} | Changed Fields: {list(changed_fields.keys())} | "
            f"Before/After: {changed_fields}"
        )


        return Order(**updated_data)

    except HTTPException:
        raise
    except Exception as e:
        loggerr.error(
            f"[update_order] Error updating order {order_id}: {str(e)}\n{traceback.format_exc()}",
            context="update_order_cascading",
            user=current_user,
            request=request,
            exception=e
        )
        raise HTTPException(status_code=500, detail="Internal Server Error: " + str(e))


@app.put("/api/v1/orders/{order_id}/payment-status", response_model=Order, summary="Update Order Payment Details")
async def update_order_payment_status(
    order_id: str,
    payment_update: PaymentStatusUpdate, # Using your original model
    request: Request,
    current_user: str = Depends(get_current_user)
):
    """
    Updates an order's payment status and amount paid by reading the order,
    calculating changes, and updating all related documents sequentially.
    """
    # --- 1. READ & VALIDATE ---
    # Fetch the original order from Firestore.
    order_ref = firebase_db.get_document("Orders", order_id)
    order_doc = order_ref.get()
    if not order_doc.exists:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Store old data for calculations.
    old_data = order_doc.to_dict()
    total_amount = old_data.get("total_amount", 0)
    order_type = OrderTypeEnum(old_data.get("order_type"))

    # Ensure 'amount_paid' is provided if the status is 'partial'.
    if payment_update.payment_status == "partial" and payment_update.amount_paid is None:
        raise HTTPException(
            status_code=400,
            detail="amount_paid is required when payment_status is 'partial'."
        )

    # --- 2. CALCULATE CHANGES ---
    # Determine the correct new amount paid based on the new status.
    old_amount_paid = old_data.get("amount_paid", 0)
    new_amount_paid = old_amount_paid 
    if payment_update.payment_status == "paid":
        new_amount_paid = total_amount
    elif payment_update.payment_status == "pending":
        new_amount_paid = 0
    elif payment_update.payment_status == "partial":
        new_amount_paid = payment_update.amount_paid

    # Calculate the difference (delta) to apply to other documents.
    amount_paid_delta = new_amount_paid - old_amount_paid

    # If nothing changed, exit early to prevent unnecessary database writes.
    if amount_paid_delta == 0 and payment_update.payment_status == old_data.get("payment_status"):
        return Order(**old_data)

    # --- 3. EXECUTE UPDATES ---
    try:
        # First, update the main order document itself.
        update_payload = payment_update.model_dump(exclude_unset=True)
        update_payload["amount_paid"] = new_amount_paid
        update_payload["updated_at"] = datetime.utcnow()
        update_payload["updated_by"] = current_user
        order_ref.update(update_payload)

        # If the paid amount changed, trigger all cascading updates.
        if amount_paid_delta != 0:
            # Update the due amount for the associated Client or Supplier.
            if order_type in [OrderTypeEnum.sale, OrderTypeEnum.delivery_challan] and old_data.get("client_id"):
                ClientService.update_due(client_id=old_data["client_id"], delta_due=-amount_paid_delta)
            elif order_type == OrderTypeEnum.purchase and old_data.get("supplier_id"):
                SupplierService.update_due(supplier_id=old_data["supplier_id"], delta_due=-amount_paid_delta)

            # For Delivery Challans, update the employee's 'collected' total.
            if order_type == OrderTypeEnum.delivery_challan and old_data.get("amount_collected_by"):
                await EmployeeService.update_employee_collection(
                    employee_name=old_data.get("amount_collected_by"),
                    amount=amount_paid_delta
                )

            # Update the relevant monthly and global financial counters.
            month_key = old_data.get("created_at").strftime("%Y-%m")
            
            if order_type in [OrderTypeEnum.sale, OrderTypeEnum.delivery_challan]:
                # For sales/challans, INCREMENT income.
                field_name = "sales_orders_amount" if order_type == OrderTypeEnum.sale else "delivery_challan_amount"
                update_monthly_doc_counters(month_key, {field_name: firestore.Increment(amount_paid_delta)})
                firebase_db.get_document("doc_counters", "financial_summary").update({"total_income": firestore.Increment(amount_paid_delta)})
            
            elif order_type == OrderTypeEnum.purchase:
                # For purchases, DECREMENT income as it's money spent.
                update_monthly_doc_counters(month_key, {"purchase_orders_amount": firestore.Increment(amount_paid_delta)})
                firebase_db.get_document("doc_counters", "financial_summary").update({"total_income": firestore.Increment(-amount_paid_delta)})

        loggerr.info(
            f"[update_payment] Payment for order '{order_id}' updated by '{current_user}'. "
            f"New status: {payment_update.payment_status}, Amount Paid: {new_amount_paid}"
        )

        # --- 4. RETURN FINAL DATA ---
        # Fetch the fully updated order and return it.
        updated_doc = order_ref.get()
        return Order(**updated_doc.to_dict())

    except HTTPException as e:
        raise e # Re-raise known errors
    except Exception as e:
        loggerr.error(f"[update_payment_error] A critical error occurred for order '{order_id}': {str(e)}")
        raise HTTPException(status_code=500, detail=f"An internal server error occurred: {str(e)}")
    

@app.delete("/api/v1/orders/{order_id}")
async def delete_order(
    order_id: str,
    request: Request,
    current_user: str = Depends(get_current_user)
):
    """
    Delete an order and revert all associated doc_counters and inventory changes.
    """
    try:
        order_ref = firebase_db.get_document("Orders", order_id)
        order_doc = order_ref.get()

        if not order_doc.exists:
            raise HTTPException(status_code=404, detail="Order not found")
        
        order_data = order_doc.to_dict()
        order_type = OrderTypeEnum(order_data.get("order_type"))
        total_amount = order_data.get("total_amount", 0)
        amount_paid = order_data.get("amount_paid", 0)
        items = order_data.get("items", [])
        
        # Revert changes only if the order was not a draft
        if not order_data.get("draft", False):
            # 1. Revert Inventory
            await InventoryService.revert_inventory_on_delete(
                items=items,
                order_type=order_type,
                order_id=order_id,
                user=current_user
            )

            # 2. Revert Client/Supplier Due Amount
            due_amount_on_delete = total_amount - amount_paid
            if due_amount_on_delete != 0: # Also revert if due was negative (overpayment)
                if order_type in [OrderTypeEnum.sale, OrderTypeEnum.delivery_challan] and order_data.get("client_id"):
                    ClientService.update_due(
                        client_id=order_data["client_id"],
                        delta_due=-due_amount_on_delete # Subtract the due amount that was added
                    )
                elif order_type == OrderTypeEnum.purchase and order_data.get("supplier_id"):
                    SupplierService.update_due(
                        supplier_id=order_data["supplier_id"],
                        delta_due=-due_amount_on_delete # Subtract the due amount that was added
                    )
            
            # 3. Revert Employee Collection and Counter
            if order_type == OrderTypeEnum.delivery_challan and order_data.get("amount_collected_by") and amount_paid > 0:
                # Revert the collection amount on the specific employee's document
                await EmployeeService.revert_employee_collection(
                    employee_name=order_data["amount_collected_by"],
                    amount=amount_paid,
                    order_id=order_id
                )
                # Also revert the aggregate total_collected counter
                firebase_db.get_document("doc_counters", "employees").update({
                    "total_collected": firestore.Increment(-amount_paid),
                    "updated_at": datetime.utcnow()
                })

            # 4. Revert Financial Summary (total_income/total_expense)
            if amount_paid > 0:
                if order_type in [OrderTypeEnum.sale, OrderTypeEnum.delivery_challan]:
                    firebase_db.get_document("doc_counters", "financial_summary").update({
                        "total_income": firestore.Increment(-amount_paid)
                    })
                

            # 5. Revert Order Counters
            orders_counter_updates = {
                "total": firestore.Increment(-1),
                "updated_at": datetime.utcnow()
            }
            if order_type == OrderTypeEnum.sale:
                orders_counter_updates["total_sales.count"] = firestore.Increment(-1)
                orders_counter_updates["total_sales.amount"] = firestore.Increment(-amount_paid)
            elif order_type == OrderTypeEnum.purchase:
                orders_counter_updates["total_purchase.count"] = firestore.Increment(-1)
                orders_counter_updates["total_purchase.amount"] = firestore.Increment(-amount_paid)
            elif order_type == OrderTypeEnum.delivery_challan:
                orders_counter_updates.update({
                    "delivery_challan.count": firestore.Increment(-1), # Assuming DC counts as a sale
                    "delivery_challan.amount": firestore.Increment(-amount_paid)
                })
            
            firebase_db.get_document("doc_counters", "orders").update(orders_counter_updates)

            # 6. Revert Client/Supplier Order Counts
            if order_type in [OrderTypeEnum.sale, OrderTypeEnum.delivery_challan] and order_data.get("client_id"):
                firebase_db.get_document("doc_counters", "clients").update({
                    "total_orders": firestore.Increment(-1),
                    "updated_at": datetime.utcnow()
                })
            elif order_type == OrderTypeEnum.purchase and order_data.get("supplier_id"):
                firebase_db.get_document("doc_counters", "suppliers").update({
                    "total_orders": firestore.Increment(-1),
                    "updated_at": datetime.utcnow()
                })

            # 7. Revert Monthly Counters
            month_key = order_data["created_at"].strftime("%Y-%m")
            monthly_updates = {}
            if order_type == OrderTypeEnum.sale:
                monthly_updates["sales_orders_count"] = firestore.Increment(-1)
                monthly_updates["sales_orders_amount"] = firestore.Increment(-amount_paid)
            elif order_type == OrderTypeEnum.purchase:
                monthly_updates["purchase_orders_count"] = firestore.Increment(-1)
                monthly_updates["purchase_orders_amount"] = firestore.Increment(-amount_paid)
            elif order_type == OrderTypeEnum.delivery_challan:
                monthly_updates["delivery_challan_count"] = firestore.Increment(-1)
                monthly_updates["delivery_challan_amount"] = firestore.Increment(-amount_paid)
            
            if monthly_updates:
                update_monthly_doc_counters(month_key, monthly_updates)

        # 8. Delete the Order Document
        order_ref.delete()

        loggerr.info(
            f"[delete_order] Order {order_id} deleted by {current_user} | "
            f"Type: {order_type.value} | Amount: {total_amount}"
        )

        return {"message": f"Order {order_id} deleted successfully."}

    except HTTPException:
        raise
    except Exception as e:
        loggerr.error(
            f"[delete_order] Error deleting Order {order_id}: {str(e)}\n{traceback.format_exc()}"
        )
        raise HTTPException(status_code=500, detail="Failed to delete order: " + str(e))

# ================================
# UTILITY ROUTES FOR ORDER MANAGEMENT
# ================================
@app.get("/api/v1/all-orders/stats")
async def get_order_stats(
    request: Request,
    month: Optional[str] = Query(None, description="Month in YYYY-MM format (for monthly stats)"),
    
    current_user: str = Depends(get_current_user)
):
    """Get order statistics from doc_counters — either monthly or overall"""
    try:
        if month:
            # 🔄 Fetch monthly stats from doc_counters/{month}
            doc = firebase_db.get_document("doc_counters", month).get()
            if not doc.exists:
                raise HTTPException(status_code=404, detail=f"No stats found for month: {month}")

            data = doc.to_dict()
            return {
                "scope": "monthly",
                "month": month,
                "sales_orders_count": data.get("sales_orders_count", 0),
                "sales_orders_amount": data.get("sales_orders_amount", 0),
                "delivery_challan_count": data.get("delivery_challan_count", 0),
                "delivery_challan_amount": data.get("delivery_challan_amount", 0),
                "purchase_orders_count": data.get("purchase_orders_count", 0),
                "purchase_orders_amount": data.get("purchase_orders_amount", 0),
                "updated_at": data.get("updated_at")
            }
        else:
            # 🌍 Fetch overall stats from doc_counters/orders
            doc = firebase_db.get_document("doc_counters", "orders").get()
            if not doc.exists:
                raise HTTPException(status_code=404, detail="Overall stats not available")

            data = doc.to_dict()
            return {
                "scope": "overall",
                "total_orders": data.get("total", 0),
                "total_sales": data.get("total_sales", {}).get("count", 0),
                "total_sales_amount": data.get("total_sales", {}).get("amount", 0),
                "total_purchase": data.get("total_purchase", {}).get("count", 0),
                "total_purchase_amount": data.get("total_purchase", {}).get("amount", 0),
                "delivery_challan_count": data.get("delivery_challan", {}).get("count", 0),
                "delivery_challan_amount": data.get("delivery_challan", {}).get("amount", 0),
                "last_id": data.get("last_id")
            }

    except HTTPException:
        raise
    except Exception as e:
        
        raise HTTPException(status_code=500, detail="Failed to fetch order statistics")

@app.get("/api/v1/suppliers", response_model=SupplierPaginatedResponse)
async def get_suppliers(
    page: int = Query(1, ge=1),
    limit: int = Query(9, ge=1, le=100),
    search: Optional[str] = None
    # ... other dependencies
):
    """
    Get a paginated list of suppliers with efficient, server-side search.
    """
    try:
        query = firebase_db.get_collection("Suppliers")

        # FIX: Integrate search directly into the Firestore query for performance.
        # This performs a prefix search on the supplier's name.
        if search:
            query = query.where("name", ">=", search).where("name", "<=", search + u"\uf8ff")

        # PERFORMANCE FIX: Use an aggregate query to get the total count efficiently.
        count_query = query.count()
        total_items_result = count_query.get()
        total_items = total_items_result[0][0].value if total_items_result else 0
        total_pages = (total_items + limit - 1) // limit if total_items > 0 else 0

        # Fetch the actual documents for the current page.
        # Note: When using .where() with .order_by() on a different field,
        # Firestore may require a composite index. The error message will provide a link to create it.
        paginated_query = query.order_by("name").offset((page - 1) * limit).limit(limit)
        docs = paginated_query.stream()
        items = [Supplier(**doc.to_dict()) for doc in docs]

        return {
            "items": items,
            "pagination": {
                "current_page": page,
                "items_per_page": limit,
                "total_items": total_items,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch suppliers: {str(e)}")


@app.post("/api/v1/suppliers", response_model=Supplier, status_code=201)
async def create_supplier(
    supplier_data_in: SupplierCreate,
    current_user: str = Depends(get_current_user)
):
    """Create a new supplier, correctly updating counters."""
    try:
        supplier_id = await CounterService.get_next_id('suppliers', user=current_user)
        
        # Use modern .model_dump() for Pydantic v2
        supplier_data = supplier_data_in.model_dump()
        current_time = datetime.utcnow()
        supplier_data.update({
            "id": supplier_id,
            "created_at": current_time,
            "updated_at": current_time,
            "created_by": current_user,
            "updated_by": current_user,
        })
            
        firebase_db.get_collection('Suppliers').document(supplier_id).set(supplier_data)
        
        # BUG FIX: Removed the redundant 'total' increment. CounterService already handled it.
        # Only update the total_due if it's greater than zero.
        if supplier_data_in.due > 0:
            firebase_db.get_document("doc_counters", "suppliers").update({
                "total_due": firestore.Increment(supplier_data_in.due),
                "updated_at": datetime.utcnow()
            })
        
        return Supplier(**supplier_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create supplier: {str(e)}")


@app.get("/api/v1/suppliers/{supplier_id}", response_model=Supplier)
async def get_supplier(supplier_id: str):
    """Get a single supplier by their ID."""
    try:
        doc = firebase_db.get_document('Suppliers', supplier_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Supplier not found")
        
        return Supplier(**doc.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get supplier: {str(e)}")


@app.put("/api/v1/suppliers/{supplier_id}", response_model=Supplier)
async def update_supplier(
    supplier_id: str,
    supplier_update: SupplierUpdate,
    current_user: str = Depends(get_current_user)
):
    """Update a supplier's details and log changes."""
    try:
        doc_ref = firebase_db.get_document('Suppliers', supplier_id)
        current_doc = doc_ref.get()
        
        if not current_doc.exists:
            raise HTTPException(status_code=404, detail="Supplier not found")
        
        old_data = current_doc.to_dict()
        update_data = supplier_update.model_dump(exclude_unset=True)

        if not update_data:
            raise HTTPException(status_code=400, detail="No update data provided.")

        update_data["updated_at"] = datetime.utcnow()
        update_data["updated_by"] = current_user

        # Atomically update 'total_due' counter
        if "due" in update_data:
            old_due = old_data.get("due", 0)
            due_difference = update_data["due"] - old_due
            if due_difference != 0:
                firebase_db.get_document("doc_counters", "suppliers").update({
                    "total_due": firestore.Increment(due_difference)
                })

        # Log before vs after changes
        changed_fields = {
            key: {
                "old": old_data.get(key),
                "new": update_data[key]
            }
            for key in update_data
            if old_data.get(key) != update_data[key]
        }

        loggerr.info(f"[SUPPLIER] Update for ID: {supplier_id} by {current_user}")
        loggerr.info(f"Changed Fields: {changed_fields}")

        # Apply update
        doc_ref.update(update_data)
        updated_doc = doc_ref.get()

        return Supplier(**updated_doc.to_dict())
    
    except HTTPException:
        raise
    except Exception as e:
        loggerr.error(f"[SUPPLIER] Update Error for ID: {supplier_id} - {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update supplier: {str(e)}")

@app.delete("/api/v1/suppliers/{supplier_id}", status_code=200)
async def delete_supplier(supplier_id: str):
    """Delete a supplier and update counters."""
    try:
        doc_ref = firebase_db.get_document("Suppliers", supplier_id)
        doc = doc_ref.get()

        if not doc.exists:
            raise HTTPException(status_code=404, detail="Supplier not found")

        supplier_data = doc.to_dict()
        doc_ref.delete()

        # Update counters atomically
        firebase_db.get_document("doc_counters", "suppliers").update({
            "total": firestore.Increment(-1),
            "total_due": firestore.Increment(-supplier_data.get("due", 0))
        })
        loggerr.info(
            f"[delete_supplier] Supplier {supplier_id} deleted. "
            f"Old data: {supplier_data}"
        )

        return {"message": "Supplier deleted successfully", "supplier_id": supplier_id}
    except HTTPException:
        raise
    except Exception as e:
        loggerr.error(f"[delete_supplier] Failed to delete supplier {supplier_id}: {str(e)}")

        raise HTTPException(status_code=500, detail=f"Failed to delete supplier: {str(e)}")


@app.get("/api/v1/suppliers/{supplier_id}/history", response_model=OrderListResponse)
async def get_supplier_history(
    supplier_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100)
):
    """Fetch all purchase orders for a supplier efficiently."""
    try:
        base_query = firebase_db.get_collection("Orders").where("supplier_id", "==", supplier_id).where("order_type", "==", "purchase")

        # PERFORMANCE FIX: Use .count() for an efficient total count.
        count_query = base_query.count()
        total_items_result = count_query.get()
        total_items = total_items_result[0][0].value if total_items_result else 0
        total_pages = (total_items + limit - 1) // limit if total_items > 0 else 0

        # Fetch just the documents for the current page
        paginated_query = base_query.order_by("created_at", direction=firestore.Query.DESCENDING).offset((page - 1) * limit).limit(limit)
        docs = paginated_query.stream()
        orders = [doc.to_dict() for doc in docs]

        # RESPONSE FIX: Return the data in the structure defined by OrderListResponse
        return {
            "orders": orders,
            "pagination": {
                "current_page": page,
                "total_pages": total_pages,
                "total_items": total_items,
                "items_per_page": limit,
                "has_next": page < total_pages,
                "has_prev": page > 1,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch supplier history: {str(e)}")

@app.get("/api/v1/suppliers/{supplier_id}/total-orders")
async def get_total_orders_for_supplier(
    supplier_id: str,
    current_user: str = Depends(get_current_user),
    request: Request = None
):
    """Get total purchase orders for a supplier"""
    try:
        query = firebase_db.get_collection("Orders") \
            .where("supplier_id", "==", supplier_id) \
            .where("order_type", "==", "purchase")

        total_orders = len(list(query.stream()))

        return {"supplier_id": supplier_id, "total_orders": total_orders}
    except Exception as e:
        
        raise HTTPException(status_code=500, detail="Failed to fetch supplier total orders.")

def get_available_months() -> List[str]:
    """Return list of YYYY-MM strings that exist as documents in Firestore `doc_counters`.

    The dashboard month dropdown can use this to show only months that have data.
    """
    pattern = re.compile(r"^\d{4}-\d{2}$")  # simple YYYY-MM
    docs = firebase_db.collection("doc_counters").stream()
    months: List[str] = []
    for doc in docs:
        doc_id = doc.id
        if pattern.match(doc_id):
            months.append(doc_id)

    # Sort descending so latest month first
    months.sort(reverse=True)
    return months

@app.get("/api/v1/dashboard/months", response_model=List[str])
async def list_available_months() -> List[str]:
    """
    Return all month IDs (YYYY-MM) that exist in Firestore `doc_counters`.
    """
    try:
        return get_available_months()
    except Exception as e:
        # Optional: log the error here
        raise HTTPException(status_code=500, detail=str(e))
    

load_dotenv()

# --- Google Drive Configuration ---
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
DRIVE_FOLDER_ID = os.getenv("DRIVE_FOLDER_ID")
REDIRECT_URI = "http://localhost:8000/auth/callback" 
SCOPE = "https://www.googleapis.com/auth/drive.file"
TOKEN_FILE = "token.json"
TIMEZONE = pytz.timezone('Asia/Kolkata')
    
# --- Helper Function for Google Credentials ---
def get_valid_credentials():
    """
    Loads, validates, and refreshes Google OAuth credentials.
    This version correctly handles the token.json format.
    """
    creds = None
    if not all([GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, DRIVE_FOLDER_ID]):
        print("ERROR: Missing Google Drive environment variables.")
        raise HTTPException(status_code=500, detail="Server is not configured correctly for Drive uploads.")

    if os.path.exists(TOKEN_FILE):
        # Load just the tokens from the file.
        with open(TOKEN_FILE, "r") as token:
            token_data = json.load(token)
        
        # Create credentials by combining tokens from the file
        # with client info from the environment variables.
        creds = Credentials(
            token=token_data.get("access_token"),
            refresh_token=token_data.get("refresh_token"),
            token_uri="https://oauth2.googleapis.com/token",
            client_id=GOOGLE_CLIENT_ID,
            client_secret=GOOGLE_CLIENT_SECRET,
            scopes=[SCOPE]
        )

    # If there are no (valid) credentials available, handle refresh or raise error.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                print("Credentials expired. Refreshing token...")
                # The refresh request will use the client_id and client_secret we provided.
                creds.refresh(GoogleAuthRequest())
                # Save the updated tokens back to the file.
                with open(TOKEN_FILE, "w") as token:
                    token.write(creds.to_json())
                print("Token refreshed successfully.")
            except Exception as e:
                # If refresh fails, delete the bad token file and ask for re-auth.
                if os.path.exists(TOKEN_FILE):
                    os.remove(TOKEN_FILE)
                raise HTTPException(status_code=401, detail=f"Could not refresh token: {e}. Please re-authenticate via /auth.")
        else:
            # If no token file or no refresh token, user must authenticate.
            raise HTTPException(status_code=401, detail="You must authenticate via the /auth endpoint first.")
            
    return creds

# In your main.py, replace the @app.post("/upload") function with this one.

@app.post("/upload", tags=["Google Drive"])
async def upload_image_to_drive(
    file: UploadFile = File(...),
    # MODIFICATION: Changed 'identifier' back to 'client_id' to match your old code
    client_id: str = Form(...), 
    # This Depends() is the modern FastAPI way to get credentials
    creds: Credentials = Depends(get_valid_credentials) 
):
    """
    Uploads an image to Google Drive and returns the public link.
    This version includes robust error handling.
    """
    try:
        drive_service = build('drive', 'v3', credentials=creds)
        file_bytes = await file.read()
        
        # --- Filename Creation Logic ---
        now = datetime.now(TIMEZONE).strftime("%Y%m%d_%H%M%S")
        ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
        # Using the client_id variable to name the file, just like your old code
        safe_client_id = "".join(c for c in client_id if c.isalnum() or c in ('_','-')).rstrip().lower()
        custom_name = f"{safe_client_id}_{now}{ext}"

        file_metadata = {
            'name': custom_name, 
            'mimeType': file.content_type, 
            'parents': [DRIVE_FOLDER_ID]
        }
        
        # MODIFICATION: Changed resumable to False to match your old code
        media_body = MediaIoBaseUpload(io.BytesIO(file_bytes), mimetype=file.content_type, resumable=False)
        
        print(f"Attempting to upload '{custom_name}'...")
        
        uploaded_file = drive_service.files().create(
            body=file_metadata, 
            media_body=media_body, 
            fields='id'
        ).execute()
        
        file_id = uploaded_file.get('id')
        print(f"File uploaded successfully. File ID: {file_id}")

        # --- Making the file public ---
        drive_service.permissions().create(fileId=file_id, body={'role': 'reader', 'type': 'anyone'}).execute()
        public_url = f"https://drive.google.com/uc?id={file_id}"

        # Returning a standard JSON response
        return JSONResponse(status_code=200, content={"filename": custom_name, "url": public_url})

    except Exception as e:
        # This will print the detailed error to your terminal for debugging
        print(f"!!! AN ERROR OCCURRED DURING UPLOAD: {e}")
        # This sends a clean error message back to the API caller
        raise HTTPException(status_code=500, detail=f"An internal server error occurred: {str(e)}")



@app.get("/auth", tags=["Google Drive"], include_in_schema=False)
def auth_redirect():
    """(ONE-TIME-USE) Redirects to Google for authentication."""
    url = (f"https://accounts.google.com/o/oauth2/v2/auth?client_id={GOOGLE_CLIENT_ID}"
           f"&redirect_uri={REDIRECT_URI}&response_type=code&scope={SCOPE}"
           f"&access_type=offline&prompt=consent")
    return RedirectResponse(url)


@app.get("/auth/callback", tags=["Google Drive"], include_in_schema=False)
def auth_callback(request: Request):
    """(ONE-TIME-USE) Handles the callback from Google."""
    try:
        code = request.query_params.get("code")
        data = {"code": code, "client_id": GOOGLE_CLIENT_ID, "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": REDIRECT_URI, "grant_type": "authorization_code"}
        res = requests.post("https://oauth2.googleapis.com/token", data=data)
        res.raise_for_status()
        with open(TOKEN_FILE, "w") as f:
            json.dump(res.json(), f)
        return JSONResponse(status_code=200, content={"message": "Authentication successful! token.json saved."})
    except requests.exceptions.HTTPError as e:
        return JSONResponse(status_code=400, content={"error": "Token exchange failed", "details": str(e)})
    

class ChatRequest(BaseModel):
    prompt: str
    chat_history: List[dict] = []


@app.post("/api/v1/chat")
async def chat_endpoint(request: Request):
    body = await request.json()
    prompt = body.get("prompt")
    # For history, ensure you convert the frontend's simplified history
    # back into LangChain's expected format (e.g., HumanMessage, AIMessage)
    # This is a crucial step for the agent's memory to work correctly.
    # Assuming `Message` from frontend maps to LangChain's internal format for simplicity here.
    history_from_frontend = body.get("chat_history", [])
    
    # Convert frontend history format to LangChain's expected format
    # Example: [{"type": "user", "content": "hi"}, {"type": "assistant", "content": "hello"}]
    # Needs to become: [HumanMessage(content="hi"), AIMessage(content="hello")]
    from langchain_core.messages import HumanMessage, AIMessage
    langchain_history = []
    for msg in history_from_frontend:
        if msg['type'] == "user":
            langchain_history.append(HumanMessage(content=msg['content']))
        elif msg['type'] == "assistant":
            langchain_history.append(AIMessage(content=msg['content']))


    if not prompt:
        return {"error": "No prompt provided."}

    async def event_stream(): # Make this async if run_agent_streaming is not async
        try:
            # Pass the correctly formatted history
            for chunk in run_agent_streaming(prompt, langchain_history):
                # Ensure the chunk is string and add SSE prefix
                yield f"data: {chunk}\n\n"
                # Add a small async sleep to allow the client to process and prevent blocking
                await asyncio.sleep(0.01) 
        except Exception as e:
            # Send errors in SSE format as well, or as a distinct error message
            yield f"data: [Error]: {str(e)}\n\n" 

    return StreamingResponse(event_stream(), media_type="text/event-stream") # Change media type



# Initialize Gemini model
gemini = ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key="AIzaSyDfTCLc5Xdi4xY625suBhdZ2gMom_ENDCQ")

# ----------- Helper Functions -----------

def extract_invoice_data_from_pdf(file_path: str):
    all_text = ""
    all_tables = []

    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            # Extract plain text
            text = page.extract_text()
            if text:
                all_text += text + "\n"

            # Extract tables
            table = page.extract_table()
            if table:
                all_tables.append(table)

    return all_text.strip(), all_tables

def format_tables_as_text(tables):
    if not tables:
        return ""

    formatted = []
    for table in tables:
        rows = ["\t".join(cell if cell is not None else "" for cell in row) for row in table if row]
        formatted.append("\n".join(rows))
    return "\n\n".join(formatted)

def get_structured_invoice(text: str, table_text: str):
    print("====== SENDING PROMPT TO GEMINI ======")
    print(text[:500])  # Print part of text for debug
    print("====== TABLE TEXT ======")
    print(table_text[:500])
    full_prompt = f"""
You are an invoice parser.

Extract a structured JSON object matching the following fields:

- order_type: one of ["sale", "purchase", "delivery_challan"] (string)
- client_name (string)
- client_id (string, optional)
- invoice_number OR challan_number (string)
- order_date (format: YYYY-MM-DD or ISO)
- amount_paid (number)
- amount_collected_by (string, optional)
- payment_method (string)
- payment_status: one of ["paid", "pending", "partial"] (string)
- remarks (string)
- status (string)
- total_amount (number)
- total_quantity (number)
- total_tax (number)
- discount (number)
- discount_type: one of ["flat", "percentage"] (string)
- draft (boolean)
- items (array of objects), each with:
    - item_id (string, optional)
    - item_name (string)
    - batch_number (string, optional)
    - Expiry (string, e.g., "06/2026")
    - quantity (number)
    - price (number)
    - discount (number)
    - tax (number)
    - link (string, optional)

Here is the raw invoice content:
{text}

Here are the extracted tables from the invoice:
{table_text}

Output a clean and valid JSON. Use null for missing fields. Do not include explanations.
"""

    response = gemini.invoke([HumanMessage(content=full_prompt)])
    return response.content

# ----------- FastAPI Endpoint -----------
import traceback
import json  # make sure this is at the top

@app.post("/api/v1/invoice/scan")
async def scan_invoice(file: UploadFile = File(...)):
    try:
        # Save the uploaded PDF to a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        # Extract data from PDF
        raw_text, tables = extract_invoice_data_from_pdf(tmp_path)
        table_text = format_tables_as_text(tables)

        # Ask Gemini to structure it
        structured_json = get_structured_invoice(raw_text, table_text)

        # Clean ```json ... ``` if present
        if structured_json.strip().startswith("```"):
            structured_json = structured_json.strip().strip("`")
            if structured_json.lower().startswith("json"):
                structured_json = structured_json[4:]
            structured_json = structured_json.strip()

        # Parse into Python dict to validate
        parsed_data = json.loads(structured_json)

        return {"structured": parsed_data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process invoice: {str(e)}")
    

@app.get("/api/v1/logs")
async def get_log_notifications():
    try:
        with open("logs/all_logs.log", "r", encoding="utf-8") as f:
            lines = f.readlines()

        # Filter last N log entries (you can adjust this number)
        last_logs = lines[-50:]

        # Optional: parse and format them
        parsed_logs = []
        for line in last_logs:
            parsed_logs.append({"message": line.strip()})

        return JSONResponse(content={"logs": parsed_logs})

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Log file not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading logs: {str(e)}")
    

@app.post("/api/v1/auth/login")
def login_user(payload: LoginRequest):
    email = payload.email
    password = payload.password

    # Fetch user doc
    docs = firebase_db.collection("Users").where("email", "==", email).limit(1).stream()
    user_doc = next(docs, None)
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")

    user = user_doc.to_dict()
    if not pwd_context.verify(password, user.get("password_hash")):
        raise HTTPException(status_code=401, detail="Invalid password")

    return {
        "email": user["email"],
        "name": user.get("name", ""),
        "role": user.get("role", "user")
    }



"""
models.py — Pydantic data models for the BHC Business Suite API
================================================================

This module is the single source of truth for every request/response shape that
the FastAPI backend accepts and returns. It exists so that the API contract can
be read, reviewed, and explained in one place instead of being scattered through
the route handlers.

How the models are organised
----------------------------
For each business entity (Client, Supplier, Order, Inventory item, Expense,
Employee) we follow the same three-layer convention used across FastAPI projects:

    <Entity>Base    -> fields shared by create + read (the "core" of the entity)
    <Entity>Create  -> what the client POSTs to create a record (no server fields)
    <Entity>Update  -> what the client PATCHes/PUTs (every field optional)
    <Entity>        -> what the API returns (adds server-managed id + timestamps)

Why this pattern matters (talking points)
-----------------------------------------
* Validation happens at the edge. A request can never reach Firestore unless it
  satisfies the `*Create` / `*Update` model, so malformed data is rejected with a
  clear 422 response before any business logic runs.
* The read model (`<Entity>`) is decoupled from the write model, so we can return
  server-generated fields (`id`, `created_at`) without ever letting a client set
  them.
* Pydantic generates the OpenAPI schema automatically, which is what powers the
  interactive docs at `/docs`.

Note on Pydantic version
------------------------
The project pins Pydantic v2 (see requirements.txt). The v1-style `@validator`
decorator and `class Config` are still supported in v2 for backwards
compatibility, and are kept here to match the running application exactly.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, validator


# =============================================================================
# SHARED / CROSS-CUTTING MODELS
# =============================================================================


class TimestampMixin(BaseModel):
    """Adds audit timestamps to any read model.

    Both fields are optional because older documents in Firestore may predate the
    introduction of automatic timestamping.
    """

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class PaginationResponse(BaseModel):
    """Pagination envelope returned alongside list endpoints.

    `total_pages` is computed as ``ceil(total_items / items_per_page)`` and the
    `has_next` / `has_prev` flags let the frontend enable or disable its paging
    controls without re-deriving the maths.
    """

    current_page: int
    total_pages: int
    total_items: int
    items_per_page: int
    has_next: bool
    has_prev: bool


class Pagination(BaseModel):
    """Looser pagination envelope used where totals can be unknown.

    Some Firestore queries (for example in-memory filtered reports) cannot cheaply
    produce a total count, so `total_pages` / `total_items` are allowed to be None.
    """

    current_page: int
    total_pages: Optional[int] = None
    total_items: Optional[int] = None
    items_per_page: int
    has_next: bool
    has_prev: bool


class OrderType(str, Enum):
    """Canonical set of order types handled by the suite.

    Using a ``str``-based Enum means the value serialises to a plain string in
    JSON while still being validated against this fixed set on the way in.
    """

    sale = "sale"
    purchase = "purchase"
    delivery_challan = "delivery_challan"


# Historical alias. Service-layer code referred to this enum as ``OrderTypeEnum``;
# both names now point at the same definition so there is only one source of truth.
OrderTypeEnum = OrderType


# =============================================================================
# AUTH
# =============================================================================


class LoginRequest(BaseModel):
    """Credentials submitted to ``POST /api/v1/auth/login``."""

    email: str
    password: str


# =============================================================================
# ORDERS
# =============================================================================


class OrderItem(BaseModel):
    """A single line item within an order.

    `quantity` and `price` must be strictly positive; `tax` is a percentage
    (0–100) and `discount` is an absolute amount that has already been computed by
    the caller. `batch_number` / `Expiry` are optional because not every product
    is batch-tracked.
    """

    item_id: str = Field(..., min_length=1)
    item_name: str = Field(..., min_length=1, max_length=100)
    batch_number: Optional[str] = Field(None, description="Batch number (optional)")
    Expiry: Optional[str] = Field(None, description="Expiry in MM/YYYY format (optional)")
    quantity: float = Field(..., gt=0)
    price: float = Field(..., gt=0)
    tax: float = Field(default=0, ge=0, le=100)
    discount: float = Field(default=0, ge=0)


class OrderBase(BaseModel):
    """Fields common to every order type (sale, purchase, delivery challan).

    The concrete create models below extend this with the identifier fields that
    are specific to each order type (invoice vs. challan number, client vs.
    supplier). The regex `pattern` constraints document and enforce the small set
    of allowed string values directly in the schema.
    """

    amount_paid: float = Field(default=0, ge=0, description="Amount paid")
    discount: float = Field(default=0, ge=0, description="Total discount")
    discount_type: str = Field(
        default="percentage",
        pattern=r"^(percentage|fixed)$",
        description="Discount type",
    )
    draft: bool = Field(default=False, description="Is this a draft order")
    items: List[OrderItem] = Field(..., min_items=1, description="List of order items")
    order_date: datetime = Field(default_factory=datetime.utcnow, description="Order date")
    order_type: str = Field(
        ...,
        pattern=r"^(sale|purchase|delivery_challan)$",
        description="Type of order",
    )
    payment_method: str = Field(..., min_length=1, max_length=50, description="Payment method")
    payment_status: str = Field(
        default="pending",
        pattern=r"^(pending|paid|partial)$",
        description="Payment status",
    )
    remarks: str = Field(default="", max_length=500, description="Additional remarks")
    status: str = Field(
        default="pending",
        pattern=r"^(pending|processing|completed|cancelled)$",
        description="Order status",
    )
    total_amount: float = Field(..., gt=0, description="Total order amount")
    total_quantity: float = Field(..., gt=0, description="Total quantity of items")
    total_tax: float = Field(default=0, ge=0, description="Total tax amount")


class SaleOrderCreate(OrderBase):
    """Payload for ``POST /api/v1/orders/sale``.

    The `invoice_number` doubles as the Firestore document ID, which is why it is
    required and length-bounded. The `@validator` guarantees the caller cannot
    submit a sale order mislabelled as another type.
    """

    invoice_number: str = Field(
        ..., min_length=1, max_length=50,
        description="Invoice number (used as the Firestore document ID)",
    )
    client_id: Optional[str] = Field(None, description="Client ID")
    client_name: Optional[str] = Field(None, min_length=1, max_length=100, description="Client name")

    @validator("order_type")
    def validate_order_type(cls, v):
        if v != "sale":
            raise ValueError('Order type must be "sale" for sale orders')
        return v


class PurchaseOrderCreate(OrderBase):
    """Payload for ``POST /api/v1/orders/purchase`` (stock coming in from a supplier)."""

    invoice_number: str = Field(
        ..., min_length=1, max_length=50,
        description="Invoice number (used as the Firestore document ID)",
    )
    supplier_id: Optional[str] = Field(None, description="Supplier ID")
    supplier_name: Optional[str] = Field(None, min_length=1, max_length=100, description="Supplier name")

    @validator("order_type")
    def validate_order_type(cls, v):
        if v != "purchase":
            raise ValueError('Order type must be "purchase" for purchase orders')
        return v


class DeliveryChallanCreate(OrderBase):
    """Payload for ``POST /api/v1/orders/delivery-challan``.

    A delivery challan is goods dispatched to a client; `amount_collected_by`
    records the employee who collected any cash on delivery so their collection
    total can be reconciled.
    """

    challan_number: str = Field(
        ..., min_length=1, max_length=50,
        description="Challan number (used as the Firestore document ID)",
    )
    client_id: Optional[str] = Field(None, description="Client ID")
    client_name: Optional[str] = Field(None, min_length=1, max_length=100, description="Client name")
    amount_collected_by: Optional[str] = Field(
        None, min_length=1, max_length=100, description="Employee who collected the amount",
    )
    link: Optional[str] = Field(default="", max_length=500, description="Related link or reference")

    @validator("order_type")
    def validate_order_type(cls, v):
        if v != "delivery_challan":
            raise ValueError('Order type must be "delivery_challan" for delivery challan orders')
        return v


class Order(TimestampMixin):
    """Unified read model for any order, returned by the order endpoints.

    A single model covers all three order types; the fields that do not apply to a
    given type are simply left as None (for example `supplier_id` on a sale).
    """

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
    remarks: Optional[str] = None
    order_date: datetime
    link: Optional[str] = None
    draft: bool
    created_by: str
    updated_by: str


class OrderUpdate(BaseModel):
    """Partial update for an order. Every field is optional so callers send only
    what changed; the route layer recomputes counters from the deltas."""

    payment_status: Optional[str] = Field(None, pattern=r"^(pending|paid|partial)$")
    status: Optional[str] = Field(None, pattern=r"^(pending|processing|completed|cancelled)$")
    amount_paid: Optional[float] = Field(None, ge=0)
    remarks: Optional[str] = Field(None, max_length=500)
    discount: Optional[float] = Field(None, ge=0)
    payment_method: Optional[str] = Field(None, min_length=1, max_length=50)
    amount_collected_by: Optional[str] = Field(None, min_length=1, max_length=100)
    link: Optional[str] = Field(None, max_length=500)


class OrderItemSummary(BaseModel):
    """Trimmed line item used inside order-history summaries."""

    item_id: Optional[str] = None
    item_name: Optional[str] = None
    quantity: float
    batch_number: Optional[str] = None


class OrderSummary(BaseModel):
    """Compact order view used in client/supplier history lists."""

    invoice_number: Optional[str] = None
    challan_number: Optional[str] = None
    order_type: str
    order_date: datetime
    total_amount: float
    amount_paid: float
    payment_status: str
    items: List[OrderItemSummary]
    link: Optional[str] = None


class OrderListResponse(BaseModel):
    """Paginated list of full orders."""

    orders: List[Order]
    pagination: PaginationResponse


# =============================================================================
# SUPPLIERS
# =============================================================================


class SupplierBase(BaseModel):
    """Core supplier fields. `due` is the outstanding amount the business owes
    this supplier and is kept non-negative."""

    name: str = Field(..., min_length=1, max_length=100)
    contact: Optional[str] = Field(None, max_length=15)
    address: Optional[str] = Field(None, max_length=500)
    due: int = Field(default=0, ge=0)


class SupplierCreate(SupplierBase):
    """Payload for ``POST /api/v1/suppliers``."""


class SupplierUpdate(BaseModel):
    """Partial update for a supplier."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    contact: Optional[str] = Field(None, max_length=15)
    address: Optional[str] = Field(None, max_length=500)
    due: Optional[int] = Field(None, ge=0)


class Supplier(SupplierBase, TimestampMixin):
    """Supplier read model (adds the server-assigned `id`)."""

    id: str


class SupplierPaginatedResponse(BaseModel):
    """Paginated list of suppliers."""

    items: List[Supplier]
    pagination: Dict[str, Any]


# =============================================================================
# INVENTORY
# =============================================================================


class BatchInfo(BaseModel):
    """Lightweight batch reference (used by dropdown helpers)."""

    batch_number: str
    expiry_date: Optional[str] = None


class InventoryBatch(BaseModel):
    """A single stock batch with its own expiry and quantity.

    The custom validator normalises the many expiry formats that arrive from the
    UI (`YYYY-MM` from an <input type="month">), from older data (`MM/YYYY`), and
    from raw Firestore timestamps (ISO 8601) into a single timezone-aware UTC
    datetime so date comparisons elsewhere are unambiguous.
    """

    batch_number: str
    Expiry: datetime
    quantity: float

    @validator("Expiry", pre=True)
    def parse_expiry_date(cls, v):
        if isinstance(v, datetime):
            if v.tzinfo is None:
                return v.replace(tzinfo=timezone.utc)
            return v.astimezone(timezone.utc)

        if isinstance(v, str):
            # Frontend <input type="month"> -> "YYYY-MM"
            try:
                return datetime.strptime(v, "%Y-%m").replace(tzinfo=timezone.utc)
            except ValueError:
                pass
            # Legacy / manual entry -> "MM/YYYY"
            try:
                return datetime.strptime(v, "%m/%Y").replace(tzinfo=timezone.utc)
            except ValueError:
                pass
            # Raw Firestore timestamp -> ISO 8601 (handles trailing 'Z')
            try:
                dt = datetime.fromisoformat(v.replace("Z", "+00:00"))
                return dt.astimezone(timezone.utc)
            except ValueError:
                pass

        raise ValueError("Expiry must be in YYYY-MM, MM/YYYY, ISO format, or a datetime object.")


class InventoryItemCreate(BaseModel):
    """Payload for ``POST /api/v1/inventory``.

    `low_stock_threshold` drives the low-stock dashboard alert; `batches` is
    optional so an item can be created before any stock is received.
    """

    name: str = Field(..., min_length=1, max_length=100)
    category: str = Field(..., min_length=1, max_length=50)
    low_stock_threshold: float = Field(..., gt=0)
    stock_quantity: float = Field(default=0, ge=0)
    batches: Optional[List[InventoryBatch]] = Field(default_factory=list)


class InventoryItem(InventoryItemCreate, TimestampMixin):
    """Inventory read model (adds `id` and timestamps)."""

    id: str

    class Config:
        from_attributes = True


class InventoryItemUpdate(BaseModel):
    """Partial update for an inventory item."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    category: Optional[str] = Field(None, min_length=1, max_length=50)
    low_stock_threshold: Optional[float] = Field(None, gt=0)
    stock_quantity: Optional[float] = Field(None, ge=0)
    batches: Optional[List[InventoryBatch]] = None


class InventoryListResponse(BaseModel):
    """Paginated list of inventory items."""

    items: List[InventoryItem]
    pagination: PaginationResponse


# =============================================================================
# CLIENTS
# =============================================================================


class ClientBase(BaseModel):
    """Core client fields. PAN/GST are Indian tax identifiers and are optional
    because not every client provides them. `due_amount` is what the client owes
    the business."""

    name: str = Field(..., min_length=1, max_length=100)
    PAN: Optional[str] = Field(default=None, max_length=10)
    GST: Optional[str] = Field(default=None, max_length=15)
    POC_name: Optional[str] = Field(default=None, max_length=100)
    POC_contact: Optional[str] = Field(default=None, max_length=15)
    address: Optional[str] = Field(default=None, max_length=500)
    due_amount: int = Field(default=0, ge=0)


class ClientCreate(ClientBase):
    """Payload for ``POST /api/v1/clients``."""


class ClientUpdate(BaseModel):
    """Partial update for a client."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    PAN: Optional[str] = Field(None, max_length=10)
    GST: Optional[str] = Field(None, max_length=15)
    POC_name: Optional[str] = Field(None, max_length=100)
    POC_contact: Optional[str] = Field(None, max_length=15)
    address: Optional[str] = Field(None, max_length=500)
    due_amount: Optional[int] = Field(None, ge=0)


class Client(ClientBase, TimestampMixin):
    """Client read model (adds the server-assigned `id`)."""

    id: str


class ClientDueReport(BaseModel):
    """A row in the "who owes us money" report.

    Field aliases let the JSON keys read like a human report ("client name",
    "person of contact") while the Python attributes stay valid identifiers.
    `populate_by_name = True` allows the model to be built either from the alias
    or from the attribute name.
    """

    name: str = Field(..., alias="client name")
    poc_name: str = Field(..., alias="person of contact")
    poc_contact: str = Field(..., alias="contact number")
    due_amount: int = Field(..., alias="due")

    class Config:
        populate_by_name = True


class ClientListResponse(BaseModel):
    """Paginated list of clients."""

    items: List[Client]
    pagination: Dict[str, Any]


class ClientDueReportPaginatedResponse(BaseModel):
    """Paginated dues report."""

    items: List[ClientDueReport]
    pagination: Dict[str, Any]


class ClientHistoryResponse(BaseModel):
    """Paginated order history for a single client."""

    orders: List[OrderSummary]
    pagination: Pagination


# =============================================================================
# FINANCE — EXPENSES & PAYMENTS
# =============================================================================


class ExpenseBase(BaseModel):
    """Core expense fields. `paid_by` references an employee (by id or name) so the
    expense can be attributed to whoever spent the money."""

    amount: float
    category: str
    paid_by: str
    remarks: Optional[str] = ""
    created_at: datetime


class ExpenseCreate(ExpenseBase):
    """Payload for ``POST /api/v1/expenses``."""


class ExpenseUpdate(BaseModel):
    """Partial update for an expense."""

    amount: Optional[float] = Field(None, gt=0)
    category: Optional[str] = Field(None, min_length=1, max_length=50)
    remarks: Optional[str] = Field(None, min_length=0, max_length=500)
    paid_by: Optional[str] = Field(None, min_length=1, max_length=100)


class Expense(ExpenseBase, TimestampMixin):
    """Expense read model (adds the server-assigned `id`)."""

    id: str


class PaymentStatusUpdate(BaseModel):
    """Payload for ``PUT /api/v1/orders/{id}/payment-status``.

    When the status is ``partial`` the route also requires `amount_paid`. For
    delivery challans, `amount_collected_by` attributes the collection to an
    employee.
    """

    payment_status: str = Field(..., pattern=r"^(pending|paid|partial)$")
    amount_paid: Optional[float] = Field(None, ge=0)
    payment_method: Optional[str] = Field(None, min_length=1, max_length=50)
    amount_collected_by: Optional[str] = Field(
        None, min_length=1, max_length=100,
        description="Employee who collected (for delivery challans)",
    )


class PaymentRecord(BaseModel):
    """A single payment row, derived from orders that have `amount_paid > 0`.

    `payment_type` is "received" for sales/challans and "paid" for purchases, so
    the finance tab can show money-in and money-out in one feed.
    """

    id: str
    order_type: str
    invoice_number: Optional[str] = None
    challan_number: Optional[str] = None
    payment_type: Optional[str] = None
    client_name: Optional[str] = None
    supplier_name: Optional[str] = None
    amount_paid: float
    payment_status: str
    amount_collected_by: Optional[str] = None
    paid_by: Optional[str] = None
    created_at: datetime


class PaymentListResponse(BaseModel):
    """Paginated list of payments."""

    payments: List[PaymentRecord]
    pagination: PaginationResponse


# =============================================================================
# EMPLOYEES
# =============================================================================


class EmployeeBase(BaseModel):
    """Core employee fields. `paid` is the total this employee has spent on
    expenses; `collected` is the total cash they have collected on deliveries."""

    name: str = Field(..., min_length=1, max_length=100)
    phone: Optional[int] = Field(default=0)
    paid: Optional[int] = Field(default=0, ge=0)
    collected: Optional[int] = Field(default=0, ge=0)


class EmployeeCreate(EmployeeBase):
    """Payload for ``POST /api/v1/employees``."""


class EmployeeUpdate(BaseModel):
    """Partial update for an employee."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone: Optional[int] = Field(default=0)
    paid: Optional[int] = Field(None, ge=0)
    collected: Optional[int] = Field(None, ge=0)


class Employee(EmployeeBase, TimestampMixin):
    """Employee read model (adds the server-assigned `id`)."""

    id: str


class EmployeeListResponse(BaseModel):
    """Simple (non-paginated) list of employees."""

    items: List[Employee]


# =============================================================================
# CHATBOT
# =============================================================================


class ChatRequest(BaseModel):
    """Payload for ``POST /api/v1/chat``.

    `chat_history` carries prior turns so the LangChain agent has conversational
    context; each entry is a ``{"type": "user"|"assistant", "content": str}`` dict.
    """

    prompt: str
    chat_history: List[dict] = []


__all__ = [
    # shared
    "TimestampMixin", "PaginationResponse", "Pagination", "OrderType", "OrderTypeEnum",
    # auth
    "LoginRequest",
    # orders
    "OrderItem", "OrderBase", "SaleOrderCreate", "PurchaseOrderCreate",
    "DeliveryChallanCreate", "Order", "OrderUpdate", "OrderItemSummary",
    "OrderSummary", "OrderListResponse",
    # suppliers
    "SupplierBase", "SupplierCreate", "SupplierUpdate", "Supplier", "SupplierPaginatedResponse",
    # inventory
    "BatchInfo", "InventoryBatch", "InventoryItemCreate", "InventoryItem",
    "InventoryItemUpdate", "InventoryListResponse",
    # clients
    "ClientBase", "ClientCreate", "ClientUpdate", "Client", "ClientDueReport",
    "ClientListResponse", "ClientDueReportPaginatedResponse", "ClientHistoryResponse",
    # finance
    "ExpenseBase", "ExpenseCreate", "ExpenseUpdate", "Expense",
    "PaymentStatusUpdate", "PaymentRecord", "PaymentListResponse",
    # employees
    "EmployeeBase", "EmployeeCreate", "EmployeeUpdate", "Employee", "EmployeeListResponse",
    # chatbot
    "ChatRequest",
]

# BHC Business Suite — Backend Guide

A single reference you can use to **explain the backend to anyone** (recruiters,
teammates, your future self). It covers the architecture, every API route, the
Pydantic models, the service layer, and the Firestore optimisation strategy.

> TL;DR for an interview: *"It's a FastAPI service over Firebase Firestore.
> Pydantic models validate every request and shape every response. Business
> rules (stock, dues, collections) live in service classes. Aggregate metrics
> are pre-computed into a `doc_counters` collection so the dashboard is O(1).
> A LangChain + Gemini agent answers natural-language questions over the data
> using RAG."*

---

## 1. Tech stack

| Layer | Choice | Why |
| :--- | :--- | :--- |
| API framework | **FastAPI** | Async, fast, automatic OpenAPI docs at `/docs` |
| Validation | **Pydantic v2** | Declarative request/response validation |
| Database | **Firebase Firestore** (Admin SDK) | Managed NoSQL, real-time, atomic increments |
| Auth | **passlib / bcrypt** | Password hashing for login |
| AI assistant | **LangChain + Google Gemini** | Tool-using agent over the data |
| Semantic search | **LlamaIndex + Qdrant** | RAG: find relevant records by meaning |
| PDF parsing | **pdfplumber + Gemini** | Invoice scanning into structured orders |
| File storage | **Google Drive API** | Stores uploaded challan images |

Entry point: `uvicorn test:app --reload --port 8000` (the FastAPI app lives in
`test.py`). Interactive docs: `http://localhost:8000/docs`.

---

## 2. Request lifecycle (how one call flows)

```
HTTP request
   │
   ▼
CORS middleware ──► request-logging middleware (logs method, path, timing)
   │
   ▼
Route handler  ──► Pydantic validates the body/query  (422 if invalid)
   │
   ▼
Service class  ──► business rules + Firestore reads/writes + counter updates
   │
   ▼
Pydantic response_model serialises the result ──► JSON
```

If anything throws, the global exception handler returns a clean
`500 {"detail": ..., "error_id": ...}` instead of leaking a stack trace.

---

## 3. The Pydantic models (`models.py`)

All request/response shapes now live in **`models.py`**, fully documented. They
follow one consistent convention per entity:

| Model | Role |
| :--- | :--- |
| `XBase` | fields shared between create and read |
| `XCreate` | the POST body (no server fields like `id`) |
| `XUpdate` | the PUT/PATCH body — **every field optional** |
| `X` | the response model (adds `id` + timestamps) |

**Why interviewers care about this split:** the client can never set
server-managed fields, malformed data is rejected at the edge with a 422, and
the OpenAPI schema (and the `/docs` page) is generated automatically from these
classes.

Worth pointing out specifically:

- **`OrderItem` / `OrderBase`** use `Field(...)` constraints (`gt=0`, `ge=0`,
  `le=100`, regex `pattern=...`) so quantities, prices, tax %, and the allowed
  string values (`sale|purchase|delivery_challan`, `pending|paid|partial`) are
  enforced declaratively.
- **`SaleOrderCreate` / `PurchaseOrderCreate` / `DeliveryChallanCreate`** all
  extend `OrderBase` and add a `@validator("order_type")` so a payload can't be
  mislabelled.
- **`InventoryBatch.parse_expiry_date`** is a custom `@validator` that accepts
  `YYYY-MM` (from the UI month picker), `MM/YYYY` (legacy), and ISO timestamps
  (from Firestore) and normalises them all to a timezone-aware UTC datetime.
- **`ClientDueReport`** uses field **aliases** (`"client name"`,
  `"person of contact"`) with `populate_by_name = True` so the JSON reads like a
  human report while the Python attributes stay clean identifiers.

You can verify the models load and validate independently of Firebase:

```bash
python -c "import models; from models import SaleOrderCreate; print('ok')"
```

---

## 4. API reference (all routes)

Base prefix: `/api/v1`. The `current_user` is resolved from the `X-User-ID`
header (falls back to `"system"`).

### Auth
| Method | Path | Body | Returns |
| :--- | :--- | :--- | :--- |
| POST | `/auth/login` | `LoginRequest` | `{email, name, role}` (verifies bcrypt hash in `Users`) |

### Clients
| Method | Path | Body | Returns |
| :--- | :--- | :--- | :--- |
| GET | `/clients` | — | `ClientListResponse` (paginated, prefix search) |
| POST | `/clients` | `ClientCreate` | `Client` |
| GET | `/clients/{id}` | — | `Client` |
| PUT | `/clients/{id}` | `ClientUpdate` | `Client` (syncs `total_due` counter) |
| DELETE | `/clients/{id}` | — | message (decrements counters) |
| GET | `/client-dues` | — | `ClientDueReportPaginatedResponse` |
| GET | `/clients/{id}/history` | — | `ClientHistoryResponse` |
| GET | `/clients/{id}/total-orders` | — | `{client_id, total_orders}` |

### Suppliers
| Method | Path | Body | Returns |
| :--- | :--- | :--- | :--- |
| GET | `/suppliers` | — | `SupplierPaginatedResponse` |
| POST | `/suppliers` | `SupplierCreate` | `Supplier` |
| GET / PUT / DELETE | `/suppliers/{id}` | `SupplierUpdate` | `Supplier` |
| GET | `/suppliers/{id}/history` | — | `OrderListResponse` |
| GET | `/suppliers/{id}/total-orders` | — | count |

### Inventory
| Method | Path | Body | Returns |
| :--- | :--- | :--- | :--- |
| GET | `/inventory` | — | `InventoryListResponse` (search + category filter) |
| GET | `/low-stock/inventory` | — | `InventoryListResponse` (stock ≤ threshold) |
| GET | `/expiring-soon/inventory` | — | `InventoryListResponse` (batch expiring ≤ N days) |
| POST | `/inventory` | `InventoryItemCreate` | `InventoryItem` |
| GET / PUT / DELETE | `/inventory/{id}` | `InventoryItemUpdate` | `InventoryItem` |

### Orders
| Method | Path | Body | Returns |
| :--- | :--- | :--- | :--- |
| POST | `/orders/sale` | `SaleOrderCreate` | `Order` (reduces stock, raises client due) |
| POST | `/orders/purchase` | `PurchaseOrderCreate` | `Order` (adds stock, raises supplier due) |
| POST | `/orders/delivery-challan` | `DeliveryChallanCreate` | `Order` (reduces stock, updates collections) |
| GET | `/orders` | — | `OrderListResponse` (filters + smart search) |
| GET | `/orders/{id}` | — | `Order` |
| PUT | `/orders/{id}` | `OrderUpdate` | `Order` (cascading counter updates) |
| PUT | `/orders/{id}/payment-status` | `PaymentStatusUpdate` | `Order` |
| DELETE | `/orders/{id}` | — | message (reverts stock + dues) |
| GET | `/all-orders/stats` | — | order totals (monthly or all-time) |

### Finance
| Method | Path | Body | Returns |
| :--- | :--- | :--- | :--- |
| GET | `/expenses` | — | expense list |
| POST | `/expenses` | `ExpenseCreate` | `Expense` (updates employee `paid`, counters) |
| GET / PUT / DELETE | `/expenses/{id}` | `ExpenseUpdate` | `Expense` |
| GET | `/payments` | — | `PaymentListResponse` (money-in + money-out) |

### Employees
| Method | Path | Body | Returns |
| :--- | :--- | :--- | :--- |
| GET | `/employees` | — | `EmployeeListResponse` |
| POST | `/employees` | `EmployeeCreate` | `Employee` |
| GET / PUT / DELETE | `/employees/{id}` | `EmployeeUpdate` | `Employee` |

### Dashboard
| Method | Path | Returns |
| :--- | :--- | :--- |
| GET | `/dashboard/months` | available months for the picker |
| GET | `/dashboard/charts` | last 6 months of counters |
| GET | `/dashboard-expenses/stats` | expense totals |
| GET | `/dashboard/financial-summary` | income / expense / net profit |

### Dropdowns (typeahead helpers, served partly from in-memory cache)
`/dropdown/clients`, `/dropdown/suppliers`, `/dropdown/inventory`,
`/dropdown/batches/{item_id}`, `/dropdown-employees`.

### AI, invoices, logs
| Method | Path | What it does |
| :--- | :--- | :--- |
| POST | `/chat` | Streams the LangChain agent's answer (SSE) |
| POST | `/invoice/scan` | PDF → Gemini → structured order JSON |
| POST | `/upload` | Uploads a file to Google Drive |
| GET | `/logs` | Last 50 log lines (powers in-app notifications) |

---

## 5. The service layer (business rules)

These classes keep the route handlers thin and put the "what actually happens"
in one place:

- **`InventoryService`** — `update_inventory_on_sale`,
  `update_inventory_on_purchase`, `revert_inventory_on_delete`. Handles
  batch-level and global stock, and refuses to oversell (`400` if not enough
  stock).
- **`ClientService.update_due` / `SupplierService.update_due`** — adjust an
  entity's outstanding balance and the matching `doc_counters` total by a delta.
- **`EmployeeService`** — `update_employee_collection` /
  `revert_employee_collection` track cash collected on delivery challans.
- **`CounterService.get_next_id`** — generates sequential IDs (`C0001`, `S0001`,
  …) atomically and bumps the `total` counter.
- **`OffsetPaginator`** — reusable offset pagination used by the list endpoints.

---

## 6. ⭐ The core optimisation: `doc_counters`

Firestore has no cheap `SUM()` / `COUNT()`. Reading every order to compute
"total sales" would be O(n) reads and slow/expensive.

**Solution:** a dedicated `doc_counters` collection acts as a live ledger. On
every create/update/delete the backend issues an **atomic
`firestore.Increment(...)`** against the relevant counter document
(`doc_counters/orders`, `doc_counters/clients`, `doc_counters/<YYYY-MM>`, …).

**Result:** the dashboard reads a handful of summary documents instead of
thousands of orders — the cost of every metric drops from **O(n) to O(1)**.

This is the single most impressive backend talking point — be ready to draw the
"write path increments a counter, read path reads one document" diagram.

---

## 7. The AI assistant (RAG)

1. **Index** — `firebase_config/llama_index_configs/*` turn each record
   (client, order, item…) into vector embeddings stored in **Qdrant**.
2. **Tools** — `firebase_config/tools.py` exposes ~50 tools: precise CRUD
   lookups (`GetOrderById`) and semantic search (`SemanticSearchClients`).
3. **Agent** — `firebase_config/agent.py` builds a LangChain
   `ZERO_SHOT_REACT_DESCRIPTION` agent on Gemini that picks the right tool, then
   runs a second pass to turn raw tool output into a clean answer.
4. **Streaming** — `POST /api/v1/chat` returns a `StreamingResponse` (SSE) so the
   reply appears word-by-word.

---

## 8. Recent cleanup (what changed and why)

- ✅ **Removed a hard-coded Gemini API key** from `test.py`; it now reads
  `GOOGLE_API_KEY` from the environment. *(Rotate the old key — it remains in git
  history.)*
- ✅ **De-duplicated `firebase_config/agent.py`** — the LLM/agent/memory setup was
  defined twice; now it's a single documented block.
- ✅ **Fixed CORS** — `allow_origins=["*"]` with `allow_credentials=True` violates
  the CORS spec. Origins now come from `CORS_ORIGINS` and credentials are only
  enabled when an explicit origin list is set.
- ✅ **Extracted `models.py`** — every Pydantic model now lives in one documented,
  de-duplicated module (the monolith had `OrderType`, `TimestampMixin`,
  `SupplierService`, and several service methods defined twice).

---

## 9. Suggested next refactor (roadmap)

`test.py` is ~4,900 lines. To finish modularising without changing behaviour,
split it along the lines `models.py` already establishes:

```
backendd/
├── main.py                 # FastAPI app, middleware, lifespan, router includes
├── models.py               # ✅ done — all Pydantic models
├── core/
│   ├── database.py         # FirebaseDB + firebase_db singleton
│   ├── settings.py         # Settings (env config)
│   └── security.py         # get_current_user, pwd_context
├── services/
│   ├── inventory.py        # InventoryService
│   ├── clients.py          # ClientService
│   ├── suppliers.py        # SupplierService
│   ├── employees.py        # EmployeeService
│   └── counters.py         # CounterService, OffsetPaginator
└── routers/
    ├── auth.py  clients.py  suppliers.py  inventory.py
    ├── orders.py  finance.py  employees.py  dashboard.py
    └── chat.py  invoices.py  logs.py
```

Each router becomes an `APIRouter(prefix="/api/v1", tags=[...])` included from
`main.py`. Do this **one domain at a time**, importing models from `models.py`,
and re-test each group against `/docs` before moving on. Because it's a live app,
keep `uvicorn test:app` working until `main.py` is proven, then switch the start
command.

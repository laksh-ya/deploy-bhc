/**
 * Demo API interceptor.
 *
 * When demo mode is active this patches the global `fetch` so any request to the
 * backend API (`/api/v1/...` or `/upload`) is answered from the in-memory mock
 * dataset instead of hitting the network. This lets the whole app be showcased
 * with zero backend, without modifying every component's fetch calls.
 *
 * It only intercepts known API paths; anything else (Next.js routes, static
 * assets, the /api/chat route) falls through to the real fetch.
 */
import {
  demoClients,
  demoSuppliers,
  demoInventory,
  demoEmployees,
  demoOrders,
  demoPayments,
  demoExpenses,
  demoMonths,
  demoMonthlyStats,
  demoLogs,
} from "@/lib/demo-data"

let installed = false

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function paginate<T>(items: T[], page = 1, limit = 10) {
  const total_items = items.length
  const total_pages = Math.max(1, Math.ceil(total_items / limit))
  const start = (page - 1) * limit
  return {
    slice: items.slice(start, start + limit),
    pagination: {
      current_page: page,
      total_pages,
      total_items,
      items_per_page: limit,
      has_next: page < total_pages,
      has_prev: page > 1,
    },
  }
}

/** Resolve a single mock response for a given API path + query. */
function resolve(path: string, search: URLSearchParams, method = "GET"): Response | null {
  const page = Number(search.get("page") || "1")
  const limit = Number(search.get("limit") || "10")

  // --- Auth --- (handled before the write short-circuit so login still returns
  // a user object, not a generic write acknowledgement).
  if (path === "/api/v1/auth/login") {
    return json({ name: "Demo Admin", email: "demo@bhc.com", role: "admin" })
  }

  // Writes (POST/PUT/PATCH/DELETE): acknowledge so the UI shows success without
  // persisting anything. Done before GET list handlers so create endpoints don't
  // match a GET list handler that shares the same path (e.g. POST /api/v1/expenses).
  if (!["GET", "HEAD"].includes(method.toUpperCase())) {
    if (path.startsWith("/api/v1/") || path === "/upload") {
      return json({ message: "Demo mode: changes are not persisted.", demo: true, id: `DEMO-${Date.now()}` })
    }
    return null
  }

  // --- Clients ---
  if (path === "/api/v1/clients") {
    const { slice, pagination } = paginate(demoClients, page, limit)
    return json({ items: slice, pagination })
  }
  if (path === "/api/v1/client-dues") {
    const dued = demoClients.filter((c) => c.due_amount > 0)
    const items = dued.map((c) => ({
      "client name": c.name,
      "person of contact": c.POC_name,
      "contact number": c.POC_contact,
      due: c.due_amount,
    }))
    const { slice, pagination } = paginate(items, page, Number(search.get("limit") || "50"))
    return json({ items: slice, pagination })
  }
  if (path.startsWith("/api/v1/clients/") && path.endsWith("/history")) {
    return json({ orders: [], pagination: { current_page: 1, total_pages: 1, total_items: 0, items_per_page: 10, has_next: false, has_prev: false } })
  }
  if (path.startsWith("/api/v1/clients/") && path.endsWith("/total-orders")) {
    return json({ total_orders: 3 })
  }
  if (path.startsWith("/api/v1/clients/")) {
    const id = path.split("/")[4]
    const found = demoClients.find((c) => c.id === id)
    return found ? json(found) : json({ detail: "Client not found" }, 404)
  }

  // --- Suppliers ---
  if (path === "/api/v1/suppliers") {
    const { slice, pagination } = paginate(demoSuppliers, page, limit)
    return json({ items: slice, pagination })
  }
  if (path.startsWith("/api/v1/suppliers/") && path.endsWith("/history")) {
    return json({ orders: [], pagination: { current_page: 1, total_pages: 1, total_items: 0, items_per_page: 10, has_next: false, has_prev: false } })
  }
  if (path.startsWith("/api/v1/suppliers/")) {
    const id = path.split("/")[4]
    const found = demoSuppliers.find((s) => s.id === id)
    return found ? json(found) : json({ detail: "Supplier not found" }, 404)
  }

  // --- Inventory ---
  if (path === "/api/v1/inventory") {
    const { slice, pagination } = paginate(demoInventory, page, limit)
    return json({ items: slice, pagination })
  }
  if (path === "/api/v1/low-stock/inventory") {
    const items = demoInventory.filter((i) => i.stock_quantity <= i.low_stock_threshold)
    return json({ items, pagination: { current_page: 1, total_pages: 1, total_items: items.length, items_per_page: items.length || 1, has_next: false, has_prev: false } })
  }
  if (path === "/api/v1/expiring-soon/inventory") {
    return json({ items: [demoInventory[1]], pagination: { current_page: 1, total_pages: 1, total_items: 1, items_per_page: 1, has_next: false, has_prev: false } })
  }
  if (path.startsWith("/api/v1/inventory/")) {
    const id = path.split("/")[4]
    const found = demoInventory.find((i) => i.id === id)
    return found ? json(found) : json({ detail: "Item not found" }, 404)
  }

  // --- Employees ---
  if (path === "/api/v1/employees" || path === "/api/v1/dropdown-employees") {
    if (path === "/api/v1/dropdown-employees") {
      return json(demoEmployees.map((e) => ({ id: e.id, name: e.name })))
    }
    return json({ items: demoEmployees })
  }
  if (path.startsWith("/api/v1/employees/")) {
    const id = path.split("/")[4]
    const found = demoEmployees.find((e) => e.id === id)
    return found ? json(found) : json({ detail: "Employee not found" }, 404)
  }

  // --- Orders ---
  if (path === "/api/v1/orders") {
    const type = search.get("order_type")
    let list = demoOrders
    if (type) list = list.filter((o) => o.order_type === type)
    const { slice, pagination } = paginate(list, page, limit)
    return json({ orders: slice, pagination })
  }
  if (path === "/api/v1/all-orders/stats") {
    const month = search.get("month")
    if (month && demoMonthlyStats[month]) {
      const m = demoMonthlyStats[month]
      return json({
        sales_orders_amount: m.sales_orders_amount,
        sales_orders_count: m.sales_orders_count,
        delivery_challan_amount: m.delivery_challan_amount,
        delivery_challan_count: m.delivery_challan_count,
        purchase_orders_amount: m.purchase_orders_amount,
        purchase_orders_count: m.purchase_orders_count,
      })
    }
    // all-time aggregate
    const sum = (k: string) => Object.values(demoMonthlyStats).reduce((a: number, v: any) => a + (v[k] || 0), 0)
    return json({
      total_sales: { amount: sum("sales_orders_amount"), count: sum("sales_orders_count") },
      delivery_challan: { amount: sum("delivery_challan_amount"), count: sum("delivery_challan_count") },
      total_purchase: { amount: sum("purchase_orders_amount"), count: sum("purchase_orders_count") },
    })
  }
  if (path.startsWith("/api/v1/orders/")) {
    const id = path.split("/")[4]
    const found = demoOrders.find((o) => o.invoice_number === id || o.challan_number === id)
    return found ? json(found) : json({ detail: "Order not found" }, 404)
  }

  // --- Payments / Finance ---
  if (path === "/api/v1/expenses") {
    const { slice, pagination } = paginate(demoExpenses, page, limit)
    // finance-tab reads data.items, data.total_pages, data.total_count
    return json({ items: slice, total_pages: pagination.total_pages, total_count: pagination.total_items, pagination })
  }
  if (path === "/api/v1/payments") {
    const { slice, pagination } = paginate(demoPayments, page, limit)
    // finance-tab reads data.payments and data.total_count
    return json({ payments: slice, total_count: pagination.total_items, pagination })
  }

  // --- Dashboard ---
  if (path === "/api/v1/dashboard/months") {
    return json(demoMonths)
  }
  if (path === "/api/v1/dashboard/charts") {
    const ordered = [...demoMonths].reverse()
    return json(ordered.map((m) => ({ month: m, ...demoMonthlyStats[m] })))
  }
  if (path === "/api/v1/dashboard-expenses/stats") {
    const month = search.get("month")
    const m = month ? demoMonthlyStats[month] : null
    return json({
      total_expense_amount: m ? m.expense_amount : Object.values(demoMonthlyStats).reduce((a: number, v: any) => a + v.expense_amount, 0),
      total_expense_count: m ? m.expense_count : Object.values(demoMonthlyStats).reduce((a: number, v: any) => a + v.expense_count, 0),
    })
  }
  if (path === "/api/v1/dashboard/financial-summary") {
    return json({ net_profit: 412000, total_income: 803000, total_expense: 391000 })
  }

  // --- Logs ---
  if (path === "/api/v1/logs") {
    return json({ logs: demoLogs })
  }

  // --- Dropdowns ---
  if (path === "/api/v1/dropdown/clients") {
    return json({ items: demoClients.map((c) => ({ id: c.id, name: c.name })) })
  }
  if (path === "/api/v1/dropdown/suppliers") {
    return json({ items: demoSuppliers.map((s) => ({ id: s.id, name: s.name })) })
  }
  if (path === "/api/v1/dropdown/inventory") {
    return json({ items: demoInventory.map((i) => ({ id: i.id, name: i.name, rate: 0, tax_percent: 0, category: i.category })) })
  }
  if (path.startsWith("/api/v1/dropdown/batches/")) {
    const id = path.split("/")[5]
    const found = demoInventory.find((i) => i.id === id)
    return json({ batches: (found?.batches || []).map((b) => b.batch_number) })
  }

  // Dropdown batches handled above.

  // Safe fallback for any unhandled GET so the demo never hits a dead backend.
  if (path.startsWith("/api/v1/")) {
    return json({
      items: [],
      orders: [],
      payments: [],
      logs: [],
      total_pages: 1,
      total_count: 0,
      pagination: { current_page: 1, total_pages: 1, total_items: 0, items_per_page: 10, has_next: false, has_prev: false },
    })
  }

  return null
}

/** Install the fetch interceptor (idempotent, browser only). */
export function installDemoApi() {
  if (installed || typeof window === "undefined") return
  installed = true

  const realFetch = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    try {
      const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url
      const url = new URL(rawUrl, window.location.origin)

      // Resolve the HTTP method (from init, or the Request object).
      const method =
        (init?.method ||
          (typeof input !== "string" && !(input instanceof URL) ? (input as Request).method : undefined) ||
          "GET").toUpperCase()

      // Never intercept the Next.js AI chat route — it streams from its own handler.
      const isApi = url.pathname.startsWith("/api/v1/") || url.pathname === "/upload"
      if (isApi) {
        const res = resolve(url.pathname, url.searchParams, method)
        if (res) {
          // Small delay so loading states are visible in the demo.
          await new Promise((r) => setTimeout(r, 120))
          return res
        }
      }
    } catch {
      // Fall through to real fetch on any parsing error.
    }
    return realFetch(input as any, init)
  }
}

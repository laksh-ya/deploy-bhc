/**
 * Mock dataset for demo mode.
 *
 * The shapes here mirror exactly what the FastAPI backend returns, so the demo
 * interceptor (lib/demo-api.ts) can stand in for the real API and every tab
 * renders with believable data — no backend or database required.
 */

const months = ["2026-05", "2026-04", "2026-03", "2026-02", "2026-01", "2025-12"]

export const demoClients = [
  { id: "C0001", name: "City General Hospital", PAN: "AABCC1234D", GST: "27AABCC1234D1Z5", POC_name: "Dr. Anil Mehta", POC_contact: "9876543210", address: "MG Road, Mumbai", due_amount: 45000, created_at: "2025-11-02T10:00:00Z", updated_at: "2026-05-12T10:00:00Z" },
  { id: "C0002", name: "Sunrise Medical Center", PAN: "AABCS5678E", GST: "29AABCS5678E1Z2", POC_name: "Priya Sharma", POC_contact: "9123456780", address: "Brigade Road, Bengaluru", due_amount: 32000, created_at: "2025-10-15T10:00:00Z", updated_at: "2026-05-10T10:00:00Z" },
  { id: "C0003", name: "Apollo Dialysis Clinic", PAN: "AABCA9012F", GST: "07AABCA9012F1Z9", POC_name: "Rahul Verma", POC_contact: "9988776655", address: "Connaught Place, Delhi", due_amount: 0, created_at: "2025-09-20T10:00:00Z", updated_at: "2026-04-28T10:00:00Z" },
  { id: "C0004", name: "Regional Health Trust", PAN: "AABCR3456G", GST: "33AABCR3456G1Z1", POC_name: "Sunita Rao", POC_contact: "9001122334", address: "Anna Salai, Chennai", due_amount: 25000, created_at: "2025-08-11T10:00:00Z", updated_at: "2026-05-01T10:00:00Z" },
  { id: "C0005", name: "Community Care Foundation", PAN: "AABCC7890H", GST: "24AABCC7890H1Z7", POC_name: "Imran Khan", POC_contact: "9090909090", address: "SG Highway, Ahmedabad", due_amount: 12000, created_at: "2025-07-30T10:00:00Z", updated_at: "2026-03-19T10:00:00Z" },
]

export const demoSuppliers = [
  { id: "S0001", name: "Medline Supplies Co.", contact: "9811112222", address: "Okhla Phase 2, Delhi", due: 18000, created_at: "2025-10-01T10:00:00Z", updated_at: "2026-05-09T10:00:00Z" },
  { id: "S0002", name: "Healthcare Equipment Ltd.", contact: "9822223333", address: "Hinjewadi, Pune", due: 0, created_at: "2025-09-12T10:00:00Z", updated_at: "2026-04-22T10:00:00Z" },
  { id: "S0003", name: "Surgical Instruments Inc.", contact: "9833334444", address: "Peenya, Bengaluru", due: 7500, created_at: "2025-08-05T10:00:00Z", updated_at: "2026-05-02T10:00:00Z" },
]

export const demoInventory = [
  { id: "I0001", name: "Blood Tubing Set Premium", category: "blood_tubing", low_stock_threshold: 20, stock_quantity: 45, batches: [{ batch_number: "BT-A12", Expiry: "2026-08-01T00:00:00Z", quantity: 45 }], created_at: "2025-11-01T10:00:00Z", updated_at: "2026-05-10T10:00:00Z" },
  { id: "I0002", name: "Dialyser F8 High Flux", category: "dialysers", low_stock_threshold: 15, stock_quantity: 8, batches: [{ batch_number: "DF8-77", Expiry: "2026-06-01T00:00:00Z", quantity: 8 }], created_at: "2025-10-20T10:00:00Z", updated_at: "2026-05-11T10:00:00Z" },
  { id: "I0003", name: "Chemical Solution Type A", category: "chemical", low_stock_threshold: 10, stock_quantity: 3, batches: [{ batch_number: "CS-A03", Expiry: "2026-07-01T00:00:00Z", quantity: 3 }], created_at: "2025-09-18T10:00:00Z", updated_at: "2026-05-08T10:00:00Z" },
  { id: "I0004", name: "CITOS Equipment Standard", category: "equipment", low_stock_threshold: 5, stock_quantity: 15, batches: [], created_at: "2025-08-22T10:00:00Z", updated_at: "2026-04-30T10:00:00Z" },
  { id: "I0005", name: "Surgical Needles Set", category: "surgical", low_stock_threshold: 30, stock_quantity: 100, batches: [{ batch_number: "SN-55", Expiry: "2026-11-01T00:00:00Z", quantity: 100 }], created_at: "2025-07-14T10:00:00Z", updated_at: "2026-03-25T10:00:00Z" },
  { id: "I0006", name: "Diasafe Solution Premium", category: "chemical", low_stock_threshold: 12, stock_quantity: 25, batches: [{ batch_number: "DS-19", Expiry: "2026-09-01T00:00:00Z", quantity: 25 }], created_at: "2025-06-10T10:00:00Z", updated_at: "2026-05-03T10:00:00Z" },
]

export const demoEmployees = [
  { id: "E0001", name: "Suresh Patil", phone: 9870011223, paid: 42000, collected: 138000, created_at: "2025-06-01T10:00:00Z", updated_at: "2026-05-10T10:00:00Z" },
  { id: "E0002", name: "Meena Joshi", phone: 9870022334, paid: 15000, collected: 92000, created_at: "2025-07-01T10:00:00Z", updated_at: "2026-05-09T10:00:00Z" },
  { id: "E0003", name: "Arjun Nair", phone: 9870033445, paid: 8000, collected: 54000, created_at: "2025-08-01T10:00:00Z", updated_at: "2026-04-20T10:00:00Z" },
]

export const demoOrders = [
  { invoice_number: "INV-1024", challan_number: null, order_type: "sale", client_id: "C0001", client_name: "City General Hospital", supplier_id: null, supplier_name: null, items: [{ item_id: "I0001", item_name: "Blood Tubing Set Premium", quantity: 20, price: 250, tax: 12, discount: 0, batch_number: "BT-A12" }], total_quantity: 20, total_tax: 600, total_amount: 5600, discount: 0, discount_type: "percentage", payment_status: "partial", payment_method: "bank_transfer", amount_paid: 3000, amount_collected_by: null, status: "completed", remarks: "Monthly supply", order_date: "2026-05-12T10:00:00Z", link: null, draft: false, created_by: "demo@bhc.com", updated_by: "demo@bhc.com", created_at: "2026-05-12T10:00:00Z", updated_at: "2026-05-12T10:00:00Z" },
  { invoice_number: "INV-1025", challan_number: null, order_type: "purchase", client_id: null, client_name: null, supplier_id: "S0001", supplier_name: "Medline Supplies Co.", items: [{ item_id: "I0002", item_name: "Dialyser F8 High Flux", quantity: 30, price: 1200, tax: 5, discount: 0, batch_number: "DF8-77" }], total_quantity: 30, total_tax: 1800, total_amount: 37800, discount: 0, discount_type: "percentage", payment_status: "paid", payment_method: "bank_transfer", amount_paid: 37800, amount_collected_by: null, status: "completed", remarks: "Restock", order_date: "2026-05-09T10:00:00Z", link: null, draft: false, created_by: "demo@bhc.com", updated_by: "demo@bhc.com", created_at: "2026-05-09T10:00:00Z", updated_at: "2026-05-09T10:00:00Z" },
  { invoice_number: null, challan_number: "DC-308", order_type: "delivery_challan", client_id: "C0004", client_name: "Regional Health Trust", supplier_id: null, supplier_name: null, items: [{ item_id: "I0005", item_name: "Surgical Needles Set", quantity: 40, price: 150, tax: 0, discount: 0, batch_number: "SN-55" }], total_quantity: 40, total_tax: 0, total_amount: 6000, discount: 0, discount_type: "percentage", payment_status: "pending", payment_method: "cash", amount_paid: 0, amount_collected_by: "Suresh Patil", status: "processing", remarks: "On delivery", order_date: "2026-05-05T10:00:00Z", link: null, draft: false, created_by: "demo@bhc.com", updated_by: "demo@bhc.com", created_at: "2026-05-05T10:00:00Z", updated_at: "2026-05-05T10:00:00Z" },
  { invoice_number: "INV-1026", challan_number: null, order_type: "sale", client_id: "C0002", client_name: "Sunrise Medical Center", supplier_id: null, supplier_name: null, items: [{ item_id: "I0006", item_name: "Diasafe Solution Premium", quantity: 10, price: 600, tax: 12, discount: 0, batch_number: "DS-19" }], total_quantity: 10, total_tax: 720, total_amount: 6720, discount: 0, discount_type: "percentage", payment_status: "paid", payment_method: "upi", amount_paid: 6720, amount_collected_by: null, status: "completed", remarks: "", order_date: "2026-05-02T10:00:00Z", link: null, draft: false, created_by: "demo@bhc.com", updated_by: "demo@bhc.com", created_at: "2026-05-02T10:00:00Z", updated_at: "2026-05-02T10:00:00Z" },
]

export const demoPayments = demoOrders
  .filter((o) => o.amount_paid > 0)
  .map((o) => ({
    id: o.invoice_number || o.challan_number,
    order_type: o.order_type,
    invoice_number: o.invoice_number,
    challan_number: o.challan_number,
    payment_type: o.order_type === "purchase" ? "paid" : "received",
    client_name: o.client_name,
    supplier_name: o.supplier_name,
    amount_paid: o.amount_paid,
    payment_status: o.payment_status,
    amount_collected_by: o.amount_collected_by,
    paid_by: null,
    created_at: o.created_at,
  }))

export const demoExpenses = [
  { id: "EXP-001", amount: 12000, category: "Salary", paid_by: "Suresh Patil", collected_by: null, remarks: "Field staff salary", type: "expense", created_at: "2026-05-11T10:00:00Z" },
  { id: "EXP-002", amount: 4500, category: "Transport", paid_by: "Meena Joshi", collected_by: null, remarks: "Delivery fuel", type: "expense", created_at: "2026-05-09T10:00:00Z" },
  { id: "EXP-003", amount: 8000, category: "Rent", paid_by: "Office", collected_by: null, remarks: "Warehouse rent", type: "expense", created_at: "2026-05-05T10:00:00Z" },
  { id: "EXP-004", amount: 2500, category: "Utilities", paid_by: "Office", collected_by: null, remarks: "Electricity", type: "expense", created_at: "2026-05-03T10:00:00Z" },
  { id: "EXP-005", amount: 6000, category: "Maintenance", paid_by: "Arjun Nair", collected_by: null, remarks: "Equipment servicing", type: "expense", created_at: "2026-04-28T10:00:00Z" },
]

export const demoMonths = months

/** Per-month dashboard counters used by the charts + stat cards. */
export const demoMonthlyStats: Record<string, any> = {
  "2026-05": { sales_orders_count: 12, sales_orders_amount: 142000, delivery_challan_count: 5, delivery_challan_amount: 38000, purchase_orders_count: 4, purchase_orders_amount: 96000, expense_amount: 27000, expense_count: 9 },
  "2026-04": { sales_orders_count: 10, sales_orders_amount: 118000, delivery_challan_count: 6, delivery_challan_amount: 41000, purchase_orders_count: 3, purchase_orders_amount: 72000, expense_amount: 22000, expense_count: 7 },
  "2026-03": { sales_orders_count: 14, sales_orders_amount: 165000, delivery_challan_count: 4, delivery_challan_amount: 29000, purchase_orders_count: 5, purchase_orders_amount: 110000, expense_amount: 31000, expense_count: 11 },
  "2026-02": { sales_orders_count: 9, sales_orders_amount: 99000, delivery_challan_count: 3, delivery_challan_amount: 21000, purchase_orders_count: 2, purchase_orders_amount: 54000, expense_amount: 18000, expense_count: 6 },
  "2026-01": { sales_orders_count: 11, sales_orders_amount: 128000, delivery_challan_count: 5, delivery_challan_amount: 33000, purchase_orders_count: 4, purchase_orders_amount: 88000, expense_amount: 24000, expense_count: 8 },
  "2025-12": { sales_orders_count: 13, sales_orders_amount: 151000, delivery_challan_count: 7, delivery_challan_amount: 47000, purchase_orders_count: 3, purchase_orders_amount: 69000, expense_amount: 29000, expense_count: 10 },
}

export const demoLogs = [
  { message: "2026-05-12 14:30:02 - INFO - [create_order] Sale order 'INV-1024' created by demo@bhc.com | Total: ₹5600" },
  { message: "2026-05-11 09:12:44 - INFO - [inventory_update] Stock reduced for 'Dialyser F8 High Flux' | 38 -> 8 (LOW STOCK)" },
  { message: "2026-05-09 16:05:10 - INFO - [create_order] Purchase order 'INV-1025' created by demo@bhc.com | Supplier: Medline Supplies Co." },
  { message: "2026-05-05 11:48:33 - INFO - [create_order] Challan 'DC-308' created | Collected by: Suresh Patil" },
  { message: "2026-05-02 13:20:19 - INFO - [payment] Payment received ₹6720 for 'INV-1026' via UPI" },
]

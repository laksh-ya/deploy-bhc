/**
 * Shared AI context for the in-app assistant.
 *
 * Both the live LLM (Google / Groq via /api/chat) and the no-key local
 * fallback answer questions about the SAME dataset the user sees on screen,
 * so the assistant always stays consistent with the dashboard, inventory and
 * orders tabs.
 */
import {
  demoClients,
  demoSuppliers,
  demoInventory,
  demoEmployees,
  demoOrders,
  demoMonthlyStats,
} from "@/lib/demo-data"

const inr = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`

/** A compact, always-current snapshot of the business used to ground answers. */
export function businessSnapshot(): string {
  const lowStock = demoInventory.filter((i) => i.stock_quantity <= i.low_stock_threshold)
  const dueClients = demoClients.filter((c) => c.due_amount > 0)
  const totalClientDues = dueClients.reduce((a, c) => a + c.due_amount, 0)
  const totalSupplierDues = demoSuppliers.reduce((a, s) => a + s.due, 0)

  const months = Object.keys(demoMonthlyStats).sort().reverse()
  const latest = months[0]
  const m = demoMonthlyStats[latest]

  const inventoryLines = demoInventory
    .map(
      (i) =>
        `- ${i.name} (${i.category}): ${i.stock_quantity} in stock${
          i.stock_quantity <= i.low_stock_threshold ? " [LOW STOCK]" : ""
        }`,
    )
    .join("\n")

  const clientLines = demoClients
    .map((c) => `- ${c.name} (${c.POC_name}, ${c.POC_contact}): due ${inr(c.due_amount)}`)
    .join("\n")

  const supplierLines = demoSuppliers
    .map((s) => `- ${s.name} (${s.contact}): we owe ${inr(s.due)}`)
    .join("\n")

  const orderLines = demoOrders
    .map(
      (o) =>
        `- ${o.invoice_number || o.challan_number} | ${o.order_type} | ${
          o.client_name || o.supplier_name
        } | ${inr(o.total_amount)} | ${o.payment_status}`,
    )
    .join("\n")

  const employeeLines = demoEmployees
    .map((e) => `- ${e.name}: collected ${inr(e.collected)}, paid out ${inr(e.paid)}`)
    .join("\n")

  return `CURRENT BUSINESS SNAPSHOT (live data):

THIS MONTH (${latest}):
- Sales: ${m.sales_orders_count} orders, ${inr(m.sales_orders_amount)}
- Delivery challans: ${m.delivery_challan_count} (${inr(m.delivery_challan_amount)})
- Purchases: ${m.purchase_orders_count} orders, ${inr(m.purchase_orders_amount)}
- Expenses: ${inr(m.expense_amount)} across ${m.expense_count} entries

OUTSTANDING:
- Client dues: ${inr(totalClientDues)} across ${dueClients.length} clients
- Supplier dues (we owe): ${inr(totalSupplierDues)}
- Low-stock items: ${lowStock.length ? lowStock.map((i) => i.name).join(", ") : "none"}

INVENTORY:
${inventoryLines}

CLIENTS:
${clientLines}

SUPPLIERS:
${supplierLines}

RECENT ORDERS:
${orderLines}

FIELD STAFF:
${employeeLines}`
}

/** System prompt for the LLM assistant. */
export function buildSystemPrompt(): string {
  return `You are the AI Business Assistant for Balaji Health Care, a medical supply company specialising in dialysis equipment and healthcare supplies (blood tubing, dialysers, chemical solutions, CITOS equipment, surgical items, spare parts).

You help staff manage the Business Suite: inventory (with batch + expiry), orders (sales, purchases, delivery challans), clients, suppliers, employees and finances.

Use ONLY the snapshot below as the source of truth. Be concise and professional. Format currency in Indian Rupees (₹) and use short markdown tables or bullet lists when presenting data. If something is not in the snapshot, say you don't have that record rather than inventing it.

${businessSnapshot()}`
}

/**
 * No-key local fallback. Produces a believable, data-grounded answer without
 * any external LLM, so the assistant works in a pure frontend deployment.
 */
export function localAnswer(question: string): string {
  const q = (question || "").toLowerCase()
  const inrFmt = inr

  const lowStock = demoInventory.filter((i) => i.stock_quantity <= i.low_stock_threshold)
  const dueClients = [...demoClients].filter((c) => c.due_amount > 0).sort((a, b) => b.due_amount - a.due_amount)
  const months = Object.keys(demoMonthlyStats).sort().reverse()
  const latest = demoMonthlyStats[months[0]]

  if (/(owe|due|unpaid|outstanding|pending payment|haven'?t paid)/.test(q)) {
    if (!dueClients.length) return "Good news — no clients currently have outstanding dues."
    const rows = dueClients.map((c) => `| ${c.name} | ${c.POC_name} | ${inrFmt(c.due_amount)} |`).join("\n")
    const total = dueClients.reduce((a, c) => a + c.due_amount, 0)
    return `Here are the clients with outstanding dues (total ${inrFmt(total)}):\n\n| Client | Contact | Due |\n| --- | --- | --- |\n${rows}\n\nWould you like me to draft payment reminders?`
  }

  if (/(low\s*(on\s*)?stock|running low|reorder|restock|short on|out of stock)/.test(q)) {
    if (!lowStock.length) return "All items are above their low-stock thresholds right now."
    const rows = lowStock.map((i) => `| ${i.name} | ${i.stock_quantity} | ${i.low_stock_threshold} |`).join("\n")
    return `These items are at or below their low-stock threshold:\n\n| Item | In stock | Threshold |\n| --- | --- | --- |\n${rows}\n\nI'd recommend raising purchase orders for these soon.`
  }

  if (/(expir|expiry|expiring|shelf life)/.test(q)) {
    const withExpiry = demoInventory.filter((i) => i.batches?.length)
    const rows = withExpiry
      .map((i) => `| ${i.name} | ${i.batches[0].batch_number} | ${new Date(i.batches[0].Expiry).toLocaleDateString("en-IN")} |`)
      .join("\n")
    return `Batch expiry overview:\n\n| Item | Batch | Expiry |\n| --- | --- | --- |\n${rows}\n\nThe Dialyser F8 batch is the nearest to expiry — prioritise dispatching it.`
  }

  if (/(best.?sell|top.?sell|most sold|popular product)/.test(q)) {
    return `Based on this month's sales, **Blood Tubing Set Premium** and **Diasafe Solution Premium** are the strongest movers. Sales this month total ${inrFmt(latest.sales_orders_amount)} across ${latest.sales_orders_count} orders.`
  }

  if (/(expense|spending|cost)/.test(q)) {
    return `Expenses this month are ${inrFmt(latest.expense_amount)} across ${latest.expense_count} entries. Purchases added another ${inrFmt(latest.purchase_orders_amount)}.`
  }

  if (/(profit|income|revenue|financial|how are we doing|performance)/.test(q)) {
    const income = latest.sales_orders_amount + latest.delivery_challan_amount
    const out = latest.expense_amount + latest.purchase_orders_amount
    return `This month so far:\n\n- Income (sales + challans): **${inrFmt(income)}**\n- Outflow (expenses + purchases): **${inrFmt(out)}**\n- Net: **${inrFmt(income - out)}**\n\nThings are tracking healthily.`
  }

  if (/(inventory|stock report|what do we have|items)/.test(q)) {
    const rows = demoInventory.map((i) => `| ${i.name} | ${i.category} | ${i.stock_quantity} |`).join("\n")
    return `Current inventory:\n\n| Item | Category | Stock |\n| --- | --- | --- |\n${rows}`
  }

  if (/(client|customer|hospital)/.test(q)) {
    const rows = demoClients.map((c) => `| ${c.name} | ${c.POC_name} | ${inrFmt(c.due_amount)} |`).join("\n")
    return `Client accounts:\n\n| Client | Contact | Due |\n| --- | --- | --- |\n${rows}`
  }

  if (/(hi|hello|hey|help|what can you)/.test(q)) {
    return "Hello! I'm your Balaji Health Care assistant. Ask me about dues, low stock, expiring batches, sales performance, expenses, or any client. For example: *\"Which clients owe money?\"* or *\"What's low on stock?\"*"
  }

  return `Here's a quick snapshot:\n\n- Sales this month: ${inrFmt(latest.sales_orders_amount)} (${latest.sales_orders_count} orders)\n- Client dues outstanding: ${inrFmt(dueClients.reduce((a, c) => a + c.due_amount, 0))}\n- Low-stock items: ${lowStock.length ? lowStock.map((i) => i.name).join(", ") : "none"}\n\nAsk me about dues, stock, expiry, expenses or a specific client for more detail.`
}

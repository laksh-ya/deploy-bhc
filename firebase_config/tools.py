from langchain.tools import Tool
from firebase_config.inventory import *
from firebase_config.clients import *
from firebase_config.finance import *

from firebase_config.orders import *
from firebase_config.suppliers import *
from firebase_config.llama_index_configs.order_index import load_orders_index
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
# from llama_index import ServiceContext
# from llama_index_configs.order_index import load_orders_index
from firebase_config.llama_index_configs import global_settings  # triggers embedding config
from firebase_config.employess import *
from firebase_config.doc_counters import *
# Create service_context once, or pass it as a parameter
# firebase_config/tools.py or wherever your tools are defined

from firebase_config.llama_index_configs.order_index import load_orders_index

from firebase_config.llama_index_configs.item_index import load_items_index
from firebase_config.llama_index_configs.supplier_index import load_suppliers_index
from firebase_config.llama_index_configs.client_index import load_clients_index

from firebase_config.llama_index_configs.expense_index import load_expenses_index
from firebase_config.llama_index_configs.employees_sync import load_employees_index
from firebase_config.llama_index_configs.doc_counter_index import load_doc_counter_index
# from firebase_config.llama_index_configs.client_index2 import load_clients_index
def query_orders_semantic(query: str) -> str:
    try:
        index = load_orders_index()
        response = index.as_query_engine().query(query)
        return str(response)
    except FileNotFoundError:
        return "Orders index not found. Please build it first."
    except Exception as e:
        return f"Error querying orders index: {e}"


def query_employees_semantic(query: str) -> str:
    try:
        index = load_employees_index()
        response = index.as_query_engine().query(query)
        return str(response)
    except FileNotFoundError:
        return "Employees index not found. Please build it first."
    except Exception as e:
        return f"Error querying employees index: {e}"

def query_doc_counters_semantic(query: str) -> str:
    try:
        from firebase_config.llama_index_configs.doc_counter_index import load_doc_counter_index
        index = load_doc_counter_index()
        response = index.as_query_engine().query(query)
        return str(response)
    except FileNotFoundError:
        return "Doc counter index not found. Please build it first."
    except Exception as e:
        return f"Error querying doc counter index: {e}"


def query_items_semantic(query: str) -> str:
    try:
        index = load_items_index()
        response = index.as_query_engine().query(query)
        return str(response)
    except FileNotFoundError:
        return "Orders index not found. Please build it first."
    except Exception as e:
        return f"Error querying orders index: {e}"
    
def query_clients_semantic(query: str) -> str:
    try:
        index = load_clients_index()
        # print(f"✅ Loaded index, using vector store: {index._vector_store._collection_name}")
        response = index.as_query_engine().query(query)
        return str(response)
    except FileNotFoundError:
        return "Clients index not found. Please build it first."
    except Exception as e:
        return f"Error querying clients index: {e}"

def query_suppliers_semantic(query: str) -> str:
    try:
        index = load_suppliers_index()
        response = index.as_query_engine().query(query)
        return str(response)
    except FileNotFoundError:
        return "Orders index not found. Please build it first."
    except Exception as e:
        return f"Error querying orders index: {e}"
        
def query_expenses_semantic(query: str) -> str:
    try:
        index = load_expenses_index()
        response = index.as_query_engine().query(query)
        return str(response)
    except FileNotFoundError:
        return "Orders index not found. Please build it first."
    except Exception as e:
        return f"Error querying orders index: {e}"
    
semantic_search_tools = [Tool(
        name="SemanticSearchInventory",
        func=query_items_semantic,
        description="Semantic search over orders when exact tool is not found."
    ),
    Tool(
        name="SemanticSearchClients",
        func=query_clients_semantic,
        description="Semantic search over orders when exact tool is not found."
    ),
    Tool(
        name="SemanticSearchSuppliers",
        func=query_suppliers_semantic,
        description="Semantic search over orders when exact tool is not found."
    ),
    Tool(
        name="SemanticSearchOrders",
        func=query_orders_semantic,
        description="Semantic search over orders when exact tool is not found."
    ),
    Tool(
        name="SemanticSearchEmployees",
        func=query_employees_semantic,
        description="Semantic search over employees when exact tool is not found."
    ),
    Tool(
        name="SemanticSearchExpenses",
        func=query_expenses_semantic,
        description="Semantic search over orders when exact tool is not found."
    ),
    Tool(name = "SemanticSearchDocCounters",func =  query_doc_counters_semantic, description = "Semantic search over doc_counters collection.")
    ]
# Inventory tools
inventory_tools = [
    
    Tool("GetInventoryItemByName", get_inventory_item_by_name, "Get inventory item details by item name."),
    Tool("SearchInventoryByPartialName", search_inventory_by_partial_name, "Search inventory items by partial item name."),
    Tool("AddInventoryItem", lambda item_data: str(add_inventory_item(item_data)), "Add a new item to the inventory."),
    # Tool("UpdateInventoryItem", lambda data: update_inventory_item(data['item_id'], data['updated_fields']) or "Updated", "Update inventory item."),
    Tool("DeleteInventoryItem", lambda item_id: delete_inventory_item(item_id) or "Deleted", "Delete inventory item by ID."),
    Tool("GetAllInventoryItems", lambda _: get_all_inventory_items(), "Get all inventory items."),
    Tool("GetInventoryItemById", get_inventory_item_by_id, "Get inventory item by ID."),
    Tool("GetLowStockItems", lambda _: get_low_stock_items(), "Get items with low stock."),
    Tool("GetItemsByCategory", get_items_by_category, "Get inventory items by category."),
    Tool("GetItemsExpiringSoon", lambda _: get_items_expiring_soon(), "Get inventory items expiring soon."),
]
# Clients tools
client_tools = [
    
    Tool("GetClientByName", get_client_by_name, "Get client details by client name."),
    Tool("SearchClientsByPartialName", search_clients_by_partial_name, "Search clients by partial name."),
    Tool(name="GetAllClients", func=lambda _: get_all_clients(), description="Get all clients.", return_direct=True),
    Tool("AddClient", lambda data: str(add_client(data)), "Add a new client."),
    Tool("UpdateClient", lambda data: update_client(data['client_id'], data['updated_fields']) or "Updated", "Update client."),
    Tool("DeleteClient", lambda client_id: delete_client(client_id) or "Deleted", "Delete client."),
    Tool("GetClientOrderHistory", get_client_order_history, "Get all orders made by a specific client."),
    Tool("GetClientPayments", get_client_payments, "Get payment history of a client."),
    # Tool("UpdateClientDue", lambda data: update_client_due(data['client_id'], data['amount']) or "Updated", "Update client's due amount."),
]
# Suppliers tools
supplier_tools = [
    
    Tool("GetSupplierByName", get_supplier_by_name, "Get supplier details by supplier name."),
    Tool("SearchSuppliersByPartialName", search_suppliers_by_partial_name, "Search suppliers by partial name."),
    Tool("AddSupplier", lambda data: str(add_supplier(data)), "Add a new supplier."),
    Tool("UpdateSupplier", lambda data: update_supplier(data['supplier_id'], data['updated_fields']) or "Updated", "Update supplier."),
    Tool("DeleteSupplier", lambda supplier_id: delete_supplier(supplier_id) or "Deleted", "Delete supplier."),
    Tool("GetSupplierOrderHistory", get_supplier_order_history, "Get order history of a supplier."),
    Tool("GetSupplierPayments", get_supplier_payments, "Get payment history to a supplier."),
    Tool("UpdateSupplierDue", lambda data: update_supplier_due(data['supplier_id'], data['amount']) or "Updated", "Update supplier's due amount."),
    Tool("AddSupplyRecord", lambda data: str(add_supply_record(data)), "Add a new supply record for a supplier."),
]
# Orders tools
order_tools = [
    
    Tool("GetOrderById", get_order_by_id, "Get order details by order ID."),
    Tool("AddOrder", lambda data: str(add_order(data)), "Add a new order."),
    Tool("UpdateOrder", lambda data: update_order(data['order_id'], data['updated_fields']) or "Updated", "Update order."),
    Tool("DeleteOrder", lambda order_id: delete_order(order_id) or "Deleted", "Delete order."),
    
    Tool("GetOrdersByClient", get_orders_by_client, "Get orders made by a client."),
    Tool("GetOrdersBySupplier", get_orders_by_supplier, "Get orders made from a supplier."),
    Tool("GetOrdersByStatus", get_orders_by_status, "Get orders by status."),
    Tool("GetOrdersByDateRange", lambda data: get_orders_by_date_range(data['start_date'], data['end_date']), "Get orders within a date range."),
    Tool("GetTotalSalesInPeriod", lambda data: get_total_sales_in_period(data['start_date'], data['end_date']), "Get total sales in a given period."),

    Tool("GetAllOrders", lambda _: get_all_orders(), "Get all orders.", return_direct=True),
    
    # 🔍 Invoice-related tools (now inside Orders)
    Tool("SearchOrdersByInvoiceNumber", search_orders_by_invoice_number, "Search orders by invoice number."),
    Tool("GetInvoiceByOrderId", get_invoice_by_order_id, "Get invoice details using order ID."),
    
]

employee_tools = [
    
    Tool("AddEmployee", lambda data: str(add_employee(data)), "Add new employee."),
    Tool("UpdateEmployee", lambda data: update_employee(data['employee_id'], data['updated_fields']) or "Updated", "Update employee details."),
    Tool("DeleteEmployee", lambda emp_id: delete_employee(emp_id) or "Deleted", "Delete employee by ID."),
    Tool("GetAllEmployees", lambda _: get_all_employees(), "Get all employees."),
    Tool("GetEmployeeById", get_employee_by_id, "Get employee details by ID."),
    Tool("GetEmployeeCollections", get_employee_collections, "Get amounts collected by employee."),
    Tool("GetEmployeePayments", get_employee_payments, "Get amounts paid by employee."),
]
# Finance tools
finance_tools = [
    
    Tool("AddExpense", lambda data: str(add_expense(data)), "Add a new expense."),
    Tool("AddPayment", lambda data: str(add_payment(data)), "Add a new payment."),
    Tool("AddSupplierPayment", lambda data: str(add_supplier_payment(data)), "Add a payment to a supplier."),
    Tool("GetAllDues", lambda _: get_all_dues(), "Get all dues."),
    Tool("GetExpenses", lambda _: get_expenses(), "Get all expenses."),
    Tool("GetPayments", lambda _: get_payments(), "Get all payments."),
    Tool("GetSupplierPayments", get_supplier_payments, "Get all payments made to a supplier."),
    Tool("UpdateExpense", lambda data: update_expense(data['expense_id'], data['updated_fields']) or "Updated", "Update an expense."),
    Tool("DeleteExpense", lambda expense_id: delete_expense(expense_id) or "Deleted", "Delete an expense by ID."),
    Tool("GetTotalExpenses", lambda _: get_total_expenses(), "Get total expense amount."),
    Tool("GetTotalPayments", lambda _: get_total_payments(), "Get total payment amount."),
]

doc_counter_tools = [
    Tool("GetMonthlyDocSummary", get_monthly_summary, "Get doc counters for a specific month."),
    Tool("GetOverallDocStats", lambda _: get_overall_stats(), "Get overall document stats.")
    
]
# Combine all tools
all_tools = (
    semantic_search_tools +
    inventory_tools +
    client_tools +
    supplier_tools +
    order_tools +
    finance_tools +
    employee_tools +
    doc_counter_tools
)

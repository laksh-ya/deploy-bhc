// "use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import {  useRef } from "react"
import { matchSorter } from "match-sorter";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useNotifications } from "@/components/notifications-provider"
import {
  Scan,
  Plus,
  ShoppingCart,
  Minus,
  X,
  Check,
  Save,
  Upload,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react"
import { useMobile } from "@/hooks/use-mobile"


interface ScannedOrderData {
  invoice_number: string
  client_name?: string
  supplier_name?: string
  order_date: string
  order_type: string
  items: {
    item_name: string
    batch_number: string
    Expiry: string
    quantity: number
    price: number
    tax_percent: number
  }[]
  total_tax: number
  total_quantity: number
  remarks: string
  status: string
  amount_paid?: number
  payment_status?: string
  payment_method?: string
  amount_collected_by?: string
}
// orders-tab.tsx

interface Order {
  id: string
  invoice_number?: string
  challan_number?: string // Add this for delivery challans
  client_name?: string
  client_id?: string
  supplier_name?: string
  supplier_id?: string
  items: {
    item_name: string
    batch_number?: string
    Expiry: string | null
    quantity: number
    price: number
    tax_percent: number
  }[]
  total_tax: number
  total_quantity: number
  order_type: string
  order_date: string
  status: string
  remarks: string
  created_at: string
  updated_at: string
  updated_by: string
  document_type: "purchase" | "sales-invoice" | "delivery-challan"
  amount_paid?: number
  payment_method?: string
  payment_status?: string
  amount_collected_by?: string
  total_amount?: number
  link?: string
  draft?: boolean
}

interface Client {
  id: string
  name: string
}

interface Supplier {
  id: string
  name: string
}

interface InventoryItem {
  id: string
  name: string
  rate: number
  tax_percent: number
}

interface Employee {
  id: string
  name: string
}

interface ItemNameFieldProps {
  item: any;
  updateItem: (id: number, field: string, value: any) => void;
  handleItemSelect: (id: number, item: InventoryItem) => void;
  itemDropdown: {
    options: InventoryItem[];
    loading: boolean;
    search: (term: string) => Promise<void>;
    loadInitial: () => void;
  };
  isCurrentlyActive: boolean;
  setActiveInputId: (id: number | null) => void;
}



function useSmartDropdown<T extends { id: string; name: string }>(endpoint: string) {
  const [options, setOptions] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const cache = useRef<T[]>([]);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Wrap loadInitial in useCallback to make it stable
  const loadInitial = useCallback(async () => {
    if (cache.current.length === 0) {
      setLoading(true);
      const url = `${apiUrl}${endpoint}?limit=100`;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to load initial data");
        const data = await res.json();
        const items = data.items || [];
        cache.current = items;
        setOptions(items);
      } catch (error) {
        console.error(`Error loading initial data from ${url}:`, error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    } else {
      setOptions(cache.current);
    }
  }, [apiUrl, endpoint]); // Dependencies for useCallback

  // Wrap search in useCallback to make it stable
  const search = useCallback(async (input: string) => {
    if (!input) {
      setOptions(cache.current);
      return;
    }
    setLoading(true);
    try {
      const localResults = matchSorter(cache.current, input, { keys: ["name"] });
      const url = `${apiUrl}${endpoint}?search_prefix=${encodeURIComponent(input)}&limit=10`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("API search failed");
      const data = await res.json();
      const apiResults: T[] = data.items || [];
      const combinedResults = [...localResults];
      const existingIds = new Set(localResults.map((item) => item.id));
      apiResults.forEach((item) => {
        if (!existingIds.has(item.id)) {
          combinedResults.push(item);
        }
      });
      setOptions(combinedResults);
    } catch (error) {
      console.error(`Error searching data from ${apiUrl}${endpoint}:`, error);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, endpoint]); // Dependencies for useCallback

  return { options, loadInitial, search, loading };
}


const ItemNameField = ({
  item,
  updateItem,
  handleItemSelect,
  itemDropdown,
  isCurrentlyActive,
  setActiveInputId,
}: ItemNameFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const isProgrammaticFocus = useRef(false);
  const prevIsActive = useRef(isCurrentlyActive);

  // This useEffect fixes the initial focus loss issue **without** causing focus to jump
  useEffect(() => {
    // Only run when the field has just become active (user-initiated)
    if (isCurrentlyActive && !prevIsActive.current && document.activeElement !== inputRef.current) {
      isProgrammaticFocus.current = true;
      inputRef.current?.focus();
      isProgrammaticFocus.current = false;
    }
    prevIsActive.current = isCurrentlyActive;
  }, [isCurrentlyActive]);
  const handleFocus = () => {
    // If our flag is true, it means the useEffect is running, so we do nothing.
    if (isProgrammaticFocus.current) {
      return;
    }
    // Otherwise, this was a real user focus event.
    setActiveInputId(item.id);
    updateItem(item.id, 'showItemDropdown', true);
    itemDropdown.loadInitial();
  };

  // This handler debounces the API call
  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value;
    updateItem(item.id, 'itemSearchTerm', searchTerm);
    updateItem(item.id, 'showItemDropdown', true);

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    if (searchTerm) {
      debounceTimeout.current = setTimeout(() => {
        itemDropdown.search(searchTerm);
      }, 400);
    }
  };

  return (
    <div className="sm:col-span-3 space-y-2 relative" data-dropdown={`item-${item.id}`}>
      <label className="text-xs sm:text-sm text-readable">Item Name</label>
      <div className="relative">
        <Input
          ref={inputRef}
          placeholder="Type to search items..."
          value={item.itemSearchTerm}
          onChange={handleTyping}
          onFocus={handleFocus}
          autoComplete="off"
          style={{ pointerEvents: "auto" }}
        />
        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        {itemDropdown.loading && (
          <div className="absolute right-8 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {item.showItemDropdown && itemDropdown.options.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {itemDropdown.options.map((inventoryItem) => (
            <div
              key={inventoryItem.id}
              onMouseDown={() => handleItemSelect(item.id, inventoryItem)}
              className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm"
            >
              <div className="font-medium">{inventoryItem.name}</div>
              <div className="text-xs text-muted-foreground">
                ID: {inventoryItem.id} • ₹{inventoryItem.rate} • {inventoryItem.tax_percent}% tax
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
interface OrdersTabProps {
  user: {
    name: string
    email: string
    role: string
  }
}

export function OrdersTab({ user }: OrdersTabProps) {
  const [orderType, setOrderType] = useState("sell")
  const [scannedData, setScannedData] = useState<ScannedOrderData | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [showVerification, setShowVerification] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const { addNotification } = useNotifications()
  const isMobile = useMobile()
  const itemsPerPage = 10
  const [editableScannedData, setEditableScannedData] = useState<ScannedOrderData | null>(null)
  // API data states
  const [clients, setClients] = useState<Client[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoadingClients, setIsLoadingClients] = useState(false)
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false)
  const [isLoadingInventory, setIsLoadingInventory] = useState(false)
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false)
  function fixExpiryDateFormat(dateStr: string | undefined): string | undefined {
    if (!dateStr) return undefined;
    const [month, year] = dateStr.split("/");
    if (!month || !year) return undefined;
    return `${year}-${month.padStart(2, "0")}-01`;  // returns "2027-08-01"
  }
  
  // Form states
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [clientSearchTerm, setClientSearchTerm] = useState("")
  const [supplierSearchTerm, setSupplierSearchTerm] = useState("")
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false)
  const [orderItems, setOrderItems] = useState([
    {
      id: 1,
      itemId: "",
      itemName: "",
      selectedItem: null as InventoryItem | null,
      itemSearchTerm: "",
      showItemDropdown: false,
      batchNumber: "",
      Expiry: "",
      quantity: 1,
      rate: 0,
      amount: 0,
      taxPercent: 0,
      total: 0,
    },
  ])
  // Add click outside handlers to close dropdowns
  // Add click outside handlers to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element

      if (!target.closest('[data-dropdown="client"]')) {
        setShowClientDropdown(false)
      }

      if (!target.closest('[data-dropdown="supplier"]')) {
        setShowSupplierDropdown(false)
      }
      
      if (!target.closest('[data-dropdown^="item-"]')) {
        // Only update state if a dropdown is actually open to avoid needless re-renders
        if (orderItems.some((item) => item.showItemDropdown)) {
            setOrderItems((prevItems) => prevItems.map((item) => ({ ...item, showItemDropdown: false })));
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [orderItems]); // Add orderItems to the dependency array

  // API functions
  const fetchClients = useCallback(
    async (searchPrefix = "") => {
      setIsLoadingClients(true)
      try {
        const params = new URLSearchParams()
        if (searchPrefix) params.append("search_prefix", searchPrefix)
        params.append("limit", "100")

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
        const url = `${apiUrl}/api/v1/dropdown/clients?${params}`
        console.log("Fetching clients with URL:", url)

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-User-ID":  "anonymous", // Include X-User-ID for logging
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(`Failed to fetch clients: ${response.status} ${response.statusText}, ${JSON.stringify(errorData)}`)
        }

        const data = await response.json()
        console.log("Clients response:", data)
        setClients(data.items || [])
      } catch (error: any) {
        console.error("Error fetching clients:", error.message)
        addNotification({
          title: "Error",
          message: `Failed to fetch clients: ${error.message}`,
          type: "error",
        })
      } finally {
        setIsLoadingClients(false)
      }
    },
    [addNotification, user],
  )

  const fetchSuppliers = useCallback(
    async (searchPrefix = "") => {
      setIsLoadingSuppliers(true)
      try {
        const params = new URLSearchParams()
        if (searchPrefix) params.append("search_prefix", searchPrefix)
        params.append("limit", "100")

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
        const url = `${apiUrl}/api/v1/dropdown/suppliers?${params}`
        console.log("Fetching suppliers with URL:", url)

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-User-ID":  "anonymous", // Include X-User-ID for logging
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(`Failed to fetch suppliers: ${response.status} ${response.statusText}, ${JSON.stringify(errorData)}`)
        }

        const data = await response.json()
        console.log("Suppliers response:", data)
        setSuppliers(data.items || [])
      } catch (error: any) {
        console.error("Error fetching suppliers:", error.message)
        addNotification({
          title: "Error",
          message: `Failed to fetch suppliers: ${error.message}`,
          type: "error",
        })
      } finally {
        setIsLoadingSuppliers(false)
      }
    },
    [addNotification, user],
  )
  const itemDropdown = useSmartDropdown<InventoryItem>("/api/v1/dropdown/inventory");
  const fetchInventoryItems = useCallback(
    async (searchPrefix = "") => {
      setIsLoadingInventory(true)
      try {
        const params = new URLSearchParams()
        if (searchPrefix) params.append("search_prefix", searchPrefix)
        params.append("limit", "100")

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
        const url = `${apiUrl}/api/v1/dropdown/inventory?${params}`
        console.log("Fetching inventory items with URL:", url)

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-User-ID":  "anonymous", // Include X-User-ID for logging
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(`Failed to fetch inventory items: ${response.status} ${response.statusText}, ${JSON.stringify(errorData)}`)
        }

        const data = await response.json()
        console.log("Inventory items response:", data)
        setInventoryItems(data.items || [])
      } catch (error: any) {
        console.error("Error fetching inventory items:", error.message)
        addNotification({
          title: "Error",
          message: `Failed to fetch inventory items: ${error.message}`,
          type: "error",
        })
      } finally {
        setIsLoadingInventory(false)
      }
    },
    [addNotification, user],
  )

  const fetchEmployees = useCallback(async () => {
    setIsLoadingEmployees(true)
    try {
      const params = new URLSearchParams({ limit: "100" })
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      const res = await fetch(`${apiUrl}/api/v1/dropdown-employees?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("authToken") || ""}` },
      })
      if (!res.ok) throw new Error(`Employees fetch failed: ${res.status}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setEmployees(data)
      } else if (Array.isArray(data.items)) {
        // API may wrap results in { items: [...] }
        setEmployees(data.items)
      } else {
        setEmployees([])
      }
    } catch (error: any) {
      console.error("Failed to load employees", error)
      addNotification({ title: "Error", message: "Failed to load employees", type: "error" })
    } finally {
      setIsLoadingEmployees(false)
    }
  }, [addNotification])

  // Inside OrdersTab component, typically after your orderItems state
  const [batchesByItemId, setBatchesByItemId] = useState<Record<string, { batches: string[]; loading: boolean }>>({});

// Function to fetch batches from your FastAPI endpoint
  const fetchBatches = useCallback(async (itemId: string) => {
    if (!itemId || (batchesByItemId[itemId] && batchesByItemId[itemId].batches.length > 0)) {
      return; // Do not fetch if no ID or if batches are already loaded
    }

    setBatchesByItemId(prev => ({ ...prev, [itemId]: { batches: [], loading: true } }));
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/v1/dropdown/batches/${itemId}`);
      if (!response.ok) throw new Error("Failed to fetch batches");
      const data = await response.json();
      setBatchesByItemId(prev => ({ ...prev, [itemId]: { batches: data.batches || [], loading: false } }));
    } catch (error) {
      console.error(`Error fetching batches for item ${itemId}:`, error);
      setBatchesByItemId(prev => ({ ...prev, [itemId]: { batches: [], loading: false } }));
    }
  }, [batchesByItemId]); // Dependency ensures memoization correctly uses latest batchesByItemId state
  // Load initial data
  useEffect(() => {
    fetchClients()
    fetchSuppliers()
    fetchInventoryItems()
    fetchEmployees()
  }, [fetchClients, fetchSuppliers, fetchInventoryItems, fetchEmployees])

  // Debounced search functions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (clientSearchTerm.length >= 3 || clientSearchTerm.length === 0) {
        fetchClients(clientSearchTerm)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [clientSearchTerm, fetchClients])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (supplierSearchTerm.length >= 3 || supplierSearchTerm.length === 0) {
        fetchSuppliers(supplierSearchTerm)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [supplierSearchTerm, fetchSuppliers])
  // ADD THIS NEW useEffect to the OrdersTab component

  // useEffect(() => {
  //   // Find the item row that is currently active/focused
  //   const activeItem = orderItems.find(item => item.showItemDropdown);
  
  //   if (activeItem) {
  //     // This timer creates the delay. It's the only timer we need.
  //     const timer = setTimeout(() => {
  //       // Only perform the search if the user has actually typed something.
  //       if (activeItem.itemSearchTerm) {
  //         itemDropdown.search(activeItem.itemSearchTerm);
  //       }
  //     }, 350); // A 350ms delay after the user stops typing
  
  //     // This is the crucial part: on every new keystroke, the previous timer is
  //     // cancelled before a new one is set. This ensures the API is only
  //     // called once after the user has paused typing.
  //     return () => clearTimeout(timer);
  //   }
  // }, [orderItems, itemDropdown]);// This hook runs whenever you type into an item field
  // Calculation mode states
  const [overallDiscount, setOverallDiscount] = useState(0)
  const [discountType, setDiscountType] = useState<"percentage" | "amount">("percentage")

  // New state for order items
  

  const [editingOrder, setEditingOrder] = useState<any>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

  const [orders, setOrders] = useState<Order[]>([])
  const [activeInputId, setActiveInputId] = useState<number | null>(null);
  // Add this state at the top with other useState declarations
  const [documentType, setDocumentType] = useState("sales-invoice")
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0])
  const [amountPaid, setAmountPaid] = useState(0)
  const [paymentStatus, setPaymentStatus] = useState("pending")
  const [modeOfPayment, setModeOfPayment] = useState("")
  const [amountCollectedBy, setAmountCollectedBy] = useState("")
  const [remarks, setRemarks] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [challanImage, setChallanImage] = useState<File | null>(null)
  const [challanImagePreview, setChallanImagePreview] = useState<string | null>(null)
  // Add this state near other form states
  const [deliveryChallanLink, setDeliveryChallanLink] = useState<string>("");
  const challanInputRef = useRef<HTMLInputElement>(null);
  // New state for challan filename (client_id)
  const [challanFilename, setChallanFilename] = useState("");

  // Base URL for backend API – takes from env, falls back to localhost.
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Filter functions
  const filteredClients = clients.filter((client) => client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()))

  const filteredSuppliers = suppliers.filter((supplier) =>
    supplier.name.toLowerCase().includes(supplierSearchTerm.toLowerCase()),
  )
  
  const getFilteredItems = (searchTerm: string) => {
    if (!searchTerm.trim()) return itemDropdown.options // Show all items when no search term
    return itemDropdown.options.filter(
      (item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }

  // Filter orders based on search term
  const filteredOrders = orders.filter((order) => {
    const searchTarget = searchTerm.toLowerCase()
  
    // ** FIX: Search both invoice_number and challan_number **
    const matchesInvoiceOrChallan =
      (order.invoice_number?.toLowerCase().includes(searchTarget) ?? false) ||
      (order.challan_number?.toLowerCase().includes(searchTarget) ?? false)
  
    const matchesClientOrSupplier =
      (order.client_name?.toLowerCase().includes(searchTarget) ?? false) ||
      (order.supplier_name?.toLowerCase().includes(searchTarget) ?? false)
  
    const matchesItemName = order.items.some((item) =>
      item.item_name.toLowerCase().includes(searchTarget)
    )
  
    return matchesInvoiceOrChallan || matchesClientOrSupplier || matchesItemName
  })
  
  // REPLACE with this corrected function
// REPLACE your current useSmartDropdown with this final, corrected version

  
  // Pagination logic
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentOrders = filteredOrders.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleEditOrder = (order: any) => {
    setEditingOrder({ ...order })
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = () => {
    if (editingOrder) {
      setOrders((orders) => orders.map((order) => (order.id === editingOrder.id ? editingOrder : order)))
      setIsEditDialogOpen(false)
      setEditingOrder(null)
      addNotification({
        title: "Order Updated",
        message: `Order ${editingOrder.invoice_number} has been updated successfully.`,
        type: "success",
      })
    }
  }

  const PaginationControls = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between mt-6 p-4 glass rounded-lg gap-4">
      <div className="text-sm text-readable-muted">
        Showing {startIndex + 1} to {Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length} orders
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="glass-button"
        >
          <ChevronLeft className="w-4 h-4" />
          {!isMobile && "Previous"}
        </Button>
        <div className="flex space-x-1">
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let page = i + 1
            if (totalPages > 5) {
              if (currentPage > 3) {
                page = currentPage - 2 + i
              }
              if (currentPage > totalPages - 2) {
                page = totalPages - 4 + i
              }
            }
            return (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => handlePageChange(page)}
                className={currentPage === page ? "bg-blue-600 text-white" : "glass-button"}
              >
                {page}
              </Button>
            )
          })}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="glass-button"
        >
          {!isMobile && "Next"}
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )

  const addNewItem = () => {
    const newItem = {
      id: Date.now(),
      itemId: "",
      itemName: "",
      selectedItem: null as InventoryItem | null,
      itemSearchTerm: "",
      showItemDropdown: false,
      batchNumber: "",
      Expiry: "",
      quantity: 1,
      rate: 0,
      amount: 0,
      taxPercent: 0,
      total: 0,
    }
    setOrderItems([...orderItems, newItem])
  }

  const removeItem = (id: number) => {
    if (orderItems.length > 1) {
      setOrderItems(orderItems.filter((item) => item.id !== id))
    }
  }

  const updateItem = (id: number, field: string, value: any) => {
    setOrderItems((currentItems) =>
      currentItems.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          if (["quantity", "rate", "taxPercent"].includes(field)) {
            const baseAmount = updatedItem.quantity * updatedItem.rate;
            const taxAmount = (baseAmount * updatedItem.taxPercent) / 100;
            updatedItem.amount = baseAmount + taxAmount;
            updatedItem.total = updatedItem.amount;
          }
          return updatedItem;
        }
        return item;
      }),
    );
  };

  // orders-tab.tsx

  const updateQuantity = (id: number, increment: boolean) => {
    setOrderItems((currentItems) =>
      currentItems.map((item) => {
        if (item.id === id) {
          const newQuantity = increment ? item.quantity + 1 : Math.max(1, item.quantity - 1);
          const baseAmount = newQuantity * item.rate;
          const taxAmount = (baseAmount * item.taxPercent) / 100;
          const newAmount = baseAmount + taxAmount;
          return {
            ...item,
            quantity: newQuantity,
            amount: newAmount,
            total: newAmount,
          };
        }
        return item;
      }),
    );
  };

  const calculateOrderSummary = () => {
    const totalItems = orderItems.length
    const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0)
    const subtotal = orderItems.reduce((sum, item) => sum + item.quantity * item.rate, 0)
    const calculatedTotalTax = orderItems.reduce(
      (sum, item) => sum + (item.quantity * item.rate * item.taxPercent) / 100,
      0,
    )

    // Calculate discount on subtotal (before tax)
    const discountAmount = discountType === "percentage" ? (subtotal * overallDiscount) / 100 : overallDiscount

    const discountedSubtotal = subtotal - discountAmount
    const calculatedGrandTotal = discountedSubtotal + calculatedTotalTax

    return {
      totalItems,
      totalQuantity,
      subtotal,
      discountAmount,
      discountedSubtotal,
      totalTax: calculatedTotalTax,
      grandTotal: calculatedGrandTotal,
    }
  }

  const { totalItems, totalQuantity, subtotal, discountAmount, discountedSubtotal, totalTax, grandTotal } =
    calculateOrderSummary()

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client)
    setClientSearchTerm(client.name)
    setShowClientDropdown(false)
  }

  const handleSupplierSelect = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setSupplierSearchTerm(supplier.name)
    setShowSupplierDropdown(false)
  }

  // Ensure fetchBatches is defined and accessible in the scope of handleItemSelect
// and also ensure updateItem is passed as prop to ItemNameField and defined in OrdersTab

async function handleItemSelect(itemId: number, selected: InventoryItem) {
  let data = selected;
  // If rate or tax_percent are missing, fetch full details
  if (data.rate === undefined || data.tax_percent === undefined) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const res = await fetch(`${apiUrl}/api/v1/inventory/${selected.id}`);
    data = await res.json();
  }

  // Use the functional update form here as well
  setOrderItems(currentItems => currentItems.map(item => {
    if (item.id === itemId) {
      const baseAmount = item.quantity * (data.rate ?? 0);
      const taxAmount = (baseAmount * (data.tax_percent ?? 0)) / 100;
      const newAmount = baseAmount + taxAmount;
      return {
        ...item,
        selectedItem: data,
        itemId: data.id,
        itemName: data.name,
        itemSearchTerm: data.name, // Set the input text to the full item name
        showItemDropdown: false,    // Hide dropdown after selection
        rate: data.rate ?? 0,
        taxPercent: data.tax_percent ?? 0,
        amount: newAmount,
        total: newAmount,
        batch_number: "", // NEW: Reset batch_number when a new item is selected
      };
    }
    return item;
  }));
  setActiveInputId(null);
  // NEW: Call fetchBatches after the item ID is updated and available in 'data.id'
  // Make sure 'fetchBatches' function is defined in the same component (OrdersTab)
  // and is stable (e.g., wrapped in useCallback if needed, though direct call is fine if it's already a useCallback)
  fetchBatches(data.id);
}
  
const handleItemSearch = (itemId: number, value: string) => {
  setOrderItems(orderItems.map(item => {
    if (item.id === itemId) {
      return {
        ...item,
        itemSearchTerm: value,
        showItemDropdown: true,
      };
    }
    return item;
  }));
  itemDropdown.search(value);

  if (!value) {
    setOrderItems(orderItems.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          selectedItem: null,
          itemId: "",
          itemName: "",
          rate: 0,
          taxPercent: 0,
          amount: 0,
          total: 0,
          batch_number: "", // NEW: Clear batch number when item search is cleared
        };
      }
      return item;
    }));

    // Optional: If you were caching batches on the frontend, you might clear it here too.
    // But since you opted out of caching, clearing batch_number in the item is sufficient.
  }
}
  // Submit functions
  const handleSubmitSaleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
  
    setIsSubmitting(true);
    try {
      let orderData: Partial<Order> = {
        invoice_number: invoiceNumber,
        challan_number: invoiceNumber,
        client_id: selectedClient?.id || "",
        client_name: selectedClient?.name || "",
        order_date: orderDate,
        items: orderItems.map((item) => ({
          item_id: item.itemId, // 
          item_name: item.itemName,
          batch_number: item.batchNumber || "",
          Expiry: item.Expiry ? formatExpiry(item.Expiry) : null, // 

          quantity: item.quantity,
          price: item.rate,
          tax_percent: item.taxPercent,
        })),
        total_quantity: totalQuantity,
        total_tax: totalTax,
        total_amount: grandTotal,
        amount_paid: amountPaid,
        payment_status: paymentStatus,
        payment_method: modeOfPayment,
        remarks: remarks,
        document_type: documentType as Order["document_type"],
        amount_collected_by: amountCollectedBy,
        order_type: documentType === "delivery-challan" ? "delivery_challan" : "sale",
        
        status: "pending",
        draft: false,
      };
  
      const endpoint =
        documentType === "delivery-challan"
          ? `${API_BASE}/api/v1/orders/delivery-challan`
          : `${API_BASE}/api/v1/orders/sale`;
  
      if (documentType === "delivery-challan") {
        orderData.challan_number = invoiceNumber;
        orderData.amount_collected_by = amountCollectedBy;
        orderData.link = deliveryChallanLink; 
        
        delete orderData.invoice_number;
        delete orderData.link;
      }
  
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });
  
      if (!response.ok) {
        const errorData = await response.json();

        if (Array.isArray(errorData.detail)) {
          const formatted = errorData.detail
            .map((err: any) => `${err.loc?.join(".")} - ${err.msg}`)
            .join("\n");
  
          throw new Error(formatted);
        } else {
          throw new Error(errorData.detail || "Failed to create order");
        }
      }
  
      const result = await response.json();
  
      addNotification({
        title: "Order Created",
        message: `${documentType === "delivery-challan" ? "Delivery challan" : "Sales order"} ${invoiceNumber} created successfully.`,
        type: "success",
      });
  
      // Reset form
      resetForm();
    } catch (error) {
      console.error("Error creating order:", error);
      const err = error as { message?: string };
      addNotification({
        title: "Error",
        message: err.message || "Failed to create order",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const formatExpiry = (date: string | Date) => {
    const d = new Date(date);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${yyyy}`;
  };
  
  const handleSubmitPurchaseOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
  
    setIsSubmitting(true);
    try {
      const orderData = {
        invoice_number: invoiceNumber,
        supplier_id: selectedSupplier?.id || "",
        supplier_name: selectedSupplier?.name || "",
        order_date: orderDate,
        items: orderItems.map((item) => ({
          item_id: item.itemId,
          item_name: item.itemName,
          batch_number: item.batchNumber || "", // safe fallback
          Expiry: item.Expiry ? formatExpiry(item.Expiry) : "01/2099", // fallback matches pattern
          quantity: Number(item.quantity),
          price: Number(item.rate),
          tax_percent: Number(item.taxPercent),
        })),
        total_amount: Number(grandTotal),
        amount_paid: Number(amountPaid),
        payment_status: paymentStatus || "paid",
        payment_method: modeOfPayment || "cash", // fallback to "cash" if empty
        order_type: "purchase",
        remarks: remarks?.trim() || "",
        discount: Number(discountAmount),
        discount_type: discountType || "flat",
        status: "pending",
        total_tax: Number(totalTax),
        total_quantity: Number(totalQuantity),
        draft: false,
      };
  
      const response = await fetch(`${API_BASE}/api/v1/orders/purchase`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });
  
      if (!response.ok) {
        const errorData = await response.json();

        if (Array.isArray(errorData.detail)) {
          const formatted = errorData.detail
            .map((err: any) => `${err.loc?.join(".")} - ${err.msg}`)
            .join("\n");
  
          throw new Error(formatted);
        } else {
          throw new Error(errorData.detail || "Failed to create order");
        }
      }
  
      const result = await response.json();
  
      addNotification({
        title: "Purchase Order Created",
        message: `Purchase order ${invoiceNumber} created successfully.`,
        type: "success",
      });
  
      resetForm(); // Reset form after success
    } catch (error) {
      console.error("Error creating purchase order:", error);
      const err = error as { message?: string };
      addNotification({
        title: "Error",
        message: err.message || "Failed to create purchase order",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  

  const resetForm = () => {
    setInvoiceNumber("")
    setOrderDate(new Date().toISOString().split("T")[0])
    setSelectedClient(null)
    setSelectedSupplier(null)
    setClientSearchTerm("")
    setSupplierSearchTerm("")
    setAmountPaid(0)
    setPaymentStatus("pending")
    setModeOfPayment("")
    setAmountCollectedBy("")
    setRemarks("")
    setOverallDiscount(0)
    setOrderItems([
      {
        id: Date.now(),
        itemId: "",
        itemName: "",
        selectedItem: null,
        itemSearchTerm: "",
        showItemDropdown: false,
        batchNumber: "",
        Expiry: "",
        quantity: 1,
        rate: 0,
        amount: 0,
        taxPercent: 0,
        total: 0,
      },
    ])
    setChallanImage(null)
    setChallanImagePreview(null)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      addNotification({
        title: "No File Selected",
        message: "Please select a file to upload.",
        type: "error",
      })
      return
    }
  
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      addNotification({
        title: "Invalid File Type",
        message: "Please upload a PDF file.",
        type: "error",
      })
      return
    }
  
    setIsScanning(true)
  
    try {
      const formData = new FormData()
      formData.append("file", file)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
        
      const response = await fetch(`${apiUrl}/api/v1/invoice/scan`, {
        method: "POST",
        body: formData,
      })
      
  
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }
  
      const result = await response.json()
      const structuredData = result.structured
  
      const mappedData: ScannedOrderData = {
        invoice_number: structuredData.invoice_number || structuredData.challan_number || "",
        client_name: structuredData.client_name || undefined,
        supplier_name: structuredData.order_type === "purchase" ? structuredData.client_name : undefined,
        order_date: structuredData.order_date || new Date().toISOString().split("T")[0],
        order_type: structuredData.order_type || orderType,
        items: structuredData.items?.map((item: any) => ({
          item_name: item.item_name || "Unknown Item",
          batch_number: item.batch_number || "",
          Expiry: item.Expiry || "",
          quantity: item.quantity || 1,
          price: item.price || 0,
          tax_percent: item.tax || 0,
        })) || [],
        total_tax: structuredData.total_tax || 0,
        total_quantity: structuredData.total_quantity || 0,
        remarks: structuredData.remarks || "",
        status: structuredData.status || "pending",
        amount_paid: structuredData.amount_paid || undefined,
        payment_status: structuredData.payment_status || undefined,
        payment_method: structuredData.payment_method || undefined,
        amount_collected_by: structuredData.amount_collected_by || undefined,
      }
      
      setScannedData(mappedData)
      setEditableScannedData(mappedData) // Set editable data
      setShowVerification(true)
  
      addNotification({
        title: "Receipt Scanned Successfully",
        message: "Please verify the extracted information before saving.",
        type: "success",
      })
    } catch (error) {
      console.error("Error uploading file:", error)
      addNotification({
        title: "Scan Failed",
        message: `Failed to process the invoice: ${error instanceof Error ? error.message : "Unknown error"}`,
        type: "error",
      })
    } finally {
      setIsScanning(false)
    }
  }

  const handleVerifyAndSave = () => {
    if (!editableScannedData) return
  
    const orderData: Order = {
      id: Date.now().toString(),
      invoice_number: editableScannedData.invoice_number,
      client_name: editableScannedData.client_name,
      supplier_name: editableScannedData.supplier_name,
      items: editableScannedData.items,
      total_tax: editableScannedData.total_tax,
      total_quantity: editableScannedData.total_quantity,
      order_type: editableScannedData.order_type,
      order_date: editableScannedData.order_date,
      status: editableScannedData.status,
      remarks: editableScannedData.remarks,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: user.name || "Anonymous",
      document_type: editableScannedData.order_type === "delivery_challan" ? "delivery-challan" : editableScannedData.order_type === "sale" ? "sales-invoice" : "purchase",
      amount_paid: editableScannedData.amount_paid,
      payment_method: editableScannedData.payment_method,
      payment_status: editableScannedData.payment_status,
      amount_collected_by: editableScannedData.amount_collected_by,
    }
  
    setOrders((prevOrders) => [...prevOrders, orderData])
  
    setScannedData(null)
    setEditableScannedData(null)
    setShowVerification(false)
  
    addNotification({
      title: "Order Saved",
      message: `Order ${editableScannedData.invoice_number} has been saved successfully.`,
      type: "success",
    })
  }

  const handleRejectScan = () => {
    setScannedData(null)
    setEditableScannedData(null)
    setShowVerification(false)
    addNotification({
      title: "Scan Rejected",
      message: "The scanned order has been rejected. You can try scanning again.",
      type: "info",
    })
  }

  // Function to handle payment status change
  const handlePaymentStatusChange = (orderId: string, newStatus: string) => {
    setOrders((prevOrders) =>
      prevOrders.map((order) => (order.id === orderId ? { ...order, payment_status: newStatus } : order)),
    )
    addNotification({
      title: "Payment Status Updated",
      message: `Payment status for order ${orderId} has been updated to ${newStatus}.`,
      type: "success",
    })
  }

  // Function to handle viewing order details
  const handleViewOrder = (order: Order) => {
    setViewingOrder(order)
    setIsViewDialogOpen(true)
  }

  // Update handleChallanImageUpload to upload and set link
  const handleChallanImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !challanFilename) {
      addNotification({
        title: "Missing Data",
        message: "Please select a file and enter a filename (client_id).",
        type: "error",
      });
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("client_id", challanFilename);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/upload`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      setChallanImage(file);
      setChallanImagePreview(URL.createObjectURL(file));
      setDeliveryChallanLink(data.url || "");
      addNotification({ title: "Upload Success", message: "Challan image uploaded.", type: "success" });
    } catch (err) {
      addNotification({ title: "Upload Failed", message: "Could not upload challan image.", type: "error" });
    }
  };


  const removeChallanImage = () => {
    setChallanImage(null)
    setChallanImagePreview(null)
  }

  // Component for rendering item name field with dropdown - exactly like client/supplier
  // orders-tab.tsx -> inside the OrdersTab component

  // REPLACE with this new, simpler component
// This is the correct, simplified component with no internal state.
  
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
        <h1 className="text-2xl sm:text-3xl font-bold heading-primary">Orders Management</h1>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            className="bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:hover:bg-purple-900/50"
            size={isMobile ? "sm" : "default"}
          >
            <Scan className="w-4 h-4 mr-2" />
            <span className={isMobile ? "hidden" : "inline"}>Scan Receipt</span>
            <span className={isMobile ? "inline" : "hidden"}>Scan</span>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="sell" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sell">Sell Order</TabsTrigger>
          <TabsTrigger value="purchase">Purchase Order</TabsTrigger>
          <TabsTrigger value="scan-order">Scan Order</TabsTrigger>
        </TabsList>

        <TabsContent value="sell">
          <Card className="glass-card">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center text-readable text-base sm:text-lg">
                <ShoppingCart className="w-5 h-5 mr-2" />
                Create Sell Order
              </CardTitle>
              {/* Document Type Selection */}
              <div className="mb-4 p-4 glass rounded-lg">
                <label className="text-readable text-sm mb-2 block">Document Type</label>
                <div className="flex space-x-4">
                  <Button
                    type="button"
                    variant={documentType === "sales-invoice" ? "default" : "outline"}
                    onClick={() => setDocumentType("sales-invoice")}
                    className={documentType === "sales-invoice" ? "bg-blue-600 text-white" : "glass-button"}
                  >
                    Sales Invoice
                  </Button>
                  <Button
                    type="button"
                    variant={documentType === "delivery-challan" ? "default" : "outline"}
                    onClick={() => setDocumentType("delivery-challan")}
                    className={documentType === "delivery-challan" ? "bg-green-600 text-white" : "glass-button"}
                  >
                    Delivery Challan
                  </Button>
                </div>
              </div>

              {/* Challan Receipt Upload - Only show for Delivery Challan */}
              {documentType === "delivery-challan" && (
                <div className="mb-4 p-4 glass rounded-lg border border-green-200/50 dark:border-green-500/30">
                  <h3 className="text-base font-semibold text-readable mb-3">Challan Receipt Upload</h3>

                  {!challanImagePreview ? (
                    <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground mb-2">Upload challan receipt image</p>
                      <input
                        type="text"
                        placeholder="Enter filename (client_id)"
                        value={challanFilename}
                        onChange={e => setChallanFilename(e.target.value)}
                        className="mb-2 px-2 py-1 border rounded"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleChallanImageUpload}
                        ref={challanInputRef}
                        style={{ display: 'none' }}
                      />
                      <button
                        type="button"
                        className="glass-button bg-transparent px-4 py-2 rounded border border-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                        onClick={() => challanInputRef.current && challanInputRef.current.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Choose Image
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative inline-block">
                        <img
                          src={challanImagePreview || "/placeholder.svg"}
                          alt="Challan Receipt"
                          className="max-w-full h-32 object-cover rounded-lg border"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white hover:bg-red-600"
                          onClick={removeChallanImage}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {challanImage?.name} ({((challanImage?.size || 0) / 1024).toFixed(1)} KB)
                      </p>
                    </div>
                  )}
                  {/* Display the link if available and allow copying */}
                  <input
                    type="text"
                    value={deliveryChallanLink}
                    onChange={e => setDeliveryChallanLink(e.target.value)}
                    placeholder="Delivery Challan Link"
                    className="mb-2 px-2 py-1 border rounded w-full"
                    readOnly
                  />
                  {deliveryChallanLink && (
                    <div className="mb-2">
                      <label className="text-xs text-readable">Challan Link:</label>
                      <a href={deliveryChallanLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline ml-2">View Uploaded Challan</a>
                    </div>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <form onSubmit={handleSubmitSaleOrder} className="space-y-4 sm:space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <label htmlFor="invoiceNumber" className="text-readable text-sm">
                      {documentType === "sales-invoice" ? "Invoice Number" : "Delivery Challan No."}
                    </label>
                    <Input
                      id="invoiceNumber"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder={
                        documentType === "sales-invoice" ? "Enter invoice number" : "Enter delivery challan number"
                      }
                      className="glass-input text-readable placeholder:text-readable-subtle"
                      required
                    />
                  </div>

                  {/* Client Name with Autocomplete */}
                  <div className="space-y-2 relative" data-dropdown="client">
                    <label htmlFor="clientName" className="text-readable text-sm">
                      Client Name
                    </label>
                    <div className="relative">
                      <Input
                        id="clientName"
                        placeholder="Type to search clients..."
                        value={clientSearchTerm}
                        onChange={(e) => {
                          setClientSearchTerm(e.target.value)
                          setShowClientDropdown(true)
                          if (!e.target.value) {
                            setSelectedClient(null)
                          }
                        }}
                        onFocus={() => setShowClientDropdown(true)}
                        className="glass-input text-readable placeholder:text-readable-subtle pr-8"
                      />
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      {isLoadingClients && (
                        <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                    </div>
                    {showClientDropdown && filteredClients.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {filteredClients.map((client) => (
                          <div
                            key={client.id}
                            className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm"
                            onClick={() => handleClientSelect(client)}
                          >
                            <div className="font-medium">{client.name}</div>
                            <div className="text-xs text-muted-foreground">{client.id}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Client ID - Auto-filled and non-editable */}
                  <div className="space-y-2">
                    <label htmlFor="clientId" className="text-readable text-sm">
                      Client ID
                    </label>
                    <Input
                      id="clientId"
                      value={selectedClient?.id || ""}
                      readOnly
                      placeholder="Auto-filled from client selection"
                      className="glass-input text-readable placeholder:text-readable-subtle bg-gray-50 dark:bg-gray-800/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="orderDate" className="text-readable text-sm">
                      Order Date
                    </label>
                    <Input
                      id="orderDate"
                      type="date"
                      value={orderDate}
                      onChange={(e) => setOrderDate(e.target.value)}
                      className="glass-input text-readable"
                    />
                  </div>
                </div>

                {/* Payment Information Section */}
                <div className="space-y-4 p-4 glass rounded-lg border border-blue-200/50 dark:border-blue-500/30">
                  <h3 className="text-base font-semibold text-readable">Payment Information</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="amountPaid" className="text-readable text-sm">
                        Amount Paid (₹)
                      </label>
                      <Input
                        id="amountPaid"
                        type="number"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(Number(e.target.value) || 0)}
                        placeholder="Enter amount paid"
                        className="glass-input text-readable placeholder:text-readable-subtle"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="paymentStatus" className="text-readable text-sm">
                        Payment Status
                      </label>
                      <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                        <SelectTrigger className="glass-input text-readable">
                          <SelectValue placeholder="Select payment status" />
                        </SelectTrigger>
                        <SelectContent className="glass-card">
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="partial">Partially Paid</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="modeOfPayment" className="text-readable text-sm">
                        Mode of Payment
                      </label>
                      <Select value={modeOfPayment} onValueChange={setModeOfPayment}>
                        <SelectTrigger className="glass-input text-readable">
                          <SelectValue placeholder="Select payment mode" />
                        </SelectTrigger>
                        <SelectContent className="glass-card">
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                          <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                          <SelectItem value="upi">UPI</SelectItem>
                          <SelectItem value="card">Credit/Debit Card</SelectItem>
                          <SelectItem value="online">Online Payment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Add Amount Collected By field only for Delivery Challan */}
                    {documentType === "delivery-challan" && (
                      <div className="space-y-2">
                        <label htmlFor="amountCollectedBy" className="text-readable text-sm">
                          Amount Collected By
                        </label>
                        <Select value={amountCollectedBy} onValueChange={setAmountCollectedBy}>
                          <SelectTrigger className="glass-input text-readable">
                            <SelectValue placeholder="Select collector" />
                          </SelectTrigger>
                          <SelectContent className="glass-card">
                            {isLoadingEmployees ? (
                              <div className="text-sm p-2">Loading employees...</div>
                            ) : employees.length === 0 ? (
                              <div className="text-sm p-2 text-red-500">No employees found</div>
                            ) : (
                              employees.map((emp) => (
                                <SelectItem key={emp.id} value={emp.name}>
                                  {emp.name}
                                </SelectItem>
                              ))
                            )}
                            {/* Always keep a few default roles */}
                            
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-base sm:text-lg font-semibold text-readable">Order Items</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="glass-button text-readable hover:scale-105 transition-transform bg-transparent"
                      onClick={addNewItem}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Item
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {orderItems.map((item, index) => (
                      <Card key={item.id} className="glass border border-white/30 dark:border-gray-600/30 hover:shadow-lg transition-all duration-300">
                        <CardContent className="p-3 sm:p-4">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-14 sm:gap-4 sm:items-end">
                              <ItemNameField item={item}
                                updateItem={updateItem}
                                handleItemSelect={handleItemSelect}
                                itemDropdown={itemDropdown}
                                isCurrentlyActive={activeInputId === item.id}
                                setActiveInputId={setActiveInputId}
                              />
                              <div className="sm:col-span-2 space-y-2">
                                  <label className="text-xs sm:text-sm text-readable">Item ID</label>
                                  <Input value={item.itemId} readOnly placeholder="Auto-filled" className="glass-input bg-gray-50 dark:bg-gray-800/50" />
                              </div>
                              <div className="sm:col-span-2 space-y-2">
                                  <label className="text-xs sm:text-sm text-readable">Batch Number</label>
                                  {batchesByItemId[item.itemId]?.loading ? (
                                      <div className="flex items-center justify-center h-10 border rounded-md"><div className="animate-spin rounded-full h-4 w-4 border-b-2"></div></div>
                                  ) : (batchesByItemId[item.itemId]?.batches?.length > 0) ? (
                                      <Select value={item.batchNumber} onValueChange={(value) => updateItem(item.id, "batchNumber", value)}>
                                          <SelectTrigger className="glass-input"><SelectValue placeholder="Select Batch"/></SelectTrigger>
                                          <SelectContent className="glass-card">
                                              {batchesByItemId[item.itemId].batches.map(batch => <SelectItem key={batch} value={batch}>{batch}</SelectItem>)}
                                          </SelectContent>
                                      </Select>
                                  ) : (
                                      <Input type="text" placeholder={item.itemId ? "N/A" : "Select Item"} value={item.batchNumber} readOnly className="glass-input bg-gray-50 dark:bg-gray-800/50" disabled />
                                  )}
                              </div>
                              <div className="sm:col-span-2 space-y-2">
                                  <label className="text-xs sm:text-sm text-readable">Expiry Date</label>
                                  <Input type="date" value={item.Expiry} onChange={(e) => updateItem(item.id, "Expiry", e.target.value)} className="glass-input" />
                              </div>
                              <div className="sm:col-span-1 space-y-2">
                                  <label className="text-xs sm:text-sm text-readable">Qty</label>
                                  <div className="flex items-center space-x-1">
                                      <Button type="button" variant="outline" size="icon" className="h-8 w-8 glass-button" onClick={() => updateQuantity(item.id, false)}><Minus className="w-3 h-3"/></Button>
                                      <Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value, 10) || 1)} className="text-center glass-input w-12" />
                                      <Button type="button" variant="outline" size="icon" className="h-8 w-8 glass-button" onClick={() => updateQuantity(item.id, true)}><Plus className="w-3 h-3"/></Button>
                                  </div>
                              </div>
                              <div className="sm:col-span-1 space-y-2">
                                  <label className="text-xs sm:text-sm text-readable">Rate</label>
                                  <Input type="number" value={item.rate} onChange={(e) => updateItem(item.id, "rate", parseFloat(e.target.value) || 0)} className="glass-input" />
                              </div>
                              <div className="sm:col-span-1 space-y-2">
                                  <label className="text-xs sm:text-sm text-readable">Amount</label>
                                  <Input type="number" value={item.amount.toFixed(2)} readOnly className="glass-input bg-gray-50 dark:bg-gray-800/50" />
                              </div>
                              <div className="sm:col-span-1 space-y-2">
                                  <label className="text-xs sm:text-sm text-readable">Tax%</label>
                                  <Input type="number" value={item.taxPercent} onChange={(e) => updateItem(item.id, "taxPercent", parseFloat(e.target.value) || 0)} className="glass-input" />
                              </div>
                              <div className="sm:col-span-1 flex justify-end sm:justify-center">
                                  <Button type="button" variant="outline" size="icon" className="h-8 w-8 glass-button text-red-500" onClick={() => removeItem(item.id)} disabled={orderItems.length === 1}><X className="w-3 h-3"/></Button>
                              </div>
                          </div>
                      </CardContent>
                      </Card>
                    
                  ))}
                  </div>

                  {/* Discount Section */}
                  <Card className="glass border-2 border-orange-200/50 dark:border-orange-500/30">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-readable">Overall Discount</h3>
                        <div className="flex space-x-2">
                          <Button
                            type="button"
                            variant={discountType === "percentage" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setDiscountType("percentage")}
                            className={discountType === "percentage" ? "bg-orange-600 text-white" : "glass-button"}
                          >
                            %
                          </Button>
                          <Button
                            type="button"
                            variant={discountType === "amount" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setDiscountType("amount")}
                            className={discountType === "amount" ? "bg-orange-600 text-white" : "glass-button"}
                          >
                            ₹
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          value={overallDiscount}
                          onChange={(e) => setOverallDiscount(Number.parseFloat(e.target.value) || 0)}
                          placeholder={discountType === "percentage" ? "Enter discount %" : "Enter discount amount"}
                          className="glass-input text-readable placeholder:text-readable-subtle"
                        />
                        <span className="text-readable text-sm">{discountType === "percentage" ? "%" : "₹"}</span>
                      </div>
                      {discountAmount > 0 && (
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                          Discount Applied: ₹{discountAmount.toLocaleString()}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Order Summary */}
                  <Card className="glass border-2 border-blue-200/50 dark:border-blue-500/30">
                    <CardContent className="p-3 sm:p-4">
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
                        <div>
                          <p className="text-xs sm:text-sm text-readable-muted">Total Items</p>
                          <p className="text-lg sm:text-xl font-bold text-readable">{totalItems}</p>
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm text-readable-muted">Total Quantity</p>
                          <p className="text-lg sm:text-xl font-bold text-readable">{totalQuantity}</p>
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm text-readable-muted">Subtotal</p>
                          <p className="text-lg sm:text-xl font-bold text-readable">₹{subtotal.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm text-readable-muted">Total Tax</p>
                          <p className="text-lg sm:text-xl font-bold text-readable">₹{totalTax.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm text-readable-muted">Grand Total</p>
                          <p className="text-xl sm:text-2xl font-bold text-readable">₹{grandTotal.toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-2">
                  <label htmlFor="remarks" className="text-readable text-sm">
                    Remarks
                  </label>
                  <Textarea
                    id="remarks"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter any remarks..."
                    rows={3}
                    className="glass-input text-readable placeholder:text-readable-subtle"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:space-x-4">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg border-0 hover:scale-105 transition-transform"
                  >
                    {isSubmitting ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    {isSubmitting
                      ? "Creating..."
                      : documentType === "sales-invoice"
                        ? "Create Sales Invoice"
                        : "Create Delivery Challan"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="glass-button text-readable hover:scale-105 transition-transform bg-transparent"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save as Draft
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchase">
          <Card className="glass-card">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center text-readable text-base sm:text-lg">
                <ShoppingCart className="w-5 h-5 mr-2" />
                Create Purchase Order
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <form onSubmit={handleSubmitPurchaseOrder} className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <label htmlFor="invoiceNumber" className="text-readable text-sm">
                      Invoice Number
                    </label>
                    <Input
                      id="invoiceNumber"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="Enter invoice number"
                      className="glass-input text-readable placeholder:text-readable-subtle"
                      required
                    />
                  </div>

                  {/* Supplier Name with Autocomplete */}
                  <div className="space-y-2 relative" data-dropdown="supplier">
                    <label htmlFor="supplierName" className="text-readable text-sm">
                      Supplier Name
                    </label>
                    <div className="relative">
                      <Input
                        id="supplierName"
                        placeholder="Type to search suppliers..."
                        value={supplierSearchTerm}
                        onChange={(e) => {
                          setSupplierSearchTerm(e.target.value)
                          setShowSupplierDropdown(true)
                          if (!e.target.value) {
                            setSelectedSupplier(null)
                          }
                        }}
                        onFocus={() => setShowSupplierDropdown(true)}
                        className="glass-input text-readable placeholder:text-readable-subtle pr-8"
                      />
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      {isLoadingSuppliers && (
                        <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                    </div>
                    {showSupplierDropdown && filteredSuppliers.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {filteredSuppliers.map((supplier) => (
                          <div
                            key={supplier.id}
                            className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm"
                            onClick={() => handleSupplierSelect(supplier)}
                          >
                            <div className="font-medium">{supplier.name}</div>
                            <div className="text-xs text-muted-foreground">{supplier.id}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Supplier ID - Auto-filled and non-editable */}
                  <div className="space-y-2">
                    <label htmlFor="supplierId" className="text-readable text-sm">
                      Supplier ID
                    </label>
                    <Input
                      id="supplierId"
                      value={selectedSupplier?.id || ""}
                      readOnly
                      placeholder="Auto-filled from supplier selection"
                      className="glass-input text-readable placeholder:text-readable-subtle bg-gray-50 dark:bg-gray-800/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="orderDate" className="text-readable text-sm">
                      Order Date
                    </label>
                    <Input
                      id="orderDate"
                      type="date"
                      value={orderDate}
                      onChange={(e) => setOrderDate(e.target.value)}
                      className="glass-input text-readable"
                    />
                  </div>
                </div>

                {/* Items Section - Same structure as sell order */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-base sm:text-lg font-semibold text-readable">Order Items</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="glass-button text-readable hover:scale-105 transition-transform bg-transparent"
                      onClick={addNewItem}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Item
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {orderItems.map((item, index) => (
                      <Card
                        key={item.id}
                        className="glass border border-white/30 dark:border-gray-600/30 hover:shadow-lg transition-all duration-300"
                      >
                        <CardContent className="p-3 sm:p-4">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-14 sm:gap-4 sm:items-end">
                            {/* Item Name with Autocomplete - exactly like client/supplier */}
                            <ItemNameField item={item}
                              updateItem={updateItem}
                              handleItemSelect={handleItemSelect}
                              itemDropdown={itemDropdown}
                              isCurrentlyActive={activeInputId === item.id}
                              setActiveInputId={setActiveInputId} 
                            />

                            {/* Item ID - Auto-filled and non-editable */}
                            <div className="sm:col-span-2 space-y-2">
                              <label className="text-xs sm:text-sm text-readable">Item ID</label>
                              <Input
                                value={item.itemId}
                                readOnly
                                placeholder="Auto-filled"
                                className="glass-input text-readable placeholder:text-readable-subtle bg-gray-50 dark:bg-gray-800/50"
                              />
                            </div>

                            {/* Batch Number */}
                            <div className="sm:col-span-2 space-y-2">
                              <label className="text-xs sm:text-sm text-readable">Batch Number</label>
                              <Input
                                value={item.batchNumber}
                                onChange={(e) => updateItem(item.id, "batchNumber", e.target.value)}
                                className="glass-input text-readable placeholder:text-readable-subtle"
                                placeholder="Batch"
                              />
                            </div>

                            {/* Expiry */}
                            <div className="sm:col-span-2 space-y-2">
                              <label className="text-xs sm:text-sm text-readable">Expiry Date</label>
                              <Input
                                type="date"
                                value={item.Expiry}
                                onChange={(e) => updateItem(item.id, "Expiry", e.target.value)}
                                className="glass-input text-readable"
                              />
                            </div>

                            {/* Quantity Counter */}
                            <div className="sm:col-span-1 space-y-2">
                              <label className="text-xs sm:text-sm text-readable">Qty</label>
                              <div className="flex items-center space-x-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 glass-button hover:scale-110 transition-transform bg-transparent"
                                  onClick={() => updateQuantity(item.id, false)}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    updateItem(item.id, "quantity", Number.parseInt(e.target.value) || 1)
                                  }
                                  className="text-center glass-input text-readable w-12"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 glass-button hover:scale-110 transition-transform bg-transparent"
                                  onClick={() => updateQuantity(item.id, true)}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>

                            {/* Rate */}
                            <div className="sm:col-span-1 space-y-2">
                              <label className="text-xs sm:text-sm text-readable">Rate</label>
                              <Input
                                type="number"
                                value={item.rate}
                                onChange={(e) => updateItem(item.id, "rate", Number.parseFloat(e.target.value) || 0)}
                                className="glass-input text-readable placeholder:text-readable-subtle"
                              />
                            </div>

                            {/* Amount */}
                            <div className="sm:col-span-1 space-y-2">
                              <label className="text-xs sm:text-sm text-readable">Amount</label>
                              <Input
                                type="number"
                                value={item.amount.toFixed(2)}
                                readOnly
                                className="glass-input text-readable placeholder:text-readable-subtle bg-gray-50 dark:bg-gray-800/50"
                              />
                            </div>

                            {/* Tax % */}
                            <div className="sm:col-span-1 space-y-2">
                              <label className="text-xs sm:text-sm text-readable">Tax%</label>
                              <Input
                                type="number"
                                value={item.taxPercent}
                                onChange={(e) =>
                                  updateItem(item.id, "taxPercent", Number.parseFloat(e.target.value) || 0)
                                }
                                className="glass-input text-readable placeholder:text-readable-subtle"
                              />
                            </div>

                            {/* Remove Button */}
                            <div className="sm:col-span-1 flex justify-end sm:justify-center">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 glass-button text-red-500 hover:text-red-600 hover:scale-110 transition-all bg-transparent"
                                onClick={() => removeItem(item.id)}
                                disabled={orderItems.length === 1}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Discount Section */}
                  <Card className="glass border-2 border-orange-200/50 dark:border-orange-500/30">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-readable">Overall Discount</h3>
                        <div className="flex space-x-2">
                          <Button
                            type="button"
                            variant={discountType === "percentage" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setDiscountType("percentage")}
                            className={discountType === "percentage" ? "bg-orange-600 text-white" : "glass-button"}
                          >
                            %
                          </Button>
                          <Button
                            type="button"
                            variant={discountType === "amount" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setDiscountType("amount")}
                            className={discountType === "amount" ? "bg-orange-600 text-white" : "glass-button"}
                          >
                            ₹
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          value={overallDiscount}
                          onChange={(e) => setOverallDiscount(Number.parseFloat(e.target.value) || 0)}
                          placeholder={discountType === "percentage" ? "Enter discount %" : "Enter discount amount"}
                          className="glass-input text-readable placeholder:text-readable-subtle"
                        />
                        <span className="text-readable text-sm">{discountType === "percentage" ? "%" : "₹"}</span>
                      </div>
                      {discountAmount > 0 && (
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                          Discount Applied: ₹{discountAmount.toLocaleString()}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Order Summary */}
                  <Card className="glass border-2 border-blue-200/50 dark:border-blue-500/30">
                    <CardContent className="p-3 sm:p-4">
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
                        <div>
                          <p className="text-xs sm:text-sm text-readable-muted">Total Items</p>
                          <p className="text-lg sm:text-xl font-bold text-readable">{totalItems}</p>
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm text-readable-muted">Total Quantity</p>
                          <p className="text-lg sm:text-xl font-bold text-readable">{totalQuantity}</p>
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm text-readable-muted">Subtotal</p>
                          <p className="text-lg sm:text-xl font-bold text-readable">₹{subtotal.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm text-readable-muted">Total Tax</p>
                          <p className="text-lg sm:text-xl font-bold text-readable">₹{totalTax.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm text-readable-muted">Grand Total</p>
                          <p className="text-xl sm:text-2xl font-bold text-readable">₹{grandTotal.toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-2">
                  <label htmlFor="remarks" className="text-readable text-sm">
                    Remarks
                  </label>
                  <Textarea
                    id="remarks"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter any remarks..."
                    rows={3}
                    className="glass-input text-readable placeholder:text-readable-subtle"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:space-x-4">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg border-0 hover:scale-105 transition-transform"
                  >
                    {isSubmitting ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    {isSubmitting ? "Creating..." : "Create Purchase Order"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="glass-button text-readable hover:scale-105 transition-transform bg-transparent"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save as Draft
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scan-order">
          <Card className="glass-card">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center text-readable text-base sm:text-lg">
                <Upload className="w-5 h-5 mr-2" />
                Scan Order
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
            <form className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <label htmlFor="fileUpload" className="text-readable text-sm">
                      Upload Receipt (PDF)
                    </label>
                    <Input
                      id="fileUpload"
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileUpload}
                      className="glass-input text-readable"
                      disabled={isScanning}
                    />
                    {isScanning && (
                      <div className="flex items-center mt-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        <span className="text-sm text-readable">Scanning...</span>
                      </div>
                    )}
                  </div>
                </div>

                {showVerification && editableScannedData && (
                  <Card className="glass-card border-2 border-blue-200/50 dark:border-blue-500/30">
                    <CardHeader>
                      <CardTitle className="text-readable text-base sm:text-lg">Verify and Edit Scanned Data</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label htmlFor="scanInvoiceNumber" className="text-readable text-sm">
                            Invoice/Challan Number
                          </label>
                          <Input
                            id="scanInvoiceNumber"
                            value={editableScannedData.invoice_number}
                            onChange={(e) =>
                              setEditableScannedData({
                                ...editableScannedData,
                                invoice_number: e.target.value,
                              })
                            }
                            className="glass-input text-readable"
                          />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="scanOrderDate" className="text-readable text-sm">
                            Order Date
                          </label>
                          <Input
                            id="scanOrderDate"
                            type="date"
                            value={editableScannedData.order_date}
                            onChange={(e) =>
                              setEditableScannedData({
                                ...editableScannedData,
                                order_date: e.target.value,
                              })
                            }
                            className="glass-input text-readable"
                          />
                        </div>
                        {editableScannedData.order_type === "purchase" ? (
                          <div className="space-y-2">
                            <label htmlFor="scanSupplierName" className="text-readable text-sm">
                              Supplier Name
                            </label>
                            <Input
                              id="scanSupplierName"
                              value={editableScannedData.supplier_name || ""}
                              onChange={(e) =>
                                setEditableScannedData({
                                  ...editableScannedData,
                                  supplier_name: e.target.value || undefined,
                                })
                              }
                              className="glass-input text-readable"
                            />
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <label htmlFor="scanClientName" className="text-readable text-sm">
                              Client Name
                            </label>
                            <Input
                              id="scanClientName"
                              value={editableScannedData.client_name || ""}
                              onChange={(e) =>
                                setEditableScannedData({
                                  ...editableScannedData,
                                  client_name: e.target.value || undefined,
                                })
                              }
                              className="glass-input text-readable"
                            />
                          </div>
                        )}
                        <div className="space-y-2">
                          <label htmlFor="scanOrderType" className="text-readable text-sm">
                            Order Type
                          </label>
                          <Select
                            value={editableScannedData.order_type}
                            onValueChange={(value) =>
                              setEditableScannedData({
                                ...editableScannedData,
                                order_type: value,
                                supplier_name: value === "purchase" ? editableScannedData.client_name : undefined,
                                client_name: value !== "purchase" ? editableScannedData.client_name : undefined,
                              })
                            }
                          >
                            <SelectTrigger className="glass-input text-readable">
                              <SelectValue placeholder="Select order type" />
                            </SelectTrigger>
                            <SelectContent className="glass-card">
                              <SelectItem value="sale">Sale</SelectItem>
                              <SelectItem value="purchase">Purchase</SelectItem>
                              <SelectItem value="delivery_challan">Delivery Challan</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-readable text-sm">Items</label>
                        {editableScannedData.items.map((item, index) => (
                          <Card key={index} className="glass border border-white/30 dark:border-gray-600/30">
                            <CardContent className="p-3 sm:p-4">
                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4">
                                <div className="sm:col-span-3 space-y-2">
                                  <label className="text-xs sm:text-sm text-readable">Item Name</label>
                                  <Input
                                    value={item.item_name}
                                    onChange={(e) => {
                                      const newItems = [...editableScannedData.items]
                                      newItems[index].item_name = e.target.value
                                      setEditableScannedData({ ...editableScannedData, items: newItems })
                                    }}
                                    className="glass-input text-readable"
                                  />
                                </div>
                                <div className="sm:col-span-2 space-y-2">
                                  <label className="text-xs sm:text-sm text-readable">Batch Number</label>
                                  <Input
                                    value={item.batch_number}
                                    onChange={(e) => {
                                      const newItems = [...editableScannedData.items]
                                      newItems[index].batch_number = e.target.value
                                      setEditableScannedData({ ...editableScannedData, items: newItems })
                                    }}
                                    className="glass-input text-readable"
                                  />
                                </div>
                                <div className="sm:col-span-2 space-y-2">
                                  <label className="text-xs sm:text-sm text-readable">Expiry</label>
                                  <Input
                                    type="date"
                                    value={item.Expiry}
                                    onChange={(e) => {
                                      const newItems = [...editableScannedData.items]
                                      newItems[index].Expiry = e.target.value
                                      setEditableScannedData({ ...editableScannedData, items: newItems })
                                    }}
                                    className="glass-input text-readable"
                                  />
                                </div>
                                <div className="sm:col-span-2 space-y-2">
                                  <label className="text-xs sm:text-sm text-readable">Quantity</label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const newItems = [...editableScannedData.items]
                                      newItems[index].quantity = Number(e.target.value) || 1
                                      setEditableScannedData({
                                        ...editableScannedData,
                                        items: newItems,
                                        total_quantity: newItems.reduce((sum, item) => sum + item.quantity, 0),
                                      })
                                    }}
                                    className="glass-input text-readable"
                                  />
                                </div>
                                <div className="sm:col-span-2 space-y-2">
                                  <label className="text-xs sm:text-sm text-readable">Price</label>
                                  <Input
                                    type="number"
                                    value={item.price}
                                    onChange={(e) => {
                                      const newItems = [...editableScannedData.items]
                                      newItems[index].price = Number(e.target.value) || 0
                                      setEditableScannedData({ ...editableScannedData, items: newItems })
                                    }}
                                    className="glass-input text-readable"
                                  />
                                </div>
                                <div className="sm:col-span-1 space-y-2">
                                  <label className="text-xs sm:text-sm text-readable">Tax%</label>
                                  <Input
                                    type="number"
                                    value={item.tax_percent}
                                    onChange={(e) => {
                                      const newItems = [...editableScannedData.items]
                                      newItems[index].tax_percent = Number(e.target.value) || 0
                                      const totalTax = newItems.reduce(
                                        (sum, item) => sum + (item.quantity * item.price * item.tax_percent) / 100,
                                        0
                                      )
                                      setEditableScannedData({
                                        ...editableScannedData,
                                        items: newItems,
                                        total_tax: totalTax,
                                      })
                                    }}
                                    className="glass-input text-readable"
                                  />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="scanRemarks" className="text-readable text-sm">
                          Remarks
                        </label>
                        <Textarea
                          id="scanRemarks"
                          value={editableScannedData.remarks}
                          onChange={(e) =>
                            setEditableScannedData({
                              ...editableScannedData,
                              remarks: e.target.value,
                            })
                          }
                          rows={3}
                          className="glass-input text-readable"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label htmlFor="scanAmountPaid" className="text-readable text-sm">
                            Amount Paid
                          </label>
                          <Input
                            id="scanAmountPaid"
                            type="number"
                            value={editableScannedData.amount_paid || ""}
                            onChange={(e) =>
                              setEditableScannedData({
                                ...editableScannedData,
                                amount_paid: Number(e.target.value) || undefined,
                              })
                            }
                            className="glass-input text-readable"
                          />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="scanPaymentStatus" className="text-readable text-sm">
                            Payment Status
                          </label>
                          <Select
                            value={editableScannedData.payment_status || ""}
                            onValueChange={(value) =>
                              setEditableScannedData({
                                ...editableScannedData,
                                payment_status: value || undefined,
                              })
                            }
                          >
                            <SelectTrigger className="glass-input text-readable">
                              <SelectValue placeholder="Select payment status" />
                            </SelectTrigger>
                            <SelectContent className="glass-card">
                              <SelectItem value="paid">Paid</SelectItem>
                              <SelectItem value="partial">Partially Paid</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="overdue">Overdue</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="scanModeOfPayment" className="text-readable text-sm">
                            Mode of Payment
                          </label>
                          <Select
                            value={editableScannedData.payment_method || ""}
                            onValueChange={(value) =>
                              setEditableScannedData({
                                ...editableScannedData,
                                payment_method: value || undefined,
                              })
                            }
                          >
                            <SelectTrigger className="glass-input text-readable">
                              <SelectValue placeholder="Select payment mode" />
                            </SelectTrigger>
                            <SelectContent className="glass-card">
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="cheque">Cheque</SelectItem>
                              <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                              <SelectItem value="upi">UPI</SelectItem>
                              <SelectItem value="card">Credit/Debit Card</SelectItem>
                              <SelectItem value="online">Online Payment</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {editableScannedData.order_type === "delivery_challan" && (
                          <div className="space-y-2">
                            <label htmlFor="scanAmountCollectedBy" className="text-readable text-sm">
                              Amount Collected By
                            </label>
                            <Select
                              value={editableScannedData.amount_collected_by || ""}
                              onValueChange={(value) =>
                                setEditableScannedData({
                                  ...editableScannedData,
                                  amount_collected_by: value || undefined,
                                })
                              }
                            >
                              <SelectTrigger className="glass-input text-readable">
                                <SelectValue placeholder="Select collector" />
                              </SelectTrigger>
                              <SelectContent className="glass-card">
                                {isLoadingEmployees ? (
                                  <div className="text-sm p-2">Loading employees...</div>
                                ) : employees.length === 0 ? (
                                  <div className="text-sm p-2 text-red-500">No employees found</div>
                                ) : (
                                  employees.map((emp) => (
                                    <SelectItem key={emp.id} value={emp.name}>
                                      {emp.name}
                                    </SelectItem>
                                  ))
                                )}
                                {/* Always keep a few default roles */}
                                <SelectItem value="delivery-boy">Delivery Boy</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 sm:space-x-4">
                        <Button
                          type="button"
                          onClick={handleVerifyAndSave}
                          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Save Order
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleRejectScan}
                          className="glass-button text-readable"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Reject Scan
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

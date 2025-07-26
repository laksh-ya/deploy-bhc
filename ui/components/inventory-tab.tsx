"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Plus,
  Package,
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Edit,
  X,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Batch {
  id: number // Temporary client-side ID for form handling
  batch_number: string
  Expiry: string // Format: YYYY-MM
  quantity: number
}

interface InventoryItem {
  id: string
  name: string
  category: string
  low_stock_threshold: number
  stock_quantity: number
  batches: Batch[]
  created_at?: string
  updated_at?: string
}

interface Pagination {
  current_page: number
  total_pages: number
  total_items: number
  items_per_page: number
  has_next: boolean
  has_prev: boolean
}

interface InventoryListResponse {
  items: InventoryItem[]
  pagination: Pagination
}

export function InventoryTab() {
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [lowStockFilter, setLowStockFilter] = useState<boolean | null>(null)
  const [expiringSoonDays, setExpiringSoonDays] = useState<number | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const itemsPerPage = 10
  const [activeTab, setActiveTab] = useState("all-items")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [newItem, setNewItem] = useState<Partial<InventoryItem>>({
    name: "",
    category: "",
    low_stock_threshold: 0,
    stock_quantity: 0,
    batches: [],
  })
  const [batches, setBatches] = useState<Batch[]>([])

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

  // Fetch inventory from backend based on active tab
  const fetchInventory = async () => {
    try {
      let url = `${apiUrl}/api/v1/inventory`
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(categoryFilter && { category: categoryFilter }),
        ...(lowStockFilter !== null && { low_stock: lowStockFilter.toString() }),
        ...(expiringSoonDays !== null && { expiring_soon_days: expiringSoonDays.toString() }),
      })

      if (activeTab === "low-stock") {
        url = `${apiUrl}/api/v1/low-stock/inventory`
        queryParams.delete("search")
        queryParams.delete("category")
        queryParams.delete("low_stock")
        queryParams.delete("expiring_soon_days")
      } else if (activeTab === "expiring") {
        url = `${apiUrl}/api/v1/expiring-soon/inventory`
        queryParams.delete("search")
        queryParams.delete("category")
        queryParams.delete("low_stock")
        queryParams.set("expiring_soon_days", String(expiringSoonDays || 300))
      }

      const response = await fetch(`${url}?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`,
        },
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || `Failed to fetch inventory: ${response.status}`)
      }

      const data: InventoryListResponse = await response.json()
      setInventoryItems(data.items || [])
      setPagination(data.pagination || null)
    } catch (err: any) {
      console.error("Fetch inventory error:", err)
      alert(err.message || "Failed to fetch inventory items.")
    }
  }

  // UseEffect to trigger fetch when filters, page, or tab change
  useEffect(() => {
    if (activeTab === "low-stock") {
      setLowStockFilter(true);
      setExpiringSoonDays(null);
      setCategoryFilter(null);
      setSearchTerm("");
      setCurrentPage(1); // Reset to page 1 only when switching to low-stock tab
    } else if (activeTab === "expiring") {
      setExpiringSoonDays(30);
      setLowStockFilter(null);
      setCategoryFilter(null);
      setSearchTerm("");
      setCurrentPage(1); // Reset to page 1 only when switching to expiring tab
    } else if (activeTab === "all-items") {
      setLowStockFilter(null);
      setExpiringSoonDays(null);
      // Only reset page if filters change, not on page navigation
      if (
        searchTerm !== "" ||
        categoryFilter !== null ||
        lowStockFilter !== null ||
        expiringSoonDays !== null
      ) {
        setCurrentPage(1);
      }
    }
  
    if (activeTab !== "add-item") {
      fetchInventory();
    }
  }, [searchTerm, categoryFilter, lowStockFilter,  activeTab, currentPage]);

  // Add this new useEffect
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, activeTab]);
  // Create new inventory item
  const createInventoryItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItem.name || !newItem.category) {
      alert("Please fill in all required fields (Name, Category).")
      return
    }
    if (batches.length > 0 && batches.some((batch) => !batch.batch_number || !batch.Expiry || batch.quantity <= 0)) {
      alert("All batches must have a valid batch number, expiry date, and positive quantity (if any batches are added).")
      return
    }

    try {
      const itemData = {
        name: newItem.name,
        category: newItem.category,
        low_stock_threshold: newItem.low_stock_threshold || 0,
        stock_quantity: newItem.stock_quantity || 0,
        batches: batches.map((batch) => ({
          batch_number: batch.batch_number,
          Expiry: batch.Expiry,
          quantity: batch.quantity,
        })),
      }

      const response = await fetch(`${apiUrl}/api/v1/inventory`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`,
        },
        body: JSON.stringify(itemData),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || "Failed to create inventory item")
      }

      await fetchInventory()
      setNewItem({
        name: "",
        category: "",
        low_stock_threshold: 0,
        stock_quantity: 0,
        batches: [],
      })
      setBatches([])
      setActiveTab("all-items")
      alert("Inventory item created successfully.")
    } catch (err: any) {
      console.error("Create inventory error:", err)
      alert(err.message || "Failed to create inventory item.")
    }
  }

  // Update inventory item
  const updateInventoryItem = async (item: InventoryItem) => {
    if (!item.name || !item.category) {
      alert("Please fill in all required fields (Name, Category).")
      return
    }
    if (item.batches.length > 0 && item.batches.some((batch) => !batch.batch_number || !batch.Expiry || batch.quantity <= 0)) {
      alert("All batches must have a valid batch number, expiry date, and positive quantity (if any batches are added).")
      return
    }

    try {
      const updateData = {
        name: item.name,
        category: item.category,
        low_stock_threshold: item.low_stock_threshold,
        stock_quantity: item.stock_quantity,
        batches: item.batches.map((batch) => ({
          batch_number: batch.batch_number,
          Expiry: batch.Expiry,
          quantity: batch.quantity,
        })),
      }

      const response = await fetch(`${apiUrl}/api/v1/inventory/${item.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`,
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || "Failed to update inventory item")
      }

      await fetchInventory()
      alert("Inventory item updated successfully.")
    } catch (err: any) {
      console.error("Update inventory error:", err)
      alert(err.message || "Failed to update inventory item.")
    }
  }

  // Delete inventory item
  const deleteInventoryItem = async (id: string) => {
    try {
      const response = await fetch(`${apiUrl}/api/v1/inventory/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`,
        },
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || "Failed to delete inventory item")
      }

      await fetchInventory()
      alert("Inventory item deleted successfully.")
    } catch (err: any) {
      console.error("Delete inventory error:", err)
      alert(err.message || "Failed to delete inventory item.")
    }
  }

  const categories = [
    "blood tubing",
    "chemical",
    "CITOS",
    "dialysers",
    "diasafe",
    "machine",
    "needle",
    "other item",
    "spare",
    "surgical",
  ]

  const addNewBatch = () => {
    const newBatch: Batch = {
      id: Date.now(),
      batch_number: "",
      Expiry: "",
      quantity: 0,
    }
    setBatches([...batches, newBatch])
  }

  const removeBatch = (id: number) => {
    setBatches(batches.filter((batch) => batch.id !== id))
  }

  const updateBatch = (id: number, field: keyof Batch, value: any) => {
    setBatches(
      batches.map((batch) =>
        batch.id === id ? { ...batch, [field]: value } : batch
      )
    )
  }

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem({
      ...item,
      batches: item.batches.map((batch, index) => ({
        ...batch,
        id: Date.now() + index, // Ensure unique IDs for form handling
      })),
    })
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (editingItem) {
      await updateInventoryItem(editingItem)
      setIsEditDialogOpen(false)
      setEditingItem(null)
    }
  }

  const PaginationControls = () => {
    if (!pagination || pagination.total_items === 0) return null;

    return (
      <div className="flex items-center justify-between mt-6 p-4 glass rounded-lg">
        <div className="text-sm text-readable-muted">
          Page {pagination.current_page} of {pagination.total_pages} ({pagination.total_items} items)
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => p - 1)}
            disabled={!pagination.has_prev}
            className="glass-button"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => p + 1)}
            disabled={!pagination.has_next}
            className="glass-button"
          >
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold heading-primary">Inventory Management</h1>
        <Button
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => setActiveTab("add-item")}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New Item
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="add-item">Add Item</TabsTrigger>
          <TabsTrigger value="all-items">All Items</TabsTrigger>
          <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
          <TabsTrigger value="expiring">Expiring Soon</TabsTrigger>
        </TabsList>

        <TabsContent value="add-item">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center heading-secondary">
                <Package className="w-5 h-5 mr-2" />
                Add Inventory Item
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-6" onSubmit={createInventoryItem}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="itemName" className="heading-tertiary">
                      Item Name
                    </Label>
                    <Input
                      id="itemName"
                      placeholder="Enter item name..."
                      value={newItem.name || ""}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      className="glass-input"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category" className="heading-tertiary">
                      Category
                    </Label>
                    <Select
                      value={newItem.category || ""}
                      onValueChange={(value) => setNewItem({ ...newItem, category: value })}
                    >
                      <SelectTrigger className="glass-input">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lowStockThreshold" className="heading-tertiary">
                      Low Stock Threshold
                    </Label>
                    <Input
                      id="lowStockThreshold"
                      type="number"
                      placeholder="Enter threshold quantity"
                      value={newItem.low_stock_threshold || 0}
                      onChange={(e) =>
                        setNewItem({ ...newItem, low_stock_threshold: Number(e.target.value) })
                      }
                      className="glass-input"
                      min="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stockQuantity" className="heading-tertiary">
                      Stock Quantity
                    </Label>
                    <Input
                      id="stockQuantity"
                      type="number"
                      placeholder="Enter current stock"
                      value={newItem.stock_quantity || 0}
                      onChange={(e) =>
                        setNewItem({ ...newItem, stock_quantity: Number(e.target.value) })
                      }
                      className="glass-input"
                      min="0"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg font-semibold heading-secondary">
                      Batch Information
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="glass-button text-readable hover:scale-105 transition-transform"
                      onClick={addNewBatch}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Batch
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {batches.map((batch) => (
                      <Card
                        key={batch.id}
                        className="glass border border-white/30 dark:border-gray-600/30 hover:shadow-lg transition-all duration-300"
                      >
                        <CardContent className="p-3 sm:p-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="space-y-2">
                              <Label
                                htmlFor={`batchNumber-${batch.id}`}
                                className="heading-tertiary"
                              >
                                Batch Number
                              </Label>
                              <Input
                                id={`batchNumber-${batch.id}`}
                                placeholder="Enter batch number"
                                value={batch.batch_number}
                                onChange={(e) =>
                                  updateBatch(batch.id, "batch_number", e.target.value)
                                }
                                className="glass-input"
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <Label
                                htmlFor={`expiryDate-${batch.id}`}
                                className="heading-tertiary"
                              >
                                Expiry Date (Month/Year)
                              </Label>
                              <Input
                                id={`expiryDate-${batch.id}`}
                                type="month"
                                value={batch.Expiry}
                                onChange={(e) =>
                                  updateBatch(batch.id, "Expiry", e.target.value)
                                }
                                className="glass-input"
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <Label
                                htmlFor={`batchQuantity-${batch.id}`}
                                className="heading-tertiary"
                              >
                                Batch Quantity
                              </Label>
                              <Input
                                id={`batchQuantity-${batch.id}`}
                                type="number"
                                placeholder="Enter batch quantity"
                                value={batch.quantity}
                                onChange={(e) =>
                                  updateBatch(batch.id, "quantity", Number(e.target.value))
                                }
                                className="glass-input"
                                min="0"
                                required
                              />
                            </div>

                            <div className="flex justify-center">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 sm:h-9 sm:w-9 glass-button text-red-500 hover:text-red-600 hover:scale-110 transition-all"
                                onClick={() => removeBatch(batch.id)}
                              >
                                <X className="w-3 h-3 sm:w-4 sm:h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                  Add Item
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all-items">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="heading-secondary">All Inventory Items</CardTitle>
                <div className="flex space-x-2">
                  <div className="flex-1 sm:w-64">
                    <Input
                      placeholder="Search inventory..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="glass-input"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowFilters(!showFilters)}
                    className="glass-button"
                  >
                    <Filter className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {showFilters && (
                <div className="mt-4 p-4 glass rounded-lg">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Select
                      value={categoryFilter || ""}
                      onValueChange={(value) => setCategoryFilter(value || null)}
                    >
                      <SelectTrigger className="glass-input">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Categories</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={lowStockFilter === null ? "" : lowStockFilter.toString()}
                      onValueChange={(value) =>
                        setLowStockFilter(value === "" ? null : value === "true")
                      }
                    >
                      <SelectTrigger className="glass-input">
                        <SelectValue placeholder="Stock Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All</SelectItem>
                        <SelectItem value="true">Low Stock</SelectItem>
                        <SelectItem value="false">Normal Stock</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder="Expiring Soon Days"
                      value={expiringSoonDays || ""}
                      onChange={(e) =>
                        setExpiringSoonDays(e.target.value ? Number(e.target.value) : null)
                      }
                      className="glass-input"
                      min="0"
                    />
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inventoryItems.map((item) => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold heading-tertiary">{item.name}</h3>
                        <div className="flex space-x-2">
                          {item.stock_quantity <= item.low_stock_threshold && (
                            <Badge variant="destructive" className="text-xs">
                              Low Stock
                            </Badge>
                          )}
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 glass-button"
                            onClick={() => handleEditItem(item)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 glass-button text-red-500 hover:text-red-600"
                            onClick={() => {
                              setItemToDelete(item.id);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>

                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-readable-muted">Item ID:</span>
                          <span className="heading-tertiary">{item.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-readable-muted">Category:</span>
                          <span className="capitalize heading-tertiary">{item.category}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-readable-muted">Stock Quantity:</span>
                          <span
                            className={`heading-tertiary ${
                              item.stock_quantity <= item.low_stock_threshold
                                ? "text-red-600 font-medium"
                                : ""
                            }`}
                          >
                            {item.stock_quantity}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-readable-muted">Low Stock Threshold:</span>
                          <span className="heading-tertiary">{item.low_stock_threshold}</span>
                        </div>
                        <div className="mt-3">
                          <span className="text-readable-muted text-xs">Batches:</span>
                          <div className="mt-1 space-y-1">
                            {item.batches.map((batch, index) => (
                              <div
                                key={`${item.id}-${batch.id || index}`}
                                className="text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded"
                              >
                                <div className="flex justify-between">
                                  <span className="font-medium">{batch.batch_number}</span>
                                  <span>{batch.quantity} units</span>
                                </div>
                                <div className="text-readable-muted">
                                  Expires: {new Date(batch.Expiry).toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit' })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {activeTab !== "expiring" && <PaginationControls />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="low-stock">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center heading-secondary">
                <AlertTriangle className="w-5 h-5 text-orange-500 mr-2" />
                Low Stock Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {inventoryItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800"
                  >
                    <div>
                      <h3 className="font-medium heading-tertiary">{item.name}</h3>
                      <p className="text-sm text-readable-muted capitalize">{item.category}</p>
                      <p className="text-xs text-readable-muted">
                        Threshold: {item.low_stock_threshold} units
                      </p>
                    </div>
                    <div className="text-right flex items-center space-x-2">
                      <Badge
                        variant="destructive"
                        className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                      >
                        {item.stock_quantity} left
                      </Badge>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 glass-button"
                        onClick={() => handleEditItem(item)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <PaginationControls />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expiring">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <CardTitle className="flex items-center heading-secondary">
                    <Calendar className="w-5 h-5 text-red-500 mr-2" />
                    Items Expiring Soon
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="expiringDays" className="whitespace-nowrap">Next</Label>
                    <Input
                      id="expiringDays"
                      type="number"
                      value={expiringSoonDays || 30}
                      onChange={(e) => setExpiringSoonDays(Number(e.target.value) || 30)}
                      className="w-24 glass-input"
                    />
                    <Label htmlFor="expiringDays">Days</Label>
                    <Button size="sm" onClick={fetchInventory} className="glass-button bg-blue-600 text-white hover:bg-blue-700">
                      Apply
                    </Button>
                  </div>
                </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {inventoryItems.flatMap((item) =>
                  item.batches.map((batch, index) => (
                    <div
                      key={`${item.id}-${batch.id || index}`}
                      className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800"
                    >
                      <div>
                        <h3 className="font-medium heading-tertiary">{item.name}</h3>
                        <p className="text-sm text-readable-muted capitalize">{item.category}</p>
                        <p className="text-xs text-readable-muted">Batch: {batch.batch_number}</p>
                      </div>
                      <div className="text-right flex items-center space-x-2">
                        <Badge
                          variant="destructive"
                          className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        >
                          Expires: {new Date(batch.Expiry).toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit' })}
                        </Badge>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 glass-button"
                          onClick={() => handleEditItem(item)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {activeTab !== "expiring" && <PaginationControls />}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="glass-card max-w-2xl">
          <DialogHeader>
            <DialogTitle className="heading-secondary">Edit Inventory Item</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="heading-tertiary">Item Name</Label>
                  <Input
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="glass-input"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="heading-tertiary">Category</Label>
                  <Select
                    value={editingItem.category}
                    onValueChange={(value) => setEditingItem({ ...editingItem, category: value })}
                  >
                    <SelectTrigger className="glass-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-card">
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="heading-tertiary">Stock Quantity</Label>
                  <Input
                    type="number"
                    value={editingItem.stock_quantity}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, stock_quantity: Number(e.target.value) })
                    }
                    className="glass-input"
                    min="0"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="heading-tertiary">Low Stock Threshold</Label>
                  <Input
                    type="number"
                    value={editingItem.low_stock_threshold}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        low_stock_threshold: Number(e.target.value),
                      })
                    }
                    className="glass-input"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-lg font-semibold heading-secondary">Batches</Label>
                {editingItem.batches.map((batch, index) => (
                  <div
                    key={`${editingItem.id}-${batch.id || index}`}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 glass rounded-lg"
                  >
                    <div className="space-y-2">
                      <Label className="heading-tertiary">Batch Number</Label>
                      <Input
                        value={batch.batch_number}
                        onChange={(e) => {
                          const newBatches = [...editingItem.batches]
                          newBatches[index].batch_number = e.target.value
                          setEditingItem({ ...editingItem, batches: newBatches })
                        }}
                        className="glass-input"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="heading-tertiary">Expiry Date (Month/Year)</Label>
                      <Input
                        type="month"
                        value={batch.Expiry}
                        onChange={(e) => {
                          const newBatches = [...editingItem.batches]
                          newBatches[index].Expiry = e.target.value
                          setEditingItem({ ...editingItem, batches: newBatches })
                        }}
                        className="glass-input"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="heading-tertiary">Quantity</Label>
                      <Input
                        type="number"
                        value={batch.quantity}
                        onChange={(e) => {
                          const newBatches = [...editingItem.batches]
                          newBatches[index].quantity = Number(e.target.value)
                          setEditingItem({ ...editingItem, batches: newBatches })
                        }}
                        className="glass-input"
                        min="0"
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  className="glass-button"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="glass-card max-w-md">
          <DialogHeader>
            <DialogTitle className="heading-secondary">Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-readable">
              Are you sure you want to delete this inventory item? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setItemToDelete(null);
                }}
                className="glass-button"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (itemToDelete) {
                    await deleteInventoryItem(itemToDelete);
                    setIsDeleteDialogOpen(false);
                    setItemToDelete(null);
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
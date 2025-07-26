"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Truck, Plus, History, Phone, ChevronRight, ChevronLeft, Edit, Package, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// --- TYPES AND CONSTANTS ---
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"

type Supplier = {
  id: string
  name: string
  address?: string
  contact?: string
  due: number
}

type PaginationInfo = {
  current_page: number
  total_pages: number
  total_items: number
}

// --- MAIN COMPONENT ---
export function SuppliersTab() {
  const [activeTab, setActiveTab] = useState("all-suppliers")
  const [loading, setLoading] = useState(false)

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  
  const [selectedSupplierOrders, setSelectedSupplierOrders] = useState<Supplier | null>(null)
  const [isOrdersDialogOpen, setIsOrdersDialogOpen] = useState(false)
  const [orders, setOrders] = useState<any[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  const [newSupplier, setNewSupplier] = useState<Partial<Supplier>>({})

  // --- DATA FETCHING ---
  const fetchSuppliers = useCallback(async (page: number, search: string) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: "9", search })

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/suppliers?${params.toString()}`, {
        headers: { "X-User-ID": "system" },
      })
      if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`)
      
      const data = await res.json()
      setSuppliers(data.items ?? [])
      setPagination(data.pagination ?? null)
    } catch (err: any) {
      alert(`Failed to load suppliers: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [])
  
  useEffect(() => {
    // Fetch data whenever the active view (all-suppliers or order-history) changes
    if (activeTab === 'all-suppliers' || activeTab === 'order-history') {
      fetchSuppliers(currentPage, searchTerm)
    }
  }, [activeTab, currentPage, searchTerm, fetchSuppliers])

  // --- EVENT HANDLERS ---
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setCurrentPage(1)
    setSearchTerm("")
    setSuppliers([])
    setPagination(null)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && (!pagination || newPage <= pagination.total_pages)) {
        setCurrentPage(newPage)
    }
  }

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = { ...newSupplier, due: Number(newSupplier.due || 0) }
      const res = await fetch(`${API_BASE_URL}/api/v1/suppliers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-ID": "system" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json()).detail || "Failed to add supplier")
      
      alert("Supplier added successfully!")
      setNewSupplier({})
      handleTabChange("all-suppliers")
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenEditDialog = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingSupplier) return
    setLoading(true)
    try {
      const payload = { name: editingSupplier.name, contact: editingSupplier.contact, address: editingSupplier.address, due: Number(editingSupplier.due || 0) };
      const res = await fetch(`${API_BASE_URL}/api/v1/suppliers/${editingSupplier.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-User-ID": "system" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json()).detail || "Failed to update supplier")
      
      alert("Supplier updated successfully!")
      setIsEditDialogOpen(false)
      fetchSuppliers(currentPage, searchTerm)
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleViewOrders = async (supplier: Supplier) => {
    setSelectedSupplierOrders(supplier)
    setIsOrdersDialogOpen(true)
    setOrdersLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/suppliers/${supplier.id}/history?limit=50`, {
        headers: { "X-User-ID": "system" },
      })
      if (!res.ok) throw new Error(`API error: ${res.status}`)
      const data = await res.json()
      setOrders(data.orders ?? [])
    } catch (err: any) {
      alert("Failed to load orders. Please try again.")
    } finally {
      setOrdersLoading(false)
    }
  }

  // --- RENDER HELPER ---
  const PaginationControls = () => {
    if (!pagination || pagination.total_items === 0) return null
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between mt-6 p-4 glass rounded-lg gap-4">
        <div className="text-sm text-readable-muted">
          Page {pagination.current_page} of {pagination.total_pages} ({pagination.total_items} total)
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="glass-button">
            <ChevronLeft className="w-4 h-4" /> Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === pagination.total_pages} className="glass-button">
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold heading-primary">Suppliers Management</h1>
        <Button onClick={() => setActiveTab("add-supplier")} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Add New Supplier
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="add-supplier">Add Supplier</TabsTrigger>
          <TabsTrigger value="all-suppliers">All Suppliers</TabsTrigger>
          <TabsTrigger value="order-history">Order History</TabsTrigger>
        </TabsList>

        <TabsContent value="add-supplier">
          <Card>
            <CardHeader><CardTitle className="flex items-center heading-secondary"><Truck className="w-5 h-5 mr-2" /> Add New Supplier</CardTitle></CardHeader>
            <CardContent>
              <form className="space-y-6" onSubmit={handleAddSupplier}>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><Label htmlFor="name">Supplier Name</Label><Input id="name" value={newSupplier.name || ''} onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})} placeholder="Required" required/></div>
                    <div className="space-y-2"><Label>Supplier ID</Label><Input value="Auto-generated" readOnly className="bg-gray-100 dark:bg-gray-800"/></div>
                    <div className="space-y-2"><Label htmlFor="contact">Contact Number</Label><Input id="contact" value={newSupplier.contact || ''} onChange={(e) => setNewSupplier({...newSupplier, contact: e.target.value})} placeholder="Optional"/></div>
                    <div className="space-y-2"><Label htmlFor="due">Initial Due (₹)</Label><Input id="due" type="number" value={newSupplier.due || ''} onChange={(e) => setNewSupplier({...newSupplier, due: Number(e.target.value)})} placeholder="Optional"/></div>
                    <div className="space-y-2 md:col-span-2"><Label htmlFor="address">Address</Label><Textarea id="address" value={newSupplier.address || ''} onChange={(e) => setNewSupplier({...newSupplier, address: e.target.value})} placeholder="Optional"/></div>
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-700">
                    {loading ? <Loader2 className="animate-spin" /> : "Add Supplier"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {(activeTab === "all-suppliers" || activeTab === "order-history") && (
            <TabsContent value={activeTab} forceMount>
                <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <CardTitle className="heading-secondary">
                        {activeTab === 'all-suppliers' && 'All Suppliers'}
                        {activeTab === 'order-history' && 'Select a Supplier to View History'}
                    </CardTitle>
                    <Input placeholder="Search suppliers..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full sm:w-64 glass-input"/>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div> : suppliers.length > 0 ? (
                    <div className={activeTab === 'order-history' ? "space-y-4" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"}>
                        {suppliers.map((supplier) => (
                        <Card 
                            key={supplier.id} 
                            className={`hover:shadow-md transition-shadow ${activeTab === 'order-history' ? 'cursor-pointer' : ''}`}
                            onClick={activeTab === 'order-history' ? () => handleViewOrders(supplier) : undefined}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="font-semibold heading-tertiary">{supplier.name}</h3>
                                    <div className="flex space-x-2">
                                        {supplier.due > 0 && <Badge variant="destructive">Dues</Badge>}
                                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleOpenEditDialog(supplier); }}><Edit className="w-4 h-4" /></Button>
                                        {activeTab !== 'order-history' && <Button variant="outline" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleViewOrders(supplier); }}><Package className="w-4 h-4" /></Button>}
                                    </div>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center"><Phone className="w-4 h-4 text-readable-muted mr-2" /><span className="text-readable-muted">{supplier.contact || "-"}</span></div>
                                    <div className="text-xs text-readable-muted pt-2 border-t mt-2"><p>Supplier ID: {supplier.id}</p></div>
                                    {supplier.due > 0 && (<div className="flex justify-between pt-2"><span className="font-medium text-red-600">Dues:</span><span className="font-medium text-red-600">₹{supplier.due.toLocaleString()}</span></div>)}
                                </div>
                            </CardContent>
                        </Card>
                        ))}
                    </div>
                    ) : <div className="text-center py-16 text-readable-muted">No suppliers found.</div>}
                    <PaginationControls />
                </CardContent>
                </Card>
            </TabsContent>
        )}
      </Tabs>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="glass-card max-w-lg sm:max-w-xl md:max-w-2xl">
          <DialogHeader><DialogTitle className="heading-secondary">Edit Supplier: {editingSupplier?.name}</DialogTitle></DialogHeader>
          {editingSupplier && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Name</Label><Input value={editingSupplier.name} onChange={(e) => setEditingSupplier({ ...editingSupplier, name: e.target.value })}/></div>
                <div className="space-y-2"><Label>Supplier ID</Label><Input value={editingSupplier.id} readOnly className="bg-gray-100 dark:bg-gray-800"/></div>
                <div className="space-y-2"><Label>Contact</Label><Input value={editingSupplier.contact || ''} onChange={(e) => setEditingSupplier({ ...editingSupplier, contact: e.target.value })}/></div>
                <div className="space-y-2"><Label>Due (₹)</Label><Input type="number" value={editingSupplier.due} onChange={(e) => setEditingSupplier({ ...editingSupplier, due: Number(e.target.value) })}/></div>
                <div className="space-y-2 md:col-span-2"><Label>Address</Label><Textarea value={editingSupplier.address || ''} onChange={(e) => setEditingSupplier({ ...editingSupplier, address: e.target.value })}/></div>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveEdit} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : 'Save Changes'}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <Dialog open={isOrdersDialogOpen} onOpenChange={setIsOrdersDialogOpen}>
        <DialogContent className="glass-card max-w-lg sm:max-w-xl md:max-w-2xl">
          <DialogHeader><DialogTitle className="heading-secondary">Purchase Orders for {selectedSupplierOrders?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
            {ordersLoading ? <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin"/></div> :
            !orders.length ? <p className="text-center text-readable-muted py-8">No purchase orders found.</p> :
            orders.map((order: any) => (
              <Card key={order.invoice_number} className="glass">
                <CardContent className="p-4 text-sm">
                  <p><b>Invoice #:</b> {order.invoice_number}</p>
                  <p className="text-readable-muted"><b>Date:</b> {new Date(order.order_date).toLocaleDateString()}</p>
                  <p className="text-readable-muted"><b>Total:</b> ₹{order.total_amount?.toLocaleString()}</p>
                  <p className="text-readable-muted"><b>Status:</b> <Badge>{order.payment_status}</Badge></p>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
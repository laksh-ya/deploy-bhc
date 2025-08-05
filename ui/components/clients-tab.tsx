"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Plus, History, DollarSign, Phone, Mail, ChevronRight, ChevronLeft, Edit, Package, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// --- TYPES AND CONSTANTS ---
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://deploy-bhc.onrender.com"

type Client = {
  id: string
  name: string
  address?: string
  PAN?: string
  GST?: string
  POC_name?: string
  POC_contact?: string
  due_amount: number
}

type PaginationInfo = {
  current_page: number
  total_pages: number
  total_items: number
}

// --- MAIN COMPONENT ---
export function ClientsTab() {
  const [activeTab, setActiveTab] = useState("all-clients")
  const [loading, setLoading] = useState(false)
  
  const [clients, setClients] = useState<Client[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedClientOrders, setSelectedClientOrders] = useState<Client | null>(null)
  const [isOrdersDialogOpen, setIsOrdersDialogOpen] = useState(false)
  const [orders, setOrders] = useState<any[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  const [newClient, setNewClient] = useState<Partial<Client>>({})

  // --- DATA FETCHING ---
  const fetchClients = useCallback(async (page: number, search: string, tab: string) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: "9", search })
    if (tab === 'client-dues') {
        params.set('order_by', 'due_amount');
        params.set('order_direction', 'desc');
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/clients?${params.toString()}`, {
        headers: { "X-User-ID": "system" },
      })
      if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`)
      const data = await res.json()
      setClients(tab === 'client-dues' ? (data.items ?? []).filter((c: Client) => c.due_amount > 0) : data.items ?? [])
      setPagination(data.pagination ?? null)
    } catch (err: any) {
      alert(`Failed to load clients: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [])
  
  // --- SEARCH FIX: This new useEffect resets the page to 1 when the search term changes ---
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // This useEffect now fetches data when the page or tab changes.
  useEffect(() => {
    fetchClients(currentPage, searchTerm, activeTab)
  }, [activeTab, currentPage, searchTerm, fetchClients])

  // --- EVENT HANDLERS ---
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setCurrentPage(1)
    setSearchTerm("")
    setClients([])
    setPagination(null)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && (!pagination || newPage <= pagination.total_pages)) {
        setCurrentPage(newPage)
    }
  }

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...newClient, due_amount: Number(newClient.due_amount || 0) };
      const res = await fetch(`${API_BASE_URL}/api/v1/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-ID": "system" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Failed to add client");
      alert("Client added successfully!");
      setNewClient({});
      handleTabChange("all-clients");
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditDialog = (client: Client) => {
    setEditingClient(client)
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingClient) return;
    setLoading(true);
    try {
        const payload = {
            name: editingClient.name,
            PAN: editingClient.PAN,
            GST: editingClient.GST,
            POC_name: editingClient.POC_name,
            POC_contact: editingClient.POC_contact,
            address: editingClient.address,
            due_amount: Number(editingClient.due_amount || 0),
        };
        const res = await fetch(`${API_BASE_URL}/api/v1/clients/${editingClient.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "X-User-ID": "system" },
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).detail || "Failed to update client");
        alert("Client updated successfully!");
        setIsEditDialogOpen(false);
        fetchClients(currentPage, searchTerm, activeTab);
    } catch (err: any) {
        alert(`Error: ${err.message}`);
    } finally {
        setLoading(false);
    }
  };

  const handleViewOrders = async (client: Client) => {
    setSelectedClientOrders(client)
    setIsOrdersDialogOpen(true)
    setOrdersLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/clients/${client.id}/history?limit=50`, {
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

  // --- RENDER ---
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold heading-primary">Clients Management</h1>
        <Button onClick={() => handleTabChange("add-client")} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" /> Add New Client
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="add-client">Add Client</TabsTrigger>
          <TabsTrigger value="all-clients">All Clients</TabsTrigger>
          <TabsTrigger value="order-history">Order History</TabsTrigger>
          <TabsTrigger value="client-dues">Client Dues</TabsTrigger>
        </TabsList>

        <TabsContent value="add-client">
            {/* Add Client Form JSX is unchanged */}
            <Card>
                <CardHeader><CardTitle className="flex items-center heading-secondary"><Users className="w-5 h-5 mr-2" /> Add New Client</CardTitle></CardHeader>
                <CardContent>
                <form className="space-y-6" onSubmit={handleAddClient}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2"><Label htmlFor="name">Client Name</Label><Input id="name" value={newClient.name || ''} onChange={(e) => setNewClient({...newClient, name: e.target.value})} placeholder="Required" required/></div>
                        <div className="space-y-2"><Label>Client ID</Label><Input value="Auto-generated" readOnly className="bg-gray-100 dark:bg-gray-800"/></div>
                        <div className="space-y-2"><Label htmlFor="PAN">PAN Number</Label><Input id="PAN" value={newClient.PAN || ''} onChange={(e) => setNewClient({...newClient, PAN: e.target.value})} placeholder="Optional"/></div>
                        <div className="space-y-2"><Label htmlFor="GST">GST Number</Label><Input id="GST" value={newClient.GST || ''} onChange={(e) => setNewClient({...newClient, GST: e.target.value})} placeholder="Optional"/></div>
                        <div className="space-y-2"><Label htmlFor="POC_name">Contact Person Name</Label><Input id="POC_name" value={newClient.POC_name || ''} onChange={(e) => setNewClient({...newClient, POC_name: e.target.value})} placeholder="Optional"/></div>
                        <div className="space-y-2"><Label htmlFor="POC_contact">Contact Person Number</Label><Input id="POC_contact" value={newClient.POC_contact || ''} onChange={(e) => setNewClient({...newClient, POC_contact: e.target.value})} placeholder="Optional"/></div>
                        <div className="space-y-2 md:col-span-2"><Label htmlFor="address">Address</Label><Textarea id="address" value={newClient.address || ''} onChange={(e) => setNewClient({...newClient, address: e.target.value})} placeholder="Optional"/></div>
                        <div className="space-y-2"><Label htmlFor="due_amount">Initial Due Amount (₹)</Label><Input id="due_amount" type="number" value={newClient.due_amount || ''} onChange={(e) => setNewClient({...newClient, due_amount: Number(e.target.value)})} placeholder="Optional, e.g., 5000"/></div>
                    </div>
                    <Button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-700">
                        {loading ? <Loader2 className="animate-spin" /> : "Add Client"}
                    </Button>
                </form>
                </CardContent>
            </Card>
        </TabsContent>

        {(activeTab === "all-clients" || activeTab === "order-history" || activeTab === "client-dues") && (
          <TabsContent value={activeTab} forceMount>
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <CardTitle className="heading-secondary">
                    {activeTab === 'all-clients' && 'All Clients'}
                    {activeTab === 'order-history' && 'Select a Client to View History'}
                    {activeTab === 'client-dues' && 'Clients with Dues'}
                  </CardTitle>
                  <Input placeholder="Search clients..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full sm:w-64 glass-input"/>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div> : clients.length > 0 ? (
                  <div className={activeTab !== 'order-history' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
                    {clients.map((client) => (
                      <Card 
                        key={client.id}
                        className={`hover:shadow-md transition-shadow ${activeTab === 'order-history' ? 'cursor-pointer' : ''} ${activeTab === 'client-dues' ? 'bg-red-50 dark:bg-red-950/30 border-red-200' : ''}`}
                        onClick={activeTab === 'order-history' ? () => handleViewOrders(client) : undefined}
                      >
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                                <h3 className="font-semibold heading-tertiary">{client.name}</h3>
                                <div className="flex space-x-2">
                                {client.due_amount > 0 && <Badge variant="destructive">Dues</Badge>}
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleOpenEditDialog(client); }}><Edit className="w-4 h-4" /></Button>
                                {activeTab !== 'order-history' && <Button variant="outline" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleViewOrders(client); }}><Package className="w-4 h-4" /></Button>}
                                </div>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center"><Mail className="w-4 h-4 text-readable-muted mr-2" /><span className="text-readable-muted">{client.POC_name || "-"}</span></div>
                                <div className="flex items-center"><Phone className="w-4 h-4 text-readable-muted mr-2" /><span className="text-readable-muted">{client.POC_contact || "-"}</span></div>
                                <div className="text-xs text-readable-muted pt-2 border-t mt-2"><p>Client ID: {client.id}</p></div>
                                {client.due_amount > 0 && (<div className="flex justify-between pt-2"><span className="font-medium text-red-600">Dues:</span><span className="font-medium text-red-600">₹{client.due_amount.toLocaleString()}</span></div>)}
                            </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : <div className="text-center py-16 text-readable-muted">No clients found.</div>}
                <PaginationControls />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
      
      {/* Dialogs are unchanged */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="glass-card max-w-lg sm:max-w-xl md:max-w-2xl">
          <DialogHeader><DialogTitle className="heading-secondary">Edit Client: {editingClient?.name}</DialogTitle></DialogHeader>
          {editingClient && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Name</Label><Input value={editingClient.name} onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}/></div>
                <div className="space-y-2"><Label>Client ID</Label><Input value={editingClient.id} readOnly className="bg-gray-100 dark:bg-gray-800"/></div>
                <div className="space-y-2"><Label>PAN</Label><Input value={editingClient.PAN || ''} onChange={(e) => setEditingClient({ ...editingClient, PAN: e.target.value })}/></div>
                <div className="space-y-2"><Label>GST</Label><Input value={editingClient.GST || ''} onChange={(e) => setEditingClient({ ...editingClient, GST: e.target.value })}/></div>
                <div className="space-y-2"><Label>Contact Person</Label><Input value={editingClient.POC_name || ''} onChange={(e) => setEditingClient({ ...editingClient, POC_name: e.target.value })}/></div>
                <div className="space-y-2"><Label>Contact Number</Label><Input value={editingClient.POC_contact || ''} onChange={(e) => setEditingClient({ ...editingClient, POC_contact: e.target.value })}/></div>
                <div className="space-y-2 md:col-span-2"><Label>Address</Label><Textarea value={editingClient.address || ''} onChange={(e) => setEditingClient({ ...editingClient, address: e.target.value })}/></div>
                <div className="space-y-2"><Label>Due Amount (₹)</Label><Input type="number" value={editingClient.due_amount} onChange={(e) => setEditingClient({ ...editingClient, due_amount: Number(e.target.value) })}/></div>
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
          <DialogHeader><DialogTitle className="heading-secondary">Orders for {selectedClientOrders?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
            {ordersLoading ? <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin"/></div> :
            !orders.length ? <p className="text-center text-readable-muted py-8">No orders found.</p> :
            orders.map((order: any) => (
              <Card key={order.invoice_number || order.challan_number} className="glass">
                <CardContent className="p-4 text-sm">
                  <p><b>ID:</b> {order.invoice_number || order.challan_number}</p>
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
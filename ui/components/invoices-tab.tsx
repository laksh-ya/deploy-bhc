// "use client"
// import { useState, useEffect } from "react"
// import { Button } from "@/components/ui/button"
// import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
// import { Input } from "@/components/ui/input"
// import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
// import { Textarea } from "@/components/ui/textarea"
// import { useNotifications } from "@/components/notifications-provider"
// import { ChevronLeft, ChevronRight, Eye, Trash2 } from "lucide-react"
// import { useMobile } from "@/hooks/use-mobile"
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogDescription,
//   DialogFooter,
//   DialogClose,
// } from "@/components/ui/dialog"
// import { Label } from "@/components/ui/label"

// interface InvoicesTabProps {
//   user?: {
//     username: string
//   }
// }

// interface Order {
//   id: string
//   invoice_number: string
//   client_name?: string
//   client_id?: string
//   supplier_name?: string
//   supplier_id?: string
//   items: {
//     item_name: string
//     batch_number: string
//     expiry: string
//     quantity: number
//     price: number
//     tax_percent: number
//   }[]
//   total_tax: number
//   total_quantity: number
//   total_amount: number
//   order_type: string
//   order_date: string
//   status: string
//   challan_number:string
//   remarks: string
//   created_at: string
//   updated_at: string
//   updated_by: string
//   created_by: string
//   document_type: "purchase" | "sales-invoice" | "delivery-challan"
//   amount_paid?: number
//   payment_method?: string
//   payment_status?: string
//   amount_collected_by?: string
//   link?: string
// }

// interface PaginationMeta {
//   current_page: number
//   total_pages: number
//   total_items: number
//   items_per_page: number
//   has_next: boolean
//   has_prev: boolean
// }

// interface OrderListResponse {
//   orders: Order[]
//   pagination?: PaginationMeta
//   count?: number
//   has_next?: boolean
//   next_cursor?: string | null
//   total_count?: number | null
// }

// type DocumentType = "purchase" | "sales-invoice" | "delivery-challan"
// type ApiOrderType = "purchase" | "sale" | "delivery_challan"

// export function InvoicesTab({ user }: InvoicesTabProps) {
//   const currentUsername = user?.username ?? "admin"
//   const [currentPage, setCurrentPage] = useState(1)
//   const [searchTerm, setSearchTerm] = useState("")
//   const { addNotification } = useNotifications()
//   const isMobile = useMobile()
//   const itemsPerPage = 10

//   const [viewingOrder, setViewingOrder] = useState<Order | null>(null)
//   const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
//   const [editingOrder, setEditingOrder] = useState<Order | null>(null)
//   const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
//   const [orders, setOrders] = useState<Order[]>([])
//   const [pagination, setPagination] = useState<PaginationMeta | null>(null);
//   const [isLoading, setIsLoading] = useState(false)
//   const [error, setError] = useState<string | null>(null)
//   const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
//   const [orderToDelete, setOrderToDelete] = useState<string | null>(null)

//   const [selectedDocumentType, setSelectedDocumentType] = useState<
//     "purchase" | "sales-invoice" | "delivery-challan" | null
//   >(null)

//   // Map frontend document_type to API order_type
//   const documentTypeToApiOrderType = (
//     docType: "purchase" | "sales-invoice" | "delivery-challan" | null
//   ): "purchase" | "sale" | "delivery_challan" | undefined => {
//     if (!docType) return undefined
//     return docType === "sales-invoice"
//       ? "sale"
//       : docType === "delivery-challan"
//       ? "delivery_challan"
//       : "purchase"
//   }

//   // Map API order_type to frontend document_type
//   const apiOrderTypeToDocumentType = (
//     orderType: string
//   ): "purchase" | "sales-invoice" | "delivery-challan" => {
//     return orderType === "sale"
//       ? "sales-invoice"
//       : orderType === "delivery_challan"
//       ? "delivery-challan"
//       : "purchase"
//   }

//   // Fetch orders from FastAPI
//   const fetchOrders = async () => {
//     setIsLoading(true)
//     setError(null)
//     try {
//       const queryParams = new URLSearchParams({
//         page: currentPage.toString(),
//         limit: itemsPerPage.toString(),
//         include_total_count: "true",
//         ...(searchTerm && { search: searchTerm }),
//         ...(selectedDocumentType && { order_type: documentTypeToApiOrderType(selectedDocumentType) }),
//       })

//       const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000" // Fallback to localhost:8000
//       console.log("Fetching orders with URL:", `${apiUrl}/api/v1/orders?${queryParams}`)
//       console.log("Auth token:", localStorage.getItem("authToken"))

//       const response = await fetch(`${apiUrl}/api/v1/orders?${queryParams}`, {
//         headers: {
//           Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`,
//         },
//       })

//       if (!response.ok) {
//         const errorData = await response.json().catch(() => ({}))
//         console.error("API error:", response.status, errorData)
//         throw new Error(`HTTP error! status: ${response.status}, detail: ${errorData.detail || "Unknown error"}`)
//       }

//       const data: OrderListResponse = await response.json()
//       console.log("API response:", data)

//       // Normalize API response
//       const normalizedOrders = data.orders.map((order) => ({
//         ...order,
//         document_type: apiOrderTypeToDocumentType(order.order_type),
//         invoice_number: order.order_type === "delivery_challan" ? order.challan_number || order.invoice_number : order.invoice_number,
//       }))
//       setOrders(normalizedOrders)

//       // Derive total orders from new pagination meta, or fallbacks
//       setPagination(data.pagination ?? null)

//       // Update current page in case backend sent different value (e.g., when clamping)
//       if (data.pagination?.current_page && data.pagination.current_page !== currentPage) {
//         setCurrentPage(data.pagination.current_page)
//       }
//     } catch (err: any) {
//       console.error("Fetch orders error:", err)
//       setError(`Failed to fetch orders: ${err.message}`)
//       addNotification({
//         title: "Error",
//         message: `Failed to fetch orders: ${err.message}`,
//         type: "error",
//       })
//     } finally {
//       setIsLoading(false)
//     }
//   }

//   // Update updateOrder function
//   const updateOrder = async (order: Order) => {
//     try {
//       const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
//       const response = await fetch(`${apiUrl}/api/v1/orders/${order.id}`, {
//         method: "PUT",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`,
//         },
//         body: JSON.stringify({
//           invoice_number: order.order_type === "delivery_challan" ? undefined : order.invoice_number,
//           challan_number: order.order_type === "delivery_challan" ? order.invoice_number : undefined,
//           client_name: order.client_name,
//           supplier_name: order.supplier_name,
//           order_date: order.order_date,
//           status: order.status,
//           payment_status: order.payment_status,
//           amount_paid: order.amount_paid,
//           payment_method: order.payment_method,
//           amount_collected_by: order.amount_collected_by,
//           remarks: order.remarks,
//           updated_by: currentUsername,
//         }),
//       })

//       if (!response.ok) {
//         const errorData = await response.json().catch(() => ({}))
//         throw new Error(`HTTP error! status: ${response.status}, detail: ${errorData.detail || "Unknown error"}`)
//       }

//       addNotification({
//         title: "Order Updated",
//         message: `Order ${order.invoice_number} has been updated successfully.`,
//         type: "success",
//       })
//     } catch (err: any) {
//       console.error("Update order error:", err)
//       addNotification({
//         title: "Error",
//         message: `Failed to update order: ${err.message}`,
//         type: "error",
//       })
//       throw err
//     }
//   }

//   // Update updatePaymentStatus function
//   const updatePaymentStatus = async (order: Order, paymentStatus: string) => {
//     try {
//       const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
//       const response = await fetch(`${apiUrl}/api/v1/orders/${order.id}/payment-status`, {
//         method: "PUT",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`,
//         },
//         body: JSON.stringify({
//           payment_status: paymentStatus,
//           amount_paid: order.amount_paid,
//           payment_method: order.payment_method,
//           amount_collected_by: order.amount_collected_by,
//         }),
//       })

//       if (!response.ok) {
//         const errorData = await response.json().catch(() => ({}))
//         throw new Error(`HTTP error! status: ${response.status}, detail: ${errorData.detail || "Unknown error"}`)
//       }

//       addNotification({
//         title: "Payment Status Updated",
//         message: `Payment status for ${order.invoice_number} updated to ${paymentStatus}.`,
//         type: "success",
//       })
//     } catch (err: any) {
//       console.error("Update payment status error:", err)
//       addNotification({
//         title: "Error",
//         message: `Failed to update payment status: ${err.message}`,
//         type: "error",
//       })
//       throw err
//     }
//   }

//   // Update deleteOrder function
//   const deleteOrder = async (orderId: string) => {
//     try {
//       const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
//       const response = await fetch(`${apiUrl}/api/v1/orders/${orderId}`, {
//         method: "DELETE",
//         headers: {
//           Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`,
//         },
//       })

//       if (!response.ok) {
//         const errorData = await response.json().catch(() => ({}))
//         throw new Error(`HTTP error! status: ${response.status}, detail: ${errorData.detail || "Unknown error"}`)
//       }

//       addNotification({
//         title: "Order Deleted",
//         message: `Order ${orderId} has been deleted successfully.`,
//         type: "success",
//       })

//       // Refresh orders after deletion
//       fetchOrders()
//     } catch (err: any) {
//       console.error("Delete order error:", err)
//       addNotification({
//         title: "Error",
//         message: `Failed to delete order: ${err.message}`,
//         type: "error",
//       })
//     }
//   }

//   // Fetch orders when page, search term, or document type changes
//   useEffect(() => {
//     fetchOrders()
//   }, [currentPage, searchTerm, selectedDocumentType])

//   // Handle viewing order details
//   const handleViewOrder = (order: Order) => {
//     setViewingOrder(order)
//     setIsViewDialogOpen(true)
//   }

//   const handleEditOrder = (order: Order) => {
//     setEditingOrder({ ...order })
//     setIsEditDialogOpen(true)
//   }
//   // Add these two functions inside your InvoicesTab component

//   const handlePrint = () => {
//     window.print();
//   };

//   const handleDownloadJson = (orderData: Order | null) => {
//     if (!orderData) return;

//     // Create a JSON string from the order data
//     const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
//       JSON.stringify(orderData, null, 2)
//     )}`;

//     // Create a temporary link element and trigger the download
//     const link = document.createElement("a");
//     link.href = jsonString;
//     link.download = `order-${orderData.invoice_number}.json`;
//     link.click();
//   };
//   const handleSaveEdit = async () => {
//     if (editingOrder) {
//       await updateOrder(editingOrder)
//       setOrders((prevOrders) =>
//         prevOrders.map((order) => (order.id === editingOrder.id ? editingOrder : order))
//       )
//       setIsEditDialogOpen(false)
//       setEditingOrder(null)
//     }
//   }

//   const handleDeleteOrder = (orderId: string) => {
//     setOrderToDelete(orderId)
//     setIsDeleteDialogOpen(true)
//   }

//   const confirmDeleteOrder = async () => {
//     if (orderToDelete) {
//       await deleteOrder(orderToDelete)
//       setIsDeleteDialogOpen(false)
//       setOrderToDelete(null)
//     }
//   }

//   // Pagination logic
  

//   const AllOrdersPaginationControls = () => {
//     if (!pagination || pagination.total_items === 0) return null;

//     return (
//       <div className="flex flex-col sm:flex-row items-center justify-between mt-6 p-4 glass rounded-lg gap-4">
//         <div className="text-sm text-readable-muted">
//           Page {pagination.current_page} of {pagination.total_pages} ({pagination.total_items} orders)
//         </div>
//         <div className="flex items-center space-x-2">
//           <Button
//             variant="outline"
//             size="sm"
//             onClick={() => setCurrentPage(p => p - 1)}
//             disabled={!pagination.has_prev}
//             className="glass-button"
//           >
//             <ChevronLeft className="w-4 h-4" />
//             {!isMobile && "Previous"}
//           </Button>
//           <Button
//             variant="outline"
//             size="sm"
//             onClick={() => setCurrentPage(p => p + 1)}
//             disabled={!pagination.has_next}
//             className="glass-button"
//           >
//             {!isMobile && "Next"}
//             <ChevronRight className="w-4 h-4" />
//           </Button>
//         </div>
//       </div>
//     );
//   };
//   return (
//     <div className="space-y-4 sm:space-y-6">
//       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
//         <h1 className="text-2xl sm:text-3xl font-bold heading-primary">View Orders</h1>
//       </div>

//       <Card className="glass-card">
//         <CardHeader className="p-4 sm:p-6">
//           <div className="flex items-center justify-between">
//             <CardTitle className="flex items-center text-readable text-base sm:text-lg">All Orders</CardTitle>
//             <div className="flex space-x-2">
//               <Input
//                 placeholder="Search orders..."
//                 value={searchTerm}
//                 onChange={(e) => {
//                   setSearchTerm(e.target.value)
//                   setCurrentPage(1)
//                 }}
//                 className="glass-input"
//               />
//               <Select
//                 value={selectedDocumentType ?? "all"}
//                 onValueChange={(value) => {
//                   setSelectedDocumentType(value === "all" ? null : (value as any))
//                   setCurrentPage(1)
//                 }}
//               >
//                 <SelectTrigger className="glass-input text-readable w-48">
//                   <SelectValue placeholder="Filter by document type" />
//                 </SelectTrigger>
//                 <SelectContent className="glass-card">
//                   <SelectItem value="all">All Types</SelectItem>
//                   <SelectItem value="sales-invoice">Sales Invoice</SelectItem>
//                   <SelectItem value="purchase">Purchase Order</SelectItem>
//                   <SelectItem value="delivery-challan">Delivery Challan</SelectItem>
//                 </SelectContent>
//               </Select>
//             </div>
//           </div>
//         </CardHeader>
//         <CardContent className="p-4 sm:p-6 pt-0">
//           {isLoading && <div className="text-center">Loading orders...</div>}
//           {error && <div className="text-center text-red-500">{error}</div>}
//           {!isLoading && !error && orders.length === 0 && (
//             <div className="text-center">No orders found.</div>
//           )}
//           {!isLoading && !error && orders.length > 0 && (
//             <div className="space-y-4">
//               {orders.map((order,index) => {
//                 const totalAmount = order.total_amount || order.items.reduce(
//                   (sum, item) => sum + item.quantity * item.price * (1 + item.tax_percent / 100),
//                   0,
//                 )

//                 return (
//                   <Card
//                     key={order.id || index}
//                     className="glass hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500"
//                   >
//                     <CardContent className="p-4">
//                       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
//                         <div className="flex-1">
//                           <div className="flex items-center gap-3 mb-2">
//                             <h3 className="text-lg font-bold text-readable">{order.invoice_number}</h3>
//                             <span
//                               className={`px-2 py-1 rounded-full text-xs font-medium ${
//                                 order.document_type === "purchase"
//                                   ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
//                                   : order.document_type === "sales-invoice"
//                                     ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
//                                     : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
//                               }`}
//                             >
//                               {order.document_type === "purchase"
//                                 ? "Purchase"
//                                 : order.document_type === "sales-invoice"
//                                   ? "Sales"
//                                   : "Delivery"}
//                             </span>
//                           </div>

//                           <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-readable-muted">
//                             <div>
//                               <span className="font-medium">
//                                 {order.order_type === "sale" ? "Client: " : "Supplier: "}
//                               </span>
//                               {order.client_name || order.supplier_name || "N/A"}
//                             </div>
//                             <div>
//                               <span className="font-medium">Date: </span>
//                               {new Date(order.order_date).toLocaleDateString()}
//                             </div>
//                             <div>
//                               <span className="font-medium">Items: </span>
//                               {order.items.length} ({order.total_quantity} qty)
//                             </div>
//                           </div>
//                         </div>

//                         <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
//                           <div className="text-right">
//                             <p className="text-xl font-bold text-readable">₹{totalAmount.toLocaleString()}</p>
//                             <div className="flex items-center gap-2 mt-1">
//                               <span
//                                 className={`px-2 py-1 rounded-full text-xs font-medium ${
//                                   order.payment_status === "paid"
//                                     ? "bg-green-500 text-white"
//                                     : order.payment_status === "partial"
//                                       ? "bg-yellow-500 text-white"
//                                       : "bg-red-500 text-white"
//                                 }`}
//                               >
//                                 {order.payment_status === "paid"
//                                   ? "Paid"
//                                   : order.payment_status === "partial"
//                                     ? "Partial"
//                                     : "Pending"}
//                               </span>
//                               <Select
//                                 value={order.payment_status || "pending"}
//                                 onValueChange={(value) => {
//                                   setOrders((prevOrders) =>
//                                     prevOrders.map((o) => (o.id === order.id ? { ...o, payment_status: value } : o))
//                                   )
//                                   updatePaymentStatus(order, value)
//                                 }}
//                                 disabled={order.payment_status === "paid"}
//                               >
//                                 <SelectTrigger className="w-24 h-6 text-xs">
//                                   <SelectValue placeholder="Select payment status" />
//                                 </SelectTrigger>
//                                 <SelectContent className="glass-card">
//                                   <SelectItem value="paid">Paid</SelectItem>
//                                   <SelectItem value="partial">Partially Paid</SelectItem>
//                                   <SelectItem value="pending">Pending</SelectItem>
//                                 </SelectContent>
//                               </Select>
//                             </div>
//                           </div>

//                           <div className="flex gap-2">
//                             <Button
//                               variant="outline"
//                               size="sm"
//                               onClick={() => handleViewOrder(order)}
//                               className="glass-button"
//                             >
//                               <Eye className="w-4 h-4 mr-1" />
//                               View
//                             </Button>
//                             <Button
//                               variant="outline"
//                               size="sm"
//                               className="glass-button"
//                               onClick={() => handleEditOrder(order)}
//                             >
//                               Edit
//                             </Button>
//                             <Button
//                               variant="outline"
//                               size="sm"
//                               className="glass-button text-red-500"
//                               onClick={() => handleDeleteOrder(order.id)}
//                               disabled={order.payment_status === "paid"}
//                             >
//                               <Trash2 className="w-4 h-4 mr-1" />
//                               Delete
//                             </Button>
//                           </div>
//                         </div>
//                       </div>
//                     </CardContent>
//                   </Card>
//                 )
//               })}
//             </div>
//           )}

//           <AllOrdersPaginationControls />
//         </CardContent>
//       </Card>

//       <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
//         <div className="print-container">
//           <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
//             <DialogHeader>
//               <DialogTitle className="flex items-center heading-secondary">
//                 <Eye className="w-5 h-5 mr-2 text-blue-600" />
//                 {`Order Details – ${viewingOrder?.invoice_number ?? ""}`}
//               </DialogTitle>
//               <DialogDescription>View order information.</DialogDescription>
//             </DialogHeader>

//             {viewingOrder && (
//               <div className="space-y-6">
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <div>
//                     <Label>Client Name</Label>
//                     <Input value={viewingOrder.client_name || "N/A"} readOnly className="glass-input" />
//                   </div>
//                   <div>
//                     <Label>Client ID</Label>
//                     <Input value={viewingOrder.client_id || "N/A"} readOnly className="glass-input" />
//                   </div>
//                   {viewingOrder.order_type === "purchase" && (
//                     <>
//                       <div>
//                         <Label>Supplier Name</Label>
//                         <Input value={viewingOrder.supplier_name || "N/A"} readOnly className="glass-input" />
//                       </div>
//                       <div>
//                         <Label>Supplier ID</Label>
//                         <Input value={viewingOrder.supplier_id || "N/A"} readOnly className="glass-input" />
//                       </div>
//                     </>
//                   )}
//                   <div>
//                     <Label>
//                       {viewingOrder.document_type === "delivery-challan" ? "Delivery Challan No." : "Invoice Number"}
//                     </Label>
//                     <Input value={viewingOrder.invoice_number || "N/A"} readOnly className="glass-input" />
//                   </div>
//                   <div>
//                     <Label>Order Date</Label>
//                     <Input value={viewingOrder.order_date || "N/A"} readOnly className="glass-input" />
//                   </div>
//                   <div>
//                     <Label>Order Type</Label>
//                     <Input value={viewingOrder.order_type || "N/A"} readOnly className="glass-input" />
//                   </div>
//                   <div>
//                     <Label>Document Type</Label>
//                     <Input value={viewingOrder.document_type || "N/A"} readOnly className="glass-input" />
//                   </div>
//                 </div>

//                 <div>
//                   <Label>Items</Label>
//                   <div className="space-y-2">
//                     {viewingOrder.items.map((item, index) => (
//                       <div key={index} className="glass rounded-lg p-3">
//                         <div className="grid grid-cols-6 gap-2">
//                           <div>
//                             <Label>Item Name</Label>
//                             <Input value={item.item_name || "N/A"} readOnly className="glass-input" />
//                           </div>
//                           <div>
//                             <Label>Batch Number</Label>
//                             <Input value={item.batch_number || "N/A"} readOnly className="glass-input" />
//                           </div>
//                           <div>
//                             <Label>Expiry</Label>
//                             <Input value={item.expiry || "N/A"} readOnly className="glass-input" />
//                           </div>
//                           <div>
//                             <Label>Quantity</Label>
//                             <Input value={item.quantity || "N/A"} readOnly className="glass-input" />
//                           </div>
//                           <div>
//                             <Label>Price (₹)</Label>
//                             <Input value={item.price || "N/A"} readOnly className="glass-input" />
//                           </div>
//                           <div>
//                             <Label>Tax %</Label>
//                             <Input value={item.tax_percent || "N/A"} readOnly className="glass-input" />
//                           </div>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 </div>

//                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//                   <div>
//                     <Label>Total Tax (₹)</Label>
//                     <Input value={viewingOrder.total_tax.toLocaleString() || "N/A"} readOnly className="glass-input" />
//                   </div>
//                   <div>
//                     <Label>Total Quantity</Label>
//                     <Input value={viewingOrder.total_quantity || "N/A"} readOnly className="glass-input" />
//                   </div>
//                   <div>
//                     <Label>Total Amount (₹)</Label>
//                     <Input
//                       value={viewingOrder.total_amount.toLocaleString() || "N/A"}
//                       readOnly
//                       className="glass-input"
//                     />
//                   </div>
//                   <div>
//                     <Label>Mode of Payment</Label>
//                     <Input value={viewingOrder.payment_method || "N/A"} readOnly className="glass-input" />
//                   </div>
//                 </div>

//                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                   <div>
//                     <Label>Payment Status</Label>
//                     <Select disabled value={viewingOrder.payment_status || "pending"}>
//                       <SelectTrigger className="glass-input text-readable">
//                         <SelectValue placeholder="Select payment status" />
//                       </SelectTrigger>
//                       <SelectContent className="glass-card">
//                         <SelectItem value="paid">Paid</SelectItem>
//                         <SelectItem value="partial">Partially Paid</SelectItem>
//                         <SelectItem value="pending">Pending</SelectItem>
//                       </SelectContent>
//                     </Select>
//                   </div>
//                   <div>
//                     <Label>Amount Paid (₹)</Label>
//                     <Input value={viewingOrder.amount_paid?.toLocaleString() || "N/A"} readOnly className="glass-input" />
//                   </div>
//                   <div>
//                     <Label>Order Status</Label>
//                     <Select disabled value={viewingOrder.status || "pending"}>
//                       <SelectTrigger className="glass-input text-readable">
//                         <SelectValue placeholder="Select order status" />
//                       </SelectTrigger>
//                       <SelectContent className="glass-card">
//                         <SelectItem value="pending">Pending</SelectItem>
//                         <SelectItem value="processing">Processing</SelectItem>
//                         <SelectItem value="completed">Completed</SelectItem>
//                         <SelectItem value="cancelled">Cancelled</SelectItem>
//                       </SelectContent>
//                     </Select>
//                   </div>
//                   {viewingOrder.document_type === "delivery-challan" && (
//                     <div>
//                       <Label>Amount Collected By</Label>
//                       <Input value={viewingOrder.amount_collected_by || "N/A"} readOnly className="glass-input" />
//                     </div>
//                   )}
//                 </div>

//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <div>
//                     <Label>Remarks</Label>
//                     <Textarea value={viewingOrder.remarks || "N/A"} readOnly className="glass-input" />
//                   </div>
//                   {viewingOrder.document_type === "delivery-challan" && (
//                     <div>
//                       <Label>Delivery Challan Link</Label>
//                       <Input value={viewingOrder.link || "N/A"} readOnly className="glass-input" />
//                     </div>
//                   )}
//                 </div>

//                 <DialogFooter className="sm:justify-between">
//                   <div>
//                     <Button
//                       type="button"
//                       variant="outline"
//                       onClick={() => handleDownloadJson(viewingOrder)}
//                       className="mr-2"
//                     >
//                       Download JSON
//                     </Button>
//                     <Button
//                       type="button"
//                       variant="outline"
//                       onClick={handlePrint}
//                     >
//                       Print
//                     </Button>
//                   </div>
//                   <DialogClose asChild>
//                     <Button type="button" variant="secondary">
//                       Close
//                     </Button>
//                   </DialogClose>
//                 </DialogFooter>
//               </div>
//             )}
//           </DialogContent>
//         </div>
//       </Dialog>

//       <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
//         <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
//           <DialogHeader>
//             <DialogTitle className="flex items-center heading-secondary">
//               Edit Order – {editingOrder?.invoice_number ?? ""}
//             </DialogTitle>
//             <DialogDescription>Edit order information and save changes.</DialogDescription>
//           </DialogHeader>

//           {editingOrder && (
//             <div className="space-y-6">
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div>
//                   <Label>{editingOrder.document_type === "delivery-challan" ? "Challan Number" : "Invoice Number"}</Label>
//                   <Input
//                     value={editingOrder.invoice_number}
//                     onChange={(e) => setEditingOrder({ ...editingOrder, invoice_number: e.target.value })}
//                     className="glass-input"
//                   />
//                 </div>
//                 <div>
//                   <Label>{editingOrder.order_type === "sale" ? "Client Name" : "Supplier Name"}</Label>
//                   <Input
//                     value={
//                       editingOrder.order_type === "sale"
//                         ? editingOrder.client_name || ""
//                         : editingOrder.supplier_name || ""
//                     }
//                     onChange={(e) => {
//                       if (editingOrder.order_type === "sale") {
//                         setEditingOrder({ ...editingOrder, client_name: e.target.value })
//                       } else {
//                         setEditingOrder({ ...editingOrder, supplier_name: e.target.value })
//                       }
//                     }}
//                     className="glass-input"
//                   />
//                 </div>
//                 <div>
//                   <Label>Order Date</Label>
//                   <Input
//                     type="date"
//                     value={editingOrder.order_date}
//                     onChange={(e) => setEditingOrder({ ...editingOrder, order_date: e.target.value })}
//                     className="glass-input"
//                   />
//                 </div>
//                 <div>
//                   <Label>Status</Label>
//                   <Select
//                     value={editingOrder.status}
//                     onValueChange={(value) => setEditingOrder({ ...editingOrder, status: value })}
//                   >
//                     <SelectTrigger className="glass-input">
//                       <SelectValue />
//                     </SelectTrigger>
//                     <SelectContent className="glass-card">
//                       <SelectItem value="pending">Pending</SelectItem>
//                       <SelectItem value="processing">Processing</SelectItem>
//                       <SelectItem value="completed">Completed</SelectItem>
//                       <SelectItem value="cancelled">Cancelled</SelectItem>
//                     </SelectContent>
//                   </Select>
//                 </div>
//                 <div>
//                   <Label>Payment Status</Label>
//                   <Select
//                     value={editingOrder.payment_status || "pending"}
//                     onValueChange={(value) => setEditingOrder({ ...editingOrder, payment_status: value })}
//                   >
//                     <SelectTrigger className="glass-input">
//                       <SelectValue />
//                     </SelectTrigger>
//                     <SelectContent className="glass-card">
//                       <SelectItem value="paid">Paid</SelectItem>
//                       <SelectItem value="partial">Partial</SelectItem>
//                       <SelectItem value="pending">Pending</SelectItem>
//                     </SelectContent>
//                   </Select>
//                 </div>
//                 <div>
//                   <Label>Amount Paid (₹)</Label>
//                   <Input
//                     type="number"
//                     value={editingOrder.amount_paid || 0}
//                     onChange={(e) => setEditingOrder({ ...editingOrder, amount_paid: Number(e.target.value) })}
//                     className="glass-input"
//                   />
//                 </div>
//                 <div>
//                   <Label>Payment Method</Label>
//                   <Select
//                     value={editingOrder.payment_method || ""}
//                     onValueChange={(value) => setEditingOrder({ ...editingOrder, payment_method: value })}
//                   >
//                     <SelectTrigger className="glass-input">
//                       <SelectValue placeholder="Select payment method" />
//                     </SelectTrigger>
//                     <SelectContent className="glass-card">
//                       <SelectItem value="cash">Cash</SelectItem>
//                       <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
//                       <SelectItem value="cheque">Cheque</SelectItem>
//                       <SelectItem value="upi">UPI</SelectItem>
//                     </SelectContent>
//                   </Select>
//                 </div>
//                 {editingOrder.document_type === "delivery-challan" && (
//                   <div>
//                     <Label>Amount Collected By</Label>
//                     <Input
//                       value={editingOrder.amount_collected_by || ""}
//                       onChange={(e) => setEditingOrder({ ...editingOrder, amount_collected_by: e.target.value })}
//                       className="glass-input"
//                     />
//                   </div>
//                 )}
//               </div>

//               <div>
//                 <Label>Remarks</Label>
//                 <Textarea
//                   value={editingOrder.remarks}
//                   onChange={(e) => setEditingOrder({ ...editingOrder, remarks: e.target.value })}
//                   className="glass-input"
//                   rows={3}
//                 />
//               </div>

//               <DialogFooter>
//                 <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
//                   Cancel
//                 </Button>
//                 <Button onClick={handleSaveEdit} className="bg-blue-600 hover:bg-blue-700">
//                   Save Changes
//                 </Button>
//               </DialogFooter>
//             </div>
//           )}
//         </DialogContent>
//       </Dialog>

//       <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Confirm Delete</DialogTitle>
//             <DialogDescription>
//               Are you sure you want to delete this order? This action cannot be undone.
//             </DialogDescription>
//           </DialogHeader>
//           <DialogFooter>
//             <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
//               Cancel
//             </Button>
//             <Button variant="destructive" onClick={confirmDeleteOrder}>
//               Delete
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
//     </div>
//   )
// }
"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useNotifications } from "@/components/notifications-provider"
import { ChevronLeft, ChevronRight, Eye, Trash2 } from "lucide-react"
import { useMobile } from "@/hooks/use-mobile"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface InvoicesTabProps {
  user?: {
    username: string
  }
}

interface Order {
  id: string
  invoice_number: string
  client_name?: string
  client_id?: string
  supplier_name?: string
  supplier_id?: string
  items: {
    item_name: string
    batch_number: string
    expiry: string
    quantity: number
    price: number
    tax_percent: number
  }[]
  total_tax: number
  total_quantity: number
  total_amount: number
  order_type: string
  order_date: string
  status: string
  challan_number:string
  remarks: string
  created_at: string
  updated_at: string
  updated_by: string
  created_by: string
  document_type: "purchase" | "sales-invoice" | "delivery-challan"
  amount_paid?: number
  payment_method?: string
  payment_status?: string
  amount_collected_by?: string
  link?: string
}

interface PaginationMeta {
  current_page: number
  total_pages: number
  total_items: number
  items_per_page: number
  has_next: boolean
  has_prev: boolean
}

interface OrderListResponse {
  orders: Order[]
  pagination?: PaginationMeta
}

export function InvoicesTab({ user }: InvoicesTabProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const { addNotification } = useNotifications()
  const isMobile = useMobile()
  const itemsPerPage = 10

  const [orders, setOrders] = useState<Order[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // State for View Dialog
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

  // State for Delete Dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null)

  // State for Partial Payment Dialog
  const [isPartialPaymentDialogOpen, setIsPartialPaymentDialogOpen] = useState(false)
  const [orderToUpdatePartial, setOrderToUpdatePartial] = useState<Order | null>(null)
  const [partialAmount, setPartialAmount] = useState<number>(0)
  
  const [selectedDocumentType, setSelectedDocumentType] = useState<
    "purchase" | "sales-invoice" | "delivery-challan" | null
  >(null)

  const documentTypeToApiOrderType = (
    docType: "purchase" | "sales-invoice" | "delivery-challan" | null
  ): "purchase" | "sale" | "delivery_challan" | undefined => {
    if (!docType) return undefined
    return docType === "sales-invoice"
      ? "sale"
      : docType === "delivery-challan"
      ? "delivery_challan"
      : "purchase"
  }

  const apiOrderTypeToDocumentType = (
    orderType: string
  ): "purchase" | "sales-invoice" | "delivery-challan" => {
    return orderType === "sale"
      ? "sales-invoice"
      : orderType === "delivery_challan"
      ? "delivery-challan"
      : "purchase"
  }

  const fetchOrders = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(selectedDocumentType && { order_type: documentTypeToApiOrderType(selectedDocumentType) }),
      })

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      const response = await fetch(`${apiUrl}/api/v1/orders?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`HTTP error! status: ${response.status}, detail: ${errorData.detail || "Unknown error"}`)
      }

      const data: OrderListResponse = await response.json()

      const normalizedOrders = data.orders.map((order) => ({
        ...order,
        document_type: apiOrderTypeToDocumentType(order.order_type),
        id: order.invoice_number || order.challan_number,
        invoice_number: order.invoice_number || order.challan_number,
      }))
      setOrders(normalizedOrders)
      setPagination(data.pagination ?? null)

      if (data.pagination?.current_page && data.pagination.current_page !== currentPage) {
        setCurrentPage(data.pagination.current_page)
      }
    } catch (err: any) {
      setError(`Failed to fetch orders: ${err.message}`)
      addNotification({ title: "Error", message: `Failed to fetch orders: ${err.message}`, type: "error" })
    } finally {
      setIsLoading(false)
    }
  }

  const updatePaymentStatus = async (orderId: string, paymentStatus: string, amountPaid?: number) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      const payload: { payment_status: string; amount_paid?: number } = {
        payment_status: paymentStatus,
      };

      if (amountPaid !== undefined) {
        payload.amount_paid = amountPaid;
      }
      
      const response = await fetch(`${apiUrl}/api/v1/orders/${orderId}/payment-status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`HTTP error! status: ${response.status}, detail: ${errorData.detail || "Unknown error"}`)
      }
      
      const updatedOrder = await response.json();

      setOrders(prevOrders => 
        prevOrders.map(o => o.id === orderId ? { ...o, ...updatedOrder } : o)
      );

      addNotification({
        title: "Payment Status Updated",
        message: `Payment status for order ${orderId} updated to ${paymentStatus}.`,
        type: "success",
      })
    } catch (err: any) {
      addNotification({ title: "Error", message: `Failed to update payment status: ${err.message}`, type: "error" })
      fetchOrders(); // Refetch to revert optimistic UI change on error
    }
  }

  const deleteOrder = async (orderId: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      const response = await fetch(`${apiUrl}/api/v1/orders/${orderId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`HTTP error! status: ${response.status}, detail: ${errorData.detail || "Unknown error"}`)
      }

      addNotification({
        title: "Order Deleted",
        message: `Order ${orderId} has been deleted successfully.`,
        type: "success",
      })
      fetchOrders()
    } catch (err: any) {
      addNotification({ title: "Error", message: `Failed to delete order: ${err.message}`, type: "error" })
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [currentPage, searchTerm, selectedDocumentType])

  const handleViewOrder = (order: Order) => {
    setViewingOrder(order)
    setIsViewDialogOpen(true)
  }

  const handlePaymentStatusChange = (order: Order, newStatus: string) => {
    if (newStatus === 'partial') {
      setOrderToUpdatePartial(order);
      setPartialAmount(order.amount_paid || 0);
      setIsPartialPaymentDialogOpen(true);
    } else {
      updatePaymentStatus(order.id, newStatus);
    }
  };

  const handleConfirmPartialPayment = () => {
    if (orderToUpdatePartial) {
      updatePaymentStatus(orderToUpdatePartial.id, 'partial', partialAmount);
    }
    setIsPartialPaymentDialogOpen(false);
    setOrderToUpdatePartial(null);
  };

  const handleDeleteOrder = (orderId: string) => {
    setOrderToDelete(orderId)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteOrder = async () => {
    if (orderToDelete) {
      await deleteOrder(orderToDelete)
      setIsDeleteDialogOpen(false)
      setOrderToDelete(null)
    }
  }
  
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = (orderData: Order | null) => {
    if (!orderData) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(orderData, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `order-${orderData.invoice_number}.json`;
    link.click();
  };

  const AllOrdersPaginationControls = () => {
    if (!pagination || pagination.total_items === 0) return null;

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between mt-6 p-4 glass rounded-lg gap-4">
        <div className="text-sm text-readable-muted">
          Page {pagination.current_page} of {pagination.total_pages} ({pagination.total_items} orders)
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => p - 1)}
            disabled={!pagination.has_prev}
            className="glass-button"
          >
            <ChevronLeft className="w-4 h-4" />
            {!isMobile && "Previous"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => p + 1)}
            disabled={!pagination.has_next}
            className="glass-button"
          >
            {!isMobile && "Next"}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
        <h1 className="text-2xl sm:text-3xl font-bold heading-primary">View Orders</h1>
      </div>

      <Card className="glass-card">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-readable text-base sm:text-lg">All Orders</CardTitle>
            <div className="flex space-x-2">
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="glass-input"
              />
              <Select
                value={selectedDocumentType ?? "all"}
                onValueChange={(value) => {
                  setSelectedDocumentType(value === "all" ? null : (value as any))
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="glass-input text-readable w-48">
                  <SelectValue placeholder="Filter by document type" />
                </SelectTrigger>
                <SelectContent className="glass-card">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="sales-invoice">Sales Invoice</SelectItem>
                  <SelectItem value="purchase">Purchase Order</SelectItem>
                  <SelectItem value="delivery-challan">Delivery Challan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {isLoading && <div className="text-center">Loading orders...</div>}
          {error && <div className="text-center text-red-500">{error}</div>}
          {!isLoading && !error && orders.length === 0 && (
            <div className="text-center">No orders found.</div>
          )}
          {!isLoading && !error && orders.length > 0 && (
            <div className="space-y-4">
              {orders.map((order,index) => {
                const totalAmount = order.total_amount || 0;
                return (
                  <Card
                    key={order.id || index}
                    className="glass hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500"
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-readable">{order.invoice_number}</h3>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                order.document_type === "purchase"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                  : order.document_type === "sales-invoice"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                    : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                              }`}
                            >
                              {order.document_type === "purchase"
                                ? "Purchase"
                                : order.document_type === "sales-invoice"
                                  ? "Sales"
                                  : "Delivery"}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-readable-muted">
                            <div>
                              <span className="font-medium">
                                {order.document_type === "purchase" ? "Supplier: " : "Client: "}
                              </span>
                              {order.client_name || order.supplier_name || "N/A"}
                            </div>
                            <div>
                              <span className="font-medium">Date: </span>
                              {new Date(order.order_date).toLocaleDateString()}
                            </div>
                            <div>
                              <span className="font-medium">Items: </span>
                              {order.items.length} ({order.total_quantity} qty)
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                          <div className="text-right">
                            <p className="text-xl font-bold text-readable">₹{totalAmount.toLocaleString()}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  order.payment_status === "paid"
                                    ? "bg-green-500 text-white"
                                    : order.payment_status === "partial"
                                      ? "bg-yellow-500 text-white"
                                      : "bg-red-500 text-white"
                                }`}
                              >
                                {order.payment_status === "paid"
                                  ? "Paid"
                                  : order.payment_status === "partial"
                                    ? "Partial"
                                    : "Pending"}
                              </span>
                              <Select
                                value={order.payment_status || "pending"}
                                onValueChange={(value) => handlePaymentStatusChange(order, value)}
                                disabled={order.payment_status === "paid"}
                              >
                                <SelectTrigger className="w-24 h-6 text-xs">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent className="glass-card">
                                  <SelectItem value="paid">Paid</SelectItem>
                                  <SelectItem value="partial">Partial</SelectItem>
                                  <SelectItem value="pending">Pending</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewOrder(order)}
                              className="glass-button"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteOrder(order.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          <AllOrdersPaginationControls />
        </CardContent>
      </Card>

      {/* View Order Dialog (Now with full content) */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <div className="print-container">
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center heading-secondary">
                <Eye className="w-5 h-5 mr-2 text-blue-600" />
                {`Order Details – ${viewingOrder?.invoice_number ?? ""}`}
              </DialogTitle>
              <DialogDescription>View order information.</DialogDescription>
            </DialogHeader>
            {viewingOrder && (
              <div className="space-y-6 p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>{viewingOrder.order_type === "purchase" ? "Supplier Name" : "Client Name"}</Label>
                    <Input value={viewingOrder.client_name || viewingOrder.supplier_name || "N/A"} readOnly className="glass-input" />
                  </div>
                  <div>
                    <Label>{viewingOrder.order_type === "purchase" ? "Supplier ID" : "Client ID"}</Label>
                    <Input value={viewingOrder.client_id || viewingOrder.supplier_id || "N/A"} readOnly className="glass-input" />
                  </div>
                  <div>
                    <Label>
                      {viewingOrder.document_type === "delivery-challan" ? "Delivery Challan No." : "Invoice Number"}
                    </Label>
                    <Input value={viewingOrder.invoice_number || "N/A"} readOnly className="glass-input" />
                  </div>
                  <div>
                    <Label>Order Date</Label>
                    <Input value={new Date(viewingOrder.order_date).toLocaleDateString() || "N/A"} readOnly className="glass-input" />
                  </div>
                </div>

                <div>
                  <Label>Items</Label>
                  <div className="space-y-2">
                    {viewingOrder.items.map((item, index) => (
                      <div key={index} className="glass rounded-lg p-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-2 text-sm">
                          <div><Label>Item</Label><p>{item.item_name}</p></div>
                          <div><Label>Batch</Label><p>{item.batch_number || "N/A"}</p></div>
                          <div><Label>Expiry</Label><p>{item.expiry || "N/A"}</p></div>
                          <div><Label>Qty</Label><p>{item.quantity}</p></div>
                          <div><Label>Price</Label><p>₹{item.price.toLocaleString()}</p></div>
                          <div><Label>Tax</Label><p>{item.tax_percent || 0}%</p></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Total Tax (₹)</Label>
                    <Input value={viewingOrder.total_tax.toLocaleString() || "N/A"} readOnly className="glass-input" />
                  </div>
                  <div>
                    <Label>Total Quantity</Label>
                    <Input value={viewingOrder.total_quantity || "N/A"} readOnly className="glass-input" />
                  </div>
                  <div>
                    <Label>Total Amount (₹)</Label>
                    <Input
                      value={viewingOrder.total_amount.toLocaleString() || "N/A"}
                      readOnly
                      className="glass-input"
                    />
                  </div>
                  <div>
                    <Label>Mode of Payment</Label>
                    <Input value={viewingOrder.payment_method || "N/A"} readOnly className="glass-input" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Payment Status</Label>
                    <Input value={viewingOrder.payment_status || "N/A"} readOnly className="glass-input" />
                  </div>
                  <div>
                    <Label>Amount Paid (₹)</Label>
                    <Input value={viewingOrder.amount_paid?.toLocaleString() || "N/A"} readOnly className="glass-input" />
                  </div>
                  <div>
                    <Label>Order Status</Label>
                    <Input value={viewingOrder.status || "N/A"} readOnly className="glass-input" />
                  </div>
                  {viewingOrder.document_type === "delivery-challan" && (
                    <div>
                      <Label>Amount Collected By</Label>
                      <Input value={viewingOrder.amount_collected_by || "N/A"} readOnly className="glass-input" />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1">
                  <div>
                    <Label>Remarks</Label>
                    <Textarea value={viewingOrder.remarks || "N/A"} readOnly className="glass-input" />
                  </div>
                  {viewingOrder.document_type === "delivery-challan" && (
                    <div className="mt-4">
                      <Label>Delivery Challan Link</Label>
                      <Input value={viewingOrder.link || "N/A"} readOnly className="glass-input" />
                    </div>
                  )}
                </div>

                <DialogFooter className="sm:justify-between pt-4">
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleDownloadJson(viewingOrder)}
                      className="mr-2"
                    >
                      Download JSON
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePrint}
                    >
                      Print
                    </Button>
                  </div>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">
                      Close
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </div>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this order? This action cannot be undone and will revert all associated inventory and financial records.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteOrder}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Partial Payment Dialog */}
      <Dialog open={isPartialPaymentDialogOpen} onOpenChange={setIsPartialPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Partial Payment</DialogTitle>
            <DialogDescription>
              Enter the new total cumulative amount paid for order {orderToUpdatePartial?.invoice_number}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="partialAmount">New Total Amount Paid (₹)</Label>
            <Input
              id="partialAmount"
              type="number"
              value={partialAmount}
              onChange={(e) => setPartialAmount(Number(e.target.value))}
              placeholder="e.g., 5000"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
                setIsPartialPaymentDialogOpen(false);
                fetchOrders(); // Revert optimistic UI change on cancel
              }}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPartialPayment}>
              Save Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
// Uncomment the following code if you want to add an Edit Order Dialog
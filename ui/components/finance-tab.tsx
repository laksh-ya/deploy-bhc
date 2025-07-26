"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DollarSign,
  Plus,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Banknote,
  ChevronLeft,
  ChevronRight,
  Filter,
  Edit,
  User,
  Trash,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import toast from "react-hot-toast"

// Placeholder for authentication token (replace with your auth logic)
const getAuthToken = () => {
  return localStorage.getItem("authToken") || ""
}

// Hardcoded expense categories (replace with API if available)
const expenseCategories = ["travel", "supplies", "utilities", "miscellaneous"]
// Static collection methods for payments (adjust based on API data)
const collectionMethods = ["Cash"]

interface Employee {
  id: string
  name: string
}

interface Expense {
  id: string
  amount: number
  category: string
  paidBy?: string
  collectedBy?: string
  remarks?: string
  date: string
  type: "expense" | "payment"
}

interface Payment {
  id: string
  amount: number
  collectedBy?: string
  remarks?: string
  date: string
  type: "payment"
  orderId?: string   // <-- Add this line
  clientName?: string // <-- Add this line
}
interface FinancialSummary {
  total_income: number
  total_expense: number
  net_profit: number
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"

// Convert backend expense doc to UI Expense
const mapBackendExpenseToUI = (e: any): Expense => ({
  id: e.id,
  amount: e.amount,
  category: e.category,
  paidBy: e.paid_by,
  collectedBy: e.collected_by,
  remarks: e.remarks,
  date: e.created_at ? new Date(e.created_at).toISOString().slice(0, 10) : "",
  type: e.type ?? (e.collected_by ? "payment" : "expense"),
})

// Convert backend payment doc to UI Payment
const mapBackendPaymentToUI = (p: any): Payment => ({
  id: p.id,
  amount: p.amount_paid ?? 0,
  collectedBy: p.amount_collected_by ?? p.paid_by,
  remarks: p.payment_status ?? "",
  date: p.created_at ? new Date(p.created_at).toISOString().slice(0, 10) : "",
  type: "payment",
  // FIX: Check for invoice_number first, then fall back to challan_number
  orderId: p.invoice_number || p.challan_number, 
  clientName: p.client_name,
});

export function FinanceTab() {
  const [currentExpensePage, setCurrentExpensePage] = useState(1)
  const [currentPaymentPage, setCurrentPaymentPage] = useState(1)
  const [expenseSearchTerm, setExpenseSearchTerm] = useState("")
  const [paymentSearchTerm, setPaymentSearchTerm] = useState("")
  const [showExpenseFilters, setShowExpenseFilters] = useState(false)
  const [showPaymentFilters, setShowPaymentFilters] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const [showEditExpenseDialog, setShowEditExpenseDialog] = useState(false)
  const [showEditPaymentDialog, setShowEditPaymentDialog] = useState(false)
  const [isLoadingSummary, setIsLoadingSummary] = useState(false)
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false)
  const [isLoadingPayments, setIsLoadingPayments] = useState(false)
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [totalExpenseCount, setTotalExpenseCount] = useState(0)
  const [totalPaymentCount, setTotalPaymentCount] = useState(0)
  const itemsPerPage = 10

  // Remote data states
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [totalExpensePages, setTotalExpensePages] = useState(1)
  const [payments, setPayments] = useState<Payment[]>([])
  const [totalPaymentPages, setTotalPaymentPages] = useState(1)
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  // Add this with your other useState hooks
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  // Fetch employees for dropdown
  // In finance-tab.tsx
  useEffect(() => {
    const fetchEmployees = async () => {
      setIsLoadingEmployees(true);
      try {
        const params = new URLSearchParams({ limit: "50" });
        const res = await fetch(`${API_BASE}/api/v1/dropdown-employees?${params.toString()}`, {
          headers: { Authorization: `Bearer ${getAuthToken()}` },
        });
        if (!res.ok) throw new Error(`Employees fetch failed: ${res.status}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        // ✅ FIX: Handle both direct array and nested { items: [...] } responses
        if (Array.isArray(data.items)) {
          setEmployees(data.items);
        } else if (Array.isArray(data)) {
          setEmployees(data);
        } else {
          setEmployees([]); // Default to empty if format is unexpected
        }
      } catch (e) {
        console.error("Failed to load employees", e);
        setError("Failed to load employees");
        toast.error("Failed to load employees");
      } finally {
        setIsLoadingEmployees(false);
      }
    };
    fetchEmployees();
  }, []);

  // Fetch summary
  useEffect(() => {
    const fetchSummary = async () => {
      setIsLoadingSummary(true)
      try {
        const res = await fetch(`${API_BASE}/api/v1/dashboard/financial-summary`, {
          headers: { Authorization: `Bearer ${getAuthToken()}` },
        })
        if (!res.ok) throw new Error(`Summary fetch failed: ${res.status}`)
        setSummary(await res.json())
      } catch (e) {
        console.error("Failed to load summary", e)
        setError("Failed to load financial summary")
        toast.error("Failed to load financial summary")
      } finally {
        setIsLoadingSummary(false)
      }
    }
    fetchSummary()
  }, [refreshTrigger])

  // Fetch expenses
  useEffect(() => {
    const fetchExpenses = async () => {
      setIsLoadingExpenses(true)
      try {
        const params = new URLSearchParams({ page: String(currentExpensePage), limit: String(itemsPerPage) })
        if (expenseSearchTerm) params.append("search", expenseSearchTerm)
        const res = await fetch(`${API_BASE}/api/v1/expenses?${params.toString()}`, {
          headers: { Authorization: `Bearer ${getAuthToken()}` },
        })
        if (!res.ok) throw new Error(`Expenses fetch failed: ${res.status}`)
        const data = await res.json()
        // FIX: Access the 'items' array from the paginated response
        setExpenses(data.items.map(mapBackendExpenseToUI))
        setTotalExpensePages(data.total_pages ?? 1)
        setTotalExpenseCount(data.total_count ?? data.items.length)
      } catch (e) {
        console.error("Failed to load expenses", e)
        setError("Failed to load expenses")
        toast.error("Failed to load expenses")
      } finally {
        setIsLoadingExpenses(false)
      }
    }
    fetchExpenses()
  }, [currentExpensePage, expenseSearchTerm, refreshTrigger])

  // Fetch payments
  useEffect(() => {
    const fetchPayments = async () => {
      setIsLoadingPayments(true)
      try {
        const params = new URLSearchParams({ page: String(currentPaymentPage), limit: String(itemsPerPage) })
        if (paymentSearchTerm) params.append("search", paymentSearchTerm)
        const res = await fetch(`${API_BASE}/api/v1/payments?${params.toString()}`, {
          headers: { Authorization: `Bearer ${getAuthToken()}` },
        })
        if (!res.ok) throw new Error(`Payments fetch failed: ${res.status}`)
        const data = await res.json()
        // FIX: Access the 'payments' array from the paginated response
        setPayments(data.payments.map(mapBackendPaymentToUI))
        setTotalPaymentPages(Math.ceil(data.total_count / itemsPerPage))
        setTotalPaymentCount(data.total_count)
      } catch (e) {
        console.error("Failed to load payments", e)
        setError("Failed to load payments")
        toast.error("Failed to load payments")
      } finally {
        setIsLoadingPayments(false)
      }
    }
    fetchPayments()
  }, [currentPaymentPage, paymentSearchTerm])

  // ------------------------------
  // Add-Expense Form State & Submit
  // ------------------------------
  const [expenseForm, setExpenseForm] = useState<{ amount: string; category: string; paidBy: string; date: string; remarks: string }>({
    amount: "",
    category: "",
    paidBy: "",
    date: "",
    remarks: "",
  })

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    const { amount, category, paidBy, remarks } = expenseForm
    const numericAmount = Number(amount)

    if (!numericAmount || !category) {
      toast.error("Please fill in required fields (amount & category)")
      return
    }

    try {
      const response = await fetch(`${API_BASE}/api/v1/expenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          amount: numericAmount,
          category,
          ...(paidBy ? { paid_by: paidBy } : {}),
          remarks,
        }),
      })
      if (!response.ok) throw new Error(`Add expense failed: ${response.status}`)
      const newExpense = await response.json()
      setExpenses([mapBackendExpenseToUI(newExpense), ...expenses])
      setTotalExpenseCount(totalExpenseCount + 1)
      setSummary((prev) =>
        prev
          ? { ...prev, total_expense: prev.total_expense + numericAmount, net_profit: prev.net_profit - numericAmount }
          : prev
      )
      toast.success("Expense added successfully")
      // reset form state
      setExpenseForm({ amount: "", category: "", paidBy: "", date: "", remarks: "" })
    } catch (error) {
      console.error("Failed to add expense", error)
      toast.error("Failed to add expense")
    }
  }

  // Handle update expense
  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingExpense) return

    const amount = Number((document.getElementById("editExpenseAmount") as HTMLInputElement).value)
    const category = (document.getElementById("editExpenseCategory") as HTMLSelectElement).value
    const paidBy = (document.getElementById("editExpensePaidBy") as HTMLSelectElement).value
    const date = (document.getElementById("editExpenseDate") as HTMLInputElement).value
    const remarks = (document.getElementById("editExpenseRemarks") as HTMLTextAreaElement).value

    if (!amount || !category) {
      toast.error("Please fill in all required fields")
      return
    }

    try {
      const response = await fetch(`${API_BASE}/api/v1/expenses/${editingExpense.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          amount,
          category,
          paid_by: paidBy,
          remarks,
        }),
      })
      if (!response.ok) throw new Error(`Update expense failed: ${response.status}`)
      const updatedExpense = await response.json()
      setExpenses(expenses.map((exp) => (exp.id === updatedExpense.id ? mapBackendExpenseToUI(updatedExpense) : exp)))
      setSummary((prev) =>
        prev
          ? {
              total_expense: prev.total_expense - editingExpense.amount + amount,
              net_profit: prev.net_profit + editingExpense.amount - amount,
              total_income: prev.total_income,
            }
          : prev
      )
      setShowEditExpenseDialog(false)
      toast.success("Expense updated successfully")
    } catch (error) {
      console.error("Failed to update expense", error)
      toast.error("Failed to update expense")
    }
  }

  // Handle delete expense
  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) {
      return;
    }
  
    try {
      const response = await fetch(`${API_BASE}/api/v1/expenses/${expenseId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
  
      if (!response.ok) {
        // Try to get a more specific error from the backend
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || `Delete expense failed: ${response.status}`);
      }
  
      toast.success("Expense deleted successfully");
  
      // ✅ Trigger a refresh of the summary and expense list
      setRefreshTrigger(t => t + 1);
  
    } catch (error) {
      const err = error as Error;
      console.error("Failed to delete expense", err);
      toast.error(err.message || "Failed to delete expense");
    }
  };

  // Handle update payment (assumed API)
  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPayment) return

    const amount = Number((document.getElementById("editPaymentAmount") as HTMLInputElement).value)
    const collectedBy = (document.getElementById("editPaymentCollectedBy") as HTMLSelectElement).value
    const date = (document.getElementById("editPaymentDate") as HTMLInputElement).value
    const remarks = (document.getElementById("editPaymentRemarks") as HTMLTextAreaElement).value

    if (!amount || !date) {
      toast.error("Please fill in all required fields")
      return
    }

    try {
      const response = await fetch(`${API_BASE}/api/v1/payments/${editingPayment.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          amount_paid: amount,
          amount_collected_by: collectedBy,
          created_at: date,
          payment_status: remarks,
        }),
      })
      if (!response.ok) throw new Error(`Update payment failed: ${response.status}`)
      const updatedPayment = await response.json()
      setPayments(payments.map((pay) => (pay.id === updatedPayment.id ? mapBackendPaymentToUI(updatedPayment) : pay)))
      setSummary((prev) =>
        prev
          ? {
              total_income: prev.total_income - editingPayment.amount + amount,
              net_profit: prev.net_profit - editingPayment.amount + amount,
              total_expense: prev.total_expense,
            }
          : prev
      )
      setShowEditPaymentDialog(false)
      toast.success("Payment updated successfully")
    } catch (error) {
      console.error("Failed to update payment", error)
      toast.error("Failed to update payment")
    }
  }

  const financialSummary = summary
    ? {
        totalIncome: summary.total_income,
        totalExpenses: summary.total_expense,
        netProfit: summary.net_profit,
      }
    : { totalIncome: 0, totalExpenses: 0, netProfit: 0 }

    const ExpensePaginationControls = () => {
      if (totalExpenseCount === 0) return null;
      return (
        <div className="flex flex-col sm:flex-row items-center justify-between mt-4 sm:mt-6 p-3 sm:p-4 glass rounded-lg gap-4">
          <div className="text-xs sm:text-sm text-readable-muted">
            Page {currentExpensePage} of {totalExpensePages} ({totalExpenseCount} expenses)
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentExpensePage(p => p - 1)}
              disabled={currentExpensePage === 1}
              className="glass-button text-xs sm:text-sm"
            >
              <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Previous</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentExpensePage(p => p + 1)}
              disabled={currentExpensePage === totalExpensePages}
              className="glass-button text-xs sm:text-sm"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
          </div>
        </div>
      )
    }

    const PaymentPaginationControls = () => {
      if (totalPaymentCount === 0) return null;
      return (
        <div className="flex flex-col sm:flex-row items-center justify-between mt-4 sm:mt-6 p-3 sm:p-4 glass rounded-lg gap-4">
          <div className="text-xs sm:text-sm text-readable-muted">
            Page {currentPaymentPage} of {totalPaymentPages} ({totalPaymentCount} payments)
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPaymentPage(p => p - 1)}
              disabled={currentPaymentPage === 1}
              className="glass-button text-xs sm:text-sm"
            >
              <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Previous</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPaymentPage(p => p + 1)}
              disabled={currentPaymentPage === totalPaymentPages}
              className="glass-button text-xs sm:text-sm"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
          </div>
        </div>
      )
    }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold heading-primary">Finance Management</h1>
        <div className="flex space-x-2 w-full sm:w-auto">
          <Button className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none">
            <Plus className="w-4 h-4 mr-2" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
          {error}
        </div>
      )}

      {/* Financial Summary Cards */}
      {isLoadingSummary ? (
        <div className="text-center">Loading summary...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6">
          <Card className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 border-green-200 dark:border-green-800">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-400">Total Income</p>
                  <p className="text-lg sm:text-2xl font-bold text-green-900 dark:text-green-300">
                    ₹{financialSummary.totalIncome.toLocaleString()}
                  </p>
                </div>
                <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 dark:text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/30 border-red-200 dark:border-red-800">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-red-700 dark:text-red-400">Total Expenses</p>
                  <p className="text-lg sm:text-2xl font-bold text-red-900 dark:text-red-300">
                    ₹{financialSummary.totalExpenses.toLocaleString()}
                  </p>
                </div>
                <TrendingDown className="w-6 h-6 sm:w-8 sm:h-8 text-red-600 dark:text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-400">Net Profit</p>
                  <p className="text-lg sm:text-2xl font-bold text-blue-900 dark:text-blue-300">
                    ₹{financialSummary.netProfit.toLocaleString()}
                  </p>
                </div>
                <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="add-expense" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="add-expense" className="text-xs sm:text-sm py-2">
            Add Expense
          </TabsTrigger>
          <TabsTrigger value="all-expenses" className="text-xs sm:text-sm py-2">
            All Expenses
          </TabsTrigger>
          <TabsTrigger value="all-payments" className="text-xs sm:text-sm py-2">
            All Payments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="add-expense">
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="flex items-center heading-secondary text-sm sm:text-base">
                <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-red-600" />
                Add Expense
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <form onSubmit={handleAddExpense} className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="expenseAmount" className="heading-tertiary text-sm">
                      Amount (₹) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        id="expenseAmount"
                        type="number"
                        min="0"
                        required
                        placeholder="Enter amount"
                        className="glass-input"
                        value={expenseForm.amount}
                        onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expenseCategory" className="heading-tertiary text-sm">
                      Category <span className="text-red-500">*</span>
                    </Label>
                    <Select
                        required
                        name="expenseCategory"
                        value={expenseForm.category}
                        onValueChange={(val) => setExpenseForm({ ...expenseForm, category: val })}
                      >
                      <SelectTrigger id="expenseCategory" className="glass-input">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expenseDate" className="heading-tertiary text-sm">
                      Expense Date
                    </Label>
                    <Input
                        id="expenseDate"
                        type="date"
                        className="glass-input"
                        value={expenseForm.date}
                        onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                      />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paidBy" className="heading-tertiary text-sm">
                      Paid By
                    </Label>
                    {isLoadingEmployees ? (
                      <div className="text-sm">Loading employees...</div>
                    ) : employees.length === 0 ? (
                      <div className="text-sm text-red-500">No employees available</div>
                    ) : (
                      <Select
                         name="paidBy"
                         value={expenseForm.paidBy}
                         onValueChange={(val) => setExpenseForm({ ...expenseForm, paidBy: val })}
                       >
                        <SelectTrigger id="paidBy" className="glass-input">
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((employee) => (
                            <SelectItem key={employee.id} value={employee.name}>
                              {employee.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expenseRemarks" className="heading-tertiary text-sm">
                    Remarks
                  </Label>
                  <Textarea
                     id="expenseRemarks"
                     placeholder="Enter remarks..."
                     rows={3}
                     className="glass-input"
                     value={expenseForm.remarks}
                     onChange={(e) => setExpenseForm({ ...expenseForm, remarks: e.target.value })}
                   />
                </div>

                <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={isLoadingEmployees}>
                  Add Expense
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all-expenses">
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="heading-secondary text-sm sm:text-base">All Expenses</CardTitle>
                <div className="flex space-x-2">
                  <div className="flex-1 sm:w-64">
                    <Input
                      placeholder="Search expenses..."
                      value={expenseSearchTerm}
                      onChange={(e) => setExpenseSearchTerm(e.target.value)}
                      className="glass-input text-sm"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowExpenseFilters(!showExpenseFilters)}
                    className="glass-button"
                  >
                    <Filter className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {showExpenseFilters && (
                <div className="mt-4 p-3 sm:p-4 glass rounded-lg">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Select>
                      <SelectTrigger className="glass-input">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isLoadingEmployees ? (
                      <div className="text-sm">Loading employees...</div>
                    ) : employees.length === 0 ? (
                      <div className="text-sm text-red-500">No employees available</div>
                    ) : (
                      <Select>
                        <SelectTrigger className="glass-input">
                          <SelectValue placeholder="Employee Name" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((employee) => (
                            <SelectItem key={employee.id} value={employee.name}>
                              {employee.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Input type="date" placeholder="Date" className="glass-input" />
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {isLoadingExpenses ? (
                <div className="text-center">Loading expenses...</div>
              ) : expenses.length === 0 ? (
                <div className="text-center text-readable-muted">No expenses found</div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {expenses.map((expense) => (
                    <Card key={expense.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold heading-tertiary text-sm sm:text-base truncate">
                              {expense.remarks || "No remarks"}
                            </h3>
                            <p className="text-xs sm:text-sm text-readable-muted capitalize">{expense.category}</p>
                          </div>
                          <div className="text-right ml-2">
                            <span className="text-sm sm:text-lg font-bold text-red-600 dark:text-red-400">
                              -₹{expense.amount.toLocaleString()}
                            </span>
                            <div className="flex items-center mt-1 justify-end">
                              <User className="w-3 h-3 sm:w-4 sm:h-4 text-readable-muted mr-1" />
                              <span className="text-xs sm:text-sm text-readable-muted truncate max-w-20 sm:max-w-none">
                                {expense.paidBy || "Unknown"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-xs sm:text-sm text-readable-muted">
                            <p>
                              Date: <span className="heading-tertiary">{expense.date}</span>
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingExpense(expense)
                                setShowEditExpenseDialog(true)
                              }}
                              className="glass-button text-xs sm:text-sm"
                            >
                              <Edit className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="glass-button text-xs sm:text-sm"
                            >
                              <Trash className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              <ExpensePaginationControls />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all-payments">
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="heading-secondary text-sm sm:text-base">All Payments Received</CardTitle>
                <div className="flex space-x-2">
                  <div className="flex-1 sm:w-64">
                    <Input
                      placeholder="Search payments..."
                      value={paymentSearchTerm}
                      onChange={(e) => setPaymentSearchTerm(e.target.value)}
                      className="glass-input text-sm"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowPaymentFilters(!showPaymentFilters)}
                    className="glass-button"
                  >
                    <Filter className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {showPaymentFilters && (
                <div className="mt-4 p-3 sm:p-4 glass rounded-lg">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {isLoadingEmployees ? (
                      <div className="text-sm">Loading employees...</div>
                    ) : employees.length === 0 && collectionMethods.length === 0 ? (
                      <div className="text-sm text-red-500">No collection methods available</div>
                    ) : (
                      <Select>
                        <SelectTrigger className="glass-input">
                          <SelectValue placeholder="Collection Method" />
                        </SelectTrigger>
                        <SelectContent>
                          {collectionMethods.map((method) => (
                            <SelectItem key={method} value={method}>
                              {method}
                            </SelectItem>
                          ))}
                          {employees.map((employee) => (
                            <SelectItem key={employee.id} value={employee.name}>
                              {employee.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Input type="date" placeholder="Date" className="glass-input" />
                    <Input type="number" placeholder="Amount" className="glass-input" />
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {isLoadingPayments ? (
                <div className="text-center">Loading payments...</div>
              ) : payments.length === 0 ? (
                <div className="text-center text-readable-muted">No payments found</div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {payments.map((payment) => (
                    <Card key={payment.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold heading-tertiary text-sm sm:text-base truncate">
                              {payment.clientName || payment.remarks || "Payment Received"}
                            </h3>
                            <p className="text-xs sm:text-sm text-readable-muted">
                              Order ID: {payment.orderId || "N/A"}
                            </p>
                          </div>
                          <div className="text-right ml-2">
                            <span className="text-sm sm:text-lg font-bold text-green-600 dark:text-green-400">
                              +₹{payment.amount.toLocaleString()}
                            </span>
                            <div className="flex items-center mt-1 justify-end">
                              {payment.collectedBy === "Cash" ? (
                                <Banknote className="w-3 h-3 sm:w-4 sm:h-4 text-readable-muted mr-1" />
                              ) : (
                                <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 text-readable-muted mr-1" />
                              )}
                              <span className="text-xs sm:text-sm text-readable-muted truncate max-w-20 sm:max-w-none">
                                {payment.collectedBy || "Unknown"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-xs sm:text-sm text-readable-muted">
                            <p>
                              Date: <span className="heading-tertiary">{payment.date}</span>
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingPayment(payment)
                              setShowEditPaymentDialog(true)
                            }}
                            className="glass-button text-xs sm:text-sm"
                          >
                            <Edit className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              <PaymentPaginationControls />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Expense Dialog */}
      <Dialog open={showEditExpenseDialog} onOpenChange={setShowEditExpenseDialog}>
        <DialogContent className="sm:max-w-[500px] mx-2 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center heading-secondary text-sm sm:text-base">
              <Edit className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600" />
              Edit Expense
            </DialogTitle>
          </DialogHeader>
          {editingExpense && (
            <form onSubmit={handleUpdateExpense} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editExpenseAmount" className="heading-tertiary text-sm">
                    Amount (₹) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="editExpenseAmount"
                    type="number"
                    min="0"
                    required
                    defaultValue={editingExpense.amount}
                    className="glass-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editExpenseCategory" className="heading-tertiary text-sm">
                    Category <span className="text-red-500">*</span>
                  </Label>
                  <Select defaultValue={editingExpense.category} name="editExpenseCategory" required>
                    <SelectTrigger id="editExpenseCategory" className="glass-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editExpensePaidBy" className="heading-tertiary text-sm">
                  Paid By
                </Label>
                {isLoadingEmployees ? (
                  <div className="text-sm">Loading employees...</div>
                ) : employees.length === 0 ? (
                  <div className="text-sm text-red-500">No employees available</div>
                ) : (
                  <Select defaultValue={editingExpense.paidBy} name="editExpensePaidBy">
                    <SelectTrigger id="editExpensePaidBy" className="glass-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.name}>
                          {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="editExpenseDate" className="heading-tertiary text-sm">
                  Date
                </Label>
                <Input id="editExpenseDate" type="date" defaultValue={editingExpense.date} className="glass-input" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editExpenseRemarks" className="heading-tertiary text-sm">
                  Remarks
                </Label>
                <Textarea
                  id="editExpenseRemarks"
                  defaultValue={editingExpense.remarks}
                  rows={3}
                  className="glass-input"
                />
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditExpenseDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={isLoadingEmployees}>
                  Update Expense
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Payment Dialog */}
      <Dialog open={showEditPaymentDialog} onOpenChange={setShowEditPaymentDialog}>
        <DialogContent className="sm:max-w-[500px] mx-2 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center heading-secondary text-sm sm:text-base">
              <Edit className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600" />
              Edit Payment
            </DialogTitle>
          </DialogHeader>
          {editingPayment && (
            <form onSubmit={handleUpdatePayment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editPaymentAmount" className="heading-tertiary text-sm">
                    Amount (₹) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="editPaymentAmount"
                    type="number"
                    min="0"
                    required
                    defaultValue={editingPayment.amount}
                    className="glass-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editPaymentCollectedBy" className="heading-tertiary text-sm">
                    Collected By
                  </Label>
                  {isLoadingEmployees ? (
                    <div className="text-sm">Loading employees...</div>
                  ) : employees.length === 0 && collectionMethods.length === 0 ? (
                    <div className="text-sm text-red-500">No collection methods available</div>
                  ) : (
                    <Select defaultValue={editingPayment.collectedBy} name="editPaymentCollectedBy">
                      <SelectTrigger id="editPaymentCollectedBy" className="glass-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {collectionMethods.map((method) => (
                          <SelectItem key={method} value={method}>
                            {method}
                          </SelectItem>
                        ))}
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.name}>
                            {employee.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPaymentDate" className="heading-tertiary text-sm">
                  Date <span className="text-red-500">*</span>
                </Label>
                <Input id="editPaymentDate" type="date" required defaultValue={editingPayment.date} className="glass-input" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPaymentRemarks" className="heading-tertiary text-sm">
                  Remarks
                </Label>
                <Textarea
                  id="editPaymentRemarks"
                  defaultValue={editingPayment.remarks}
                  rows={3}
                  className="glass-input"
                />
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditPaymentDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={isLoadingEmployees}>
                  Update Payment
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

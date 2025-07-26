"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Search, Plus, Edit, Trash2, User, DollarSign, TrendingUp, TrendingDown } from "lucide-react"

// Interfaces remain the same
interface Employee {
  id: string
  employeeId: string
  name: string
  amountPaid: number
  amountCollected: number
  phone: string
}

interface EmployeesTabProps {
  user?: { username: string }
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"

// Helper function to map backend data to frontend shape
const mapBackendToUI = (emp: any): Employee => ({
  id: emp.id,
  employeeId: emp.employeeId ?? emp.id,
  name: emp.name,
  amountPaid: emp.paid ?? 0,
  amountCollected: emp.collected ?? 0,
  // Ensure phone is always a string for the form
  phone: emp.phone?.toString() ?? "",
})

// Helper to prepare data for the backend
const preparePayload = (data: Partial<Employee>) => {
  return {
    name: data.name,
    // Ensure numbers are numbers, default to 0
    paid: Number(data.amountPaid) || 0,
    collected: Number(data.amountCollected) || 0,
    // **KEY FIX**: Convert empty phone string to null for the backend
    phone: data.phone ? Number(data.phone) : null,
  }
}

export function EmployeesTab({ user }: EmployeesTabProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  
  // Fetch employees on component mount
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/employees`)
        if (!res.ok) throw new Error(`Failed: ${res.status}`)
        const data = await res.json()
        setEmployees(data.items.map(mapBackendToUI))
      } catch (err) {
        console.error("Error fetching employees", err)
      }
    }
    fetchEmployees()
  }, [])

  // Client-side filtering
  const filteredEmployees = employees.filter(
    (employee) =>
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Calculated stats
  const totalAmountPaid = employees.reduce((sum, emp) => sum + emp.amountPaid, 0)
  const totalAmountCollected = employees.reduce((sum, emp) => sum + emp.amountCollected, 0)

  // Helper functions
  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase()
  const formatCurrency = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount)

  // API Handlers
  const handleAddEmployee = async (employeeData: Partial<Employee>) => {
    try {
      const payload = preparePayload(employeeData)
      const res = await fetch(`${API_BASE}/api/v1/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`Failed: ${res.status} ${await res.text()}`)
      const newEmp = mapBackendToUI(await res.json())
      setEmployees((prev) => [...prev, newEmp])
      setIsAddDialogOpen(false)
    } catch (err) {
      console.error("Error adding employee", err)
    }
  }

  const handleEditEmployee = async (employeeData: Partial<Employee>) => {
    if (!selectedEmployee) return
    try {
      const payload = preparePayload(employeeData)
      const res = await fetch(`${API_BASE}/api/v1/employees/${selectedEmployee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`Failed: ${res.status} ${await res.text()}`)
      const updated = mapBackendToUI(await res.json())
      setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
      setIsEditDialogOpen(false)
    } catch (err) {
      console.error("Error updating employee", err)
    }
  }

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/employees/${employeeId}`, { method: "DELETE" })
      if (!res.ok) throw new Error(`Failed: ${res.status}`)
      setEmployees((prev) => prev.filter((e) => e.id !== employeeId))
    } catch (err) {
      console.error("Error deleting employee", err)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-readable">Employee Management</h1>
          <p className="text-sm text-readable-muted">Manage employee details and track payments</p>
        </div>
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Employee
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-readable-muted">Total Employees</CardTitle>
            <User className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-readable">{employees.length}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-readable-muted">Total Paid</CardTitle>
            <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-readable">{formatCurrency(totalAmountPaid)}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-readable-muted">Total Collected</CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-readable">{formatCurrency(totalAmountCollected)}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-readable-muted">Net Balance</CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-bold text-readable">{formatCurrency(totalAmountCollected - totalAmountPaid)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-readable-muted h-4 w-4" />
        <Input
          placeholder="Search employees by name or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 glass-input"
        />
      </div>

      {/* Employee Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {filteredEmployees.map((employee) => (
          <Card key={employee.id} className="glass-card hover:shadow-lg transition-all duration-200 flex flex-col">
            <CardHeader className="pb-3 p-3 sm:p-4">
              <div className="flex items-center space-x-3">
                <Avatar className="w-10 h-10 sm:w-12 sm:h-12">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500/20 to-cyan-600/20 text-blue-600 dark:text-blue-400 font-semibold text-xs sm:text-sm">
                    {getInitials(employee.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-sm sm:text-lg text-readable truncate">{employee.name}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-readable-muted">
                    ID: {employee.employeeId}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 pt-0 flex-grow flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <span className="text-xs sm:text-sm text-readable-muted">Paid</span>
                  <span className="font-semibold text-red-600 dark:text-red-400 text-xs sm:text-sm">{formatCurrency(employee.amountPaid)}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <span className="text-xs sm:text-sm text-readable-muted">Collected</span>
                  <span className="font-semibold text-green-600 dark:text-green-400 text-xs sm:text-sm">{formatCurrency(employee.amountCollected)}</span>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 glass-button bg-transparent text-xs sm:text-sm"
                  onClick={() => {
                    setSelectedEmployee(employee)
                    setIsEditDialogOpen(true)
                  }}
                >
                  <Edit className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  Edit
                </Button>
                {/* DELETE BUTTON WITH CONFIRMATION */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 bg-transparent"
                    >
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="glass-card">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete <strong>{employee.name}</strong> and all their associated data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteEmployee(employee.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Yes, delete employee
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No Employees Message */}
      {filteredEmployees.length === 0 && (
         <div className="text-center py-8 sm:py-12">
           <User className="w-10 h-10 sm:w-12 sm:h-12 text-readable-muted mx-auto mb-4" />
           <h3 className="text-base sm:text-lg font-medium text-readable mb-2">No employees found</h3>
           <p className="text-sm text-readable-muted">
             {searchTerm ? "Try adjusting your search terms." : "Add your first employee to get started."}
           </p>
         </div>
      )}

      {/* Add Employee Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="glass-card max-w-md mx-2 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-readable">Add New Employee</DialogTitle>
            <DialogDescription className="text-readable-muted">Enter the employee details below.</DialogDescription>
          </DialogHeader>
          <EmployeeForm onSubmit={handleAddEmployee} onDone={() => setIsAddDialogOpen(false)} />
        </DialogContent>
      </Dialog>
      
      {/* Edit Employee Dialog (Single instance) */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="glass-card max-w-md mx-2 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-readable">Edit Employee</DialogTitle>
            <DialogDescription className="text-readable-muted">Update the employee details below.</DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <EmployeeForm
              employee={selectedEmployee}
              onSubmit={handleEditEmployee}
              onDone={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Employee Form Sub-component (Slightly modified to handle closing the dialog)
function EmployeeForm({
  employee,
  onSubmit,
  onDone,
}: {
  employee?: Employee
  onSubmit: (data: Partial<Employee>) => void
  onDone: () => void
}) {
  const [formData, setFormData] = useState({
    name: employee?.name || "",
    amountPaid: employee?.amountPaid || 0,
    amountCollected: employee?.amountCollected || 0,
    phone: employee?.phone || "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name" className="text-readable text-sm">Full Name</Label>
          <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="glass-input" required />
        </div>
        <div>
          <Label htmlFor="phone" className="text-readable text-sm">Phone</Label>
          <Input id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="glass-input" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="amountPaid" className="text-readable text-sm">Amount Paid (₹)</Label>
          <Input id="amountPaid" type="number" value={formData.amountPaid} onChange={(e) => setFormData({ ...formData, amountPaid: Number(e.target.value) })} className="glass-input" min="0" />
        </div>
        <div>
          <Label htmlFor="amountCollected" className="text-readable text-sm">Amount Collected (₹)</Label>
          <Input id="amountCollected" type="number" value={formData.amountCollected} onChange={(e) => setFormData({ ...formData, amountCollected: Number(e.target.value) })} className="glass-input" min="0" />
        </div>
      </div>
      <DialogFooter className="flex-col gap-2 sm:flex-row">
         <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
        <Button type="submit" className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white">
          {employee ? "Update Employee" : "Add Employee"}
        </Button>
      </DialogFooter>
    </form>
  )
}
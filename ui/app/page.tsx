"use client"

import { useState, useEffect } from "react"
import { LoginPage } from "@/components/login-page"
import { Sidebar } from "@/components/sidebar"
import { InventoryTab } from "@/components/inventory-tab"
import { OrdersTab } from "@/components/orders-tab"
import { ClientsTab } from "@/components/clients-tab"
import { SuppliersTab } from "@/components/suppliers-tab"
import { InvoicesTab } from "@/components/invoices-tab"
import { FinanceTab } from "@/components/finance-tab"
import { DashboardTab } from "@/components/dashboard-tab"
import { ChatbotTab } from "@/components/chatbot-tab"
import { NotificationsProvider } from "@/components/notifications-provider"
import { useMobile } from "@/hooks/use-mobile"
import { EmployeesTab } from "@/components/employees-tab"
import { Logs } from "@/components/logs"


export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [user, setUser] = useState<{ username: string } | null>(null)
  const isMobile = useMobile()

  useEffect(() => {
    // Check if user is logged in (from localStorage)
    const savedUser = localStorage.getItem("user")
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
  }, [])

  const handleLogin = (userData: { username: string }) => {
    setUser(userData)
    localStorage.setItem("user", JSON.stringify(userData))
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem("user")
  }

  // Function to handle navigation from dashboard
  const handleNavigateToTab = (tabName: string) => {
    setActiveTab(tabName)
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardTab onNavigateToTab={handleNavigateToTab} />
      case "inventory":
        return <InventoryTab />
      case "orders":
        return <OrdersTab user={user} />
      case "clients":
        return <ClientsTab />
      case "suppliers":
        return <SuppliersTab />
      case "invoices":
        return <InvoicesTab />
      case "finance":
        return <FinanceTab />
      case "chatbot":
        return <ChatbotTab />
      case "employees":
        return <EmployeesTab user={user} />
      case "logs":
        return <Logs />
      default:
        return <DashboardTab onNavigateToTab={handleNavigateToTab} />
    }
  }

  return (
    <NotificationsProvider>
      <div className="flex h-screen bg-background">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={handleLogout} />
        <main className={`flex-1 overflow-auto ${isMobile ? "w-full" : "ml-64"}`}>
          <div className={`p-3 sm:p-4 md:p-6 pt-16 md:pt-6`}>{renderActiveTab()}</div>
        </main>
      </div>
    </NotificationsProvider>
  )
}

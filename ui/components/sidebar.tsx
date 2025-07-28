"use client"

import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Truck,
  FileText,
  DollarSign,
  Bot,
  Building2,
  LogOut,
  Bell,
  Sun,
  Moon,
  Laptop,
  Menu,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useTheme } from "next-themes"
import { useNotifications } from "@/components/notifications-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import { useMobile } from "@/hooks/use-mobile"

interface SidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  user: {
    name: string
    email: string
    role: string
  }
  onLogout: () => void
}

const navigation = [
  { id: "dashboard", name: "Dashboard", icon: LayoutDashboard },
  { id: "inventory", name: "Inventory", icon: Package },
  { id: "orders", name: "Orders", icon: ShoppingCart },
  { id: "clients", name: "Clients", icon: Users },
  { id: "suppliers", name: "Suppliers", icon: Truck },
  { id: "employees", name: "Employees", icon: Users },
  { id: "invoices", name: "View Orders", icon: FileText },
  { id: "finance", name: "Finance", icon: DollarSign },
  { id: "chatbot", name: "AI Assistant", icon: Bot },  
  { id: "logs", name: "Logs", icon: FileText },
]

export function Sidebar({ activeTab, setActiveTab, user, onLogout }: SidebarProps) {
  const { theme, setTheme } = useTheme()
  const { notifications, markAsRead } = useNotifications()
  const [mounted, setMounted] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isMobile = useMobile()

  // After mounting, we can safely show the UI
  useEffect(() => {
    setMounted(true)
  }, [])

  // Close sidebar when changing tabs on mobile
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    if (isMobile) {
      setSidebarOpen(false)
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  const getInitials = (name?: string) => {
    if (!name || typeof name !== "string") return "NA"
    return name.substring(0, 2).toUpperCase()
  }
  

  if (!mounted) {
    return (
      <div className="w-64 glass-sidebar">
        <div className="p-6 border-b border-white/20 dark:border-slate-700/30">Loading...</div>
      </div>
    )
  }

  // Mobile hamburger menu
  if (isMobile && !sidebarOpen) {
    return (
      <div className="fixed top-0 left-0 z-40 p-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSidebarOpen(true)}
          className="glass-button text-readable shadow-lg"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "fixed inset-y-0 left-0 z-40 glass-sidebar flex flex-col shadow-2xl transition-all duration-300",
        isMobile ? "w-[85%] max-w-[300px]" : "w-64",
        isMobile && !sidebarOpen && "transform -translate-x-full",
      )}
    >
      <div className="p-6 border-b border-white/20 dark:border-slate-700/30 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-readable">Business Suite</h1>
            <p className="text-xs text-readable-muted">Balaji Health Care</p>
          </div>
        </div>

        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
            className="text-readable-muted hover:text-readable"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <nav className="mt-6 px-3 flex-1 overflow-y-auto">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.id}>
                <button
                  onClick={() => handleTabChange(item.id)}
                  className={cn(
                    "w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200",
                    activeTab === item.id
                      ? "bg-gradient-to-r from-blue-500/20 to-cyan-600/20 text-blue-600 dark:text-blue-400 shadow-lg backdrop-blur-sm border border-blue-200/30 dark:border-blue-500/30"
                      : "text-readable-muted hover:bg-white/30 dark:hover:bg-slate-800/30 hover:text-readable backdrop-blur-sm",
                  )}
                >
                  <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                  <span className="truncate">{item.name}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Action Buttons */}
      <div className="p-3 border-t border-white/20 dark:border-slate-700/30">
        <div className="flex items-center justify-between mb-3">
          {/* Theme Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 glass-button text-readable">
                {theme === "light" && <Sun className="h-4 w-4" />}
                {theme === "dark" && <Moon className="h-4 w-4" />}
                {theme === "system" && <Laptop className="h-4 w-4" />}
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-card">
              <DropdownMenuItem onClick={() => setTheme("light")} className="text-readable">
                <Sun className="mr-2 h-4 w-4" />
                <span>Light</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")} className="text-readable">
                <Moon className="mr-2 h-4 w-4" />
                <span>Dark</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")} className="text-readable">
                <Laptop className="mr-2 h-4 w-4" />
                <span>System</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 relative glass-button text-readable">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <Badge
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0"
                    variant="destructive"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 glass-card max-h-96 overflow-y-auto">
              <DropdownMenuLabel className="text-readable">Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="py-2 px-4 text-center text-sm text-readable-muted">No notifications</div>
              ) : (
                notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className={cn(
                      "flex flex-col items-start p-3 cursor-pointer text-readable",
                      !notification.read && "bg-blue-50/50 dark:bg-blue-950/30",
                    )}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium text-readable">{notification.title}</span>
                      {!notification.read && (
                        <Badge variant="outline" className="text-xs">
                          New
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-readable-muted mt-1">{notification.message}</p>
                    <span className="text-xs text-readable-subtle mt-1">
                      {new Date(notification.timestamp).toLocaleString()}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* User Profile Section */}
      <div className="p-4 border-t border-white/20 dark:border-slate-700/30">
        <div className="flex items-center space-x-3 mb-3">
          <Avatar className="w-10 h-10 shadow-lg">
            <AvatarFallback className="bg-gradient-to-br from-blue-500/20 to-cyan-600/20 text-blue-600 dark:text-blue-400 font-semibold">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-readable">{user.name}</p>
            <p className="text-xs text-readable-muted">Balaji Health Care</p>
          </div>
        </div>
        <Button
          onClick={onLogout}
          variant="outline"
          size="sm"
          className="w-full glass-button text-readable-muted hover:text-blue-500 dark:hover:text-blue-400"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  )
}

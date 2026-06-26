"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { apiUrl } from "@/lib/config"
import { DEMO_MODE } from "@/lib/demo-auth"
import { demoInventory, demoClients } from "@/lib/demo-data"

export interface Notification {
  id: string
  title: string
  message: string
  timestamp: number
  read: boolean
  type: "info" | "warning" | "success" | "error"
}

interface NotificationsContextType {
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void
  markAsRead: (id: string) => void
  clearNotifications: () => void
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined)

/** Derive business alerts (low stock, expiring soon, dues) for the demo. */
function derivedAlerts(): Notification[] {
  const now = Date.now()
  const alerts: Notification[] = []

  demoInventory
    .filter((i) => i.stock_quantity <= i.low_stock_threshold)
    .forEach((i, idx) =>
      alerts.push({
        id: `lowstock-${idx}`,
        title: "Low stock alert",
        message: `${i.name} is low — only ${i.stock_quantity} left (threshold ${i.low_stock_threshold}).`,
        timestamp: now - idx * 60000,
        read: false,
        type: "warning",
      }),
    )

  const soon = new Date()
  soon.setMonth(soon.getMonth() + 2)
  demoInventory.forEach((i, idx) => {
    const b = i.batches?.[0]
    if (b && new Date(b.Expiry) <= soon) {
      alerts.push({
        id: `expiry-${idx}`,
        title: "Expiring soon",
        message: `${i.name} (batch ${b.batch_number}) expires ${new Date(b.Expiry).toLocaleDateString("en-IN")}.`,
        timestamp: now - (idx + 5) * 60000,
        read: false,
        type: "warning",
      })
    }
  })

  const topDue = [...demoClients].filter((c) => c.due_amount > 0).sort((a, b) => b.due_amount - a.due_amount)[0]
  if (topDue) {
    alerts.push({
      id: "dues-top",
      title: "Outstanding dues",
      message: `${topDue.name} has the highest outstanding balance: ₹${topDue.due_amount.toLocaleString("en-IN")}.`,
      timestamp: now - 30000,
      read: false,
      type: "info",
    })
  }

  return alerts
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  // Load notifications from logs (+ derived business alerts in demo mode).
  useEffect(() => {
    async function fetchNotifications() {
      const collected: Notification[] = DEMO_MODE ? derivedAlerts() : []
      try {
        const response = await fetch(apiUrl("/api/v1/logs"))
        const data = await response.json()

        if (Array.isArray(data.logs)) {
          const logNotifications: Notification[] = data.logs
            .map((log: any, index: number) => ({
              id: `log-${index}`,
              title: "Activity",
              message: log.message,
              timestamp: Date.now() - index * 1000,
              read: false,
              type: "info" as const,
            }))
            .reverse()
            .slice(0, 15)
          collected.push(...logNotifications)
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error)
      }
      setNotifications(collected.slice(0, 20))
    }

    fetchNotifications()
  }, [])

  const addNotification = (notification: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: Date.now(),
      read: false,
    }
    setNotifications((prev) => [newNotification, ...prev])
  }

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
    )
  }

  const clearNotifications = () => {
    setNotifications([])
  }

  return (
    <NotificationsContext.Provider value={{ notifications, addNotification, markAsRead, clearNotifications }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationsContext)
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationsProvider")
  }
  return context
}

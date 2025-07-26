"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

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

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  // Load notifications from API on mount
  useEffect(() => {
    async function fetchNotifications() {
      try {
        const response = await fetch("http://localhost:8000/api/v1/logs")
        const data = await response.json()

        if (Array.isArray(data.logs)) {
          const fetchedNotifications: Notification[] = data.logs.map((log: any, index: number) => ({
            id: `${Date.now()}-${index}`,
            title: "System Log",
            message: log.message,
            timestamp: Date.now(),
            read: false,
            type: "info",
          }))
          .reverse()
          .slice(0,15)
          setNotifications(fetchedNotifications)
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error)
      }
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

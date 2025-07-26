"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, AlertCircle, FileText } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

interface LogEntry {
  message: string
}

export function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/v1/logs")
        if (!response.ok) throw new Error("Failed to fetch logs")
        const data = await response.json()
        setLogs((data.logs || []).reverse())
      } catch (err: any) {
        setError(err.message || "Error loading logs")
      } finally {
        setLoading(false)
      }
    }

    fetchLogs()
  }, [])

  return (
    <Card className="glass-card">
      <CardHeader className="border-b border-white/20 dark:border-gray-700/30">
        <CardTitle className="flex items-center justify-between heading-secondary">
          <div className="flex items-center">
            <FileText className="w-5 h-5 mr-2 text-red-600 dark:text-red-400" />
            System Logs
          </div>
          <Badge
            variant="secondary"
            className="bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-600 dark:text-red-400 border-0"
          >
            {loading ? "Loading..." : `${logs.length} Logs`}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        {error ? (
          <Alert variant="destructive" className="m-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="ml-2 text-sm text-red-700 dark:text-red-400">
              {error}
            </AlertDescription>
          </Alert>
        ) : loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="w-5 h-5 animate-spin text-red-600" />
            <span className="ml-2 text-sm text-readable-muted">Fetching logs...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-6 text-sm text-center text-readable-muted">No logs available.</div>
        ) : (
          <ScrollArea className="h-[400px] p-4">
            <div className="space-y-3">
              {logs.map((log, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-sm text-red-900 dark:text-red-200 shadow-sm backdrop-blur-md"
                >
                  {log.message}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

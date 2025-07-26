"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Building2, Lock, User } from "lucide-react"

interface LoginPageProps {
  onLogin: (userData: { email: string; role: string; name: string }) => void
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email || !formData.password) {
      alert("Please fill in all fields")
      return
    }

    try {
      setLoading(true)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      })

      if (!res.ok) {
        throw new Error("Invalid credentials")
      }

      const data = await res.json()
      onLogin(data)
    } catch (err: any) {
      alert(err.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-cyan-50/30 to-sky-50/50 dark:from-blue-950/20 dark:via-cyan-950/10 dark:to-sky-950/20"></div>

      <Card className="w-full max-w-md glass-card relative z-10 shadow-2xl">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg animate-pulse-blue">
              <Building2 className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold text-readable bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Business Suite
          </CardTitle>
          <p className="text-sm sm:text-base text-readable-muted font-medium">Balaji Health Care</p>
          <p className="text-xs text-readable-subtle mt-1">Complete Business Management Solution</p>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center text-readable text-sm">
                <User className="w-4 h-4 mr-2 text-blue-500" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                required
                className="glass-input text-readable placeholder:text-readable-subtle focus-blue transition-all duration-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center text-readable text-sm">
                <Lock className="w-4 h-4 mr-2 text-blue-500" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                required
                className="glass-input text-readable placeholder:text-readable-subtle focus-blue transition-all duration-200"
              />
            </div>

            <Button
              type="submit"
              className="w-full mt-6 btn-blue text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              disabled={loading}
            >
              {loading ? "Signing In..." : "Sign In to Business Suite"}
            </Button>
          </form>

          <div className="mt-6 p-3 sm:p-4 glass rounded-lg border border-blue-200/30 dark:border-blue-700/30">
            <p className="text-xs sm:text-sm text-readable-muted text-center">
              <strong className="text-blue-600 dark:text-blue-400">Access:</strong> Only authorized users may log in
            </p>
            <p className="text-xs text-readable-subtle text-center mt-1">
              Powered by AI • Built for Healthcare Excellence
            </p>
          </div>

          <div className="mt-4 flex justify-center space-x-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
            <div className="w-2 h-2 bg-sky-400 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }}></div>
          </div>
        </CardContent>
      </Card>

      <div className="absolute top-10 left-10 w-20 h-20 bg-blue-400/10 rounded-full blur-xl"></div>
      <div className="absolute bottom-10 right-10 w-32 h-32 bg-cyan-400/10 rounded-full blur-xl"></div>
      <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-sky-400/10 rounded-full blur-xl"></div>
    </div>
  )
}

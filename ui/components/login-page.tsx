"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Building2, Lock, User, Sparkles, Loader2 } from "lucide-react"
import { API_BASE_URL } from "@/lib/config"
import { DEMO_MODE, PRIMARY_DEMO_USER, demoLogin } from "@/lib/demo-auth"

interface LoginPageProps {
  onLogin: (userData: { email: string; role: string; name: string }) => void
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [formData, setFormData] = useState({ email: "", password: "" })
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.email || !formData.password) {
      setError("Please fill in all fields")
      return
    }

    setLoading(true)

    // 1) Demo accounts always work (no backend needed).
    const demoUser = demoLogin(formData.email, formData.password)
    if (demoUser) {
      onLogin(demoUser)
      setLoading(false)
      return
    }

    // 2) Otherwise authenticate against the real backend.
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      })

      if (!res.ok) {
        throw new Error("Invalid credentials")
      }

      const data = await res.json()
      onLogin(data)
    } catch (err: any) {
      setError(
        DEMO_MODE
          ? "Those credentials didn't match. Use the quick sign-in below."
          : err.message || "Login failed",
      )
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = () => {
    setError(null)
    setDemoLoading(true)
    // Brief, intentional pause so entering the workspace feels deliberate.
    setTimeout(() => onLogin(PRIMARY_DEMO_USER), 450)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-cyan-50/40 to-sky-100 dark:from-slate-950 dark:via-blue-950/40 dark:to-slate-900" />
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.4] dark:opacity-[0.15]" />

      <Card className="w-full max-w-md glass-card relative z-10 shadow-2xl animate-fade-in">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Building2 className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold gradient-text-blue">
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
                className="glass-input text-readable placeholder:text-readable-subtle focus-ring transition-all duration-200"
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
                className="glass-input text-readable placeholder:text-readable-subtle focus-ring transition-all duration-200"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center" role="alert">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full mt-2 btn-blue text-white shadow-lg shadow-blue-500/20 hover:shadow-xl transition-all duration-200"
              disabled={loading || demoLoading}
            >
              {loading ? "Signing In..." : "Sign In to Business Suite"}
            </Button>
          </form>

          {DEMO_MODE && (
            <div className="mt-5 text-center">
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-blue-200/40 dark:border-blue-800/40" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-transparent px-2 text-readable-subtle">or</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={demoLoading}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline underline-offset-4 transition-colors disabled:opacity-60"
              >
                {demoLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Opening workspace…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Explore with sample data
                  </>
                )}
              </button>
            </div>
          )}

          <p className="text-xs text-readable-subtle text-center mt-4">
            Powered by AI • Built for Healthcare Excellence
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

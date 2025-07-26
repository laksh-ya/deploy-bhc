"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, DollarSign, ShoppingCart, FileText, Receipt, Calendar, Heart, BarChart3 } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  
} from "recharts"

interface DashboardTabProps {
  onNavigateToTab?: (tabName: string) => void
}

interface MetricsData {
  totalSales: { amount: number; count: number }
  salesOrders: { amount: number; count: number }
  deliveryChallan: { amount: number; count: number }
  totalPurchase: { amount: number; count: number }
  totalExpense: { amount: number; count: number }
}

interface ChartData {
  salesOrdersCount: number[]
  deliveryChallanCount: number[]
  salesAmount: number[]
  expenseAmount: number[]
}

// Helper function to format "YYYY-MM" into a readable label like "July 2025"
const formatMonthLabel = (monthStr: string): string => {
  const [year, month] = monthStr.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return date.toLocaleString('default', { month: 'long', year: 'numeric' })
}

export function DashboardTab({ onNavigateToTab }: DashboardTabProps) {
  const [timePeriod, setTimePeriod] = useState("monthly")
  // Initialize selectedMonth as empty; it will be set after fetching available months.
  const [selectedMonth, setSelectedMonth] = useState("")
  // State to hold the months fetched from the API for the dropdown
  const [availableMonths, setAvailableMonths] = useState<{ value: string; label: string }[]>([])

  const [metricsData, setMetricsData] = useState<MetricsData | null>(null)
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // useEffect to fetch the list of available months from the API on component mount
  useEffect(() => {
    const fetchAvailableMonths = async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      try {
        const res = await fetch(`${apiUrl}/api/v1/dashboard/months`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
        })

        if (!res.ok) {
          throw new Error("Could not fetch available months")
        }

        const monthStrings: string[] = await res.json()

        if (monthStrings && monthStrings.length > 0) {
          const formattedMonths = monthStrings.map(monthStr => ({
            value: monthStr,
            label: formatMonthLabel(monthStr),
          }))
          setAvailableMonths(formattedMonths)
          // Set the most recent month (first in the sorted list) as the default selection
          setSelectedMonth(monthStrings[0])
        } else {
          setError("No monthly data available to display.")
          setIsLoading(false)
        }
      } catch (err: any) {
        setError(err.message || "Failed to load month options.")
        setIsLoading(false)
        console.error(err)
      }
    }

    fetchAvailableMonths()
  }, []) // Empty dependency array ensures this runs only once

  // Fetch main dashboard data based on time period and selected month
  useEffect(() => {
    // Prevent fetching if in monthly view but no month has been selected yet
    if (timePeriod === "monthly" && !selectedMonth) {
      return
    }

    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

      try {
        const orderStatsUrl =
          timePeriod === "monthly"
            ? `${apiUrl}/api/v1/all-orders/stats?month=${selectedMonth}`
            : `${apiUrl}/api/v1/all-orders/stats`

        const expenseStatsUrl =
          timePeriod === "monthly"
            ? `${apiUrl}/api/v1/dashboard-expenses/stats?month=${selectedMonth}`
            : `${apiUrl}/api/v1/dashboard-expenses/stats`

        const chartDataUrl = `${apiUrl}/api/v1/dashboard/charts`

        const [orderRes, expenseRes, chartRes] = await Promise.all([
          fetch(orderStatsUrl, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
          }),
          fetch(expenseStatsUrl, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
          }),
          fetch(chartDataUrl, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
          }),
        ])

        if (!orderRes.ok || !expenseRes.ok || !chartRes.ok) {
          throw new Error(`Failed to fetch some dashboard data`)
        }

        const orderData = await orderRes.json()
        const expenseData = await expenseRes.json()
        const chartRaw = await chartRes.json()

        const expenseAmountLakh = (expenseData.total_expense_amount ?? 0)  
        const expenseCount = expenseData.total_expense_count ?? 0

        if (timePeriod === "monthly") {
          setMetricsData({
            totalSales: {
              amount:
                (orderData.sales_orders_amount ?? 0)  +
                (orderData.delivery_challan_amount ?? 0) ,
              count: (orderData.sales_orders_count ?? 0) + (orderData.delivery_challan_count ?? 0),
            },
            salesOrders: {
              amount: (orderData.sales_orders_amount ?? 0),
              count: orderData.sales_orders_count ?? 0,
            },
            deliveryChallan: {
              amount: (orderData.delivery_challan_amount ?? 0),
              count: orderData.delivery_challan_count ?? 0,
            },
            totalPurchase: {
              amount: (orderData.purchase_orders_amount ?? 0),
              count: orderData.purchase_orders_count ?? 0,
            },
            totalExpense: { amount: expenseAmountLakh, count: expenseCount },
          })
        } else {
          // ✅ FIX: Correctly access the .count and .amount properties from the API response objects
          setMetricsData({
            totalSales: {
              amount: (orderData.total_sales?.amount ?? 0) + (orderData.delivery_challan?.amount ?? 0),
              count: (orderData.total_sales?.count ?? 0) + (orderData.delivery_challan?.count ?? 0),
            },
            salesOrders: { 
              amount: orderData.total_sales?.amount ?? 0, 
              count: orderData.total_sales?.count ?? 0 
            },
            deliveryChallan: {
              amount: orderData.delivery_challan?.amount ?? 0,
              count: orderData.delivery_challan?.count ?? 0,
            },
            totalPurchase: { 
              amount: orderData.total_purchase?.amount ?? 0, 
              count: orderData.total_purchase?.count ?? 0 
            },
            totalExpense: { 
              amount: expenseData.total_expense_amount ?? 0, 
              count: expenseData.total_expense_count ?? 0 
            },
          });
        }

        const salesOrdersCount = chartRaw.map((m: any) => m.sales_orders_count || 0)
        const deliveryChallanCount = chartRaw.map((m: any) => m.delivery_challan_count || 0)
        const salesAmount = chartRaw.map((m: any) => (m.sales_orders_amount || 0) )
        const expenseAmount = chartRaw.map((m: any) => (m.expense_amount || 0))

        setChartData({ salesOrdersCount, deliveryChallanCount, salesAmount, expenseAmount })
      } catch (err: any) {
        setError("Failed to load dashboard data. Please try again.")
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [timePeriod, selectedMonth])

  const formatAmount = (amount: number) => `₹${amount.toFixed(2)}`
  
  const salesOrdersChartData = chartData?.salesOrdersCount?.map((value, i) => ({ label: `P${i + 1}`, value })) ?? []
  const deliveryChallanChartData = chartData?.deliveryChallanCount?.map((value, i) => ({ label: `P${i + 1}`, value })) ?? []
  const salesAmountChartData = chartData?.salesAmount?.map((value, i) => ({ label: `P${i + 1}`, value })) ?? []
  const expenseAmountChartData = chartData?.expenseAmount?.map((value, i) => ({ label: `P${i + 1}`, value })) ?? []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-readable-muted">Loading dashboard data...</p>
      </div>
    )
  }

  if (error || !metricsData || !chartData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-500">{error || "No data available"}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-red-500 to-pink-600 rounded-lg flex items-center justify-center">
            <Heart className="w-3 h-3 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold heading-primary">Business Dashboard</h1>
            <p className="text-xs sm:text-sm text-readable-muted">Balaji Health Care - Key Metrics</p>
          </div>
        </div>

        {/* Time Period Toggle */}
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-3">
          <div className="flex items-center space-x-2 text-xs text-readable-muted">
            <Calendar className="w-3 h-3" />
            <span className="hidden sm:inline">Last updated: Today, 2:30 PM</span>
            <span className="sm:hidden">Updated: Today</span>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={timePeriod} onValueChange={setTimePeriod}>
              <SelectTrigger className="w-24 sm:w-32 glass-button text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="alltime">All Time</SelectItem>
              </SelectContent>
            </Select>

            {timePeriod === "monthly" && (
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-32 sm:w-40 glass-button text-xs sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {/* Render dropdown items from the fetched 'availableMonths' state */}
                  {availableMonths.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      {/* Key Metrics Cards and Charts (Rest of the component remains the same) */}
      {/* ... */}
      <div className="space-y-4 sm:space-y-6">
        {/* Total Sales - Most Important Card */}
        <Card className="glass-card hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] borderSPA-2 border-green-200/50 dark:border-green-500/30 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-readable-muted mb-2">Total Sales</p>
                <p className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-green-600 dark:text-green-400 mb-2">
                  {formatAmount(metricsData.totalSales.amount)}
                </p>
                <p className="text-sm sm:text-base lg:text-lg font-semibold heading-primary">
                  {metricsData.totalSales.count} Orders
                </p>
              </div>
              <div className="p-3 sm:p-4 rounded-3xl bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-sm">
                <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sales Sub-components */}
        <div className="ml-2 sm:ml-4 border-l-2 sm:border-l-4 border-green-200 dark:border-green-700 pl-3 sm:pl-6 space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {/* Sales Orders */}
            <Card className="glass-card hover:shadow-xl transition-all duration-300 hover:scale-105 border border-blue-200/50 dark:border-blue-500/30">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-readable-muted mb-1">Sales Orders</p>
                    <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                      {formatAmount(metricsData.salesOrders.amount)}
                    </p>
                    <p className="text-xs sm:text-sm font-semibold heading-primary">
                      {metricsData.salesOrders.count} Orders
                    </p>
                  </div>
                  <div className="p-2 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-sm">
                    <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Challan */}
            <Card className="glass-card hover:shadow-xl transition-all duration-300 hover:scale-105 border border-purple-200/50 dark:border-purple-500/30">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-readable-muted mb-1">Delivery Challan</p>
                    <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                      {formatAmount(metricsData.deliveryChallan.amount)}
                    </p>
                    <p className="text-xs sm:text-sm font-semibold heading-primary">
                      {metricsData.deliveryChallan.count} Orders
                    </p>
                  </div>
                  <div className="p-2 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-sm">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Purchase and Expense */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {/* Total Purchase */}
          <Card className="glass-card hover:shadow-xl transition-all duration-300 hover:scale-105 border border-orange-200/50 dark:border-orange-500/30">
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium text-readable-muted mb-1">Total Purchase</p>
                  <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-orange-600 dark:text-orange-400 mb-1">
                    {formatAmount(metricsData.totalPurchase.amount)}
                  </p>
                  <p className="text-xs sm:text-sm font-semibold heading-primary">
                    {metricsData.totalPurchase.count} Orders
                  </p>
                </div>
                <div className="p-2 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 backdrop-blur-sm">
                  <Receipt className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Expense */}
          <Card className="glass-card hover:shadow-xl transition-all duration-300 hover:scale-105 border border-red-200/50 dark:border-red-500/30">
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium text-readable-muted mb-1">Total Expense</p>
                  <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-red-600 dark:text-red-400 mb-1">
                    {formatAmount(metricsData.totalExpense.amount)}
                  </p>
                  <p className="text-xs sm:text-sm font-semibold heading-primary">
                    {metricsData.totalExpense.count} Expenses
                  </p>
                </div>
                <div className="p-2 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/20 backdrop-blur-sm">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Sales Orders Count Chart */}
        <Card className="glass-card">
          <CardHeader className="p-3 sm:p-4 lg:p-6">
    <CardTitle className="flex items-center heading-secondary text-sm sm:text-base lg:text-lg">
      <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 mr-2" />
      <span className="truncate">{timePeriod === "monthly" ? "Monthly" : "All Time"} Sales Orders Count</span>
    </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
            <div className="h-40 sm:h-48 lg:h-64 glass rounded-xl overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesOrdersChartData}>
                  <defs>
                    <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '10px'
                    }} 
                  />
                  <Area type="monotone" dataKey="value" stroke="none" fill="url(#colorBlue)" />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3b82f6" 
                    strokeWidth={3} 
                    dot={false}
                    className="line-glow-blue" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
                  
        {/* Delivery Challan Count Chart */}
        <Card className="glass-card">
          <CardHeader className="p-3 sm:p-4 lg:p-6">
    <CardTitle className="flex items-center heading-secondary text-sm sm:text-base lg:text-lg">
      <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500 mr-2" />
      <span className="truncate">{timePeriod === "monthly" ? "Monthly" : "All Time"} Delivery Challan Count</span>
    </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
            <div className="h-40 sm:h-48 lg:h-64 glass rounded-xl overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={deliveryChallanChartData}>
                  <defs>
                    <linearGradient id="colorPurple" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '10px'
                    }} 
                  />
                  <Area type="monotone" dataKey="value" stroke="none" fill="url(#colorBlue)" />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#a855f7" 
                    strokeWidth={3} 
                    dot={false}
                    className="line-glow-purple" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Sales Amount Chart */}
        <Card className="glass-card">
          <CardHeader className="p-3 sm:p-4 lg:p-6">
    <CardTitle className="flex items-center heading-secondary text-sm sm:text-base lg:text-lg">
      <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mr-2" />
      <span className="truncate">{timePeriod === "monthly" ? "Monthly" : "All Time"} Sales Amount</span>
    </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
            <div className="h-40 sm:h-48 lg:h-64 glass rounded-xl overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesAmountChartData}>
                  <defs>
                    <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '10px'
                    }} 
                  />
                  <Area type="monotone" dataKey="value" stroke="none" fill="url(#colorBlue)" />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    dot={false}
                    className="line-glow-green" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Expense Amount Chart */}
        <Card className="glass-card">
          <CardHeader className="p-3 sm:p-4 lg:p-6">
    <CardTitle className="flex items-center heading-secondary text-sm sm:text-base lg:text-lg">
      <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 mr-2" />
      <span className="truncate">{timePeriod === "monthly" ? "Monthly" : "All Time"} Expense Amount</span>
    </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 lg:p-6 pt-0">
            <div className="h-40 sm:h-48 lg:h-64 glass rounded-xl overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={expenseAmountChartData}>
                  <defs>
                    <linearGradient id="colorRed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '10px'
                    }} 
                  />
                  <Area type="monotone" dataKey="value" stroke="none" fill="url(#colorBlue)" />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#ef4444" 
                    strokeWidth={3} 
                    dot={false}
                    className="line-glow-red" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Company Footer */}
      <Card className="glass-card border-red-200/30 dark:border-red-500/30">
        <CardContent className="p-3 sm:p-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
            <span className="font-semibold text-readable text-sm sm:text-base">Balaji Health Care</span>
          </div>
          <p className="text-xs sm:text-sm text-readable-muted">
            Committed to Excellence in Healthcare Solutions • Business Suite v1.0
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
export interface CounterStructure {
  // Basic Entity Counters
  clients: {
    last_id: number
    total: number
    active_count: number
    inactive_count: number
    total_due: number
    avg_order_value: number
  }

  employees: {
    last_id: number
    total: number
    active_count: number
    total_collected: number
    total_paid: number
    net_balance: number
    top_performer_id: string
  }

  suppliers: {
    last_id: number
    total: number
    active_count: number
    inactive_count: number
    total_due: number
  }

  items: {
    last_id: number
    total: number
    low_stock_count: number
    expiring_soon_count: number
    expired_count: number
    by_category: {
      blood_tubing: number
      dialysers: number
      chemical: number
      surgical: number
      equipment: number
      spare: number
      other: number
    }
  }

  // Financial Tracking
  expenses: {
    total: number
    total_amount: number
    by_category: {
      office: number
      travel: number
      equipment: number
      maintenance: number
      utilities: number
      other: number
    }
  }

  payments: {
    total: number
    total_amount: number
    by_method: {
      bank_transfer: number
      cash: number
      upi: number
      card: number
    }
  }

  // Order Management
  orders: {
    last_id: number
    total: number
    total_due: number
    by_status: {
      pending: number
      completed: number
      cancelled: number
      overdue: number
    }
    by_type: {
      sales_orders: {
        count: number
        amount: number
      }
      purchase_orders: {
        count: number
        amount: number
      }
      delivery_challan: {
        count: number
        amount: number
      }
    }
  }

  // Financial Summary
  financial_summary: {
    last_updated_at: string
    total_income: number
    total_expenses: number
    net_profit: number
    profit_margin: number
  }

  // Time-based Analytics
  monthly_summary: {
    [key: string]: {
      // e.g., "2025-06"
      sales_orders: {
        count: number
        amount: number
      }
      delivery_challan: {
        count: number
        amount: number
      }
      purchase_orders: {
        count: number
        amount: number
      }
      expenses: {
        count: number
        amount: number
      }
      payments: {
        count: number
        amount: number
      }
      net_profit: number
    }
  }

  // Dashboard KPIs
  kpis: {
    last_updated_at: string
    growth_rates: {
      revenue_growth: number
      expense_growth: number
      profit_growth: number
      order_growth: number
    }
    alerts: {
      low_stock_items: number
      overdue_payments: number
      expiring_items: number
      inactive_clients: number
    }
  }
}

import type React from "react"
import "@/app/globals.css"
import { ThemeProvider } from "@/components/theme-provider"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Business Suite - Balaji Health Care</title>
        <meta
          name="description"
          content="Complete business management solution for Balaji Health Care - AI-powered inventory, orders, and financial management with modern blue interface"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%233B82F6'><path d='M3 21h18v-2H3v2zM5 10v7h4v-7H5zm6 0v7h4v-7h-4zm6 0v7h4v-7h-4zM5 8h14V6H5v2z'/></svg>"
        />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          
        </ThemeProvider>
      </body>
    </html>
  )
}

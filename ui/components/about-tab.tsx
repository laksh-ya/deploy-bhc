"use client"

/**
 * Architecture & Docs tab (demo mode).
 *
 * A visual, non-technical walkthrough of the BHC Business Suite — the problem,
 * the features, the AI assistant, and the engineering optimisations — drawn
 * from the project documentation. Designed so anyone can understand it.
 */
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  Area,
  AreaChart,
  CartesianGrid,
} from "recharts"
import {
  Building2,
  PlayCircle,
  ExternalLink,
  BookOpen,
  Clock,
  ShieldCheck,
  TrendingUp,
  Boxes,
  ShoppingCart,
  Users,
  Wallet,
  Bot,
  ScanLine,
  Database,
  Layers,
  Zap,
  Search,
  BrainCircuit,
  MessageSquare,
  MessageCircle,
  Server,
  Lock,
  Gauge,
  AlertTriangle,
  Repeat,
  CheckCircle2,
} from "lucide-react"

const YT_ID = "XTlps8ep0D8"

const techBadges = [
  "Next.js 15",
  "React + TypeScript",
  "Tailwind + shadcn/ui",
  "FastAPI",
  "Python",
  "Firebase Firestore",
  "LangChain",
  "LlamaIndex + Qdrant",
  "Google Gemini",
]

const docCounterData = [
  { name: "Reading every order (O(n))", reads: 2000, fill: "#ef4444" },
  { name: "doc_counters (O(1))", reads: 1, fill: "#06b6d4" },
]

const salesTrend = [
  { month: "Dec", sales: 151000, expense: 29000 },
  { month: "Jan", sales: 128000, expense: 24000 },
  { month: "Feb", sales: 99000, expense: 18000 },
  { month: "Mar", sales: 165000, expense: 31000 },
  { month: "Apr", sales: 118000, expense: 22000 },
  { month: "May", sales: 142000, expense: 27000 },
]

function SectionTitle({ kicker, title, subtitle }: { kicker: string; title: string; subtitle?: string }) {
  return (
    <div className="text-center max-w-3xl mx-auto mb-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">{kicker}</p>
      <h2 className="text-2xl sm:text-3xl font-bold heading-primary">{title}</h2>
      {subtitle && <p className="text-readable-muted mt-3 leading-relaxed">{subtitle}</p>}
    </div>
  )
}

export function AboutTab() {
  return (
    <div className="space-y-16 pb-16 animate-fade-in">
      {/* ---------------- HERO ---------------- */}
      <section className="relative overflow-hidden rounded-3xl">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500" />
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        <div className="relative z-10 px-6 py-12 sm:px-12 sm:py-16 text-center text-white">
          <div className="flex justify-center mb-5">
            <div className="w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-2xl">
              <Building2 className="w-11 h-11 text-white" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">BHC Business Suite</h1>
          <p className="text-base sm:text-lg text-blue-50 mt-2 font-medium">Balaji Health Care</p>
          <p className="max-w-2xl mx-auto mt-4 text-blue-50/90 leading-relaxed">
            A full-stack, AI-enhanced platform that replaces manual spreadsheets with one real-time hub for
            inventory, orders, clients, suppliers, finances — and an intelligent assistant.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-7">
            <a
              href="https://bhcmp.store"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-blue-700 font-semibold shadow-lg hover:bg-blue-50 transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> Live Site
            </a>
            <a
              href={`https://youtu.be/${YT_ID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/15 backdrop-blur-sm text-white font-semibold border border-white/30 hover:bg-white/25 transition-colors"
            >
              <PlayCircle className="w-4 h-4" /> Watch Demo
            </a>
            <a
              href="https://round-story-935.notion.site/BHC-Balaji-Health-Care-Business-Suite-Documentation-27d2c96307f780b0beadcda0cc649a05"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/15 backdrop-blur-sm text-white font-semibold border border-white/30 hover:bg-white/25 transition-colors"
            >
              <BookOpen className="w-4 h-4" /> Full Docs
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
            {techBadges.map((t) => (
              <span
                key={t}
                className="text-xs font-medium px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-white"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- EXECUTIVE SUMMARY + RESULTS ---------------- */}
      <section className="px-1">
        <SectionTitle
          kicker="The Outcome"
          title="Why it matters"
          subtitle="The suite turned manual, fragmented processes into a single source of truth — improving efficiency, accuracy and visibility across the business."
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { icon: Clock, title: "Time Saved", body: "AI invoice scanning auto-creates order forms from PDFs, cutting manual data entry dramatically." },
            { icon: ShieldCheck, title: "Error Reduction", body: "Centralised data and automated stock + dues calculations eliminate manual tracking mistakes." },
            { icon: TrendingUp, title: "Financial Visibility", body: "Real-time income, expense and net-profit tracking enables faster, data-driven decisions." },
          ].map((r) => (
            <Card key={r.title} className="glass-card">
              <CardContent className="p-6">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4">
                  <r.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-readable mb-1">{r.title}</h3>
                <p className="text-sm text-readable-muted leading-relaxed">{r.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ---------------- THE PROBLEM ---------------- */}
      <section className="px-1">
        <SectionTitle
          kicker="The Problem"
          title="Life before the suite"
          subtitle="Balaji Health Care ran on manual, disconnected records — which created real day-to-day friction."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            { title: "Complex inventory", body: "Medical supplies carry batch numbers and expiry dates. Manual tracking risked shipping expired stock and missing low-stock items." },
            { title: "Fragmented orders", body: "Sales orders, purchase orders and delivery challans lived in separate places, making it hard to follow items end to end." },
            { title: "Manual dues & expenses", body: "Client dues and supplier payments were calculated by hand, delaying reporting and follow-ups." },
            { title: "No single source of truth", body: "Scattered data made simple questions like “what's our net profit this month?” slow to answer." },
          ].map((p) => (
            <Card key={p.title} className="glass-card">
              <CardContent className="p-6 flex gap-4">
                <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-readable mb-1">{p.title}</h3>
                  <p className="text-sm text-readable-muted leading-relaxed">{p.body}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ---------------- APP PREVIEW ---------------- */}
      <section className="px-1">
        <SectionTitle kicker="A Look Inside" title="The application" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            { src: "/showcase/dashboard.png", label: "Real-time Dashboard" },
            { src: "/showcase/order_view.jpg", label: "Order Management" },
            { src: "/showcase/finance.jpg", label: "Finance & Payments" },
            { src: "/showcase/chatbot.jpg", label: "AI Assistant" },
          ].map((s) => (
            <Card key={s.src} className="glass-card overflow-hidden">
              <div className="relative w-full aspect-video bg-slate-100 dark:bg-slate-800">
                <Image src={s.src} alt={s.label} fill className="object-cover object-top" unoptimized />
              </div>
              <CardContent className="p-4">
                <p className="text-sm font-medium text-readable">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ---------------- DEMO VIDEO ---------------- */}
      <section className="px-1">
        <SectionTitle kicker="See It In Action" title="Demo video" />
        <Card className="glass-card overflow-hidden max-w-3xl mx-auto">
          <div className="relative w-full aspect-video">
            <iframe
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube.com/embed/${YT_ID}`}
              title="BHC Business Suite demo"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </Card>
      </section>

      {/* ---------------- ARCHITECTURE ---------------- */}
      <section className="px-1">
        <SectionTitle
          kicker="How It's Built"
          title="A clean, decoupled architecture"
          subtitle="The interface, the business logic and the data layer are separate — so each can evolve independently."
        />
        <Card className="glass-card">
          <CardContent className="p-6 sm:p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
              <div className="rounded-2xl border border-blue-200/40 dark:border-blue-500/30 p-5 bg-blue-50/40 dark:bg-blue-950/20">
                <Layers className="w-7 h-7 text-blue-500 mb-3" />
                <h3 className="font-semibold text-readable">Frontend</h3>
                <p className="text-xs text-readable-muted mt-1">Next.js 15 · TypeScript · Tailwind · shadcn/ui · Recharts. A responsive, tab-based single-page app.</p>
              </div>
              <div className="rounded-2xl border border-cyan-200/40 dark:border-cyan-500/30 p-5 bg-cyan-50/40 dark:bg-cyan-950/20">
                <Server className="w-7 h-7 text-cyan-500 mb-3" />
                <h3 className="font-semibold text-readable">Backend</h3>
                <p className="text-xs text-readable-muted mt-1">FastAPI · Pydantic validation · service classes for business rules · LangChain AI agent.</p>
              </div>
              <div className="rounded-2xl border border-indigo-200/40 dark:border-indigo-500/30 p-5 bg-indigo-50/40 dark:bg-indigo-950/20">
                <Database className="w-7 h-7 text-indigo-500 mb-3" />
                <h3 className="font-semibold text-readable">Data</h3>
                <p className="text-xs text-readable-muted mt-1">Firebase Firestore as the source of truth + Qdrant vector database for AI semantic search.</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 mt-6 text-xs text-readable-subtle">
              <span>Browser</span>
              <span className="text-blue-400">──HTTPS / JSON──▶</span>
              <span>FastAPI</span>
              <span className="text-cyan-400">──▶</span>
              <span>Firestore + Qdrant</span>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ---------------- KEY FEATURES ---------------- */}
      <section className="px-1">
        <SectionTitle kicker="What It Does" title="Key features" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { icon: Gauge, title: "Dashboard & analytics", body: "Real-time income, expenses and net profit, with 6-month trend charts and monthly filtering." },
            { icon: ShoppingCart, title: "Order management", body: "Sales, purchases and delivery challans. Inventory and dues auto-adjust on every order." },
            { icon: Boxes, title: "Inventory control", body: "Batch and expiry tracking, with dedicated low-stock and expiring-soon views." },
            { icon: Users, title: "Clients & suppliers", body: "Full records, automatic due tracking, and complete order history per account." },
            { icon: Wallet, title: "Financial tracking", body: "Logged expenses and a centralised record of every payment received — a clear audit trail." },
            { icon: Bot, title: "AI assistant", body: "Ask questions in plain language and get concise, data-grounded answers." },
            { icon: ScanLine, title: "Invoice scanning (OCR)", body: "Upload a PDF or photo and Gemini extracts a ready-to-save order form." },
            { icon: MessageSquare, title: "Voice & notifications", body: "Voice input, hands-free voice mode, and in-app alerts for low stock and dues." },
            { icon: Lock, title: "Secure auth", body: "Bcrypt-hashed passwords, role-based access, and audit attribution on records." },
          ].map((f) => (
            <Card key={f.title} className="glass-card">
              <CardContent className="p-5">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center mb-3">
                  <f.icon className="w-5 h-5 text-blue-500" />
                </div>
                <h3 className="font-semibold text-readable text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-readable-muted leading-relaxed">{f.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ---------------- DOC_COUNTERS OPTIMISATION ---------------- */}
      <section className="px-1">
        <SectionTitle
          kicker="The Core Optimisation"
          title="doc_counters: O(n) → O(1)"
          subtitle="NoSQL databases have no cheap SUM() or COUNT(). Instead of reading thousands of orders to show a dashboard total, the suite keeps a running ledger updated by atomic increments."
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
          <Card className="glass-card">
            <CardContent className="p-6">
              <h3 className="font-semibold text-readable mb-1">How it works</h3>
              <p className="text-sm text-readable-muted leading-relaxed mb-4">
                When an order is created, the backend issues a single atomic <code className="text-blue-600 dark:text-blue-400">Increment</code> on a
                summary document (e.g. <code className="text-blue-600 dark:text-blue-400">doc_counters/orders</code>). The dashboard then reads just
                that one document — not the whole collection.
              </p>
              <ul className="space-y-2 text-sm text-readable-muted">
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-500 mt-0.5 flex-shrink-0" /> Reads drop from thousands to one per metric.</li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-500 mt-0.5 flex-shrink-0" /> Atomic increments prevent race conditions.</li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-500 mt-0.5 flex-shrink-0" /> Keeps Firebase costs near zero.</li>
              </ul>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-6">
              <h3 className="font-semibold text-readable mb-3">Firestore reads per dashboard load</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={docCounterData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
                  <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                  <Bar dataKey="reads" radius={[0, 6, 6, 0]}>
                    {docCounterData.map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-readable-subtle text-center mt-2">Lower is cheaper and faster.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ---------------- AI ASSISTANT (RAG) ---------------- */}
      <section className="px-1">
        <SectionTitle
          kicker="Feature Deep Dive"
          title="The AI assistant — an open-book exam"
          subtitle="We can't fit the whole database into the model's context. So instead of memorising everything, the AI learns how to find the right information."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: BookOpen, step: "1 · The Book", title: "LlamaIndex + Qdrant", body: "Every record is turned into a meaning-based vector embedding stored in the Qdrant vector database." },
            { icon: Search, step: "2 · The Librarian", title: "Semantic search", body: "“Which clients haven't paid?” finds the right records by meaning — even without exact keywords." },
            { icon: BrainCircuit, step: "3 · The Brain", title: "LangChain agent", body: "Picks the right tool: a precise lookup for “get invoice 101”, or semantic search for fuzzy questions." },
            { icon: MessageSquare, step: "4 · The Experience", title: "Streaming replies", body: "Answers stream in word-by-word for a natural, conversational feel." },
          ].map((c) => (
            <Card key={c.step} className="glass-card">
              <CardContent className="p-5">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-3">
                  <c.icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">{c.step}</p>
                <h3 className="font-semibold text-readable text-sm mt-0.5">{c.title}</h3>
                <p className="text-xs text-readable-muted leading-relaxed mt-1">{c.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ---------------- NIGHTLY SMS BRIEFING ---------------- */}
      <section className="px-1">
        <SectionTitle
          kicker="Feature Deep Dive"
          title="Automated nightly briefing"
          subtitle="Every night at 10 PM, the owner gets an AI-written business summary by SMS — built entirely on free tiers."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: Clock, title: "Scheduled", body: "A free PythonAnywhere task runs the script at 10 PM IST daily." },
            { icon: BrainCircuit, title: "Summarised", body: "Gemini turns the day's metrics into a clear, professional summary." },
            { icon: Repeat, title: "Self-checked", body: "If it's over 300 characters, it asks Gemini to make it more concise." },
            { icon: MessageCircle, title: "Delivered", body: "The final message is sent to the owner's phone via Twilio." },
          ].map((s) => (
            <Card key={s.title} className="glass-card">
              <CardContent className="p-5">
                <s.icon className="w-6 h-6 text-cyan-500 mb-3" />
                <h3 className="font-semibold text-readable text-sm mb-1">{s.title}</h3>
                <p className="text-xs text-readable-muted leading-relaxed">{s.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ---------------- OPTIMISATIONS ---------------- */}
      <section className="px-1">
        <SectionTitle
          kicker="Engineering"
          title="Built to be fast & cheap"
          subtitle="The goal was to minimise database operations — making the app responsive and nearly free to run."
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
          {[
            { icon: Wallet, title: "Cost", points: ["doc_counters pre-aggregates totals", "Atomic increments instead of recalculating", "One read per metric, not thousands"] },
            { icon: Zap, title: "Performance", points: ["Server-side pagination with count()", "In-memory cache for dropdowns", "Indexed prefix search queries"] },
            { icon: Gauge, title: "Experience", points: ["Clear loading states everywhere", "Debounced search inputs", "Route prefetching for instant tabs"] },
          ].map((o) => (
            <Card key={o.title} className="glass-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <o.icon className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold text-readable">{o.title}</h3>
                </div>
                <ul className="space-y-2">
                  {o.points.map((p) => (
                    <li key={p} className="flex gap-2 text-sm text-readable-muted">
                      <CheckCircle2 className="w-4 h-4 text-cyan-500 mt-0.5 flex-shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="glass-card">
          <CardContent className="p-6">
            <h3 className="font-semibold text-readable mb-3">Sales vs expenses — last 6 months (sample)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={salesTrend} margin={{ left: 0, right: 10 }}>
                <defs>
                  <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} />
                <Area type="monotone" dataKey="sales" stroke="#2563eb" fill="url(#gSales)" strokeWidth={2} name="Sales" />
                <Area type="monotone" dataKey="expense" stroke="#06b6d4" fill="url(#gExp)" strokeWidth={2} name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      {/* ---------------- DATA MODEL ---------------- */}
      <section className="px-1">
        <SectionTitle
          kicker="Under The Hood"
          title="The data model"
          subtitle="Core entities mirror the real-world medical-supply business, validated by Pydantic on every request."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { icon: Users, title: "Client", body: "name, PAN/GST, point of contact, address, and a running due_amount owed to the business." },
            { icon: Server, title: "Supplier", body: "name, contact, address, and the total due the business owes them." },
            { icon: Boxes, title: "Inventory item", body: "name, category, stock_quantity, low_stock_threshold, and a list of batches." },
            { icon: Layers, title: "Batch", body: "batch_number, Expiry date, and quantity — nested inside an inventory item." },
            { icon: ShoppingCart, title: "Order", body: "sale / purchase / delivery_challan, line items, totals, amount_paid and payment_status." },
            { icon: Wallet, title: "Employee", body: "name, phone, amount paid out, and amount collected from clients on delivery." },
          ].map((e) => (
            <Card key={e.title} className="glass-card">
              <CardContent className="p-5 flex gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center flex-shrink-0">
                  <e.icon className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-readable text-sm mb-0.5">{e.title}</h3>
                  <p className="text-xs text-readable-muted leading-relaxed">{e.body}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ---------------- SECURITY ---------------- */}
      <section className="px-1">
        <SectionTitle kicker="Trust" title="Security & compliance" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: Lock, title: "Password security", body: "Stored as one-way bcrypt hashes — never plaintext." },
            { icon: ShieldCheck, title: "Access control", body: "Role-based model with per-request user attribution." },
            { icon: Database, title: "Encryption", body: "HTTPS/TLS in transit; Firestore encrypts data at rest." },
            { icon: CheckCircle2, title: "PII scope", body: "Business contact data only — no patient/medical (PHI) data." },
          ].map((s) => (
            <Card key={s.title} className="glass-card">
              <CardContent className="p-5">
                <s.icon className="w-6 h-6 text-blue-500 mb-3" />
                <h3 className="font-semibold text-readable text-sm mb-1">{s.title}</h3>
                <p className="text-xs text-readable-muted leading-relaxed">{s.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ---------------- GLOSSARY ---------------- */}
      <section className="px-1">
        <SectionTitle kicker="Reference" title="Glossary" />
        <Card className="glass-card max-w-3xl mx-auto">
          <CardContent className="p-6 divide-y divide-slate-200/40 dark:divide-slate-700/40">
            {[
              { term: "Delivery Challan", def: "A document for goods dispatched to a client, tracking items sent and any payment collected on delivery." },
              { term: "Dues", def: "The outstanding balance a client owes the business, or that the business owes a supplier — calculated automatically." },
              { term: "Batch", def: "A specific lot of a product, tracked by its own batch number, quantity and expiry date." },
              { term: "doc_counters", def: "A Firestore collection of pre-aggregated totals that makes dashboard metrics O(1) instead of O(n)." },
              { term: "RAG", def: "Retrieval-Augmented Generation — the AI retrieves relevant records, then generates a grounded answer." },
              { term: "Atomic operation", def: "A database write (like Increment) guaranteed to complete fully or not at all, preventing data corruption." },
            ].map((g) => (
              <div key={g.term} className="py-3 first:pt-0 last:pb-0">
                <p className="font-semibold text-readable text-sm">{g.term}</p>
                <p className="text-sm text-readable-muted mt-0.5 leading-relaxed">{g.def}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <p className="text-center text-xs text-readable-subtle">
        BHC Business Suite · Built for Healthcare Excellence ·{" "}
        <a href="https://bhcmp.store" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
          bhcmp.store
        </a>
      </p>
    </div>
  )
}


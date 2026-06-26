# BHC Business Suite — Project Guide & Walkthrough

A practical, end-to-end guide to **understanding, running, demoing, and
explaining** this project. Pair it with `backendd/BACKEND_GUIDE.md` (deep dive on
the API + Pydantic models).

---

## 1. What this project is

A full-stack business management suite for **Balaji Health Care**, a medical
supply company. It replaces spreadsheets with one real-time hub for inventory
(batch + expiry), orders (sales / purchases / delivery challans), clients,
suppliers, employees, finances, and an AI assistant.

```
deploy-bhc/
├── ui/          → Next.js 15 + TypeScript + Tailwind + shadcn/ui frontend
├── backendd/    → FastAPI + Firebase Firestore backend (+ LangChain AI agent)
└── assets/      → screenshots & logo used by the README
```

---

## 2. Architecture in one picture

```
┌─────────────────────────┐        HTTPS / JSON        ┌──────────────────────────┐
│        Frontend         │  ───────────────────────►  │         Backend          │
│  Next.js (ui/)          │   /api/v1/... requests     │  FastAPI (backendd/)     │
│                         │  ◄───────────────────────  │                          │
│  • tabs per domain      │       JSON responses       │  • Pydantic validation   │
│  • shadcn/ui components  │                            │  • service classes       │
│  • demo mode (offline)   │                            │  • doc_counters (O(1))   │
└─────────────────────────┘                            │  • LangChain + Gemini    │
                                                        └────────────┬─────────────┘
                                                                     │
                                                          ┌──────────▼───────────┐
                                                          │  Firebase Firestore  │
                                                          │  + Qdrant (vectors)  │
                                                          └──────────────────────┘
```

---

## 3. Frontend map (`ui/`)

| Path | What it is |
| :--- | :--- |
| `app/page.tsx` | Root client component. Holds auth state + tab switching. Installs the demo API interceptor when demo mode is on. |
| `app/layout.tsx` | HTML shell + theme provider. |
| `app/globals.css` | Theme tokens, glassmorphism utilities, blue/cyan brand gradients. |
| `app/api/chat/route.ts` | Server route for the AI chat. Streams plain text from Google **or** Groq (env-selectable model) and falls back to a local, data-grounded answer when no key is set. |
| `app/api/ocr/route.ts` | Server route for invoice/receipt OCR. Sends an uploaded PDF/image to Gemini and returns a structured order; returns a realistic mock when no key is set. |
| `lib/ai-context.ts` | Builds the assistant's system prompt + the no-key local fallback, grounded in the demo dataset. |
| `components/*-tab.tsx` | One component per domain (dashboard, inventory, orders, clients, suppliers, employees, finance, invoices/view-orders, chatbot, logs). |
| `components/login-page.tsx` | Login screen with **real backend login + one-click demo**. |
| `components/sidebar.tsx` | Navigation, theme toggle, notifications, user profile. |
| `components/ui/*` | shadcn/ui primitives (button, card, dialog, …). |
| `lib/config.ts` | **Single source for the API base URL.** |
| `lib/demo-auth.ts` | Demo accounts + `DEMO_MODE` flag. |
| `lib/demo-data.ts` | Mock dataset (shapes match the real API). |
| `lib/demo-api.ts` | Patches `fetch` to serve mock data in demo mode. |

### How the frontend talks to the backend
Components fetch from `${API_BASE_URL}/api/v1/...`. `API_BASE_URL` resolves from
`NEXT_PUBLIC_API_URL` → `NEXT_PUBLIC_API_BASE_URL` → `http://localhost:8000`.

> **Tip:** new components should import `API_BASE_URL` (or `apiUrl()`) from
> `@/lib/config` rather than re-reading env vars. A couple of older components
> still hard-code `http://localhost:8000`; the demo interceptor works regardless
> because it matches on the request *path*, but consolidating them on
> `lib/config.ts` is the recommended cleanup.

---

## 4. Demo mode — showcase with zero backend ⭐

This is what lets you open the app on any machine (or a recruiter's) and have
**every tab work without Firebase, Qdrant, or the Python server**.

**How it turns on (either is enough):**
- Set `NEXT_PUBLIC_DEMO_MODE=true`, **or**
- Don't configure any API URL (a fresh clone defaults to demo).

**What happens when it's on:**
1. `app/page.tsx` calls `installDemoApi()` at module load.
2. That patches `window.fetch`: any request to `/api/v1/...` or `/upload` is
   answered from `lib/demo-data.ts` instead of the network.
3. The login screen offers a one-click **"Quick Sign In"**.
4. The **AI assistant** (`/api/chat`) and **invoice OCR** (`/api/ocr`) run as
   same-origin Next.js routes, so they work on Vercel with no Python backend.
   With a Google/Groq key set they use the real model; with no key they return a
   believable, data-grounded result so the showcase always works.

**AI / OCR configuration (optional, server-side only):**
Copy `ui/.env.example` → `ui/.env.local`. Key vars:
- `AI_PROVIDER` — `google` (default) or `groq`
- `GOOGLE_GENERATIVE_AI_API_KEY`, `GOOGLE_CHAT_MODEL` (e.g. `gemini-2.0-flash`)
- `GROQ_API_KEY`, `GROQ_CHAT_MODEL` (e.g. `llama-3.3-70b-versatile`)
- `GOOGLE_OCR_MODEL` (defaults to `GOOGLE_CHAT_MODEL`)
These are **not** `NEXT_PUBLIC_*`, so keys stay on the server and are never
shipped to the browser.

**To demo locally:**
```bash
cd ui
pnpm install
# create ui/.env.local with:  NEXT_PUBLIC_DEMO_MODE=true
pnpm run dev
# open http://localhost:3000  → click "Try the Live Demo"
```

Writes (create/update/delete) return a friendly "changes are not persisted"
response in demo mode, so buttons still behave without corrupting anything.

> To demo against the **real** backend instead, set
> `NEXT_PUBLIC_API_URL=http://localhost:8000` (and leave `NEXT_PUBLIC_DEMO_MODE`
> unset) and run the FastAPI server.

---

## 5. Running the real stack

### Backend
```bash
cd backendd
python -m venv venv && venv\Scripts\activate     # Windows
pip install -r requirements.txt
# create backendd/.env (see README for the full list):
#   FIREBASE_CREDENTIALS_PATH, GOOGLE_API_KEY, QDRANT_URL, QDRANT_API_KEY, ...
uvicorn test:app --reload --port 8000
# docs: http://localhost:8000/docs
```

### Frontend
```bash
cd ui
pnpm install
# ui/.env.local:
#   NEXT_PUBLIC_API_URL=http://localhost:8000
pnpm run dev   # http://localhost:3000
```

---

## 6. How to explain this project (interview script)

1. **Pitch (15s):** "Full-stack suite that replaced manual spreadsheets for a
   medical supplier — inventory with batch/expiry, three order types, finances,
   and an AI assistant, on a FastAPI + Firestore + Next.js stack."
2. **Backend:** "FastAPI with Pydantic models validating every request. Business
   rules live in service classes. The clever bit is `doc_counters` — I keep
   running aggregates with atomic increments so the dashboard is O(1) instead of
   scanning every order." *(Open `backendd/models.py` and `BACKEND_GUIDE.md`.)*
3. **AI:** "A LangChain agent on Gemini with ~50 tools, plus LlamaIndex + Qdrant
   for semantic search (RAG), so it answers fuzzy questions like 'which clients
   haven't paid?'."
4. **Frontend:** "Next.js 15 + shadcn/ui, responsive, dark mode. I added a demo
   mode that mocks the API so anyone can try the full app instantly."
5. **Engineering judgement:** "It started as one big file; I extracted the
   models into a documented module, removed a hard-coded key, de-duplicated the
   agent setup, and wrote a roadmap to split the rest into routers/services."

---

## 7. Known issues & cleanup roadmap

| Area | Status | Note |
| :--- | :--- | :--- |
| Hard-coded Gemini key in `test.py` | ✅ fixed | now from `GOOGLE_API_KEY`. **Rotate the old key — still in git history.** |
| Duplicated agent setup | ✅ fixed | `firebase_config/agent.py` cleaned. |
| Invalid CORS (`*` + credentials) | ✅ fixed | configurable via `CORS_ORIGINS`. |
| Pydantic models scattered/duplicated | ✅ fixed | now in `backendd/models.py`. |
| Offline demo not possible | ✅ fixed | demo mode + mock API. |
| Theme mixed purple into a blue brand | ✅ fixed | gradients unified to blue/cyan. |
| `test.py` is ~4,900 lines | ⏳ roadmap | split into `routers/`, `services/`, `core/` — see `BACKEND_GUIDE.md` §9. |
| Some components hard-code `localhost:8000` | ⏳ roadmap | migrate to `@/lib/config`. |
| Login returns no token/session | ⏳ roadmap | issue a JWT and protect routes with `get_current_user`. |

---

## 8. File-by-file cheat sheet for the new additions

| File | Why it exists |
| :--- | :--- |
| `backendd/models.py` | All Pydantic models, documented & de-duplicated. The thing to show when explaining the API contract. |
| `backendd/BACKEND_GUIDE.md` | Full route + model + service reference. |
| `ui/lib/config.ts` | One place for the backend URL. |
| `ui/lib/demo-auth.ts` | Demo accounts + the `DEMO_MODE` switch. |
| `ui/lib/demo-data.ts` | Realistic mock dataset matching API shapes. |
| `ui/lib/demo-api.ts` | `fetch` interceptor that serves the mock data. |
| `PROJECT_GUIDE.md` | This document. |
```

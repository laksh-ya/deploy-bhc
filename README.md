# Laksh-ya Business Suite (deploy-bhc)

This is a comprehensive, AI-powered business management suite built for **Balaji Health Care**. It features a modern, responsive web application (built with Next.js and shadcn/ui) and a robust FastAPI backend.

The system provides full-stack management of inventory, orders, clients, suppliers, finances, and employees, augmented with an advanced AI chatbot for natural language queries and a PDF invoice scanner.

---

## 🌟 Key Features

<br>

| Backend (FastAPI) | AI & Chatbot (LangChain) | Frontend (Next.js) |
| :--- | :--- | :--- |
| 🗃️ **Full Business CRUD** | 🤖 **Conversational Agent** | 🖥️ **Modern UI/UX** |
| 📦 **Advanced Order Management** | 🛠️ **Database Tools** | 📱 **Responsive Design** |
| 🧾 **Automated Accounting** | 🧠 **Semantic Search (LlamaIndex)** | 📊 **Dashboard & Charts** |
| 🏭 **Inventory Control** | 🤖 **AI-Powered Summaries** | 💬 **Streaming AI Chat UI** |
| 📊 **Dashboard & Stats API** | 🔊 **Voice Input (Speech-to-Text)** | 🎨 **Dark Mode Support** |
| 📄 **PDF Invoice Scanning** | | 🔐 **Login & Auth Flow** |
| 🔐 **Authentication** | | 📝 **Full Data Management** |
| ☁️ **Google Drive Integration** | | |
| 🪵 **Centralized Logging** | | |

<br>

### 1. Backend (FastAPI)

* **Full Business CRUD:** Complete API for Clients, Suppliers, Inventory, Employees, and Expenses.
* **Order Management:** Advanced logic for Sales (`sale`), Purchases (`purchase`), and Delivery Challans (`delivery_challan`).
* **Automated Accounting:** Automatically updates client/supplier dues and employee collection/payment totals on relevant transactions.
* **Inventory Control:** Stock levels are automatically adjusted on sales, purchases, and deletions.
* **Dashboard API:** Endpoints for financial summaries, monthly stats, and chart data (e.g., low-stock/expiring items).
* **PDF Invoice Scanning:** An endpoint (`/api/v1/invoice/scan`) that uses `pdfplumber` and Google Gemini to parse uploaded PDF invoices into structured JSON.
* **Google Drive Integration:** Securely uploads challan images and other files to a dedicated Google Drive folder using OAuth2.

### 2. AI Chatbot (LangChain & LlamaIndex)

* **Conversational Agent:** A streaming, conversational agent (using LangChain and Gemini) that can answer natural language questions.
* **Database Tools:** The agent is equipped with tools to perform read-only operations on the live Firestore database (e.g., "how many clients have pending dues?").
* **Semantic Search:** Uses LlamaIndex and a Qdrant vector store to perform semantic searches over all major data collections (Clients, Orders, Inventory, etc.).

### 3. Frontend (Next.js)

* **Modern UI/UX:** Built with Next.js 15 (Turbopack), TypeScript, and styled with Tailwind CSS & shadcn/ui.
* **Responsive Design:** Fully responsive interface for both desktop and mobile, with a collapsible sidebar.
* **Tab-Based Interface:** All modules (Dashboard, Inventory, Orders, Clients, Suppliers, Finance, Employees, Logs) are organized into clean, accessible tabs.
* **AI Chatbot UI:** A complete chat interface supporting streaming responses, quick-query suggestions, and voice input (Speech Recognition).
* **Full Data Management:** Complete forms and tables for creating, reading, updating, and deleting all business data.

---

## 🛠️ Tech Stack

### Backend

| Service | Technology |
| :--- | :--- |
| Framework | **FastAPI** |
| Database | **Firebase Firestore** |
| AI (Chat) | **LangChain**, **Google Gemini**, **LlamaIndex** |
| AI (Scanning)| **Google Gemini**, `pdfplumber` |
| Vector DB | **Qdrant** |
| Authentication | Firebase Auth, `passlib` (Bcrypt) |
| File Storage | **Google Drive API** |
| Language | Python |

### Frontend

| Service | Technology |
| :--- | :--- |
| Framework | **Next.js 15** (with Turbopack) |
| Language | **TypeScript** |
| UI | **shadcn/ui**, **Tailwind CSS** |
| State | React Hooks (`useState`, `useEffect`) |
| API Comms | `axios`, `fetch` |
| Charting | `recharts` |
| AI SDK | `@ai-sdk/google`, `ai` (Vercel AI SDK) |

---

## 🚀 Getting Started

This is a monorepo project. You will need to run the `backendd` and `ui` services separately.

### 1. Backend (`backendd`)

The backend is a Python-based FastAPI server.

1.  **Navigate to the backend directory:**
    ```bash
    cd backendd
    ```

2.  **Create a virtual environment and install dependencies:**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    pip install -r requirements.txt
    ```

3.  **Set up Environment Variables:**
    Create a `.env` file in the `backendd` directory and add the necessary credentials. This includes:
    * `FIREBASE_CREDENTIALS_PATH`: Path to your Firebase service account key (`.json`).
    * `SECRET_KEY`: A secret key for your application.
    * `GOOGLE_API_KEY`: Your Google Gemini API key.
    * `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: For Google Drive OAuth.
    * `QDRANT_URL`, `QDRANT_API_KEY`: For the LlamaIndex vector store.

4.  **Run the server:**
    The main application file is `test.py`.
    ```bash
    uvicorn test:app --reload --port 8000
    ```

### 2. Frontend (`ui`)

The frontend is a Next.js application.

1.  **Navigate to the UI directory:**
    ```bash
    cd ui
    ```

2.  **Install dependencies (using pnpm as per `pnpm-lock.yaml`):**
    ```bash
    pnpm install
    ```

3.  **Set up Environment Variables:**
    Create a `.env.local` file in the `ui` directory:
    ```
    NEXT_PUBLIC_API_URL=http://localhost:8000
    NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
    GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_key_for_client_side_chatbot
    ```

4.  **Run the development server:**
    ```bash
    pnpm run dev
    ```

5.  Open [http://localhost:3000](http://localhost:3000) in your browser.

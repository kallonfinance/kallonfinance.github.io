# Kallon FinanceTracker

Kallon FinanceTracker is a highly polished, responsive, and secure personal finance tracking application. It delivers a full-suite dashboard to manage monthly credits, debit items, category budgets, savings goals, and period reports with seamless dark mode support.

---

## 🎨 Design Philosophy and Aesthetics

Built upon a **Modern Swiss Product Grid** design style, Kallon features:
* **Space Grotesk** heading typography paired with **Inter** copy and **JetBrains Mono** metrics.
* **Ambient Lighting Transitions**: Micro-hover states, progress bar fills, and grid arrangements with comfortable negative space.
* **Dual Theme Compatibility**: Light Slate and Deep Cobalt Dark themes which persist across sessions.

---

## 🚀 Core Features

1. **User Authentication Guard**: Account registration, password login, password recovery questions, and secure local session persistence.
2. **Interactive command Hub Dashboard**: Overall income, expenditure, total savings, active transaction counts, side-by-side cash flow bar graphs, top expense streams, and recent ledger history.
3. **Streamlined Income & Expense Ledger**: Detailed transaction tracking including date-pickers, description fields, sort keys, category tags, advanced search keywords, type filtering, and pagination.
4. **Expense Category Customization**: Dual-channelsettings panel to manage custom Income streams and Expense categories.
5. **Set-and-Forget Budgets Tracking**: Monthly spent limits per category with progressive color-coding alerts if thresholds are approached or exceeded.
6. **Savings Goal Map**: Target planner representing major acquisition milestones (Emergency fund, Vacation cache) with deposits triggers.
7. **Comprehensive Audit Reports**: Choice lists for monthly breakdowns, savings rate formulas, category percentages, and direct print formats customized to trigger clean physical **PDF** printouts, and **CSV** / **Excel** sheet downloads.

---

## 🛠️ Setup Guide (Local Client Sandbox)

The application compiles out-of-the-box as a high-performance **React + TypeScript + Tailwind CSS v4** SPA. All data is securely persisted on-device inside your browser’s `localStorage`.

### Prerequisites
* **Node.js** (v18 or higher)
* **npm** (v9 or higher)

### Installation
1. Clone or download this project workspace.
2. Inside the root directory, install current dependencies:
   ```bash
   npm install
   ```
3. Boot the lightning-fast development server:
   ```bash
   npm run dev
   ```
4. Open the development application URL (defaults to `http://localhost:3000`).
5. **Quick-Start Credentials**: Use `demo@kallon.com` with password `123456` (Answer: `demo`) to instantly preview seeded dashboard metrics.

---

## 🗄️ Optional Supabase PostgreSQL Schema Integration

If you wish to scale this application to support a shared, multi-user web service using **Supabase** as the persistent cloud database, follow these steps:

1. Create a free account at [Supabase](https://supabase.com).
2. Create a new project called **Kallon FinanceTracker**.
3. Open the **SQL Editor** in your Supabase Dashboard.
4. Click "New Query" and paste the complete database definitions from `/supabase_schema.sql` (found in this folder).
5. Run the query to establish:
   * `categories` table with Row Level Security (RLS) policies.
   * `transactions` table with cascading foreign key references.
   * `budgets` table tracking unique category limits.
   * `savings_goals` table recording deposit progress.
6. Retrieve your Project API credentials from `Settings > API`:
   * Write your `SUPABASE_URL` and `SUPABASE_ANON_KEY` to your system environment variables.

---

## 🚢 Production Deployment Guide

### Client Frontend deployment (Vercel, Netlify, Cloud Run)
Because the app compiles to highly optimized static JS, HTML, and CSS assets, you can host the frontend on any global CDN:

#### Deploy to Cloud Run (Containerized Docker/Nginx setup)
1. build the production bundle:
   ```bash
   npm run build
   ```
   This generates ready-to-serve client code inside `/dist`.
2. Configure your ingress or static proxy (e.g. Nginx or Cloud Run static handler) to serve `/dist/index.html` on port `3000`.

---

## 📂 File Directory Mapping

```text
kallon-financetracker/
│
├── src/
│   ├── components/
│   │   ├── Auth.tsx          # Login, Register, Sec retrieval question form
│   │   ├── Dashboard.tsx     # High performance SVG graphs and summary cards
│   │   ├── Transactions.tsx  # Searchable history ledger with advanced filter panels
│   │   ├── Budgets.tsx       # Progress indicators, monthly spender limits
│   │   ├── Savings.tsx       # Progressive targets with incremental deposit triggers
│   │   ├── Reports.tsx       # CSV, Excel download exporters & Native PDF print layouts
│   │   └── Categories.tsx    # Category manager for dual types
│   │
│   ├── App.tsx               # Main nav layouts, sidebar/drawer, dark mode triggers
│   ├── db.ts                 # Local storage CRUD mock interface
│   ├── types.ts              # Fully typed models matching Supabase specs
│   ├── index.css             # Standard Tailwind v4 and Google Fonts setups
│   └── main.tsx              # App mount point
│
├── supabase_schema.sql       # Live database SQL schema + row-level policy scripts
├── requirements.txt          # Python API dependency lists (Optional)
├── metadata.json             # Workspace descriptors
├── package.json              # Client dependencies and build scripts
└── README.md                 # System instructions
```

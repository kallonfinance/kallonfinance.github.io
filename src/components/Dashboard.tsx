import React, { useState, useEffect } from 'react';
import { dbService } from '../db';
import { Category, Transaction, SavingsGoal, Budget } from '../types';
import { CreditCard, ArrowUpRight, ArrowDownLeft, Landmark, PiggyBank, Receipt, TrendingUp, AlertTriangle, ArrowRight, Wallet, CheckCircle } from 'lucide-react';
import { ExpenseTreemap } from './ExpenseTreemap';

interface DashboardProps {
  userId: string;
  darkMode: boolean;
  onNavigate: (tab: string) => void;
  transactionsVersion: number;
  goalsVersion: number;
  currencySymbol: string;
}

export function Dashboard({ userId, darkMode, onNavigate, transactionsVersion, goalsVersion, currencySymbol }: DashboardProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);

  const loadDashboardData = () => {
    setTransactions(dbService.getTransactions(userId));
    setCategories(dbService.getCategories(userId));
    setSavingsGoals(dbService.getSavingsGoals(userId));
    setBudgets(dbService.getBudgets(userId));
  };

  useEffect(() => {
    loadDashboardData();
  }, [userId, transactionsVersion, goalsVersion]);

  // Date constants
  const today = new Date();
  const currentMonthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  // Transactions this month
  const currentMonthTransactions = transactions.filter(
    (tx) => tx.transactionDate.startsWith(currentMonthPrefix)
  );

  // Totals
  const totalIncome = currentMonthTransactions
    .filter((t) => t.transactionType === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = currentMonthTransactions
    .filter((t) => t.transactionType === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalIncome - totalExpenses;
  
  // Total Savings (Sum of current cache in savings goals)
  const totalSavings = savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0);

  // Exceeding Budgets check
  const budgetAlerts = budgets.map((b) => {
    const cat = categories.find((c) => c.id === b.categoryId);
    if (!cat) return null;
    const spent = currentMonthTransactions
      .filter((tx) => tx.categoryId === b.categoryId && tx.transactionType === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const isNearLimit = spent >= b.monthlyLimit * 0.85;
    const isExceeded = spent > b.monthlyLimit;

    if (spent === 0 || !isNearLimit) return null;

    return {
      categoryName: cat.name,
      limit: b.monthlyLimit,
      spent,
      isExceeded,
    };
  }).filter((x) => x !== null) as { categoryName: string; limit: number; spent: number; isExceeded: boolean }[];

  // Recent 5 transactions
  const recentTransactions = [...transactions]
    .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  // SVG Chart data preparation (Income vs Expense comparison)
  // Let's draw side-by-side columns representing Income and Expenses
  const maxBarValue = Math.max(totalIncome, totalExpenses, 1000) * 1.15;
  const incBarHeight = (totalIncome / maxBarValue) * 120;
  const expBarHeight = (totalExpenses / maxBarValue) * 120;

  // Breakdown expense category amounts for mini-distribution chart
  const expenseBreakdown = categories
    .filter((c) => c.type === 'expense')
    .map((c) => {
      const sum = currentMonthTransactions
        .filter((tx) => tx.categoryId === c.id && tx.transactionType === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      return { name: c.name, amount: sum };
    })
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const maxExpenseCategoryVal = expenseBreakdown.length > 0 ? expenseBreakdown[0].amount : 1;

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Financial Command</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            A precise audit dashboard summarizing monthly balances, capital targets, and spending caps.
          </p>
        </div>
        
        {/* Quick Month Visualizer Tag */}
        <span className="self-start sm:self-center font-mono text-xs rounded-full bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 px-3 py-1 font-semibold dark:text-indigo-400">
          Showing Month: {today.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </span>
      </div>

      {/* ALERT FLAGGERS FOR BUDGET LIMITS */}
      {budgetAlerts.length > 0 && (
        <div className="space-y-2">
          {budgetAlerts.map((alert, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 rounded-2xl border p-4 text-xs font-semibold ${
                alert.isExceeded
                  ? 'border-rose-100 bg-rose-50/55 text-rose-700 dark:border-rose-950/40 dark:bg-rose-950/15 dark:text-rose-400 animate-pulse'
                  : 'border-amber-100 bg-amber-50/55 text-amber-700 dark:border-amber-950/40 dark:bg-amber-950/15 dark:text-amber-400'
              }`}
            >
              <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
              <div className="flex-1">
                {alert.isExceeded ? (
                  <p>
                    <strong className="font-bold">Overspend Limit!</strong> You have exceeded the monthly budget limit for <span className="underline">{alert.categoryName}</span>. Spending is at <span className="font-mono">{currencySymbol}{alert.spent.toFixed(2)}</span> / limit is <span className="font-mono">{currencySymbol}{alert.limit.toFixed(0)}</span>.
                  </p>
                ) : (
                  <p>
                    <strong className="font-bold">Nearing Budget limit.</strong> You have utilized 85%+ of the monthly budget for <span className="underline">{alert.categoryName}</span>. Spent is at <span className="font-mono">{currencySymbol}{alert.spent.toFixed(2)}</span> of the <span className="font-mono">{currencySymbol}{alert.limit.toFixed(0)}</span> limit.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SUMMARY PANEL CARDS */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        {/* Total Income */}
        <div className={`rounded-2xl border p-5 transition-card ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'}`}>
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="text-xs text-neutral-400 font-medium">Income This Month</span>
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-2 text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <h2 className="font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {currencySymbol}{totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h2>
          <span className="text-[10px] text-neutral-400 font-mono">Monthly inflows</span>
        </div>

        {/* Total Expenses */}
        <div className={`rounded-2xl border p-5 transition-card ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'}`}>
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="text-xs text-neutral-400 font-medium">Expenses This Month</span>
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 p-2 text-rose-600 dark:text-rose-400">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
          </div>
          <h2 className="font-mono text-lg font-bold text-rose-600 dark:text-rose-400">
            {currencySymbol}{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h2>
          <span className="text-[10px] text-neutral-400 font-mono font-medium">Monthly expenditures</span>
        </div>

        {/* Net Balance */}
        <div className={`rounded-2xl border p-5 transition-card ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'}`}>
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="text-xs text-neutral-400 font-medium">Net Month Balance</span>
            <div className={`rounded-xl p-2 ${netBalance >= 0 ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400' : 'bg-rose-50 text-rose-500'}`}>
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <h2 className={`font-mono text-lg font-bold ${netBalance >= 0 ? 'text-indigo-900 dark:text-indigo-400' : 'text-rose-600'}`}>
            {netBalance < 0 ? '-' : ''}{currencySymbol}{Math.abs(netBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h2>
          <span className="text-[10px] text-neutral-400 font-mono">Inflow vs Outflow surplus</span>
        </div>

        {/* Total Savings Portfolio */}
        <div className={`rounded-2xl border p-5 transition-card ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'}`}>
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="text-xs text-neutral-400 font-medium">Total Savings goals</span>
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 p-2 text-amber-600 dark:text-amber-500">
               <PiggyBank className="h-4 w-4" />
            </div>
          </div>
          <h2 className="font-mono text-lg font-bold text-[#AD00D4]">
            {currencySymbol}{totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h2>
          <span className="text-[10px] text-neutral-400 font-mono">Accumulated goals cash</span>
        </div>

        {/* Transaction Count */}
        <div className={`col-span-1 sm:col-span-2 lg:col-span-1 rounded-2xl border p-5 transition-card ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'}`}>
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="text-xs text-neutral-400 font-medium">Month Ledger Lines</span>
            <div className="rounded-xl bg-neutral-100 dark:bg-neutral-950 p-2 text-neutral-600 dark:text-neutral-400">
               <Receipt className="h-4 w-4" />
            </div>
          </div>
          <h2 className="font-mono text-lg font-bold text-[#C9C9C9]">
            {currentMonthTransactions.length} items
          </h2>
          <span className="text-[10px] text-neutral-400 font-mono">Logged during period</span>
        </div>
      </div>

      {/* CORE CHARTS COLOUMN */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Chart 1: Cash Flow Column Graph (Income vs Expense) */}
        <div className={`rounded-2xl border p-6 flex flex-col justify-between ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'}`}>
          <div>
            <h3 className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center justify-between">
              <span className="text-sm font-semibold tracking-tight">Period Cash Flow Comparison</span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Monthly</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-1 leading-normal">
              Visual ledger comparison matching raw inflows against total spending.
            </p>
          </div>

          <div className="flex items-center justify-center py-6">
            {/* Standard beautifully custom responsive inline column chart SVG */}
            <svg viewBox="0 0 240 160" className="w-full max-w-[280px]">
              {/* Grid Lines */}
              <line x1="20" y1="20" x2="220" y2="20" stroke="rgba(156, 163, 175, 0.15)" strokeDasharray="3,3" />
              <line x1="20" y1="60" x2="220" y2="60" stroke="rgba(156, 163, 175, 0.15)" strokeDasharray="3,3" />
              <line x1="20" y1="100" x2="220" y2="100" stroke="rgba(156, 163, 175, 0.15)" strokeDasharray="3,3" />
              <line x1="20" y1="140" x2="220" y2="140" stroke="rgba(156, 163, 175, 0.3)" />

              {/* Income Column */}
              <rect
                x="65"
                y={140 - incBarHeight}
                width="35"
                height={incBarHeight}
                rx="6"
                className="fill-emerald-500/80 hover:fill-emerald-500 transition-all cursor-pointer"
              />
              <text x="82.5" y={135 - incBarHeight} textAnchor="middle" className="font-mono text-[9px] font-bold fill-emerald-600 dark:fill-emerald-400">
                {currencySymbol}{totalIncome.toFixed(0)}
              </text>

              {/* Expense Column */}
              <rect
                x="140"
                y={140 - expBarHeight}
                width="35"
                height={expBarHeight}
                rx="6"
                className="fill-rose-500/80 hover:fill-rose-500 transition-all cursor-pointer"
              />
              <text x="157.5" y={135 - expBarHeight} textAnchor="middle" className="font-mono text-[9px] font-bold fill-rose-600 dark:fill-rose-400">
                {currencySymbol}{totalExpenses.toFixed(0)}
              </text>

              {/* Horizontal labels */}
              <text x="82.5" y="154" textAnchor="middle" className="text-[10px] font-semibold fill-neutral-400">
                Inflow
              </text>
              <text x="157.5" y="154" textAnchor="middle" className="text-[10px] font-semibold fill-neutral-400">
                Outflow
              </text>
            </svg>
          </div>

          <div className="flex items-center justify-around border-t pt-4 border-neutral-100 dark:border-neutral-800 text-xs">
            <div className="flex items-center gap-1.5 label text-neutral-400 font-medium">
              <span className="h-2.5 w-2.5 bg-emerald-500 rounded-xs" />
              <span>Income</span>
            </div>
            <div className="flex items-center gap-1.5 label text-neutral-400 font-medium">
              <span className="h-2.5 w-2.5 bg-rose-500 rounded-xs" />
              <span>Expenses</span>
            </div>
          </div>
        </div>

        {/* Chart 2: Category Breakdown list */}
        <div className={`rounded-2xl border p-6 flex flex-col justify-between ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'}`}>
          <div>
            <h3 className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center justify-between">
              <span className="text-sm font-semibold tracking-tight">Outflow Breakdown by Category</span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Top Categories</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-1 leading-normal">
              Direct allocation of expenditures across expense streams.
            </p>
          </div>

          <div className="py-4 space-y-3.5 max-h-[175px] overflow-y-auto custom-scrollbar pr-1 mt-3">
            {expenseBreakdown.map((item, idx) => {
              const widthPct = (item.amount / maxExpenseCategoryVal) * 100;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-neutral-700 dark:text-neutral-300">{item.name}</span>
                    <span className="font-mono font-semibold">{currencySymbol}{item.amount.toFixed(2)}</span>
                  </div>
                  <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {expenseBreakdown.length === 0 && (
              <p className="py-12 text-center text-xs text-neutral-400 dark:text-neutral-500">
                No expense streams logged this month.
              </p>
            )}
          </div>

          <div className="mt-4 border-t pt-4 border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
            <span className="text-neutral-400">Accumulated Spend</span>
            <span className="font-mono font-bold">{currencySymbol}{totalExpenses.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Expense density visualization using D3 */}
      <ExpenseTreemap
        expenses={expenseBreakdown}
        currencySymbol={currencySymbol}
        darkMode={darkMode}
      />

      {/* RECENT transactions LEDGER SECTION */}
      <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'}`}>
        <div className="flex items-center justify-between border-b pb-4 mb-4 border-neutral-100 dark:border-neutral-800">
          <h3 className="text-sm font-bold flex items-center gap-1.5">
            <Receipt className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
            Most Recent General Ledger Lines
          </h3>
          <button
            onClick={() => onNavigate('transactions')}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center hover:underline cursor-pointer"
          >
            Manage All
            <ArrowRight className="h-3 w-3 ml-0.5" />
          </button>
        </div>

        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {recentTransactions.map((tx) => {
            const cat = categories.find((c) => c.id === tx.categoryId);
            return (
              <div key={tx.id} className="flex items-center justify-between py-3 hover:bg-neutral-50/20 dark:hover:bg-neutral-950/20 px-2 rounded-xl transition">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${
                    tx.transactionType === 'income'
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20'
                      : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20'
                  }`}>
                    {tx.transactionType === 'income' ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownLeft className="h-4 w-4" />
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">{tx.description}</h4>
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wide font-semibold mt-0.5">
                      <span className="text-black dark:text-neutral-100 font-extrabold">{cat ? cat.name : 'Uncategorized'}</span> • {tx.transactionDate}
                    </p>
                  </div>
                </div>

                <span className={`font-mono text-sm font-bold ${
                  tx.transactionType === 'income' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {tx.transactionType === 'income' ? '+' : '-'}{currencySymbol}{tx.amount.toFixed(2)}
                </span>
              </div>
            );
          })}

          {recentTransactions.length === 0 && (
            <div className="py-8 text-center text-xs text-neutral-400">
              No general ledger lines logged yet. Populate custom categories and record your first transactions!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

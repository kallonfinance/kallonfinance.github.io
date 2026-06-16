import React, { useState, useEffect } from 'react';
import { dbService } from '../db';
import { Category, Budget, Transaction } from '../types';
import { Target, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

interface BudgetsProps {
  userId: string;
  darkMode: boolean;
  transactionsVersion: number;
  currencySymbol: string;
}

export function Budgets({ userId, darkMode, transactionsVersion, currencySymbol }: BudgetsProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Edit limit forms
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [newLimit, setNewLimit] = useState('');

  const [message, setMessage] = useState<string | null>(null);

  const loadData = () => {
    const cats = dbService.getCategories(userId).filter((c) => c.type === 'expense');
    setCategories(cats);
    const bdgs = dbService.getBudgets(userId);
    setBudgets(bdgs);
    const txs = dbService.getTransactions(userId);
    setTransactions(txs);
  };

  useEffect(() => {
    loadData();
  }, [userId, transactionsVersion]);

  // Current Month calculations
  const getCurrentMonthYearString = () => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mm}`; // YYYY-MM prefix
  };

  const currentMonthPrefix = getCurrentMonthYearString();

  const handleSaveBudget = (e: React.FormEvent, categoryId: string) => {
    e.preventDefault();
    const limitNum = parseFloat(newLimit);
    if (isNaN(limitNum) || limitNum < 0) {
      alert('Please enter a valid budget limit.');
      return;
    }

    dbService.saveBudget(userId, categoryId, limitNum);
    setMessage('Budget limit adjusted successfully!');
    setEditingCatId(null);
    loadData();
    setTimeout(() => setMessage(null), 3000);
  };

  // Compute aggregate specs per Category
  const budgetItems = categories.map((cat) => {
    // Find the defined budget (if any)
    const definedBudget = budgets.find((b) => b.categoryId === cat.id);
    const limit = definedBudget ? definedBudget.monthlyLimit : 0;

    // Sum transactions for this category this month
    const spentThisMonth = transactions
      .filter(
        (tx) =>
          tx.categoryId === cat.id &&
          tx.transactionType === 'expense' &&
          tx.transactionDate.startsWith(currentMonthPrefix)
      )
      .reduce((sum, tx) => sum + tx.amount, 0);

    const remaining = Math.max(0, limit - spentThisMonth);
    const isExceeded = spentThisMonth > limit && limit > 0;
    const percentage = limit > 0 ? (spentThisMonth / limit) * 100 : 0;

    return {
      category: cat,
      budgetId: definedBudget?.id,
      limit,
      spentThisMonth,
      remaining,
      isExceeded,
      percentage,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Monthly Budget Planning</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Establish monthly limits per expense category to monitor spent liquidity and guard against overspending.
        </p>
      </div>

      {message && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5 text-xs font-semibold text-emerald-600 dark:border-emerald-950/40 dark:bg-emerald-950/20 dark:text-emerald-400">
          {message}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Analytics Card */}
        <div className={`md:col-span-1 rounded-2xl border p-6 flex flex-col justify-between ${
          darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
        }`}>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-base font-bold">Monthly Cap Status</h2>
            </div>
            
            <p className="text-xs text-neutral-400 mb-5 leading-relaxed">
              Monitoring active spending for <strong className="font-semibold text-neutral-600 dark:text-neutral-300">{currentMonthPrefix}</strong>. Categories with zero budget will not register caps.
            </p>

            <div className="space-y-3.5 border-t pt-4 border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">Total Defined Cap</span>
                <span className="font-mono text-sm font-semibold">{currencySymbol}{budgets.reduce((sum, b) => sum + b.monthlyLimit, 0).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">Capped Spend</span>
                <span className="font-mono text-sm font-semibold text-rose-500">
                  {currencySymbol}{budgetItems.reduce((sum, item) => sum + (item.limit > 0 ? item.spentThisMonth : 0), 0).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">Exceeded Caps Count</span>
                <span className="font-mono text-xs font-semibold rounded-full bg-rose-50 dark:bg-rose-950/25 px-2 py-0.5 text-rose-600 dark:text-rose-450">
                  {budgetItems.filter((item) => item.isExceeded).length} Capped Over
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/15 border border-indigo-100/60 dark:border-indigo-950/20 text-xs text-indigo-600 dark:text-indigo-400 leading-relaxed flex gap-2">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>Setting your budget to zero disables tracking limits for that specific expense.</span>
          </div>
        </div>

        {/* Categories Grid List */}
        <div className="md:col-span-2 space-y-4">
          {budgetItems.length === 0 ? (
            <div className={`p-12 text-center rounded-2xl border text-neutral-400 dark:text-neutral-500 ${
              darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
            }`}>
              No custom expense categories found. Build expense categories under Category settings first.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {budgetItems.map((item) => (
                <div
                  key={item.category.id}
                  className={`rounded-2xl border p-5 transition-card transition-colors ${
                    item.isExceeded
                      ? 'border-rose-200 bg-rose-50/10 dark:border-rose-950/30'
                      : darkMode
                      ? 'bg-neutral-900 border-neutral-800'
                      : 'bg-white border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-sm">{item.category.name}</h3>
                      {item.limit > 0 ? (
                        <p className="text-xs text-neutral-400 mt-0.5">
                          Limit: <span className="font-mono font-medium">{currencySymbol}{item.limit.toFixed(0)}</span>
                        </p>
                      ) : (
                        <span className="inline-block mt-1 text-[10px] uppercase tracking-wider bg-neutral-100 dark:bg-neutral-950 text-neutral-400 px-2 py-0.5 rounded-md font-semibold">
                          No Limit Active
                        </span>
                      )}
                    </div>

                    {editingCatId === item.category.id ? (
                      <form
                        onSubmit={(e) => handleSaveBudget(e, item.category.id)}
                        className="flex items-center gap-1.5"
                      >
                        <input
                          type="number"
                          className="w-18 rounded-lg border py-1 px-1.5 text-xs font-mono text-center focus:outline-none bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white dark:border-neutral-805"
                          placeholder="Limit"
                          value={newLimit}
                          onChange={(e) => setNewLimit(e.target.value)}
                          autoFocus
                          required
                        />
                        <button
                          type="submit"
                          className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-2 py-1 font-semibold"
                        >
                          Set
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCatId(null)}
                          className="text-xs border rounded-lg px-2 py-1 dark:border-neutral-800 text-neutral-400"
                        >
                          X
                        </button>
                      </form>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingCatId(item.category.id);
                          setNewLimit(item.limit > 0 ? item.limit.toString() : '');
                        }}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        {item.limit > 0 ? 'Edit Limit' : 'Configure'}
                      </button>
                    )}
                  </div>

                  {item.limit > 0 && (
                    <div className="space-y-2">
                       <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-400">Used: {currencySymbol}{item.spentThisMonth.toFixed(2)}</span>
                        <span className={item.isExceeded ? 'text-rose-500 font-bold' : 'text-neutral-400'}>
                          {item.percentage.toFixed(0)}%
                        </span>
                      </div>

                      {/* Bar indicator */}
                      <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-950 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            item.percentage > 100
                              ? 'bg-rose-500'
                              : item.percentage > 75
                              ? 'bg-amber-400'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, item.percentage)}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[11px] pt-1 border-t border-dotted border-neutral-100 dark:border-neutral-800">
                        {item.isExceeded ? (
                          <div className="flex items-center gap-1 text-rose-500 font-semibold">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            <span>Over limit by {currencySymbol}{(item.spentThisMonth - item.limit).toFixed(2)}</span>
                          </div>
                        ) : (
                          <div className="text-neutral-400 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                            <span>Remaining: {currencySymbol}{item.remaining.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

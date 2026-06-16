import React, { useState, useEffect } from 'react';
import { dbService } from '../db';
import { Category, Transaction, CategoryType, TransactionFilters } from '../types';
import { Search, Filter, Plus, Edit2, Trash2, Calendar, FileText, ArrowUpRight, ArrowDownLeft, SlidersHorizontal, ChevronLeft, ChevronRight, Download, RefreshCw, X, Check } from 'lucide-react';

interface TransactionsProps {
  userId: string;
  darkMode: boolean;
  onTransactionsChanged: () => void;
  categoriesVersion: number;
  currencySymbol: string;
}

export function Transactions({ userId, darkMode, onTransactionsChanged, categoriesVersion, currencySymbol }: TransactionsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Modal toggle for add/edit
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Form State
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<CategoryType>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Filters State
  const [filters, setFilters] = useState<TransactionFilters>({
    searchTerm: '',
    dateFrom: '',
    dateTo: '',
    categoryId: '',
    type: 'all',
    sortBy: 'date_desc',
  });

  const [showFilters, setShowFilters] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Alerts
  const [msg, setMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const loadData = () => {
    const list = dbService.getTransactions(userId);
    setTransactions(list);
    const cats = dbService.getCategories(userId);
    setCategories(cats);
  };

  useEffect(() => {
    loadData();
  }, [userId, categoriesVersion]);

  // Select default category whenever type or categories list changes
  useEffect(() => {
    const filteredCats = categories.filter((c) => c.type === type);
    if (filteredCats.length > 0) {
      setCategoryId(filteredCats[0].id);
    } else {
      setCategoryId('');
    }
  }, [type, categories]);

  const handleCreateOrUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setMsg({ text: 'Please enter a valid amount greater than zero.', isError: true });
      return;
    }
    if (!categoryId) {
      setMsg({ text: 'Please select of category.', isError: true });
      return;
    }
    if (!date) {
      setMsg({ text: 'Please select a date.', isError: true });
      return;
    }

    const payload = {
      amount: parseFloat(amount),
      categoryId,
      transactionType: type,
      description: description.trim() || 'No description',
      transactionDate: date,
    };

    if (editingTx) {
      dbService.updateTransaction(userId, editingTx.id, payload);
      setMsg({ text: 'Transaction updated successfully!', isError: false });
    } else {
      dbService.addTransaction(userId, payload);
      setMsg({ text: 'Transaction added successfully!', isError: false });
    }

    onTransactionsChanged();
    loadData();
    resetForm();
    setTimeout(() => setMsg(null), 3000);
  };

  const handleEditClick = (tx: Transaction) => {
    setEditingTx(tx);
    setAmount(tx.amount.toString());
    setType(tx.transactionType);
    setCategoryId(tx.categoryId);
    setDescription(tx.description);
    setDate(tx.transactionDate);
    setShowAddForm(true);
  };

  const handleDelete = (tx: Transaction) => {
    if (window.confirm(`Delete transaction for ${currencySymbol}${tx.amount.toFixed(2)} (${tx.description})?`)) {
      dbService.deleteTransaction(userId, tx.id);
      onTransactionsChanged();
      loadData();
    }
  };

  const resetForm = () => {
    setEditingTx(null);
    setAmount('');
    setType('expense');
    const defaultExpense = categories.find((c) => c.type === 'expense');
    setCategoryId(defaultExpense ? defaultExpense.id : '');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setShowAddForm(false);
  };

  // Filtering Logic
  const filteredTransactions = transactions
    .filter((tx) => {
      // Search Term matches description or Category Name
      const catName = categories.find((c) => c.id === tx.categoryId)?.name || '';
      const matchesSearch =
        tx.description.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        catName.toLowerCase().includes(filters.searchTerm.toLowerCase());

      // Type Filter
      const matchesType = filters.type === 'all' || tx.transactionType === filters.type;

      // Category Filter
      const matchesCategory = !filters.categoryId || tx.categoryId === filters.categoryId;

      // Date Range Filters
      const matchesDateFrom = !filters.dateFrom || tx.transactionDate >= filters.dateFrom;
      const matchesDateTo = !filters.dateTo || tx.transactionDate <= filters.dateTo;

      return matchesSearch && matchesType && matchesCategory && matchesDateFrom && matchesDateTo;
    })
    .sort((a, b) => {
      // Sort configurations
      if (filters.sortBy === 'date_desc') {
        return b.transactionDate.localeCompare(a.transactionDate) || b.createdAt.localeCompare(a.createdAt);
      }
      if (filters.sortBy === 'date_asc') {
        return a.transactionDate.localeCompare(b.transactionDate) || a.createdAt.localeCompare(b.createdAt);
      }
      if (filters.sortBy === 'amount_desc') {
        return b.amount - a.amount;
      }
      if (filters.sortBy === 'amount_asc') {
        return a.amount - b.amount;
      }
      return 0;
    });

  // Pagination Helper
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Trigger page corrections if lists diminish
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [filteredTransactions.length, totalPages, currentPage]);

  const handleExportCSV = () => {
    const formattedData = filteredTransactions.map((tx) => ({
      ID: tx.id,
      Date: tx.transactionDate,
      Type: tx.transactionType.toUpperCase(),
      Category: categories.find((c) => c.id === tx.categoryId)?.name || 'Unknown',
      Amount: tx.amount,
      Description: tx.description,
      CreatedAt: tx.createdAt,
    }));
    dbService.exportToCSV(formattedData, `kallon_transactions_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-6">
      {/* Upper header action list */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Ledger & Transactions</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Audit, filter, export and manage your income streams and expense logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className={`flex items-center gap-1 px-4 py-2.5 rounded-xl border text-sm font-medium transition hover:shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700 ${
              darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
            }`}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            id="register-tx-btn"
            onClick={() => {
              resetForm();
              setShowAddForm(true);
            }}
            className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Transaction
          </button>
        </div>
      </div>

      {msg && (
        <div className={`rounded-xl border p-3.5 text-xs font-semibold ${
          msg.isError
            ? 'border-rose-100 bg-rose-50/50 text-rose-600 dark:border-rose-950/40 dark:bg-rose-950/20 dark:text-rose-400'
            : 'border-emerald-100 bg-emerald-50/50 text-emerald-600 dark:border-emerald-950/40 dark:bg-emerald-950/20 dark:text-emerald-400'
        }`}>
          {msg.text}
        </div>
      )}

      {/* FILTER DRAWER AND SEARCH BAR */}
      <div className={`rounded-2xl border p-4 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'}`}>
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute top-3 left-3 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search description or category name..."
              value={filters.searchTerm}
              onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
              className="w-full rounded-xl border py-2 pl-9 pr-4 text-sm bg-white dark:bg-neutral-950 dark:border-neutral-800 text-neutral-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-medium transition ${
                showFilters 
                ? 'border-indigo-500 bg-indigo-50/55 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400' 
                : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900/50'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              { (filters.type !== 'all' || filters.categoryId || filters.dateFrom || filters.dateTo) && (
                <span className="h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
              )}
            </button>
            
            <button
              onClick={() => setFilters({
                searchTerm: '',
                dateFrom: '',
                dateTo: '',
                categoryId: '',
                type: 'all',
                sortBy: 'date_desc'
              })}
              className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-900/40 rounded-xl"
              title="Reset Filters"
            >
              <RefreshCw className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Collapsible Filtration panel */}
        {showFilters && (
          <div className="grid gap-4 mt-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 pt-4 border-t border-neutral-100 dark:border-neutral-800 animate-fade-in">
            {/* Filter by Type */}
            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Type</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value as any })}
                className="w-full rounded-xl border py-2 px-3 text-sm bg-white dark:bg-neutral-950 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Types</option>
                <option value="income">Income Only</option>
                <option value="expense">Expense Only</option>
              </select>
            </div>

            {/* Filter by Category */}
            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Category</label>
              <select
                value={filters.categoryId}
                onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
                className="w-full rounded-xl border py-2 px-3 text-sm bg-white dark:bg-neutral-950 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    ({c.type === 'income' ? 'Inc' : 'Exp'}) {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">From Date</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full rounded-xl border py-1.5 px-3 text-sm bg-white dark:bg-neutral-950 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">To Date</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full rounded-xl border py-1.5 px-3 text-sm bg-white dark:bg-neutral-950 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Sorting */}
            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
                className="w-full rounded-xl border py-2 px-3 text-sm bg-white dark:bg-neutral-950 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="date_desc">Newest Date</option>
                <option value="date_asc">Oldest Date</option>
                <option value="amount_desc">Highest Amount</option>
                <option value="amount_asc">Lowest Amount</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* RE-USABLE MODAL PRE-BUILT FORM */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className={`w-full max-w-md rounded-3xl border p-6 shadow-xl ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'}`}>
            <div className="flex items-center justify-between border-b pb-3 mb-4 border-neutral-100 dark:border-neutral-800">
              <h2 className="text-lg font-bold">
                {editingTx ? 'Edit Transaction' : 'Record Transaction'}
              </h2>
              <button onClick={resetForm} className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('expense')}
                    className={`flex items-center justify-center gap-1 border rounded-xl py-2 px-3 text-sm font-semibold transition ${
                      type === 'expense'
                        ? 'border-rose-500 bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-450'
                        : 'border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-950/30'
                    }`}
                  >
                    <ArrowDownLeft className="h-4 w-4" />
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('income')}
                    className={`flex items-center justify-center gap-1 border rounded-xl py-2 px-3 text-sm font-semibold transition ${
                      type === 'income'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-450'
                        : 'border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-950/30'
                    }`}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    Income
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">Amount ({currencySymbol})</label>
                <input
                  id="transaction-amount-input"
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="mt-1 w-full rounded-xl border py-2.5 px-4 text-sm font-mono bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white dark:border-neutral-800 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">Category</label>
                <select
                  id="transaction-category-select"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="mt-1 w-full rounded-xl border py-2.5 px-3 text-sm bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white dark:border-neutral-800 focus:border-indigo-500 outline-none"
                >
                  {categories
                    .filter((c) => c.type === type)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  {categories.filter((c) => c.type === type).length === 0 && (
                    <option value="">No custom categories. Seed settings first.</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">Date</label>
                <div className="relative mt-1">
                  <Calendar className="absolute top-3 left-3 h-4.5 w-4.5 text-neutral-400" />
                  <input
                    id="transaction-date-input"
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white dark:border-neutral-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">Description</label>
                <div className="relative mt-1">
                  <FileText className="absolute top-3 left-3 h-4.5 w-4.5 text-neutral-400" />
                  <input
                    id="transaction-description-input"
                    type="text"
                    value={description}
                    placeholder="e.g. Weekly grocery shopping, Consulting paycheck"
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white dark:border-neutral-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 rounded-xl border py-2.5 text-sm font-semibold hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-950 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="tx-submit-btn"
                  type="submit"
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 active:scale-95 transition"
                >
                  {editingTx ? 'Save Changes' : 'Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TABLE DATA LIST CARD */}
      <div className={`overflow-hidden rounded-2xl border ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'}`}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className={`border-b text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:border-neutral-800 ${
                darkMode ? 'bg-neutral-900/60' : 'bg-neutral-50/50'
              }`}>
                <th className="py-4 px-6">Classification</th>
                <th className="py-4 px-6">Category</th>
                <th className="py-4 px-6">Description</th>
                <th className="py-4 px-6">Date</th>
                <th className="py-4 px-6 text-right">Amount</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {paginatedTransactions.map((tx) => {
                const cat = categories.find((c) => c.id === tx.categoryId);
                return (
                  <tr key={tx.id} className="hover:bg-neutral-50/40 dark:hover:bg-neutral-950/20 transition-colors">
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        tx.transactionType === 'income'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
                          : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-450'
                      }`}>
                        {tx.transactionType === 'income' ? (
                          <>
                            <ArrowUpRight className="h-3 w-3" />
                            Income
                          </>
                        ) : (
                          <>
                            <ArrowDownLeft className="h-3 w-3" />
                            Expense
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-bold text-[#B0B0B0]">
                      {cat ? cat.name : 'Uncategorized'}
                    </td>
                    <td className="py-4 px-6 text-[#C9C9C9] col-span-1 max-w-xs truncate font-medium">
                      {tx.description}
                    </td>
                    <td className="py-4 px-6 font-mono text-xs text-neutral-400">
                      {tx.transactionDate}
                    </td>
                    <td className={`py-4 px-6 text-right font-mono font-bold ${
                      tx.transactionType === 'income'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {tx.transactionType === 'income' ? '+' : '-'}{currencySymbol}{tx.amount.toFixed(2)}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEditClick(tx)}
                          className="p-1.5 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg dark:hover:bg-indigo-950/35 transition"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(tx)}
                          className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg dark:hover:bg-rose-950/35 transition"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400 dark:text-neutral-500">
                    No transactions found matching your criteria. Click "Add Transaction" to record your first entry.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION PANEL */}
        {filteredTransactions.length > 0 && (
          <div className="flex items-center justify-between border-t py-4 px-6 border-neutral-100 dark:border-neutral-800">
            <span className="text-xs text-neutral-400">
              Showing <span className="font-semibold text-neutral-700 dark:text-neutral-200">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
              <span className="font-semibold text-neutral-700 dark:text-neutral-200">
                {Math.min(currentPage * itemsPerPage, filteredTransactions.length)}
              </span>{' '}
              of <span className="font-semibold text-neutral-700 dark:text-neutral-200">{filteredTransactions.length}</span> entries
            </span>

            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage((c) => Math.max(1, c - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border dark:border-neutral-800 disabled:opacity-40 hover:bg-neutral-50 dark:hover:bg-neutral-950 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pg) => (
                <button
                  key={pg}
                  onClick={() => setCurrentPage(pg)}
                  className={`h-7 w-7 rounded-lg text-xs font-mono font-semibold transition ${
                    currentPage === pg
                      ? 'bg-indigo-600 text-white'
                      : 'border dark:border-neutral-800 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-950'
                  }`}
                >
                  {pg}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((c) => Math.min(totalPages, c + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border dark:border-neutral-800 disabled:opacity-40 hover:bg-neutral-50 dark:hover:bg-neutral-950 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

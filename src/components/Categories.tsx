import React, { useState, useEffect } from 'react';
import { dbService } from '../db';
import { Category, CategoryType } from '../types';
import { Plus, Edit2, Trash2, Check, X, Tag, ListPlus } from 'lucide-react';

interface CategoriesProps {
  userId: string;
  darkMode: boolean;
  onCategoriesChanged: () => void;
}

export function Categories({ userId, darkMode, onCategoriesChanged }: CategoriesProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Create state
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<CategoryType>('expense');
  
  // Edit state
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Notifications
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load categories
  const loadCategories = () => {
    const cats = dbService.getCategories(userId);
    setCategories(cats);
  };

  useEffect(() => {
    loadCategories();
  }, [userId]);

  const showNotification = (msg: string, isErr = false) => {
    if (isErr) {
      setError(msg);
      setTimeout(() => setError(null), 3000);
    } else {
      setSuccess(msg);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      showNotification('Please enter a category name.', true);
      return;
    }

    const result = dbService.addCategory(userId, newName, newType);
    if (typeof result === 'string') {
      showNotification(result, true);
    } else {
      showNotification(`Category "${newName.trim()}" added successfully!`);
      setNewName('');
      loadCategories();
      onCategoriesChanged();
    }
  };

  const startEditing = (cat: Category) => {
    setEditingCatId(cat.id);
    setEditingName(cat.name);
  };

  const handleUpdateCategory = (catId: string) => {
    if (!editingName.trim()) {
      showNotification('Category name cannot be empty.', true);
      return;
    }

    const result = dbService.updateCategory(userId, catId, editingName);
    if (typeof result === 'string') {
      showNotification(result, true);
    } else {
      showNotification('Category updated successfully.');
      setEditingCatId(null);
      loadCategories();
      onCategoriesChanged();
    }
  };

  const handleDeleteCategory = (catId: string, name: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${name}"? Deleting this category will also remove associated budgets.`);
    if (!confirmed) return;

    const success = dbService.deleteCategory(userId, catId);
    if (success) {
      showNotification(`Category "${name}" deleted successfully.`);
      loadCategories();
      onCategoriesChanged();
    } else {
      showNotification('Failed to delete category.', true);
    }
  };

  const incomes = categories.filter((c) => c.type === 'income');
  const expenses = categories.filter((c) => c.type === 'expense');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Category Settings</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Customize and structure your income stream resources and monthly expense categories.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3.5 text-xs font-semibold text-rose-600 dark:border-rose-950/40 dark:bg-rose-950/20 dark:text-rose-400">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5 text-xs font-semibold text-emerald-600 dark:border-emerald-950/40 dark:bg-emerald-950/20 dark:text-emerald-400">
          {success}
        </div>
      )}

      {/* Main Grid: Form + Columns */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Creation Box */}
        <div className={`h-fit rounded-2xl border p-6 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'}`}>
          <div className="mb-4 flex items-center gap-2">
            <ListPlus className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-bold">New Category</h2>
          </div>

          <form onSubmit={handleAddCategory} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">Category Name</label>
              <input
                id="category-name-input"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Subscriptions, Consulting"
                className="mt-1 w-full rounded-xl border py-2.5 px-4 text-sm bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white dark:border-neutral-800 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">Type</label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewType('expense')}
                  className={`flex items-center justify-center rounded-xl border py-2 px-3 text-sm font-medium transition ${
                    newType === 'expense'
                      ? 'border-[#1500FF] bg-indigo-50/50 text-[#1500FF] dark:bg-indigo-950/30 dark:text-[#1500FF]'
                      : 'border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-950/40'
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setNewType('income')}
                  className={`flex items-center justify-center rounded-xl border py-2 px-3 text-sm font-medium transition ${
                    newType === 'income'
                      ? 'border-[#1500FF] bg-indigo-50/50 text-[#1500FF] dark:bg-indigo-950/30 dark:text-[#1500FF]'
                      : 'border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-950/40'
                  }`}
                >
                  Income
                </button>
              </div>
            </div>

            <button
              id="add-category-button"
              type="submit"
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 active:scale-95 transition"
            >
              <Plus className="h-4 w-4" />
              Create Category
            </button>
          </form>
        </div>

        {/* Existing Categories Table/List */}
        <div className="lg:col-span-2 grid gap-6 md:grid-cols-2">
          {/* Expenses Column */}
          <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'}`}>
            <div className="mb-4 flex items-center justify-between border-b pb-3 border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-rose-500" />
                <h3 className="font-semibold text-neutral-800 dark:text-neutral-100">Expenses Categories</h3>
              </div>
              <span className="font-mono text-xs rounded-full bg-rose-50 dark:bg-rose-950/20 text-rose-500 px-2.5 py-0.5">
                {expenses.length} Total
              </span>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
              {expenses.map((cat) => (
                <div
                  key={cat.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition ${
                    editingCatId === cat.id
                      ? 'border-indigo-500 bg-indigo-50/25 dark:bg-indigo-950/10'
                      : 'border-neutral-100 hover:bg-neutral-50 dark:border-neutral-800/50 dark:hover:bg-neutral-900/30'
                  }`}
                >
                  {editingCatId === cat.id ? (
                    <div className="flex w-full items-center gap-2">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 rounded-lg border py-1 px-2.5 text-sm bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white dark:border-neutral-800 focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => handleUpdateCategory(cat.id)}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md dark:hover:bg-emerald-950/30"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingCatId(null)}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded-md dark:hover:bg-rose-950/30"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2.5">
                        <Tag className="h-4 w-4 text-neutral-400" />
                        <span className="text-sm font-medium">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => startEditing(cat)}
                          className="p-1.5 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md dark:hover:bg-indigo-950/30 transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-md dark:hover:bg-rose-950/30 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Income Column */}
          <div className={`rounded-2xl border p-6 ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'}`}>
            <div className="mb-4 flex items-center justify-between border-b pb-3 border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <h3 className="font-semibold text-neutral-800 dark:text-neutral-100">Income Categories</h3>
              </div>
              <span className="font-mono text-xs rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 px-2.5 py-0.5">
                {incomes.length} Total
              </span>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
              {incomes.map((cat) => (
                <div
                  key={cat.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition ${
                    editingCatId === cat.id
                      ? 'border-indigo-500 bg-indigo-50/25 dark:bg-indigo-950/10'
                      : 'border-neutral-100 hover:bg-neutral-50 dark:border-neutral-800/50 dark:hover:bg-neutral-900/30'
                  }`}
                >
                  {editingCatId === cat.id ? (
                    <div className="flex w-full items-center gap-2">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 rounded-lg border py-1 px-2.5 text-sm bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white dark:border-neutral-800 focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => handleUpdateCategory(cat.id)}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md dark:hover:bg-emerald-950/30"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingCatId(null)}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded-md dark:hover:bg-rose-950/30"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2.5">
                        <Tag className="h-4 w-4 text-neutral-400" />
                        <span className="text-sm font-medium">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => startEditing(cat)}
                          className="p-1.5 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md dark:hover:bg-indigo-950/30 transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-md dark:hover:bg-rose-950/30 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

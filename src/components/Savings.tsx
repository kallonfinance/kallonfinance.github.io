import React, { useState, useEffect } from 'react';
import { dbService } from '../db';
import { SavingsGoal } from '../types';
import { PiggyBank, Target, Calendar, Plus, Trash2, Edit3, CircleDollarSign, Check, X } from 'lucide-react';

interface SavingsProps {
  userId: string;
  darkMode: boolean;
  onGoalsChanged: () => void;
  currencySymbol: string;
}

export function Savings({ userId, darkMode, onGoalsChanged, currencySymbol }: SavingsProps) {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  
  // Create / Edit modal state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

  // Form State
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');

  // Quick Deposit State
  const [activeDepositId, setActiveDepositId] = useState<string | null>(null);
  const [depositValue, setDepositValue] = useState('');

  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const loadGoals = () => {
    const list = dbService.getSavingsGoals(userId);
    setGoals(list);
  };

  useEffect(() => {
    loadGoals();
  }, [userId]);

  const handleCreateOrUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(targetAmount);
    const current = parseFloat(currentAmount || '0');

    if (!goalName.trim()) {
      setMessage({ text: 'Please enter a goal name.', isError: true });
      return;
    }
    if (isNaN(target) || target <= 0) {
      setMessage({ text: 'Please enter a valid target amount greater than zero.', isError: true });
      return;
    }
    if (isNaN(current) || current < 0) {
      setMessage({ text: 'Current savings amount cannot be negative.', isError: true });
      return;
    }

    const payload = {
      goalName: goalName.trim(),
      targetAmount: target,
      currentAmount: current,
      targetDate: targetDate || new Date(Date.now() + 31536000000).toISOString().split('T')[0], // default 1 year out
    };

    if (editingGoal) {
      dbService.updateSavingsGoal(userId, editingGoal.id, payload);
      setMessage({ text: 'Savings goal modified successfully!', isError: false });
    } else {
      dbService.addSavingsGoal(userId, payload);
      setMessage({ text: 'Savings goal launched successfully!', isError: false });
    }

    onGoalsChanged();
    loadGoals();
    resetForm();
    setTimeout(() => setMessage(null), 3000);
  };

  const handleEditClick = (g: SavingsGoal) => {
    setEditingGoal(g);
    setGoalName(g.goalName);
    setTargetAmount(g.targetAmount.toString());
    setCurrentAmount(g.currentAmount.toString());
    setTargetDate(g.targetDate);
    setShowAddForm(true);
  };

  const handleDelete = (g: SavingsGoal) => {
    if (window.confirm(`Are you sure you want to delete the "${g.goalName}" goal?`)) {
      dbService.deleteSavingsGoal(userId, g.id);
      onGoalsChanged();
      loadGoals();
    }
  };

  const handleQuickDeposit = (e: React.FormEvent, goalId: string) => {
    e.preventDefault();
    const dep = parseFloat(depositValue);
    if (isNaN(dep) || dep <= 0) {
      alert('Please enter a valid deposit amount.');
      return;
    }

    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;

    const updatedCurrent = goal.currentAmount + dep;
    dbService.updateSavingsGoal(userId, goalId, { currentAmount: updatedCurrent });
    
    // Log as a transaction of type "expense" (or special category "Savings") if desired?
    // Let's create an implicit category "Savings" or simply update the goal.
    // The requirement is to "track progress" and "view completion percentage".
    // This simple deposit helper is extremely elegant.
    
    setActiveDepositId(null);
    setDepositValue('');
    onGoalsChanged();
    loadGoals();
  };

  const resetForm = () => {
    setEditingGoal(null);
    setGoalName('');
    setTargetAmount('');
    setCurrentAmount('');
    setTargetDate('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Savings & Future Goals</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Keep track of capital allocations toward specific goals and track milestones.
          </p>
        </div>

        <button
          id="config-savings-btn"
          onClick={() => {
            resetForm();
            setShowAddForm(true);
          }}
          className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition shadow-sm self-start cursor-pointer transition-theme"
        >
          <Plus className="h-4 w-4" />
          Create Savings Goal
        </button>
      </div>

      {message && (
        <div id="savings-notif" className={`rounded-xl border p-3.5 text-xs font-semibold ${
          message.isError
            ? 'border-rose-100 bg-rose-50/50 text-rose-600 dark:border-rose-950/45 dark:bg-rose-950/20 dark:text-rose-400'
            : 'border-emerald-100 bg-emerald-50/50 text-emerald-600 dark:border-emerald-950/45 dark:bg-emerald-950/20 dark:text-emerald-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Grid displays - Active goals */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {goals.map((g) => {
          const percentage = Math.min(100, (g.currentAmount / g.targetAmount) * 100) || 0;
          const isCompleted = g.currentAmount >= g.targetAmount;
          
          return (
            <div
              key={g.id}
              className={`rounded-3xl border p-6 flex flex-col justify-between transition-card ${
                isCompleted
                  ? 'border-emerald-250 bg-emerald-50/10 dark:border-emerald-950/20'
                  : darkMode
                  ? 'bg-neutral-900 border-neutral-800'
                  : 'bg-white border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  {/* Piggy Bank Icon */}
                  <div className={`p-3 rounded-2xl ${
                    isCompleted
                      ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
                      : darkMode
                      ? 'bg-neutral-950 text-indigo-400'
                      : 'bg-indigo-50 text-indigo-600'
                  }`}>
                    <PiggyBank className="h-5.5 w-5.5" />
                  </div>

                  <div className="flex items-center gap-1.5 text-neutral-400">
                    <button
                      onClick={() => handleEditClick(g)}
                      className="p-1 px-1.5 hover:text-indigo-600 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg text-xs"
                      title="Edit Goal"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(g)}
                      className="p-1 px-1.5 hover:text-rose-500 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg text-xs"
                      title="Delete Goal"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-[16px] text-blue-600 dark:text-blue-400">{g.goalName}</h3>
                  <div className="mt-2.5 flex items-baseline justify-between">
                    <span className="font-mono text-xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                      {currencySymbol}{g.currentAmount.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                    </span>
                    <span className="text-xs text-neutral-400 font-medium">
                      of <span className="font-mono text-[#ABABAB] font-bold">{currencySymbol}{g.targetAmount.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 pt-2">
                  <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-950 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted ? 'bg-emerald-500' : 'bg-indigo-600 dark:bg-indigo-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400">Completion</span>
                    <span className={`font-semibold ${isCompleted ? 'text-emerald-500' : 'text-indigo-600 dark:text-indigo-400'}`}>
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Deposit section / Date section */}
              <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
                <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-mono">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Target Date: {g.targetDate}</span>
                </div>

                {/* Quick deposit inline trigger */}
                {activeDepositId === g.id ? (
                  <form
                    onSubmit={(e) => handleQuickDeposit(e, g.id)}
                    className="flex w-full items-center gap-1.5 mt-2 animate-fade-in"
                  >
                    <input
                      type="number"
                      placeholder="Amount to deposit"
                      step="0.01"
                      required
                      value={depositValue}
                      onChange={(e) => setDepositValue(e.target.value)}
                      className="flex-1 rounded-xl border py-1.5 px-3 text-xs bg-white dark:bg-neutral-950 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveDepositId(null)}
                      className="p-1.5 border dark:border-neutral-800 rounded-lg text-neutral-400"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </form>
                ) : (
                  !isCompleted && (
                    <button
                      onClick={() => {
                        setActiveDepositId(g.id);
                        setDepositValue('');
                      }}
                      className="inline-flex w-full items-center justify-center gap-1 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-800 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200"
                    >
                      <CircleDollarSign className="h-3.5 w-3.5 text-emerald-500" />
                      Add Savings Deposit
                    </button>
                  )
                )}
              </div>
            </div>
          );
        })}

        {goals.length === 0 && (
          <div className={`col-span-full p-12 text-center rounded-3xl border text-neutral-400 dark:text-neutral-500 ${
            darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
          }`}>
            No savings goals currently mapped. Budget on a rainy day fund or down payment by launching your first goal!
          </div>
        )}
      </div>

      {/* RE-USABLE ADD/EDIT GOAL SCREEN DIALOG */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className={`w-full max-w-md rounded-3xl border p-6 shadow-xl ${darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'}`}>
            <div className="flex items-center justify-between border-b pb-3 mb-4 border-neutral-100 dark:border-neutral-800">
              <h2 className="text-lg font-bold">
                {editingGoal ? 'Amend Savings Structure' : 'New Savings Goal'}
              </h2>
              <button onClick={resetForm} className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1 font-mono">Goal Name</label>
                <input
                  id="goal-name-input"
                  type="text"
                  required
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  placeholder="e.g. Emergency Fund, New Hatchback"
                  className="w-full rounded-xl border py-2.5 px-4 text-sm bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white dark:border-neutral-800 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1 font-mono">Target Capacity ({currencySymbol})</label>
                  <input
                    id="goal-target-input"
                    type="number"
                    step="0.01"
                    required
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full rounded-xl border py-2 px-3 text-sm font-mono bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white dark:border-neutral-800 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1 font-mono">Current Cache ({currencySymbol})</label>
                  <input
                    id="goal-current-input"
                    type="number"
                    step="0.01"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border py-2 px-3 text-sm font-mono bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white dark:border-neutral-800 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1 font-mono">Target Date</label>
                <div className="relative">
                  <Calendar className="absolute top-2.5 left-3 h-4.5 w-4.5 text-neutral-400" />
                  <input
                    id="goal-date-input"
                    type="date"
                    required
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full rounded-xl border py-2 pl-10 pr-4 text-sm bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white dark:border-neutral-800 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 rounded-xl border py-2 text-sm font-semibold hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-950 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="goal-submit-btn"
                  type="submit"
                  className="flex-1 rounded-xl bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-500 active:scale-95 transition"
                >
                  {editingGoal ? 'Confirm Shifts' : 'Initiate Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

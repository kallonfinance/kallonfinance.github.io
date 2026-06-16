import React, { useState, useEffect } from 'react';
import { dbService } from './db';
import { User } from './types';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { Transactions } from './components/Transactions';
import { Budgets } from './components/Budgets';
import { Savings } from './components/Savings';
import { Categories } from './components/Categories';
import { Reports } from './components/Reports';
import { Contact } from './components/Contact';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  LayoutDashboard,
  Receipt,
  Target,
  PiggyBank,
  Tags,
  FileBarChart,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import logoImg from './assets/images/app_logo_1781644653866.jpg';

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'Dollar ($)' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira (₦)' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan (¥)' },
  { code: 'GBP', symbol: '£', name: 'Pound (£)' },
  { code: 'EUR', symbol: '€', name: 'Euro (€)' },
];

export default function App() {
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    // Read theme selection from localstorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kallon_theme') === 'dark';
    }
    return false;
  });

  // Minimum presentation timer for Splash screen setup
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  const [currency, setCurrency] = useState<string>('$');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Reactive view sync keys
  const [transactionsVersion, setTransactionsVersion] = useState(0);
  const [goalsVersion, setGoalsVersion] = useState(0);
  const [categoriesVersion, setCategoriesVersion] = useState(0);

  // Sync user state on first mount using Firebase Auth state change callback
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          console.log("Restoring session. Attempting to get user doc for UID:", firebaseUser.uid);
          let userDoc;
          try {
            userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            console.log("User doc fetch returned. Exists:", userDoc.exists());
          } catch (docErr) {
            console.error("CRITICAL: Failed to get/check users document in Firestore:", docErr);
            throw docErr;
          }

          let user: User;
          if (userDoc.exists()) {
            user = userDoc.data() as User;
          } else {
            user = {
              id: firebaseUser.uid,
              email: firebaseUser.email || 'user@kallon.com',
              passwordHash: '',
              securityQuestion: 'Which authentication provider is active?',
              securityAnswer: 'firebase',
              createdAt: new Date().toISOString(),
            };
            console.log("User doc not found. Creating new profile in Firestore:", user);
            try {
              await setDoc(doc(db, 'users', firebaseUser.uid), user);
              console.log("Successfully created user profile.");
            } catch (setErr) {
              console.error("CRITICAL: Failed to write users document in Firestore:", setErr);
              throw setErr;
            }
          }
          
          // Seed defaults & sync user data from cloud Firestore
          console.log("Seeding default categories for user:", user.id);
          await dbService.seedDefaultCategories(user.id);
          console.log("Syncing user data from cloud for user:", user.id);
          await dbService.syncFromCloud(user.id);

          dbService.setActiveUserId(user.id);
          setActiveUser(user);
          setCurrency(dbService.getPreferredCurrency(user.id));
        } catch (error: any) {
          console.error("Error setting up user session from cloud:", error);
          if (error && error.stack) {
            console.error("Session setup error stack trace:", error.stack);
          }
        } finally {
          setIsLoadingAuth(false);
        }
      } else {
        dbService.setActiveUserId(null);
        setActiveUser(null);
        setIsLoadingAuth(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync dark mode selection to the root class list for Tailwind v4
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('kallon_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('kallon_theme', 'light');
    }
  }, [darkMode]);

  const handleCurrencyChange = (sym: string) => {
    setCurrency(sym);
    if (activeUser) {
      dbService.setPreferredCurrency(activeUser.id, sym);
    }
  };

  const handleAuthSuccess = (user: User) => {
    setActiveUser(user);
    dbService.setActiveUserId(user.id);
    setCurrency(dbService.getPreferredCurrency(user.id));
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Failed to sign out natively from Firebase Auth:", e);
    }
    dbService.setActiveUserId(null);
    setActiveUser(null);
    setActiveTab('dashboard');
    setMobileMenuOpen(false);
    setCurrency('$');
    setShowLogoutConfirm(false);
  };

  const triggerTransactionsUpdate = () => {
    setTransactionsVersion((prev) => prev + 1);
  };

  const triggerGoalsUpdate = () => {
    setGoalsVersion((prev) => prev + 1);
  };

  const triggerCategoriesUpdate = () => {
    setCategoriesVersion((prev) => prev + 1);
    // Categories updates can cascade and change budgets/select lists
    setTransactionsVersion((prev) => prev + 1);
  };

  // Render high-fidelity premium splash screen before security auth or dashboard loads
  if (showSplash || isLoadingAuth) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center transition-colors duration-500 ${
        darkMode ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-50 text-neutral-900'
      }`}>
        <div className="flex flex-col items-center max-w-sm px-6 text-center animate-scale-up">
          {/* Logo container with pulse design */}
          <div className="relative mb-6 flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border border-neutral-200/80 dark:border-neutral-800/80 shadow-xl bg-white dark:bg-neutral-900">
            <img
              src={logoImg}
              alt="Kallon Finance Logo"
              className="h-full w-full object-cover animate-pulse"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/10 to-transparent pointer-events-none" />
          </div>

          {/* Title branding text */}
          <h1 className="font-display text-4xl font-extrabold tracking-tight mb-2">
            Kallon <span className="text-indigo-600 dark:text-indigo-400">FinanceTracker</span>
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium tracking-wide mb-8">
            Your Personal Secure Financial Framework
          </p>

          {/* Sleek Progress Bar */}
          <div className="w-48 h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden relative">
            <div className="absolute top-0 left-0 h-full bg-indigo-600 dark:bg-indigo-500 rounded-full w-2/3 animate-progress-slide" />
          </div>

          <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mt-4 animate-pulse">
            {isLoadingAuth ? 'Restoring Secure Session...' : 'Readying Dashboard...'}
          </span>
        </div>
      </div>
    );
  }

  // If no user session is open, present the Auth hub
  if (!activeUser) {
    return (
      <Auth
        onAuthSuccess={handleAuthSuccess}
        darkMode={darkMode}
      />
    );
  }

  // Sidebar link maps
  const navTabs = [
    { id: 'dashboard', label: 'Command Hub', icon: LayoutDashboard },
    { id: 'transactions', label: 'Ledger Logs', icon: Receipt },
    { id: 'budgets', label: 'Spend Caps', icon: Target },
    { id: 'savings', label: 'Savings Goals', icon: PiggyBank },
    { id: 'reports', label: 'Monthly reports', icon: FileBarChart },
    { id: 'categories', label: 'Manage Categories', icon: Tags },
    { id: 'contact', label: 'Help & Support', icon: HelpCircle },
  ];

  return (
    <div className={`min-h-screen font-sans flex transition-colors duration-250 ${
      darkMode ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-50/50 text-neutral-900'
    }`}>
      {/* SIDEBAR NAVIGATION RAIL - DESKTOP VIEW */}
      <aside className={`fixed inset-y-0 left-0 z-40 hidden w-64 border-r flex-col justify-between transition-colors duration-250 md:flex ${
        darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
      }`}>
        <div className="flex flex-col">
          {/* Logo Brand banner */}
          <div className="flex h-16 items-center gap-2.5 px-6 border-b border-neutral-100 dark:border-neutral-800/80">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-neutral-100 dark:border-neutral-800 shadow-xs bg-white dark:bg-neutral-950">
              <img
                src={logoImg}
                alt="Kallon Finance Logo"
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">
              Kallon <span className="text-indigo-600 dark:text-indigo-400">Finance</span>
            </span>
          </div>

          {/* Navigation link stacks */}
          <nav className="space-y-1.5 p-4 mt-2">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center gap-3.5 rounded-xl py-2.5 px-4 text-sm font-semibold transition cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-neutral-500 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-950/40'
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User profile actions */}
        <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 space-y-3 bg-neutral-50/20 dark:bg-neutral-950/20">
          <div className="flex items-center gap-2 px-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-wider font-bold text-neutral-400">Secure Session</p>
              <p className="text-xs font-semibold truncate text-blue-600 dark:text-blue-400">{activeUser.email}</p>
            </div>
          </div>

          <div className="space-y-1 px-2">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-400 font-mono">Currency</label>
            <select
              value={currency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="w-full rounded-lg border py-1 px-2 text-xs bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.symbol}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="flex items-center justify-center rounded-xl border p-2 text-neutral-400 hover:text-neutral-600 dark:border-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
              title="Toggle Dark Mode"
            >
              {darkMode ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center justify-center rounded-xl border border-rose-200 p-2 text-rose-500 hover:bg-rose-50 dark:border-neutral-800 dark:hover:bg-rose-950/20 cursor-pointer"
              title="End Secure Session"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MOBILE HEADER BAR */}
      <div className="fixed top-0 inset-x-0 z-30 flex h-16 items-center justify-between border-b px-4 md:hidden no-print transition-colors duration-250 bg-white border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-neutral-150 dark:border-neutral-800 shadow-xs bg-white dark:bg-neutral-950">
            <img
              src={logoImg}
              alt="Kallon Finance Logo"
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="font-display font-bold tracking-tight">Kallon FinanceTracker</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 text-neutral-400 hover:text-neutral-500"
          >
            {darkMode ? <Sun className="h-4.5 w-4.5 text-amber-500" /> : <Moon className="h-4.5 w-4.5" />}
          </button>
          
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-neutral-500 hover:text-neutral-600"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* MOBILE COLLAPSIBLE DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden animate-fade-in no-print">
          <aside className={`absolute top-0 bottom-0 left-0 w-3/4 max-w-sm p-6 shadow-xl flex flex-col justify-between ${
            darkMode ? 'bg-neutral-900 border-r border-neutral-800' : 'bg-white border-r border-neutral-200'
          }`}>
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4 border-neutral-200 dark:border-neutral-805">
                <span className="font-display font-bold tracking-tight">Kallon Grid</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-md text-neutral-400">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation Stack */}
              <nav className="space-y-2">
                {navTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`flex w-full items-center gap-3.5 rounded-xl py-3 px-4 text-sm font-semibold transition ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-neutral-500 hover:bg-neutral-50/50 dark:text-neutral-400 dark:hover:bg-neutral-950/40'
                      }`}
                    >
                      <Icon className="h-4.5 w-4.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Profile section */}
            <div className="border-t pt-4 border-neutral-200 dark:border-neutral-800 space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <p className="text-xs truncate font-medium text-blue-600 dark:text-blue-400">{activeUser.email}</p>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-neutral-400 font-mono">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  className="w-full rounded-lg border py-2 px-2.5 text-xs bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.symbol}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-100 px-4 py-3 text-sm font-semibold text-rose-500 hover:bg-rose-50/50 cursor-pointer"
              >
                <LogOut className="h-4.5 w-4.5" />
                End Session
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* MAIN VIEWPORT PORT */}
      <main className="flex-1 min-h-screen pt-16 md:pt-0 md:pl-64 flex flex-col">

        {/* WORKSPACE ELEMENT SCREEN */}
        <div className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          {activeTab === 'dashboard' && (
            <Dashboard
              userId={activeUser.id}
              darkMode={darkMode}
              onNavigate={setActiveTab}
              transactionsVersion={transactionsVersion}
              goalsVersion={goalsVersion}
              currencySymbol={currency}
            />
          )}

          {activeTab === 'transactions' && (
            <Transactions
              userId={activeUser.id}
              darkMode={darkMode}
              onTransactionsChanged={triggerTransactionsUpdate}
              categoriesVersion={categoriesVersion}
              currencySymbol={currency}
            />
          )}

          {activeTab === 'budgets' && (
            <Budgets
              userId={activeUser.id}
              darkMode={darkMode}
              transactionsVersion={transactionsVersion}
              currencySymbol={currency}
            />
          )}

          {activeTab === 'savings' && (
            <Savings
              userId={activeUser.id}
              darkMode={darkMode}
              onGoalsChanged={triggerGoalsUpdate}
              currencySymbol={currency}
            />
          )}

          {activeTab === 'categories' && (
            <Categories
              userId={activeUser.id}
              darkMode={darkMode}
              onCategoriesChanged={triggerCategoriesUpdate}
            />
          )}

          {activeTab === 'reports' && (
            <Reports
              userId={activeUser.id}
              darkMode={darkMode}
              transactionsVersion={transactionsVersion}
              currencySymbol={currency}
            />
          )}

          {activeTab === 'contact' && (
            <Contact
              userId={activeUser.id}
              darkMode={darkMode}
            />
          )}
        </div>
      </main>

      {/* BEAUTIFUL CUSTOM LOGOUT CONFIRMATION MODAL */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in" id="logout-confirmation-modal">
          <div className={`w-full max-w-sm rounded-2xl border p-6 shadow-xl animate-scale-in ${
            darkMode ? 'bg-neutral-900 border-neutral-800 text-neutral-100' : 'bg-white border-neutral-200 text-neutral-900'
          }`}>
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-500 mb-4">
                <LogOut className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold tracking-tight">End Secure Session?</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                Are you sure you want to end your active secure session for <strong className="text-blue-600 dark:text-blue-400">{activeUser.email}</strong>?
              </p>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition cursor-pointer ${
                  darkMode
                    ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-400'
                    : 'border-neutral-200 hover:bg-neutral-50 text-neutral-600'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 py-2.5 text-sm font-semibold text-white transition cursor-pointer shadow-md"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { User, Category, Transaction, Budget, SavingsGoal } from './types';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where 
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, signInWithEmailAndPassword, updatePassword
} from 'firebase/auth';

// Helper to generate a simple UUID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36).substring(4);
}

// Default Categories
const DEFAULT_INCOME_CATEGORIES = ['Salary', 'Business', 'Freelancing', 'Investment', 'Gifts', 'Other'];
const DEFAULT_EXPENSE_CATEGORIES = [
  'Food',
  'Transportation',
  'Rent',
  'Utilities',
  'Education',
  'Healthcare',
  'Entertainment',
  'Shopping',
  'Family',
  'Miscellaneous',
];

// Localstorage state getters and setters
const getStorageItem = <T>(key: string, defaultValue: T): T => {
  const item = localStorage.getItem(key);
  if (!item) return defaultValue;
  try {
    return JSON.parse(item) as T;
  } catch {
    return defaultValue;
  }
};

const setStorageItem = <T>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const dbService = {
  // USER AUTHENTICATION & CLOUD SYNC ENGINE
  getUsers(): User[] {
    return getStorageItem<User[]>('kallon_users', []);
  },

  async syncFromCloud(userId: string): Promise<void> {
    try {
      // 1. Fetch Categories
      const catSnap = await getDocs(query(collection(db, 'categories'), where('userId', '==', userId)));
      const categories: Category[] = [];
      catSnap.forEach(docSnap => categories.push(docSnap.data() as Category));
      const allCats = getStorageItem<Category[]>('kallon_categories', []).filter(c => c.userId !== userId);
      setStorageItem('kallon_categories', [...allCats, ...categories]);

      // 2. Fetch Transactions
      const txSnap = await getDocs(query(collection(db, 'transactions'), where('userId', '==', userId)));
      const transactions: Transaction[] = [];
      txSnap.forEach(docSnap => transactions.push(docSnap.data() as Transaction));
      const allTxs = getStorageItem<Transaction[]>('kallon_transactions', []).filter(t => t.userId !== userId);
      setStorageItem('kallon_transactions', [...allTxs, ...transactions]);

      // 3. Fetch Budgets
      const budgetSnap = await getDocs(query(collection(db, 'budgets'), where('userId', '==', userId)));
      const budgets: Budget[] = [];
      budgetSnap.forEach(docSnap => budgets.push(docSnap.data() as Budget));
      const allBudgets = getStorageItem<Budget[]>('kallon_budgets', []).filter(b => b.userId !== userId);
      setStorageItem('kallon_budgets', [...allBudgets, ...budgets]);

      // 4. Fetch Savings Goals
      const savingsSnap = await getDocs(query(collection(db, 'savings'), where('userId', '==', userId)));
      const savings: SavingsGoal[] = [];
      savingsSnap.forEach(docSnap => savings.push(docSnap.data() as SavingsGoal));
      const allSavings = getStorageItem<SavingsGoal[]>('kallon_savings', []).filter(g => g.userId !== userId);
      setStorageItem('kallon_savings', [...allSavings, ...savings]);
    } catch (e) {
      console.warn("Failed to sync client data from Cloud Firestore:", e);
    }
  },

  async registerUser(email: string, passwordHash: string, securityQuestion: string, securityAnswer: string): Promise<User | string> {
    const normalizedEmail = email.toLowerCase().trim();
    try {
      // 1. Register natively via Firebase Auth (decrypt basic client side safe btoa hash for Auth)
      let rawPassword = 'Password123!';
      try {
        rawPassword = atob(passwordHash);
      } catch {
        rawPassword = passwordHash;
      }
      
      const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, rawPassword);
      const firebaseUser = userCredential.user;

      const newUser: User = {
        id: firebaseUser.uid,
        email: normalizedEmail,
        passwordHash,
        securityQuestion,
        securityAnswer: securityAnswer.toLowerCase().trim(),
        createdAt: new Date().toISOString(),
      };

      // 2. Save user profile to Firestore `/users/{uid}`
      await setDoc(doc(db, 'users', firebaseUser.uid), newUser);

      // Save locally
      const users = this.getUsers();
      setStorageItem('kallon_users', [...users.filter(u => u.email !== normalizedEmail), newUser]);

      // Seed categories in Firestore & localStorage
      await this.seedDefaultCategories(newUser.id);

      return newUser;
    } catch (error: any) {
      if (error.code === 'auth/operation-not-allowed') {
        return 'Email/password authentication is currently disabled in your Firebase Console. Please go to Build > Authentication > Sign-in Method and enable "Email/Password" to login with your custom password.';
      }
      return error.message || 'Registration failed.';
    }
  },

  async loginUser(email: string, passwordHash: string): Promise<User | string> {
    const normalizedEmail = email.toLowerCase().trim();
    try {
      let rawPassword = 'Password123!';
      try {
        rawPassword = atob(passwordHash);
      } catch {
        rawPassword = passwordHash;
      }

      // 1. Authenticate with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, rawPassword);
      const firebaseUser = userCredential.user;

      // 2. Load custom user document (contains custom backup questions)
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      let user: User;

      if (userDoc.exists()) {
        user = userDoc.data() as User;
      } else {
        user = {
          id: firebaseUser.uid,
          email: normalizedEmail,
          passwordHash,
          securityQuestion: 'What was your primary registration path?',
          securityAnswer: 'cloud',
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', firebaseUser.uid), user);
      }

      // 3. Mark sessions
      setStorageItem('kallon_active_user', user.id);

      const users = this.getUsers();
      setStorageItem('kallon_users', [...users.filter(u => u.id !== user.id), user]);

      // 4. Download and sync latest financial transaction lines from Cloud
      await this.syncFromCloud(user.id);

      return user;
    } catch (error: any) {
      if (error.code === 'auth/operation-not-allowed') {
        return 'Email/password logins are not configured in your Firebase Project Console. Navigate to Authentication and turn on English/Password in sign-in providers.';
      }
      return error.message || 'Incorrect email or password credentials.';
    }
  },

  async loginWithGoogle(): Promise<User | string> {
    try {
      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const firebaseUser = userCredential.user;

      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      let user: User;

      if (userDoc.exists()) {
        user = userDoc.data() as User;
      } else {
        user = {
          id: firebaseUser.uid,
          email: firebaseUser.email || 'google-auth-user@kallon.com',
          passwordHash: '',
          securityQuestion: 'Which authentication provider is active?',
          securityAnswer: 'google',
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', firebaseUser.uid), user);
      }

      setStorageItem('kallon_active_user', user.id);

      const users = this.getUsers();
      setStorageItem('kallon_users', [...users.filter(u => u.id !== user.id), user]);

      // Seed and Sync collections
      await this.seedDefaultCategories(user.id);
      await this.syncFromCloud(user.id);

      return user;
    } catch (error: any) {
      console.error("Google Authentication error detail:", error);
      if (error && error.code) {
        if (error.code === 'auth/operation-not-allowed') {
          return 'Google Sign-In is NOT enabled in your Firebase Project! To enable it: \n\n1. Go to Firebase Console -> Build -> Authentication -> Sign-in Method.\n2. Click "Add new provider" -> Select "Google", toggle to Enable, add a support email, then click Save.';
        }
        if (error.code === 'auth/unauthorized-domain') {
          const host = window.location.hostname;
          return `Unauthorized Domain Error! "${host}" is not added as an authorized domain in your Firebase project. \n\nHow to fix:\n1. Open your Firebase Console -> Build -> Authentication -> Settings tab.\n2. Under "Authorized domains", click "Add domain".\n3. Copy and paste your exact web domain: "${host}"\n4. Save, then refresh this app and try again!`;
        }
        if (error.code === 'auth/popup-blocked') {
          return 'Google authentication popup was blocked by your browser! Please enable popups/redirects for this tab in your browser bar and try again.';
        }
        if (error.code === 'auth/popup-closed-by-user') {
          return 'The Google authentication popup was closed by the user before completing the sign-in flow.';
        }
      }
      return `${error.message || 'Google Single Sign-On failed.'} (Code: ${error?.code || 'unknown'})`;
    }
  },

  async resetPassword(email: string, securityAnswer: string, newPasswordHash: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedAnswer = securityAnswer.toLowerCase().trim();

    try {
      // Look up user in Firestore
      const userSnap = await getDocs(query(collection(db, 'users'), where('email', '==', normalizedEmail)));
      if (userSnap.empty) return false;

      let matchedUser: User | null = null;
      userSnap.forEach((docSnap) => {
        const u = docSnap.data() as User;
        if (u.securityAnswer === normalizedAnswer) {
          matchedUser = u;
        }
      });

      if (!matchedUser) return false;

      // Update locally
      const users = this.getUsers();
      const uIdx = users.findIndex((u) => u.email === normalizedEmail);
      if (uIdx !== -1) {
        users[uIdx].passwordHash = newPasswordHash;
        setStorageItem('kallon_users', users);
      }

      // Update in Firestore
      await updateDoc(doc(db, 'users', (matchedUser as User).id), {
        passwordHash: newPasswordHash
      });

      // Attempt to update natively if logged in
      if (auth.currentUser) {
        let rawPass = 'Password123!';
        try {
          rawPass = atob(newPasswordHash);
        } catch {
          rawPass = newPasswordHash;
        }
        await updatePassword(auth.currentUser, rawPass);
      }

      return true;
    } catch (e) {
      console.warn("Failed reset password in cloud:", e);
      return false;
    }
  },

  getActiveUserId(): string | null {
    return localStorage.getItem('kallon_active_user');
  },

  setActiveUserId(userId: string | null): void {
    if (userId) {
      localStorage.setItem('kallon_active_user', userId);
    } else {
      localStorage.removeItem('kallon_active_user');
    }
  },

  getActiveUser(): User | null {
    const userId = this.getActiveUserId();
    if (!userId) return null;
    return this.getUsers().find((u) => u.id === userId) || null;
  },

  // CATEGORIES
  async seedDefaultCategories(userId: string): Promise<void> {
    const existingCats = getStorageItem<Category[]>('kallon_categories', []);
    
    // Check if categories already exist
    const userHasCats = existingCats.some((c) => c.userId === userId);
    if (userHasCats) return;

    try {
      const catSnap = await getDocs(query(collection(db, 'categories'), where('userId', '==', userId)));
      if (!catSnap.empty) {
        const categories: Category[] = [];
        catSnap.forEach(d => categories.push(d.data() as Category));
        setStorageItem('kallon_categories', [...existingCats.filter(c => c.userId !== userId), ...categories]);
        return;
      }
    } catch (e) {
      console.warn("Could not check categories in Firestore: ", e);
    }

    const newCats: Category[] = [];

    DEFAULT_INCOME_CATEGORIES.forEach((name) => {
      newCats.push({
        id: generateId(),
        userId,
        name,
        type: 'income',
        createdAt: new Date().toISOString(),
      });
    });

    DEFAULT_EXPENSE_CATEGORIES.forEach((name) => {
      newCats.push({
        id: generateId(),
        userId,
        name,
        type: 'expense',
        createdAt: new Date().toISOString(),
      });
    });

    // Write to Firestore asynchronously in background
    newCats.forEach((cat) => {
      setDoc(doc(db, 'categories', cat.id), cat)
        .catch(e => handleFirestoreError(e, OperationType.CREATE, `categories/${cat.id}`));
    });

    setStorageItem('kallon_categories', [...existingCats, ...newCats]);
  },

  getCategories(userId: string): Category[] {
    this.seedDefaultCategories(userId).catch(console.error);
    const allCats = getStorageItem<Category[]>('kallon_categories', []);
    return allCats.filter((c) => c.userId === userId);
  },

  addCategory(userId: string, name: string, type: 'income' | 'expense'): Category | string {
    const allCats = getStorageItem<Category[]>('kallon_categories', []);
    const normalizedName = name.trim();

    const duplicate = allCats.find(
      (c) => c.userId === userId && c.name.toLowerCase() === normalizedName.toLowerCase() && c.type === type
    );

    if (duplicate) {
      return `A ${type} category named "${normalizedName}" already exists.`;
    }

    const newCat: Category = {
      id: generateId(),
      userId,
      name: normalizedName,
      type,
      createdAt: new Date().toISOString(),
    };

    // 1. Sync to memory cache
    setStorageItem('kallon_categories', [...allCats, newCat]);

    // 2. Sync to Cloud Firestore asynchronously
    setDoc(doc(db, 'categories', newCat.id), newCat)
      .catch(e => handleFirestoreError(e, OperationType.CREATE, `categories/${newCat.id}`));

    return newCat;
  },

  updateCategory(userId: string, catId: string, name: string): Category | string {
    const allCats = getStorageItem<Category[]>('kallon_categories', []);
    const normalizedName = name.trim();

    const catIndex = allCats.findIndex((c) => c.id === catId && c.userId === userId);
    if (catIndex === -1) {
      return 'Category not found.';
    }

    const duplicate = allCats.find(
      (c) => c.id !== catId && c.userId === userId && c.name.toLowerCase() === normalizedName.toLowerCase() && c.type === allCats[catIndex].type
    );

    if (duplicate) {
      return `Another category named "${normalizedName}" already exists.`;
    }

    allCats[catIndex].name = normalizedName;

    // 1. Sync to memory cache
    setStorageItem('kallon_categories', allCats);

    // 2. Sync to Firestore in background
    setDoc(doc(db, 'categories', catId), allCats[catIndex])
      .catch(e => handleFirestoreError(e, OperationType.UPDATE, `categories/${catId}`));

    return allCats[catIndex];
  },

  deleteCategory(userId: string, catId: string): boolean {
    const allCats = getStorageItem<Category[]>('kallon_categories', []);
    const filteredCats = allCats.filter((c) => !(c.id === catId && c.userId === userId));

    if (allCats.length === filteredCats.length) {
      return false;
    }

    // 1. Sync to local storage
    setStorageItem('kallon_categories', filteredCats);

    // Also clean up budgets
    const allBudgets = getStorageItem<Budget[]>('kallon_budgets', []);
    const filteredBudgets = allBudgets.filter((b) => !(b.categoryId === catId && b.userId === userId));
    setStorageItem('kallon_budgets', filteredBudgets);

    // 2. Sync to Cloud Firestore (Delete document)
    deleteDoc(doc(db, 'categories', catId))
      .catch(e => handleFirestoreError(e, OperationType.DELETE, `categories/${catId}`));

    return true;
  },

  // TRANSACTIONS
  getTransactions(userId: string): Transaction[] {
    const allTx = getStorageItem<Transaction[]>('kallon_transactions', []);
    return allTx.filter((t) => t.userId === userId);
  },

  addTransaction(userId: string, transaction: Omit<Transaction, 'id' | 'userId' | 'createdAt'>): Transaction {
    const allTx = getStorageItem<Transaction[]>('kallon_transactions', []);
    const newTx: Transaction = {
      ...transaction,
      id: generateId(),
      userId,
      createdAt: new Date().toISOString(),
    };

    // 1. Save to local storage cache
    setStorageItem('kallon_transactions', [...allTx, newTx]);

    // 2. Sync to cloud Firestore in background
    setDoc(doc(db, 'transactions', newTx.id), newTx)
      .catch(e => handleFirestoreError(e, OperationType.CREATE, `transactions/${newTx.id}`));

    return newTx;
  },

  updateTransaction(userId: string, id: string, updated: Partial<Omit<Transaction, 'id' | 'userId' | 'createdAt'>>): Transaction | null {
    const allTx = getStorageItem<Transaction[]>('kallon_transactions', []);
    const index = allTx.findIndex((t) => t.id === id && t.userId === userId);

    if (index === -1) return null;

    allTx[index] = {
      ...allTx[index],
      ...updated,
    };

    // 1. Save locally
    setStorageItem('kallon_transactions', allTx);

    // 2. Sync to Firestore in background
    setDoc(doc(db, 'transactions', id), allTx[index])
      .catch(e => handleFirestoreError(e, OperationType.UPDATE, `transactions/${id}`));

    return allTx[index];
  },

  deleteTransaction(userId: string, id: string): boolean {
    const allTx = getStorageItem<Transaction[]>('kallon_transactions', []);
    const filtered = allTx.filter((t) => !(t.id === id && t.userId === userId));

    if (allTx.length === filtered.length) return false;

    // 1. Save locally
    setStorageItem('kallon_transactions', filtered);

    // 2. Delete from cloud Firestore in background
    deleteDoc(doc(db, 'transactions', id))
      .catch(e => handleFirestoreError(e, OperationType.DELETE, `transactions/${id}`));

    return true;
  },

  // BUDGETS
  getBudgets(userId: string): Budget[] {
    const allBudgets = getStorageItem<Budget[]>('kallon_budgets', []);
    return allBudgets.filter((b) => b.userId === userId);
  },

  saveBudget(userId: string, categoryId: string, limit: number): Budget {
    const allBudgets = getStorageItem<Budget[]>('kallon_budgets', []);
    const index = allBudgets.findIndex((b) => b.userId === userId && b.categoryId === categoryId);

    if (index > -1) {
      allBudgets[index].monthlyLimit = limit;
      
      // Upgrade locally
      setStorageItem('kallon_budgets', allBudgets);

      // Synced
      setDoc(doc(db, 'budgets', allBudgets[index].id), allBudgets[index])
        .catch(e => handleFirestoreError(e, OperationType.UPDATE, `budgets/${allBudgets[index].id}`));

      return allBudgets[index];
    } else {
      const newBudget: Budget = {
        id: generateId(),
        userId,
        categoryId,
        monthlyLimit: limit,
        createdAt: new Date().toISOString(),
      };

      // Create locally
      setStorageItem('kallon_budgets', [...allBudgets, newBudget]);

      // Synced
      setDoc(doc(db, 'budgets', newBudget.id), newBudget)
        .catch(e => handleFirestoreError(e, OperationType.CREATE, `budgets/${newBudget.id}`));

      return newBudget;
    }
  },

  deleteBudget(userId: string, budgetId: string): boolean {
    const allBudgets = getStorageItem<Budget[]>('kallon_budgets', []);
    const filtered = allBudgets.filter((b) => !(b.id === budgetId && b.userId === userId));

    if (allBudgets.length === filtered.length) return false;

    // Remove locally
    setStorageItem('kallon_budgets', filtered);

    // Synced
    deleteDoc(doc(db, 'budgets', budgetId))
      .catch(e => handleFirestoreError(e, OperationType.DELETE, `budgets/${budgetId}`));

    return true;
  },

  // SAVINGS GOALS
  getSavingsGoals(userId: string): SavingsGoal[] {
    const allGoals = getStorageItem<SavingsGoal[]>('kallon_savings', []);
    return allGoals.filter((g) => g.userId === userId);
  },

  addSavingsGoal(userId: string, goal: Omit<SavingsGoal, 'id' | 'userId' | 'createdAt'>): SavingsGoal {
    const allGoals = getStorageItem<SavingsGoal[]>('kallon_savings', []);
    const newGoal: SavingsGoal = {
      ...goal,
      id: generateId(),
      userId,
      createdAt: new Date().toISOString(),
    };

    // Save locally
    setStorageItem('kallon_savings', [...allGoals, newGoal]);

    // Synced
    setDoc(doc(db, 'savings', newGoal.id), newGoal)
      .catch(e => handleFirestoreError(e, OperationType.CREATE, `savings/${newGoal.id}`));

    return newGoal;
  },

  updateSavingsGoal(userId: string, id: string, updated: Partial<Omit<SavingsGoal, 'id' | 'userId' | 'createdAt'>>): SavingsGoal | null {
    const allGoals = getStorageItem<SavingsGoal[]>('kallon_savings', []);
    const index = allGoals.findIndex((g) => g.id === id && g.userId === userId);

    if (index === -1) return null;

    allGoals[index] = {
      ...allGoals[index],
      ...updated,
    };

    // Save locally
    setStorageItem('kallon_savings', allGoals);

    // Synced
    setDoc(doc(db, 'savings', id), allGoals[index])
      .catch(e => handleFirestoreError(e, OperationType.UPDATE, `savings/${id}`));

    return allGoals[index];
  },

  deleteSavingsGoal(userId: string, id: string): boolean {
    const allGoals = getStorageItem<SavingsGoal[]>('kallon_savings', []);
    const filtered = allGoals.filter((g) => !(g.id === id && g.userId === userId));

    if (allGoals.length === filtered.length) return false;

    // Remove locally
    setStorageItem('kallon_savings', filtered);

    // Synced
    deleteDoc(doc(db, 'savings', id))
      .catch(e => handleFirestoreError(e, OperationType.DELETE, `savings/${id}`));

    return true;
  },

  // EXPORTS HELPERS
  exportToCSV(data: any[], filename: string): void {
    if (data.length === 0) return;
    
    // Extract headers
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map((header) => {
        const val = row[header];
        const escaped = ('' + (val !== undefined && val !== null ? val : '')).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  exportToExcelPlaceholder(data: any[], filename: string): void {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = '\uFEFF' + [
      headers.join(';'),
      ...data.map(row => headers.map(h => {
        let val = row[h];
        if (typeof val === 'string') {
          val = val.replace(/;/g, ',');
        }
        return val !== undefined && val !== null ? val : '';
      }).join(';'))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  // CURRENCY PREFERENCE MANAGEMENT
  getPreferredCurrency(userId: string): string {
    if (!userId) return '$';
    return localStorage.getItem(`kallon_currency_${userId}`) || '$';
  },

  setPreferredCurrency(userId: string, symbol: string): void {
    if (!userId) return;
    localStorage.setItem(`kallon_currency_${userId}`, symbol);
  },
};

// Autoseed demo user asynchronously
if (typeof window !== 'undefined') {
  const existingUsers = dbService.getUsers();
  if (existingUsers.length === 0) {
    dbService.registerUser('demo@kallon.com', btoa('123456'), 'What is your security answer?', 'demo').catch(console.error);
  }
}

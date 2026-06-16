export interface User {
  id: string;
  email: string;
  passwordHash: string; // Stored securely in local storage
  securityQuestion: string;
  securityAnswer: string;
  createdAt: string;
}

export type CategoryType = 'income' | 'expense';

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: CategoryType;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  categoryId: string;
  amount: number;
  transactionType: CategoryType;
  description: string;
  transactionDate: string; // YYYY-MM-DD
  createdAt: string;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string; // The category this budget is set for
  monthlyLimit: number;
  createdAt: string;
}

export interface SavingsGoal {
  id: string;
  userId: string;
  goalName: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // YYYY-MM-DD
  createdAt: string;
}

// Global active filters for transactions
export interface TransactionFilters {
  searchTerm: string;
  dateFrom: string;
  dateTo: string;
  categoryId: string;
  type: 'all' | 'income' | 'expense';
  sortBy: 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';
}

export interface SupportMessage {
  id: string;
  userId: string;
  category: string;
  subject: string;
  message: string;
  createdAt: string;
}


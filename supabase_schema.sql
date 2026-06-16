-- Kallon FinanceTracker - Supabase SQL Database Schema
-- Paste this schema into your Supabase SQL Editor to bootstrap the database.

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. categories table
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- references auth.users(id)
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Prevent duplicate categories of the same type for a single user
    CONSTRAINT unique_user_category UNIQUE (user_id, name, type)
);

-- Index for scanning categories per user
CREATE INDEX idx_categories_user ON public.categories(user_id);

-- Enable RLS (Row Level Security) on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Security Policies for categories
CREATE POLICY "Allow individual read access to categories" 
    ON public.categories FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Allow individual insert access to categories" 
    ON public.categories FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow individual update access to categories" 
    ON public.categories FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Allow individual delete access to categories" 
    ON public.categories FOR DELETE 
    USING (auth.uid() = user_id);


-- 2. transactions table
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- references auth.users(id)
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('income', 'expense')),
    description TEXT,
    transaction_date DATE DEFAULT CURRENT_DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index for searching and sorting transactions per user
CREATE INDEX idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);

-- Enable RLS on transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Security Policies for transactions
CREATE POLICY "Allow individual read access to transactions" 
    ON public.transactions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Allow individual insert access to transactions" 
    ON public.transactions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow individual update access to transactions" 
    ON public.transactions FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Allow individual delete access to transactions" 
    ON public.transactions FOR DELETE 
    USING (auth.uid() = user_id);


-- 3. budgets table
CREATE TABLE public.budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- references auth.users(id)
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    monthly_limit NUMERIC(15, 2) NOT NULL CHECK (monthly_limit >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Ensure exactly one budget per expense category for a user
    CONSTRAINT unique_user_category_budget UNIQUE (user_id, category_id)
);

-- Index for matching budgets
CREATE INDEX idx_budgets_user ON public.budgets(user_id);

-- Enable RLS on budgets
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- Security Policies for budgets
CREATE POLICY "Allow individual read access to budgets" 
    ON public.budgets FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Allow individual insert access to budgets" 
    ON public.budgets FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow individual update access to budgets" 
    ON public.budgets FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Allow individual delete access to budgets" 
    ON public.budgets FOR DELETE 
    USING (auth.uid() = user_id);


-- 4. savings_goals table
CREATE TABLE public.savings_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- references auth.users(id)
    goal_name VARCHAR(150) NOT NULL,
    target_amount NUMERIC(15, 2) NOT NULL CHECK (target_amount > 0),
    current_amount NUMERIC(15, 2) DEFAULT 0.00 NOT NULL CHECK (current_amount >= 0),
    target_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index for savings goals search
CREATE INDEX idx_savings_goals_user ON public.savings_goals(user_id);

-- Enable RLS on savings_goals
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

-- Security Policies for savings_goals
CREATE POLICY "Allow individual read access to savings goals" 
    ON public.savings_goals FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Allow individual insert access to savings goals" 
    ON public.savings_goals FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow individual update access to savings goals" 
    ON public.savings_goals FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Allow individual delete access to savings goals" 
    ON public.savings_goals FOR DELETE 
    USING (auth.uid() = user_id);

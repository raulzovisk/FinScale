
export type TransactionType = 'income' | 'expense';
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Transaction {
    id: number;
    description: string;
    amount: number;
    type: TransactionType;
    category: string;
    date: string;
    created_at: string;
    installment_id?: string | null;
    installment_number?: number | null;
    installment_total?: number | null;
    card_id?: number | null;
    card_name?: string | null;
}

export interface Card {
    id: number;
    name: string;
    last_digits: string | null;
    color: string;
    initial_balance: number;
    current_balance: number;
    total_income: number;
    total_expense: number;
    created_at: string;
}

export interface Category {
    id: number;
    name: string;
    color: string;
    icon: string;
}



export interface RecurrentCharge {
    id: number;
    description: string;
    amount: number;
    frequency: RecurrenceFrequency;
    nextDueDate: string;
    next_due_date?: string;
    category: string;
    isActive: boolean;
    is_active?: boolean;
}

export interface TelegramConfig {
    botToken: string;
    chatId: string;
    isActive: boolean;
}

export interface SummaryData {
    totalIncome: number;
    totalExpense: number;
    balance: number;
}

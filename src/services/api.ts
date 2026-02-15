import { Transaction, SummaryData, RecurrentCharge } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    const token = localStorage.getItem('authToken');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${url}`, {
        headers: getAuthHeaders(),
        ...options,
    });

    if (response.status === 401) {
        // Token expirado ou inválido — limpar e recarregar
        localStorage.removeItem('authToken');
        window.location.reload();
        throw new Error('Sessão expirada. Faça login novamente.');
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
        throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
}

export const api = {
    async getTransactions(): Promise<Transaction[]> {
        return request<Transaction[]>('/transactions');
    },

    async addTransaction(data: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction> {
        return request<Transaction>('/transactions', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async deleteTransaction(id: number): Promise<void> {
        await request(`/transactions/${id}`, { method: 'DELETE' });
    },

    async getSummary(): Promise<SummaryData> {
        return request<SummaryData>('/transactions/summary');
    },

    async getCategories() {
        return request('/categories');
    },

    // Cobranças Recorrentes
    async getRecurrentCharges(): Promise<RecurrentCharge[]> {
        return request<RecurrentCharge[]>('/recurrent-charges');
    },

    async addRecurrentCharge(data: Omit<RecurrentCharge, 'id' | 'isActive'>): Promise<RecurrentCharge> {
        return request<RecurrentCharge>('/recurrent-charges', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async toggleRecurrentCharge(id: number): Promise<RecurrentCharge> {
        return request<RecurrentCharge>(`/recurrent-charges/${id}/toggle`, {
            method: 'PATCH',
        });
    },

    async deleteRecurrentCharge(id: number): Promise<void> {
        await request(`/recurrent-charges/${id}`, { method: 'DELETE' });
    },

    async processRecurrentCharges(): Promise<{ processed: number; message: string }> {
        return request<{ processed: number; message: string }>('/recurrent-charges/process', {
            method: 'POST',
        });
    },
};



import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { TransactionForm } from './components/TransactionForm';
import { Analytics } from './components/Analytics';
import { RecurrentCharges } from './components/RecurrentCharges';
import { Register } from './components/Auth';
import { api } from './services/api';
import { Transaction } from './types';

const App: React.FC = () => {
    // Verificar se já tem token salvo ao carregar
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        return !!localStorage.getItem('authToken');
    });
    const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'recurrents' | 'analytics'>('dashboard');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await api.getTransactions();
            setTransactions(data);
        } catch (error) {
            console.error('Erro ao carregar transações:', error);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            fetchData();
        }
    }, [fetchData, isAuthenticated]);

    const handleAddTransaction = async (data: Omit<Transaction, 'id' | 'created_at'>) => {
        try {
            await api.addTransaction(data);
            await fetchData();
            setActiveTab('dashboard');
        } catch (error) {
            console.error('Erro ao adicionar transação:', error);
        }
    };

    const handleDeleteTransaction = async (id: number) => {
        try {
            await api.deleteTransaction(id);
            await fetchData();
        } catch (error) {
            console.error('Erro ao deletar transação:', error);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        setIsAuthenticated(false);
    };

    // Mostrar tela de registro/login se não autenticado
    if (!isAuthenticated) {
        return (
            <Register
                onRegisterSuccess={() => setIsAuthenticated(true)}
                onLoginSuccess={() => setIsAuthenticated(true)}
                onGoToLogin={() => { }}
            />
        );
    }

    return (
        <Layout activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout}>
            <div className="max-w-7xl mx-auto px-4 py-6">
                {activeTab === 'dashboard' && (
                    <Dashboard
                        transactions={transactions}
                        onDelete={handleDeleteTransaction}
                        onNavigate={() => setActiveTab('transactions')}
                        onLogout={handleLogout}
                    />
                )}
                {activeTab === 'transactions' && (
                    <TransactionForm onSubmit={handleAddTransaction} />
                )}
                {activeTab === 'recurrents' && (
                    <RecurrentCharges />
                )}
                {activeTab === 'analytics' && (
                    <Analytics transactions={transactions} />
                )}
            </div>
        </Layout>
    );
};

export default App;

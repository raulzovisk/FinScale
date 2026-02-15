
import React, { useState, useMemo } from 'react';
import {
    ArrowUpCircle,
    ArrowDownCircle,
    Wallet,
    Trash2,
    Sparkles,
    Search,
    ChevronRight
} from 'lucide-react';
import { Transaction } from '../types';
import { getFinancialAdvice } from '../services/geminiService';

interface DashboardProps {
    transactions: Transaction[];
    onDelete: (id: number) => void;
    onNavigate: () => void;
    onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ transactions, onDelete, onNavigate, onLogout }) => {
    const [advice, setAdvice] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const summary = useMemo(() => {
        return transactions.reduce((acc, t) => {
            const amt = Number(t.amount);
            if (t.type === 'income') {
                acc.income += amt;
                acc.balance += amt;
            } else {
                acc.expense += amt;
                acc.balance -= amt;
            }
            return acc;
        }, { income: 0, expense: 0, balance: 0 });
    }, [transactions]);

    const filteredTransactions = transactions
        .filter(t => t.description.toLowerCase().includes(searchTerm.toLowerCase()))
        .slice(0, 10);

    const handleGetAdvice = async () => {
        setIsGenerating(true);
        const result = await getFinancialAdvice(transactions);
        setAdvice(result);
        setIsGenerating(false);
    };

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        onLogout();
    };

    return (
        <div className="space-y-6 text-gray-900">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm transition-transform hover:scale-[1.02]">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-green-100 text-green-600 rounded-xl">
                            <ArrowUpCircle size={24} />
                        </div>
                        <span className="text-gray-500 font-medium">Entradas</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">R$ {summary.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm transition-transform hover:scale-[1.02]">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-red-100 text-red-600 rounded-xl">
                            <ArrowDownCircle size={24} />
                        </div>
                        <span className="text-gray-500 font-medium">Saídas</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">R$ {summary.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>

                <div className="bg-indigo-600 p-6 rounded-2xl shadow-xl text-white transition-transform hover:scale-[1.02]">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-white/20 rounded-xl">
                            <Wallet size={24} />
                        </div>
                        <span className="text-indigo-100 font-bold uppercase text-xs tracking-wider">Saldo Total</span>
                    </div>
                    <p className="text-3xl font-black">R$ {summary.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
            </div>

            {/* AI Advice Section */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Sparkles className="text-indigo-600" size={24} />
                        <h2 className="text-lg font-bold text-indigo-900">Consultoria com Gemini AI</h2>
                    </div>
                    <button
                        onClick={handleGetAdvice}
                        disabled={isGenerating || transactions.length === 0}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isGenerating ? 'Analisando...' : 'Pedir Dicas'}
                    </button>
                </div>
                {advice && (
                    <div className="bg-white p-4 rounded-xl text-gray-700 whitespace-pre-wrap animate-in fade-in duration-500 leading-relaxed border border-indigo-100">
                        {advice}
                    </div>
                )}
                {!advice && !isGenerating && (
                    <p className="text-indigo-600 text-sm">Receba dicas personalizadas baseadas no seu padrão de gastos.</p>
                )}
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-lg font-bold text-gray-900">Transações Recentes</h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-700 text-[10px] uppercase tracking-widest font-black">
                            <tr>
                                <th className="px-6 py-4">Descrição</th>
                                <th className="px-6 py-4">Categoria</th>
                                <th className="px-6 py-4">Data</th>
                                <th className="px-6 py-4 text-right">Valor</th>
                                <th className="px-6 py-4">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredTransactions.map((t) => (
                                <tr key={t.id} className="hover:bg-indigo-50/30 transition-colors group">
                                    <td className="px-6 py-4 font-medium text-gray-800">{t.description}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs capitalize">{t.category}</span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 text-sm">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                                    <td className={`px-6 py-4 text-right font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                        {t.type === 'income' ? '+' : '-'} R$ {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => onDelete(t.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                        Nenhuma transação encontrada.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {transactions.length > 10 && (
                    <div className="p-4 border-t border-gray-50 text-center">
                        <button
                            onClick={onNavigate}
                            className="text-indigo-600 text-sm font-medium hover:underline flex items-center justify-center gap-1 mx-auto"
                        >
                            Ver Todas <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div >
    );
};

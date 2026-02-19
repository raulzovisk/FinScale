
import React, { useState, useMemo } from 'react';
import {
    ArrowUpCircle,
    ArrowDownCircle,
    Wallet,
    Trash2,
    Sparkles,
    Search,
    ChevronRight,
    CalendarClock,
    Calendar
} from 'lucide-react';
import { Transaction, Card } from '../types';
import { getFinancialAdvice } from '../services/geminiService';

interface DashboardProps {
    transactions: Transaction[];
    cards: Card[];
    onDelete: (id: number) => void;
    onNavigate: () => void;
    onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ transactions, cards, onDelete, onNavigate, onLogout }) => {
    const [advice, setAdvice] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const today = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, []);

    const currentMonth = useMemo(() => {
        const d = new Date();
        return { year: d.getFullYear(), month: d.getMonth() };
    }, []);

    const monthLabel = useMemo(() => {
        const d = new Date(currentMonth.year, currentMonth.month);
        return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }, [currentMonth]);

    // Transações do mês atual com data <= hoje
    const currentTransactions = useMemo(() => {
        return transactions.filter(t => {
            const tDate = t.date.substring(0, 10);
            const tDateObj = new Date(tDate + 'T12:00:00');
            return tDate <= today &&
                tDateObj.getMonth() === currentMonth.month &&
                tDateObj.getFullYear() === currentMonth.year;
        });
    }, [transactions, today, currentMonth]);

    // Transações futuras (data > hoje)
    const futureTransactions = useMemo(() => {
        return transactions
            .filter(t => t.date.substring(0, 10) > today)
            .sort((a, b) => a.date.localeCompare(b.date));
    }, [transactions, today]);

    // Summary mensal (somente transações até hoje no mês)
    const summary = useMemo(() => {
        return currentTransactions.reduce((acc, t) => {
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
    }, [currentTransactions]);

    // Total comprometido futuro
    const futureTotal = useMemo(() => {
        return futureTransactions.reduce((acc, t) => {
            if (t.type === 'expense') acc.expense += Number(t.amount);
            else acc.income += Number(t.amount);
            return acc;
        }, { expense: 0, income: 0 });
    }, [futureTransactions]);

    const filteredTransactions = currentTransactions
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
            {/* Month label */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar size={16} />
                <span className="capitalize font-medium">{monthLabel}</span>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm transition-transform hover:scale-[1.02]">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-green-100 text-green-600 rounded-xl">
                            <ArrowUpCircle size={24} />
                        </div>
                        <span className="text-gray-500 font-medium">Entradas do Mês</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">R$ {summary.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm transition-transform hover:scale-[1.02]">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-red-100 text-red-600 rounded-xl">
                            <ArrowDownCircle size={24} />
                        </div>
                        <span className="text-gray-500 font-medium">Saídas do Mês</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">R$ {summary.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>

                <div className="bg-indigo-600 p-6 rounded-2xl shadow-xl text-white transition-transform hover:scale-[1.02]">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-white/20 rounded-xl">
                            <Wallet size={24} />
                        </div>
                        <span className="text-indigo-100 font-bold uppercase text-xs tracking-wider">Saldo do Mês</span>
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

            {/* Cards Section */}
            {cards.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        💳 Meus Cartões
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {cards.map((card) => (
                            <div
                                key={card.id}
                                className="rounded-xl p-4 text-white relative overflow-hidden"
                                style={{ background: `linear-gradient(135deg, ${card.color}, ${card.color}cc)` }}
                            >
                                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-4 translate-x-4" />
                                <p className="font-bold text-sm">{card.name}</p>
                                {card.last_digits && (
                                    <p className="text-xs opacity-70">•••• {card.last_digits}</p>
                                )}
                                <p className="text-lg font-black mt-2">
                                    R$ {Number(card.current_balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                                <p className="text-[10px] opacity-60 mt-1">Fundo: R$ {Number(card.initial_balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Transactions (current month, date <= today) */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-lg font-bold text-gray-900">Transações do Mês</h2>
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
                                <th className="px-6 py-4">Cartão</th>
                                <th className="px-6 py-4">Data</th>
                                <th className="px-6 py-4 text-right">Valor</th>
                                <th className="px-6 py-4">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredTransactions.map((t) => (
                                <tr key={t.id} className="hover:bg-indigo-50/30 transition-colors group">
                                    <td className="px-6 py-4 font-medium text-gray-800">
                                        {t.description}
                                        {t.installment_total && t.installment_total > 1 && (
                                            <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-bold">
                                                {t.installment_number}/{t.installment_total}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs capitalize">{t.category}</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {t.card_name ? (
                                            <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-xs font-medium">💳 {t.card_name}</span>
                                        ) : (
                                            <span className="text-gray-300">—</span>
                                        )}
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
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                        Nenhuma transação do mês atual encontrada.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {currentTransactions.length > 10 && (
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

            {/* Future Transactions */}
            {futureTransactions.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                                <CalendarClock size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Próximas</h2>
                                <p className="text-xs text-gray-400">Transações agendadas para o futuro</p>
                            </div>
                        </div>
                        <div className="text-right">
                            {futureTotal.expense > 0 && (
                                <p className="text-sm font-bold text-red-500">-R$ {futureTotal.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} comprometido</p>
                            )}
                            {futureTotal.income > 0 && (
                                <p className="text-sm font-bold text-green-500">+R$ {futureTotal.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} previsto</p>
                            )}
                        </div>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {futureTransactions.slice(0, 15).map((t) => (
                            <div key={t.id} className="px-6 py-4 flex items-center justify-between hover:bg-amber-50/30 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className={`w-2 h-2 rounded-full ${t.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`} />
                                    <div>
                                        <p className="font-medium text-gray-800">
                                            {t.description}
                                            {t.installment_total && t.installment_total > 1 && (
                                                <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-bold">
                                                    {t.installment_number}/{t.installment_total}
                                                </span>
                                            )}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                                            <Calendar size={12} />
                                            <span>{new Date(t.date).toLocaleDateString('pt-BR')}</span>
                                            {t.card_name && (
                                                <>
                                                    <span>·</span>
                                                    <span className="text-indigo-500">💳 {t.card_name}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                        {t.type === 'income' ? '+' : '-'} R$ {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                    <button
                                        onClick={() => onDelete(t.id)}
                                        className="p-2 text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {futureTransactions.length > 15 && (
                        <div className="p-4 border-t border-gray-50 text-center">
                            <p className="text-gray-400 text-xs">+ {futureTransactions.length - 15} transações futuras</p>
                        </div>
                    )}
                </div>
            )}
        </div >
    );
};

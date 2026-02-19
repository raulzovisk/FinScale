
import React, { useState, useEffect } from 'react';
import { RecurrentCharge, RecurrenceFrequency, TransactionType, Card } from '../types';
import { api } from '../services/api';
import { Plus, Trash2, Calendar, CreditCard, Clock, ToggleLeft, ToggleRight, Loader2, TrendingUp, TrendingDown } from 'lucide-react';

interface RecurrentChargesProps {
    cards: Card[];
    onDataChange?: () => void;
}

export const RecurrentCharges: React.FC<RecurrentChargesProps> = ({ cards, onDataChange }) => {
    const [charges, setCharges] = useState<RecurrentCharge[]>([]);
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<TransactionType>('expense');
    const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
    const [nextDueDate, setNextDueDate] = useState('');
    const [cardId, setCardId] = useState<number | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [processedMessage, setProcessedMessage] = useState<string | null>(null);

    useEffect(() => {
        initPage();
    }, []);

    const initPage = async () => {
        setIsLoading(true);
        try {
            // Processar cobranças vencidas antes de listar
            const result = await api.processRecurrentCharges();
            if (result.processed > 0) {
                setProcessedMessage(`✅ ${result.message}`);
                setTimeout(() => setProcessedMessage(null), 6000);
                onDataChange?.();
            }
        } catch (error) {
            console.error('Erro ao processar recorrências:', error);
        }
        await loadCharges();
    };

    const loadCharges = async () => {
        setIsLoading(true);
        try {
            const data = await api.getRecurrentCharges();
            setCharges(data);
        } catch (error) {
            console.error('Erro ao carregar cobranças:', error);
        }
        setIsLoading(false);
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description || !amount || !nextDueDate) return;

        setIsSubmitting(true);
        try {
            await api.addRecurrentCharge({
                description,
                amount: parseFloat(amount),
                type,
                frequency,
                nextDueDate,
                category: 'recorrente',
                card_id: cardId || undefined,
            });

            setDescription('');
            setAmount('');
            setType('expense');
            setNextDueDate('');
            setCardId(undefined);
            setFrequency('monthly');
            await loadCharges();
            onDataChange?.();
        } catch (error) {
            console.error('Erro ao adicionar cobrança:', error);
        }
        setIsSubmitting(false);
    };

    const handleToggle = async (id: number) => {
        try {
            await api.toggleRecurrentCharge(id);
            await loadCharges();
        } catch (error) {
            console.error('Erro ao alternar status:', error);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await api.deleteRecurrentCharge(id);
            await loadCharges();
        } catch (error) {
            console.error('Erro ao deletar cobrança:', error);
        }
    };

    const frequencyLabels: Record<RecurrenceFrequency, string> = {
        daily: 'Diário',
        weekly: 'Semanal',
        monthly: 'Mensal',
        yearly: 'Anual',
    };

    const activeCharges = charges.filter(c => c.isActive || c.is_active);
    const inactiveCharges = charges.filter(c => !c.isActive && !c.is_active);
    const totalExpenseMonthly = activeCharges.filter(c => (c.type || 'expense') === 'expense').reduce((sum, c) => sum + Number(c.amount), 0);
    const totalIncomeMonthly = activeCharges.filter(c => c.type === 'income').reduce((sum, c) => sum + Number(c.amount), 0);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Notificação de processamento */}
            {processedMessage && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between animate-in fade-in duration-300">
                    <span className="font-medium">{processedMessage}</span>
                    <button onClick={() => setProcessedMessage(null)} className="text-emerald-600 hover:text-emerald-800 font-bold">✕</button>
                </div>
            )}
            {/* Resumo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gradient-to-r from-red-500 to-rose-600 p-6 rounded-2xl shadow-lg text-white">
                    <p className="text-red-100 text-sm font-medium">Saídas Recorrentes</p>
                    <p className="text-3xl font-bold mt-1">R$ {totalExpenseMonthly.toFixed(2)}</p>
                    <span className="bg-white/20 px-3 py-1 rounded-full text-sm mt-2 inline-block">
                        {activeCharges.filter(c => (c.type || 'expense') === 'expense').length} ativas
                    </span>
                </div>
                <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-6 rounded-2xl shadow-lg text-white">
                    <p className="text-green-100 text-sm font-medium">Entradas Recorrentes</p>
                    <p className="text-3xl font-bold mt-1">R$ {totalIncomeMonthly.toFixed(2)}</p>
                    <span className="bg-white/20 px-3 py-1 rounded-full text-sm mt-2 inline-block">
                        {activeCharges.filter(c => c.type === 'income').length} ativas
                    </span>
                </div>
            </div>

            {/* Formulário */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Clock className="text-indigo-600" size={24} />
                    Nova Cobrança Recorrente
                </h2>

                <form onSubmit={handleAdd} className="space-y-4">
                    {/* Tipo toggle */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setType('expense')}
                            className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${type === 'expense'
                                    ? 'bg-red-500 text-white shadow-lg'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                        >
                            <TrendingDown size={18} /> Saída
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('income')}
                            className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${type === 'income'
                                    ? 'bg-emerald-500 text-white shadow-lg'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                        >
                            <TrendingUp size={18} /> Entrada
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-700 uppercase">Descrição</label>
                            <input
                                type="text"
                                placeholder="Ex: Netflix, Salário"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-700 uppercase">Valor</label>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="0,00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-700 uppercase">Frequência</label>
                            <select
                                value={frequency}
                                onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="daily">Diário</option>
                                <option value="weekly">Semanal</option>
                                <option value="monthly">Mensal</option>
                                <option value="yearly">Anual</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-700 uppercase">Próximo Vencimento</label>
                            <input
                                type="date"
                                value={nextDueDate}
                                onChange={(e) => setNextDueDate(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    {/* Card selector */}
                    {cards.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-700 uppercase">Cartão (opcional)</label>
                            <select
                                value={cardId || ''}
                                onChange={(e) => setCardId(e.target.value ? parseInt(e.target.value) : undefined)}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Sem cartão</option>
                                {cards.map((card) => (
                                    <option key={card.id} value={card.id}>
                                        💳 {card.name} {card.last_digits ? `•••• ${card.last_digits}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                        Adicionar Recorrente
                    </button>
                </form>
            </div>

            {/* Lista de cobranças */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">Cobranças Recorrentes</h3>
                </div>

                {isLoading ? (
                    <div className="p-12 flex items-center justify-center text-gray-400">
                        <Loader2 size={24} className="animate-spin mr-2" />
                        Carregando...
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {charges.map((charge) => {
                            const isActive = charge.isActive || charge.is_active;
                            const chargeType = charge.type || 'expense';
                            const isIncome = chargeType === 'income';
                            return (
                                <div
                                    key={charge.id}
                                    className={`p-4 flex items-center justify-between hover:bg-gray-50 transition-colors ${!isActive ? 'opacity-50' : ''}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl ${!isActive
                                                ? 'bg-gray-100 text-gray-400'
                                                : isIncome
                                                    ? 'bg-emerald-50 text-emerald-600'
                                                    : 'bg-red-50 text-red-600'
                                            }`}>
                                            {isIncome ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">{charge.description}</h4>
                                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                                <Calendar size={12} />
                                                Vence dia {new Date(charge.nextDueDate || charge.next_due_date || '').getDate()}
                                                <span className="mx-1">·</span>
                                                {frequencyLabels[(charge.frequency as RecurrenceFrequency)] || charge.frequency}
                                                {charge.card_id && (
                                                    <>
                                                        <span className="mx-1">·</span>
                                                        <CreditCard size={12} />
                                                        <span className="text-indigo-600 font-medium">
                                                            {cards.find(c => c.id === charge.card_id)?.name || 'Cartão'}
                                                        </span>
                                                    </>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`font-bold ${isIncome ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {isIncome ? '+' : '-'} R$ {Number(charge.amount).toFixed(2)}
                                        </span>
                                        <button
                                            onClick={() => handleToggle(charge.id)}
                                            className={`p-2 transition-colors ${isActive ? 'text-indigo-600 hover:text-indigo-800' : 'text-gray-400 hover:text-indigo-600'}`}
                                            title={isActive ? 'Pausar cobrança' : 'Ativar cobrança'}
                                        >
                                            {isActive ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(charge.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                            title="Excluir cobrança"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                        {charges.length === 0 && (
                            <div className="p-12 text-center text-gray-400 italic">
                                Nenhuma cobrança recorrente cadastrada.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

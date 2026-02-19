
import React, { useState } from 'react';
import { Transaction, TransactionType, Card } from '../types';
import { DollarSign, Tag, Calendar, FileText, CreditCard } from 'lucide-react';

interface TransactionFormProps {
    onSubmit: (data: Omit<Transaction, 'id' | 'created_at'> & { installments?: number; card_id?: number }) => void;
    cards?: Card[];
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ onSubmit, cards = [] }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<TransactionType>('expense');
    const [category, setCategory] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [installments, setInstallments] = useState(1);
    const [cardId, setCardId] = useState<string>('');

    const categories = [
        'Alimentação', 'Transporte', 'Lazer',
        'Educação', 'Saúde', 'Trabalho', 'Outros',];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!description || !amount || !category) return;

        onSubmit({
            description,
            amount: parseFloat(amount),
            type,
            category,
            date,
            ...(installments > 1 ? { installments } : {}),
            ...(cardId ? { card_id: parseInt(cardId) } : {}),
        });

        setDescription('');
        setAmount('');
        setCategory('');
        setDate(new Date().toISOString().split('T')[0]);
        setInstallments(1);
        setCardId('');
    };

    return (
        <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-gray-900">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Nova Transação</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={() => setType('expense')}
                        className={`py-3 px-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 font-medium ${type === 'expense'
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-gray-100 text-gray-500 hover:border-gray-200'
                            }`}
                    >
                        Saída
                    </button>
                    <button
                        type="button"
                        onClick={() => setType('income')}
                        className={`py-3 px-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 font-medium ${type === 'income'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-100 text-gray-500 hover:border-gray-200'
                            }`}
                    >
                        Entrada
                    </button>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <FileText size={16} /> Descrição
                    </label>
                    <input
                        type="text"
                        required
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Ex: Aluguel, Supermercado..."
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <DollarSign size={16} /> Valor
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0,00"
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Calendar size={16} /> Data
                        </label>
                        <input
                            type="date"
                            required
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                    </div>
                </div>

                {type === 'expense' && (
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            📦 Parcelas
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="range"
                                min="1"
                                max="24"
                                value={installments}
                                onChange={(e) => setInstallments(parseInt(e.target.value))}
                                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <span className="min-w-[60px] text-center px-3 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-sm">
                                {installments === 1 ? 'À vista' : `${installments}x`}
                            </span>
                        </div>
                        {installments > 1 && (
                            <p className="text-xs text-gray-500">
                                {installments}x de R$ {(parseFloat(amount || '0') / installments).toFixed(2)} — mesmo dia nos próximos meses
                            </p>
                        )}
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Tag size={16} /> Categoria
                    </label>
                    <select
                        value={category}
                        required
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                    >
                        <option value="">Selecione uma categoria</option>
                        {categories.map((cat) => (
                            <option key={cat} value={cat.toLowerCase()}>{cat}</option>
                        ))}
                    </select>
                </div>

                {/* Card selector (optional) */}
                {cards.length > 0 && (
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <CreditCard size={16} /> Cartão <span className="text-xs font-normal text-gray-400">(opcional)</span>
                        </label>
                        <select
                            value={cardId}
                            onChange={(e) => setCardId(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                        >
                            <option value="">Sem cartão</option>
                            {cards.map((card) => (
                                <option key={card.id} value={card.id}>
                                    {card.name}{card.last_digits ? ` •••• ${card.last_digits}` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <button
                    type="submit"
                    className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-[0.98]"
                >
                    Salvar Transação
                </button>
            </form>
        </div>
    );
};

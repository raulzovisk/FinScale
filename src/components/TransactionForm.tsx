
import React, { useState } from 'react';
import { Transaction, TransactionType } from '../types';
import { DollarSign, Tag, Calendar, FileText } from 'lucide-react';

interface TransactionFormProps {
    onSubmit: (data: Omit<Transaction, 'id' | 'created_at'>) => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ onSubmit }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<TransactionType>('expense');
    const [category, setCategory] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

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
        });

        setDescription('');
        setAmount('');
        setCategory('');
        setDate(new Date().toISOString().split('T')[0]);
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


import React, { useState, useEffect } from 'react';
import { Card } from '../types';
import { api } from '../services/api';
import { CreditCard, Plus, Trash2, Edit3, X, DollarSign, Palette } from 'lucide-react';

interface CardsProps {
    cards: Card[];
    onCardsChange: () => void;
}

const CARD_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
    '#f59e0b', '#10b981', '#06b6d4', '#3b82f6',
    '#1e293b', '#64748b',
];

export const Cards: React.FC<CardsProps> = ({ cards, onCardsChange }) => {
    const [showForm, setShowForm] = useState(false);
    const [editingCard, setEditingCard] = useState<Card | null>(null);
    const [name, setName] = useState('');
    const [lastDigits, setLastDigits] = useState('');
    const [color, setColor] = useState('#6366f1');
    const [initialBalance, setInitialBalance] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const resetForm = () => {
        setName('');
        setLastDigits('');
        setColor('#6366f1');
        setInitialBalance('');
        setEditingCard(null);
        setShowForm(false);
    };

    const openEditForm = (card: Card) => {
        setName(card.name);
        setLastDigits(card.last_digits || '');
        setColor(card.color);
        setInitialBalance(String(card.initial_balance));
        setEditingCard(card);
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;
        setIsSubmitting(true);

        try {
            if (editingCard) {
                await api.updateCard(editingCard.id, {
                    name,
                    last_digits: lastDigits || undefined,
                    color,
                    initial_balance: parseFloat(initialBalance) || 0,
                });
            } else {
                await api.addCard({
                    name,
                    last_digits: lastDigits || undefined,
                    color,
                    initial_balance: parseFloat(initialBalance) || 0,
                });
            }
            onCardsChange();
            resetForm();
        } catch (error) {
            console.error('Erro ao salvar cartão:', error);
        }
        setIsSubmitting(false);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Tem certeza que deseja deletar este cartão? As transações vinculadas não serão excluídas.')) return;
        try {
            await api.deleteCard(id);
            onCardsChange();
        } catch (error) {
            console.error('Erro ao deletar cartão:', error);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                        <CreditCard size={24} />
                    </div>
                    Meus Cartões
                </h2>
                <button
                    onClick={() => { resetForm(); setShowForm(true); }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200 active:scale-[0.98]"
                >
                    <Plus size={18} /> Novo Cartão
                </button>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900">
                                {editingCard ? 'Editar Cartão' : 'Novo Cartão'}
                            </h3>
                            <button onClick={resetForm} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Nome do Cartão</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ex: Nubank, Itaú Platinum..."
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Últimos 4 dígitos</label>
                                    <input
                                        type="text"
                                        maxLength={4}
                                        value={lastDigits}
                                        onChange={(e) => setLastDigits(e.target.value.replace(/\D/g, ''))}
                                        placeholder="1234"
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                                        <DollarSign size={14} /> Saldo Inicial
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={initialBalance}
                                        onChange={(e) => setInitialBalance(e.target.value)}
                                        placeholder="0,00"
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                                    <Palette size={14} /> Cor do Cartão
                                </label>
                                <div className="flex gap-2 flex-wrap">
                                    {CARD_COLORS.map((c) => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setColor(c)}
                                            className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'hover:scale-105'}`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Card Preview */}
                            <div
                                className="rounded-2xl p-5 text-white shadow-lg relative overflow-hidden"
                                style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-6 -translate-x-6" />
                                <div className="flex items-center gap-2 mb-4">
                                    <CreditCard size={20} />
                                    <span className="font-bold text-sm uppercase tracking-wider opacity-90">Prévia</span>
                                </div>
                                <p className="text-lg font-bold">{name || 'Nome do Cartão'}</p>
                                <p className="text-sm opacity-80 mt-1">
                                    •••• {lastDigits || '••••'}
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-[0.98] disabled:opacity-50"
                            >
                                {isSubmitting ? 'Salvando...' : (editingCard ? 'Atualizar Cartão' : 'Criar Cartão')}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Cards Grid */}
            {cards.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                    <CreditCard className="mx-auto text-gray-300 mb-4" size={48} />
                    <h3 className="text-lg font-semibold text-gray-500 mb-2">Nenhum cartão cadastrado</h3>
                    <p className="text-gray-400 text-sm">Adicione cartões para controlar gastos separadamente.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {cards.map((card) => (
                        <div
                            key={card.id}
                            className="rounded-2xl p-6 text-white shadow-lg relative overflow-hidden transition-transform hover:scale-[1.02] group"
                            style={{ background: `linear-gradient(135deg, ${card.color}, ${card.color}cc)` }}
                        >
                            {/* Decorative circles */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-6 -translate-x-6" />

                            {/* Actions */}
                            <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => openEditForm(card)}
                                    className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                                >
                                    <Edit3 size={14} />
                                </button>
                                <button
                                    onClick={() => handleDelete(card.id)}
                                    className="p-2 bg-white/20 hover:bg-red-500/60 rounded-lg transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>

                            {/* Card info */}
                            <div className="flex items-center gap-2 mb-4">
                                <CreditCard size={20} />
                                <span className="font-bold uppercase tracking-wider text-xs opacity-80">Cartão</span>
                            </div>

                            <p className="text-xl font-bold mb-1 relative z-10">{card.name}</p>
                            {card.last_digits && (
                                <p className="text-sm opacity-80 mb-4">•••• {card.last_digits}</p>
                            )}

                            {/* Balance */}
                            <div className="mt-4 pt-4 border-t border-white/20 relative z-10">
                                <p className="text-xs uppercase tracking-wider opacity-70 mb-1">Saldo Disponível</p>
                                <p className="text-2xl font-black">
                                    R$ {Number(card.current_balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                                <div className="flex gap-4 mt-2 text-xs opacity-80">
                                    <span>Fundo: R$ {Number(card.initial_balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex gap-4 mt-1 text-xs opacity-80">
                                    <span className="text-green-200">+ R$ {Number(card.total_income).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    <span className="text-red-200">- R$ {Number(card.total_expense).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

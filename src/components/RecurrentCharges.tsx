
import React, { useState, useEffect } from 'react';
import { RecurrentCharge, RecurrenceFrequency } from '../types';
import { api } from '../services/api';
import { Plus, Trash2, Calendar, CreditCard, Clock, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';

export const RecurrentCharges: React.FC = () => {
    const [charges, setCharges] = useState<RecurrentCharge[]>([]);
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
    const [nextDueDate, setNextDueDate] = useState('');
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
                frequency,
                nextDueDate,
                category: 'recorrente',
            });

            setDescription('');
            setAmount('');
            setNextDueDate('');
            setFrequency('monthly');
            await loadCharges();
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
    const totalMonthly = activeCharges.reduce((sum, c) => sum + Number(c.amount), 0);

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
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-2xl shadow-lg text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-indigo-100 text-sm font-medium">Total em Recorrentes Ativas</p>
                        <p className="text-3xl font-bold mt-1">R$ {totalMonthly.toFixed(2)}</p>
                    </div>
                    <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                        <CreditCard size={32} />
                    </div>
                </div>
                <div className="mt-4 flex gap-4 text-sm">
                    <span className="bg-white/20 px-3 py-1 rounded-full">{activeCharges.length} ativas</span>
                    {inactiveCharges.length > 0 && (
                        <span className="bg-white/10 px-3 py-1 rounded-full">{inactiveCharges.length} pausadas</span>
                    )}
                </div>
            </div>

            {/* Formulário */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Clock className="text-indigo-600" size={24} />
                    Agendar Cobrança Recorrente
                </h2>

                <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-700 uppercase">Serviço</label>
                        <input
                            type="text"
                            placeholder="Ex: Netflix, Internet"
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
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                        Adicionar
                    </button>
                </form>
            </div>

            {/* Lista de cobranças */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">Assinaturas Ativas</h3>
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
                            return (
                                <div
                                    key={charge.id}
                                    className={`p-4 flex items-center justify-between hover:bg-gray-50 transition-colors ${!isActive ? 'opacity-50' : ''}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl ${isActive ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                                            <CreditCard size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">{charge.description}</h4>
                                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                                <Calendar size={12} />
                                                Vence dia {new Date(charge.nextDueDate || charge.next_due_date).getDate()}
                                                <span className="mx-1">·</span>
                                                {frequencyLabels[(charge.frequency as RecurrenceFrequency)] || charge.frequency}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-bold text-gray-900">R$ {Number(charge.amount).toFixed(2)}</span>
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

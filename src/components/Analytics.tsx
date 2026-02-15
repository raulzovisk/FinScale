
import React, { useMemo, useState } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
    AreaChart,
    Area
} from 'recharts';
import { Transaction } from '../types';
import { Calendar, TrendingUp, TrendingDown, Target } from 'lucide-react';

interface AnalyticsProps {
    transactions: Transaction[];
}

type PeriodFilter = '7d' | '30d' | '90d' | '1y';

const PERIOD_LABELS: Record<PeriodFilter, string> = {
    '7d': '7 dias',
    '30d': '30 dias',
    '90d': '90 dias',
    '1y': '1 ano',
};

const PERIOD_DAYS: Record<PeriodFilter, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365,
};

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

// Normaliza qualquer formato de data (ex: "2026-02-15T00:00:00.000Z") para "YYYY-MM-DD"
const normalizeDate = (dateStr: string): string => dateStr.split('T')[0];

const formatCurrency = (value: number) =>
    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white px-4 py-3 rounded-xl shadow-lg border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 mb-2">{label}</p>
            {payload.map((entry: any, index: number) => (
                <p key={index} className="text-sm font-bold" style={{ color: entry.color }}>
                    {entry.name}: {formatCurrency(entry.value)}
                </p>
            ))}
        </div>
    );
};

const PieTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0];
    return (
        <div className="bg-white px-4 py-3 rounded-xl shadow-lg border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 mb-1">{data.name}</p>
            <p className="text-sm font-bold" style={{ color: data.payload.fill }}>
                {formatCurrency(data.value)}
            </p>
        </div>
    );
};

export const Analytics: React.FC<AnalyticsProps> = ({ transactions }) => {
    const [period, setPeriod] = useState<PeriodFilter>('30d');

    // Filtrar transações pelo período selecionado e normalizar datas
    const filteredTransactions = useMemo(() => {
        const days = PERIOD_DAYS[period];
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = cutoff.toISOString().split('T')[0];
        return transactions
            .map(t => ({ ...t, date: normalizeDate(t.date) }))
            .filter(t => t.date >= cutoffStr);
    }, [transactions, period]);

    // Totais do período
    const totalIncome = useMemo(() =>
        filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0),
        [filteredTransactions]
    );

    const totalExpense = useMemo(() =>
        filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0),
        [filteredTransactions]
    );

    // Dados do gráfico de barras — agrupados por dia
    const barData = useMemo(() => {
        const days = PERIOD_DAYS[period];
        // Para períodos maiores, agrupar por semana/mês
        let groupCount: number;
        let groupFormat: Intl.DateTimeFormatOptions;

        if (days <= 7) {
            groupCount = 7;
            groupFormat = { weekday: 'short' };
        } else if (days <= 30) {
            groupCount = 30;
            groupFormat = { day: 'numeric', month: 'short' };
        } else if (days <= 90) {
            // Agrupar por semana (~13 semanas)
            groupCount = 13;
            groupFormat = { day: 'numeric', month: 'short' };
        } else {
            // Agrupar por mês (~12 meses)
            groupCount = 12;
            groupFormat = { month: 'short', year: '2-digit' };
        }

        if (days <= 30) {
            // Agrupar por dia
            const dateList = Array.from({ length: groupCount }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - i);
                return d.toISOString().split('T')[0];
            }).reverse();

            return dateList.map(date => {
                const dayTx = filteredTransactions.filter(t => t.date === date);
                return {
                    name: new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', groupFormat),
                    income: dayTx.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0),
                    expense: dayTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0),
                };
            });
        } else if (days <= 90) {
            // Agrupar por semana
            const weeks: { start: string; end: string; label: string }[] = [];
            for (let i = groupCount - 1; i >= 0; i--) {
                const end = new Date();
                end.setDate(end.getDate() - i * 7);
                const start = new Date(end);
                start.setDate(start.getDate() - 6);
                weeks.push({
                    start: start.toISOString().split('T')[0],
                    end: end.toISOString().split('T')[0],
                    label: start.toLocaleDateString('pt-BR', groupFormat),
                });
            }
            return weeks.map(w => {
                const weekTx = filteredTransactions.filter(t => t.date >= w.start && t.date <= w.end);
                return {
                    name: w.label,
                    income: weekTx.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0),
                    expense: weekTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0),
                };
            });
        } else {
            // Agrupar por mês
            const months: { year: number; month: number; label: string }[] = [];
            for (let i = groupCount - 1; i >= 0; i--) {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                months.push({
                    year: d.getFullYear(),
                    month: d.getMonth(),
                    label: d.toLocaleDateString('pt-BR', groupFormat),
                });
            }
            return months.map(m => {
                const monthTx = filteredTransactions.filter(t => {
                    const d = new Date(t.date + 'T12:00:00');
                    return d.getFullYear() === m.year && d.getMonth() === m.month;
                });
                return {
                    name: m.label,
                    income: monthTx.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0),
                    expense: monthTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0),
                };
            });
        }
    }, [filteredTransactions, period]);

    // Dados do gráfico de tendência (área) — gastos acumulados dia a dia
    const trendData = useMemo(() => {
        const days = PERIOD_DAYS[period];
        // Limitar pontos para legibilidade
        const step = days <= 30 ? 1 : days <= 90 ? 3 : 7;
        const points = Math.ceil(days / step);

        const dateList = Array.from({ length: points }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (points - 1 - i) * step);
            return d.toISOString().split('T')[0];
        });

        const cutoff = dateList[0];
        let accumulated = 0;

        return dateList.map(date => {
            const dayExpense = filteredTransactions
                .filter(t => t.date <= date && t.date >= cutoff && t.type === 'expense')
                .reduce((sum, t) => sum + Number(t.amount), 0);

            return {
                date: new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }),
                total: dayExpense,
            };
        });
    }, [filteredTransactions, period]);

    // Dados do gráfico de pizza — distribuição por categoria
    const pieData = useMemo(() => {
        const categoryTotals: Record<string, number> = {};
        filteredTransactions.filter(t => t.type === 'expense').forEach(t => {
            categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Number(t.amount);
        });

        return Object.entries(categoryTotals)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredTransactions]);

    // Cálculos da saúde financeira
    const expenseRatio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;
    const saved = totalIncome - totalExpense;

    const getRatioStatus = (ratio: number) => {
        if (ratio <= 50) return { color: 'bg-green-500', text: 'text-green-600', label: 'Excelente' };
        if (ratio <= 70) return { color: 'bg-indigo-600', text: 'text-indigo-600', label: 'Bom' };
        if (ratio <= 90) return { color: 'bg-yellow-500', text: 'text-yellow-600', label: 'Atenção' };
        return { color: 'bg-red-500', text: 'text-red-600', label: 'Crítico' };
    };

    const ratioStatus = getRatioStatus(expenseRatio);

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Filtro de Período */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2 text-gray-700">
                    <Calendar size={20} className="text-indigo-600" />
                    <span className="font-semibold text-sm">Período:</span>
                </div>
                <div className="flex bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                    {(Object.keys(PERIOD_LABELS) as PeriodFilter[]).map((key) => (
                        <button
                            key={key}
                            onClick={() => setPeriod(key)}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${period === key
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            {PERIOD_LABELS[key]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Cards de Resumo do Período */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-xl">
                        <TrendingUp size={22} className="text-green-600" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium">Receitas ({PERIOD_LABELS[period]})</p>
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(totalIncome)}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-red-100 rounded-xl">
                        <TrendingDown size={22} className="text-red-600" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium">Despesas ({PERIOD_LABELS[period]})</p>
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(totalExpense)}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-indigo-100 rounded-xl">
                        <Target size={22} className="text-indigo-600" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium">Saldo ({PERIOD_LABELS[period]})</p>
                        <p className={`text-lg font-bold ${saved >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(saved)}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Comparativo: Entrada vs Saída */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Comparativo: Entrada vs Saída</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#475569', fontSize: 11 }}
                                    dy={10}
                                    interval={period === '30d' ? 2 : 0}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#475569', fontSize: 11 }}
                                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar name="Receitas" dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                                <Bar name="Despesas" dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Tendência de Gastos */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Tendência de Gastos Acumulados</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#475569', fontSize: 10 }}
                                    interval={Math.max(0, Math.floor(trendData.length / 8))}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#475569', fontSize: 10 }}
                                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    name="Total Acumulado"
                                    type="monotone"
                                    dataKey="total"
                                    stroke="#6366f1"
                                    fillOpacity={1}
                                    fill="url(#colorTotal)"
                                    strokeWidth={3}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Distribuição por Categoria */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Distribuição por Categoria</h3>
                    {pieData.length > 0 ? (
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={100}
                                        paddingAngle={8}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<PieTooltip />} />
                                    <Legend
                                        layout="horizontal"
                                        align="center"
                                        verticalAlign="bottom"
                                        formatter={(value: string) => (
                                            <span className="text-xs text-gray-700 capitalize">{value}</span>
                                        )}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">
                            Sem despesas no período selecionado.
                        </div>
                    )}
                </div>

                {/* Saúde Financeira */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center">
                    <div className="space-y-6">
                        <h4 className="font-bold text-gray-900 border-b pb-2">Saúde Financeira</h4>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-600">Gastos vs Receita (Meta: 70%)</span>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ratioStatus.text} bg-opacity-10`}
                                            style={{ backgroundColor: `${ratioStatus.color.replace('bg-', '')}15` }}>
                                            {ratioStatus.label}
                                        </span>
                                        <span className="font-bold text-gray-900">
                                            {Math.round(expenseRatio)}%
                                        </span>
                                    </div>
                                </div>
                                <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden relative">
                                    {/* Marcador da meta 70% */}
                                    <div className="absolute top-0 h-full w-px bg-gray-400" style={{ left: '70%' }} />
                                    <div
                                        className={`${ratioStatus.color} h-full rounded-full transition-all duration-1000 ease-out`}
                                        style={{ width: `${Math.min(100, expenseRatio)}%` }}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                                    <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider mb-1">
                                        Total Despesas
                                    </p>
                                    <p className="text-xl font-black text-indigo-900">
                                        {formatCurrency(totalExpense)}
                                    </p>
                                    <p className="text-[10px] text-indigo-400 mt-1">Período: {PERIOD_LABELS[period]}</p>
                                </div>
                                <div className={`p-4 rounded-xl border ${saved >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                                    <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${saved >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {saved >= 0 ? 'Economizado' : 'Déficit'}
                                    </p>
                                    <p className={`text-xl font-black ${saved >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                                        {formatCurrency(Math.abs(saved))}
                                    </p>
                                    <p className={`text-[10px] mt-1 ${saved >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        Período: {PERIOD_LABELS[period]}
                                    </p>
                                </div>
                            </div>

                            {/* Top categorias */}
                            {pieData.length > 0 && (
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                                        Top Categorias de Gasto
                                    </p>
                                    <div className="space-y-2">
                                        {pieData.slice(0, 3).map((cat, i) => (
                                            <div key={cat.name} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                                                    />
                                                    <span className="text-sm text-gray-700 capitalize">{cat.name}</span>
                                                </div>
                                                <span className="text-sm font-bold text-gray-900">
                                                    {formatCurrency(cat.value)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

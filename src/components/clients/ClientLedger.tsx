'use client';

import {
    Wallet,
    AlertCircle,
    Gift,
    CreditCard,
    Banknote,
    ArrowUpCircle,
    ArrowDownCircle,
    XCircle,
    ChevronDown,
    ChevronUp,
    Loader2,
    Filter,
} from 'lucide-react';
import { useState } from 'react';
import { Appointment } from '@/lib/types/appointment';
import { ClientCredit } from '@/lib/types/clientCredit';
import {
    buildClientLedger,
    getClientLedgerSummary,
    LedgerEntry,
    formatPaymentMethod,
    formatLedgerDate,
} from '@/lib/utils/clientLedger';
import { formatArgentineCurrency } from '@/lib/utils/currency';

interface ClientLedgerProps {
    appointments: Appointment[];
    credits: ClientCredit[];
    isAdmin?: boolean;
    loading?: boolean;
}

function entryIcon(type: LedgerEntry['type']) {
    switch (type) {
        case 'payment': return <ArrowUpCircle className="w-4 h-4 text-[#34baab]" />;
        case 'credit_generated': return <Gift className="w-4 h-4 text-amber-500" />;
        case 'credit_used': return <ArrowDownCircle className="w-4 h-4 text-blue-500" />;
        case 'credit_forfeited': return <XCircle className="w-4 h-4 text-red-400" />;
    }
}

function entryColors(type: LedgerEntry['type']): string {
    switch (type) {
        case 'payment': return 'bg-[#34baab]/10 border-[#34baab]/20';
        case 'credit_generated': return 'bg-amber-50 border-amber-200';
        case 'credit_used': return 'bg-blue-50 border-blue-200';
        case 'credit_forfeited': return 'bg-red-50 border-red-200';
    }
}

function entryAmountColor(type: LedgerEntry['type']): string {
    switch (type) {
        case 'payment': return 'text-[#34baab]';
        case 'credit_generated': return 'text-amber-600';
        case 'credit_used': return 'text-blue-600';
        case 'credit_forfeited': return 'text-red-500';
    }
}

export function ClientLedger({ appointments, credits, isAdmin, loading }: ClientLedgerProps) {
    const [open, setOpen] = useState(false);
    const [txType, setTxType] = useState<'all' | LedgerEntry['type']>('all');
    const [txDateFrom, setTxDateFrom] = useState('');
    const [txDateTo, setTxDateTo] = useState('');

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 text-[#34baab] animate-spin" />
            </div>
        );
    }

    const entries = buildClientLedger(appointments, credits);
    const summary = getClientLedgerSummary(appointments, credits);

    const hasFilters = txType !== 'all' || !!txDateFrom || !!txDateTo;

    const filteredEntries = entries.filter(e => {
        const matchType = txType === 'all' || e.type === txType;
        const matchFrom = !txDateFrom || e.date >= txDateFrom;
        const matchTo = !txDateTo || e.date <= txDateTo;
        return matchType && matchFrom && matchTo;
    });

    const hasData = filteredEntries.length > 0;

    // Group filtered entries by month
    const grouped = filteredEntries.reduce<Record<string, LedgerEntry[]>>((acc, entry) => {
        const key = entry.date.slice(0, 7); // YYYY-MM
        if (!acc[key]) acc[key] = [];
        acc[key].push(entry);
        return acc;
    }, {});

    const monthLabel = (key: string) => {
        const [year, month] = key.split('-');
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return `${months[parseInt(month) - 1]} ${year}`;
    };

    return (
        <div className="space-y-4">
            {/* Summary Cards */}
            <div className="flex flex-wrap gap-3">
                {isAdmin && (
                    <div className="flex-1 min-w-[130px] bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <Banknote className="w-4 h-4 text-[#34baab]" />
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pagado</span>
                        </div>
                        <p className="text-lg font-black text-[#34baab]">
                            $ {formatArgentineCurrency(summary.totalPaid)}
                        </p>
                    </div>
                )}

                {summary.totalDebt > 0 && (
                    <div className="flex-1 min-w-[130px] bg-red-50 border border-red-200 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <AlertCircle className="w-4 h-4 text-red-400" />
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Deuda</span>
                        </div>
                        <p className="text-lg font-black text-red-600">
                            $ {formatArgentineCurrency(summary.totalDebt)}
                        </p>
                    </div>
                )}

                {summary.availableCredit > 0 && (
                    <div className="flex-1 min-w-[130px] bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <Gift className="w-4 h-4 text-amber-500" />
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Saldo a favor</span>
                        </div>
                        <p className="text-lg font-black text-amber-600">
                            $ {formatArgentineCurrency(summary.availableCredit)}
                        </p>
                    </div>
                )}
            </div>

            {/* Net balance alert */}
            {summary.netBalance > 0 && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                    <p className="text-sm font-bold text-red-700">
                        Saldo neto a cobrar: <span className="text-red-600">$ {formatArgentineCurrency(summary.netBalance)}</span>
                        {summary.availableCredit > 0 && (
                            <span className="font-normal text-red-500"> (ya descontando $ {formatArgentineCurrency(summary.availableCredit)} de crédito disponible)</span>
                        )}
                    </p>
                </div>
            )}

            {summary.netBalance < 0 && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                    <Gift className="w-5 h-5 text-amber-500 shrink-0" />
                    <p className="text-sm font-bold text-amber-700">
                        El cliente tiene $ {formatArgentineCurrency(Math.abs(summary.netBalance))} de saldo a favor.
                    </p>
                </div>
            )}

            {/* Timeline toggle */}
            <div className="border border-gray-100 rounded-3xl overflow-hidden bg-white shadow-sm">
                <button
                    type="button"
                    onClick={() => setOpen(!open)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-[#34baab]" />
                        <span className="font-bold text-gray-900">Historial de Transacciones</span>
                        <span className="text-xs text-gray-400 font-medium">
                            ({hasFilters ? `${filteredEntries.length} de ${entries.length}` : entries.length} registros)
                        </span>
                        {hasFilters && (
                            <span className="text-[9px] font-black bg-[#34baab] text-white px-1.5 py-0.5 rounded uppercase tracking-wide">Filtrado</span>
                        )}
                    </div>
                    {open ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </button>

                {open && (
                    <div className="p-4 animate-in slide-in-from-top-2 duration-200 space-y-4">
                        {/* Filters */}
                        <div className="space-y-2">
                            {/* Type pills */}
                            <div className="flex flex-wrap gap-1">
                                {([
                                    { value: 'all', label: 'Todos' },
                                    { value: 'payment', label: 'Pagos' },
                                    { value: 'credit_generated', label: 'Crédito +' },
                                    { value: 'credit_used', label: 'Crédito −' },
                                    { value: 'credit_forfeited', label: 'Seña perdida' },
                                ] as const).map(f => (
                                    <button
                                        key={f.value}
                                        type="button"
                                        onClick={() => setTxType(f.value)}
                                        className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wide transition-colors ${
                                            txType === f.value
                                                ? 'bg-[#34baab] text-white'
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                            {/* Date range */}
                            <div className="flex items-center gap-2">
                                <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <div className="flex-1 grid grid-cols-2 gap-1.5">
                                    <input
                                        type="date"
                                        value={txDateFrom}
                                        onChange={e => setTxDateFrom(e.target.value)}
                                        className="w-full px-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#34baab]"
                                    />
                                    <input
                                        type="date"
                                        value={txDateTo}
                                        onChange={e => setTxDateTo(e.target.value)}
                                        className="w-full px-2 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#34baab]"
                                    />
                                </div>
                                {hasFilters && (
                                    <button
                                        type="button"
                                        onClick={() => { setTxType('all'); setTxDateFrom(''); setTxDateTo(''); }}
                                        className="text-[10px] text-[#34baab] font-bold whitespace-nowrap hover:underline"
                                    >
                                        Limpiar
                                    </button>
                                )}
                            </div>
                        </div>

                        {!hasData ? (
                            <div className="text-center py-8 text-gray-400">
                                <Wallet className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p className="font-medium">{entries.length === 0 ? 'No hay transacciones registradas.' : 'No hay transacciones que coincidan con el filtro.'}</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {Object.keys(grouped).sort((a, b) => b.localeCompare(a)).map(monthKey => (
                                    <div key={monthKey}>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">
                                            {monthLabel(monthKey)}
                                        </p>
                                        <div className="space-y-2">
                                            {grouped[monthKey].map(entry => (
                                                <div
                                                    key={entry.id}
                                                    className={`flex items-start gap-3 p-3 rounded-2xl border ${entryColors(entry.type)}`}
                                                >
                                                    <div className="mt-0.5 shrink-0">{entryIcon(entry.type)}</div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="font-bold text-sm text-gray-900">{entry.label}</span>
                                                            <span className={`font-black text-sm shrink-0 ${entryAmountColor(entry.type)}`}>
                                                                {entry.type === 'credit_forfeited' ? '—' : `$ ${formatArgentineCurrency(entry.amount)}`}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                                                            <span className="text-[10px] text-gray-500 font-medium">
                                                                {formatLedgerDate(entry.date)}
                                                            </span>
                                                            {entry.method && (
                                                                <span className="text-[10px] text-gray-500 font-medium">
                                                                    {formatPaymentMethod(entry.method)}
                                                                </span>
                                                            )}
                                                            {entry.treatmentName && (
                                                                <span className="text-[10px] text-gray-500 font-medium truncate">
                                                                    {entry.treatmentName}
                                                                </span>
                                                            )}
                                                            {entry.appointmentDate && entry.type !== 'payment' && (
                                                                <span className="text-[10px] text-gray-400">
                                                                    Turno: {formatLedgerDate(entry.appointmentDate)}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {entry.notes && (
                                                            <p className="text-[10px] text-gray-400 italic mt-1">{entry.notes}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 px-1">
                {[
                    { icon: <ArrowUpCircle className="w-3 h-3 text-[#34baab]" />, label: 'Pago recibido' },
                    { icon: <Gift className="w-3 h-3 text-amber-500" />, label: 'Crédito generado' },
                    { icon: <ArrowDownCircle className="w-3 h-3 text-blue-500" />, label: 'Crédito aplicado' },
                    { icon: <XCircle className="w-3 h-3 text-red-400" />, label: 'Seña perdida' },
                ].map(({ icon, label }) => (
                    <div key={label} className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
                        {icon} {label}
                    </div>
                ))}
            </div>
        </div>
    );
}

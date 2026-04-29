'use client';

import { Rental } from '@/lib/types/rental';
import { Pencil, Trash2, CreditCard } from 'lucide-react';
import { Button } from '../ui/Button';
import { formatCurrencyWithSymbol } from '@/lib/utils/currency';

interface RentalTableProps {
    rentals: Rental[];
    onEdit: (rental: Rental) => void;
    onDelete: (rental: Rental) => void;
}

const PAYMENT_LABELS: Record<string, string> = {
    cash: 'Efectivo', transfer: 'Transf.', debit: 'Débito', credit: 'Crédito', qr: 'QR'
};

export function RentalTable({ rentals, onEdit, onDelete }: RentalTableProps) {
    if (rentals.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                <p className="text-gray-500">No hay alquileres registrados.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Desktop View: Table */}
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-6 py-4 text-sm font-bold text-gray-400 uppercase tracking-widest">Fecha</th>
                                <th className="px-6 py-4 text-sm font-bold text-gray-400 uppercase tracking-widest">Cliente</th>
                                <th className="px-6 py-4 text-sm font-bold text-gray-400 uppercase tracking-widest">Máquina</th>
                                <th className="px-6 py-4 text-sm font-bold text-gray-400 uppercase tracking-widest">Métodos</th>
                                <th className="px-6 py-4 text-sm font-bold text-gray-400 uppercase tracking-widest">Vendedor</th>
                                <th className="px-6 py-4 text-sm font-bold text-gray-400 uppercase tracking-widest text-right">Precio</th>
                                <th className="px-6 py-4 text-sm font-bold text-gray-400 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {rentals.map((rental) => (
                                <tr key={rental.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 font-semibold text-gray-700 whitespace-nowrap">
                                        {(() => {
                                            const [year, month, day] = rental.date.split('-');
                                            return `${day}/${month}/${year}`;
                                        })()}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-gray-900">{rental.clientName}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-3 py-1 bg-[#34baab]/10 text-[#34baab] rounded-full text-xs font-bold uppercase">
                                            {rental.machine}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            {rental.payments && rental.payments.length > 0 ? (
                                                rental.payments.map((p, idx) => (
                                                    <div key={p.id || idx} className="flex items-center gap-1.5 text-[10px]">
                                                        <CreditCard className="w-3 h-3 text-gray-400" />
                                                        <span className="font-bold text-gray-700">{PAYMENT_LABELS[p.method]}</span>
                                                        <span className="text-gray-400 font-medium">{formatCurrencyWithSymbol(p.amount)}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-[10px]">
                                                    <CreditCard className="w-3 h-3 text-gray-400" />
                                                    <span className="font-bold text-gray-700">{PAYMENT_LABELS[rental.paymentMethod]}</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-gray-700">{rental.sellerName}</td>
                                    <td className="px-6 py-4 font-black text-gray-900 text-right">{formatCurrencyWithSymbol(rental.price || 0)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => onEdit(rental)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <Pencil className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => onDelete(rental)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile View: Cards */}
            <div className="md:hidden space-y-3">
                {rentals.map((rental) => (
                    <div key={rental.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-start mb-3">
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-[#34baab] uppercase tracking-wider">
                                    {(() => {
                                        const [year, month, day] = rental.date.split('-');
                                        return `${day}/${month}/${year}`;
                                    })()}
                                </p>
                                <h3 className="text-lg font-black text-gray-900 leading-tight">
                                    {rental.clientName}
                                </h3>
                            </div>
                            <span className="px-3 py-1 bg-[#34baab]/10 text-[#34baab] rounded-lg text-[10px] font-black uppercase tracking-widest">
                                {rental.machine}
                            </span>
                        </div>

                        {/* Payments Mobile */}
                        <div className="mb-4 space-y-1.5">
                            {rental.payments && rental.payments.length > 0 ? (
                                rental.payments.map((p, idx) => (
                                    <div key={p.id || idx} className="flex items-center gap-2 text-[10px] bg-gray-50/50 p-2 rounded-lg border border-gray-100/50">
                                        <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="font-black text-gray-700 uppercase">{PAYMENT_LABELS[p.method]}</span>
                                        {p.bankAccount && <span className="text-[8px] text-gray-400 font-bold bg-white px-1.5 py-0.5 rounded border">{(p.bankAccount as string).toUpperCase()}</span>}
                                        <span className="ml-auto font-black text-gray-900">{formatCurrencyWithSymbol(p.amount)}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="flex items-center gap-2 text-[10px] bg-gray-50/50 p-2 rounded-lg border border-gray-100/50">
                                    <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                                    <span className="font-black text-gray-700 uppercase">{PAYMENT_LABELS[rental.paymentMethod]}</span>
                                    <span className="ml-auto font-black text-gray-900">{formatCurrencyWithSymbol(rental.price)}</span>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Vendedor</p>
                                <p className="font-bold text-gray-700 text-sm whitespace-nowrap overflow-hidden text-ellipsis">{rental.sellerName}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Precio Total</p>
                                <p className="font-black text-gray-900 text-sm">{formatCurrencyWithSymbol(rental.price || 0)}</p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-3 border-t border-gray-50">
                            <button
                                onClick={() => onEdit(rental)}
                                className="flex items-center gap-2 px-4 py-2 text-blue-600 font-bold text-sm bg-blue-50 rounded-xl active:scale-95 transition-all"
                            >
                                <Pencil className="w-4 h-4" /> Editar
                            </button>
                            <button
                                onClick={() => onDelete(rental)}
                                className="flex items-center gap-2 px-4 py-2 text-red-600 font-bold text-sm bg-red-50 rounded-xl active:scale-95 transition-all"
                            >
                                <Trash2 className="w-4 h-4" /> Borrar
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

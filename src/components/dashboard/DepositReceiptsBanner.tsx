'use client';

import { useEffect, useMemo, useState } from 'react';
import { Receipt, ChevronDown, ChevronUp, MessageCircle, Check, X, AlertTriangle, FileText, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Appointment } from '@/lib/types/appointment';
import { BANK_ACCOUNTS, BankAccount } from '@/lib/types/bankAccount';
import {
    DEPOSIT_RECEIPT_PROBLEM_LABELS,
    DepositReceipt,
    DepositReceiptCandidate,
} from '@/lib/types/depositReceipt';
import {
    confirmDepositReceipt,
    rejectDepositReceipt,
    subscribePendingDepositReceipts,
} from '@/lib/firebase/depositReceipts';
import { getAppointmentsByDateRange } from '@/lib/firebase/appointments';
import { getTodayDate } from '@/lib/utils/time';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Select } from '../ui/Select';

const plata = (n: number) => '$ ' + Number(n || 0).toLocaleString('es-AR');
const ddmm = (ymd: string) => (ymd ? ymd.split('-').reverse().slice(0, 2).join('/') : '');
const sinAcentos = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Cuenta de la app según el banco de destino que leyó la IA (Brubank si no se sabe). */
function guessBankAccount(bank: string | undefined): BankAccount {
    const b = sinAcentos(bank || '');
    if (b.includes('mercado')) return 'mercadopago';
    if (b.includes('prex')) return 'prex';
    return 'cuenta1';
}

function candidateLabel(c: DepositReceiptCandidate): string {
    const sena = c.depositRequired > 0
        ? ` · seña ${plata(c.depositRequired)}${c.paid > 0 ? ` (pagado ${plata(c.paid)})` : ''}`
        : '';
    return `${ddmm(c.date)} ${c.time} · ${c.clientName} · ${c.treatment}${sena}`;
}

function toCandidate(a: Appointment): DepositReceiptCandidate {
    return {
        appointmentId: a.id,
        clientName: a.clientName,
        date: a.date,
        time: a.time,
        treatment: a.treatment,
        depositRequired: 0,
        paid: (a.payments || []).reduce((s, p) => s + p.amount, 0),
    };
}

/**
 * Aviso del panel principal con los comprobantes de seña que llegaron por WhatsApp y todavía
 * no se confirmaron. La secretaria mira el banco y, si la plata entró, confirma: recién ahí se
 * carga la seña en el turno. No se puede cerrar: sigue apareciendo hasta resolverlos todos.
 */
export function DepositReceiptsBanner() {
    const [receipts, setReceipts] = useState<DepositReceipt[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        return subscribePendingDepositReceipts(setReceipts, error =>
            console.error('[DepositReceipts] Error al leer comprobantes:', error)
        );
    }, []);

    if (receipts.length === 0) return null;

    const withProblems = receipts.filter(r => r.problems.length > 0).length;

    return (
        <div className="mb-6 animate-in fade-in slide-in-from-top duration-500">
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 md:p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                            <Receipt className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-amber-900 leading-tight uppercase tracking-tight">
                                {receipts.length === 1 ? 'Hay 1 seña por confirmar' : `Hay ${receipts.length} señas por confirmar`}
                            </h3>
                            <p className="text-sm text-amber-800 mt-1 font-medium opacity-80">
                                Llegaron comprobantes por WhatsApp. Revisá en el banco que la plata haya entrado y confirmalos.
                                {withProblems > 0 && ` ${withProblems} necesita${withProblems === 1 ? '' : 'n'} revisión.`}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-200 transition-all active:scale-95 whitespace-nowrap"
                    >
                        {isExpanded ? 'Ocultar' : 'Revisar'}
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>

                {isExpanded && (
                    <div className="mt-6 border-t border-amber-200 pt-6 space-y-4 animate-in slide-in-from-top duration-300">
                        {receipts.map(r => <ReceiptCard key={r.id} receipt={r} />)}
                    </div>
                )}
            </div>
        </div>
    );
}

function ReceiptCard({ receipt }: { receipt: DepositReceipt }) {
    const { user, profile } = useAuth();
    const reading = receipt.reading;

    const [appointmentId, setAppointmentId] = useState(receipt.appointmentId || '');
    const [amount, setAmount] = useState(reading?.amount || 0);
    const [bankAccount, setBankAccount] = useState<BankAccount>(guessBankAccount(reading?.recipientBank));
    const [extraCandidates, setExtraCandidates] = useState<DepositReceiptCandidate[]>([]);
    const [searching, setSearching] = useState(false);
    const [saving, setSaving] = useState(false);

    const candidates = useMemo(() => {
        const ids = new Set(receipt.candidates.map(c => c.appointmentId));
        return [...receipt.candidates, ...extraCandidates.filter(c => !ids.has(c.appointmentId))];
    }, [receipt.candidates, extraCandidates]);

    const by = { uid: user?.uid || '', name: profile?.fullName || user?.email || '' };
    const paymentDate = /^\d{4}-\d{2}-\d{2}$/.test(reading?.date || '') ? reading!.date : getTodayDate();
    const whatsappUrl = `https://wa.me/${receipt.fromPhone.replace(/\D/g, '')}`;

    const handleConfirm = async () => {
        if (!appointmentId) return toast.error('Elegí el turno al que corresponde la seña');
        if (amount <= 0) return toast.error('El monto debe ser mayor a 0');
        setSaving(true);
        try {
            await confirmDepositReceipt(receipt.id, { appointmentId, amount, date: paymentDate, bankAccount }, by);
            toast.success(`Seña de ${plata(amount)} cargada en el turno`);
        } catch (error: any) {
            console.error('[DepositReceipts] Error al confirmar:', error);
            toast.error(error?.message || 'No se pudo confirmar la seña');
        } finally {
            setSaving(false);
        }
    };

    const handleReject = async () => {
        setSaving(true);
        try {
            await rejectDepositReceipt(receipt.id, '', by);
            toast.success('Comprobante rechazado');
        } catch (error) {
            console.error('[DepositReceipts] Error al rechazar:', error);
            toast.error('No se pudo rechazar el comprobante');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={`bg-white rounded-2xl border p-4 md:p-5 shadow-sm ${receipt.problems.length ? 'border-orange-300' : 'border-amber-100'}`}>
            <div className="flex flex-col md:flex-row gap-4">
                {/* Comprobante */}
                <div className="shrink-0">
                    {receipt.fileUrl && receipt.fileMime.startsWith('image/') ? (
                        <a href={receipt.fileUrl} target="_blank" rel="noopener noreferrer" title="Ver comprobante completo">
                            <img
                                src={receipt.fileUrl}
                                alt="Comprobante"
                                className="w-full md:w-36 max-h-64 md:max-h-56 object-contain rounded-xl border border-gray-100 bg-gray-50"
                            />
                        </a>
                    ) : receipt.fileUrl ? (
                        <a
                            href={receipt.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex md:w-36 h-24 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 text-sm font-bold text-gray-600 hover:bg-gray-100"
                        >
                            <FileText className="w-5 h-5" /> Ver PDF
                        </a>
                    ) : (
                        <div className="flex md:w-36 h-24 items-center justify-center rounded-xl border border-dashed border-gray-200 text-xs text-gray-400 text-center px-2">
                            Sin archivo: miralo en el WhatsApp
                        </div>
                    )}
                </div>

                {/* Datos */}
                <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                            <p className="text-2xl font-black text-gray-900">{reading ? plata(reading.amount) : 'Sin leer'}</p>
                            <p className="text-xs text-gray-500">
                                Envió <span className="font-bold text-gray-700">{receipt.profileName || 'sin nombre'}</span> ({receipt.fromPhone})
                                {' · '}{new Date(receipt.receivedAt).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                        <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors shadow-sm shadow-green-200"
                            title="Abrir el chat de WhatsApp"
                        >
                            <MessageCircle className="w-4 h-4" />
                        </a>
                    </div>

                    {receipt.problems.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {receipt.problems.map(p => (
                                <span key={p} className="inline-flex items-center gap-1 text-[10px] font-black bg-orange-100 text-orange-700 px-2 py-1 rounded-lg uppercase tracking-tight border border-orange-200">
                                    <AlertTriangle className="w-3 h-3" /> {DEPOSIT_RECEIPT_PROBLEM_LABELS[p]}
                                </span>
                            ))}
                        </div>
                    )}

                    {reading && (
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                            <div><dt className="inline text-gray-400">Fecha: </dt><dd className="inline font-bold text-gray-700">{reading.date ? reading.date.split('-').reverse().join('/') : '—'} {reading.time}</dd></div>
                            <div><dt className="inline text-gray-400">N.º operación: </dt><dd className="inline font-bold text-gray-700">{reading.operationNumber || '—'}</dd></div>
                            <div><dt className="inline text-gray-400">Pagó: </dt><dd className="inline font-bold text-gray-700">{reading.payerName || '—'}{reading.payerBank && ` (${reading.payerBank})`}</dd></div>
                            <div><dt className="inline text-gray-400">A: </dt><dd className="inline font-bold text-gray-700">{[reading.recipientName, reading.recipientAlias, reading.recipientBank].filter(Boolean).join(' · ') || '—'}</dd></div>
                            {reading.notes && <div className="sm:col-span-2 text-gray-500 italic">{reading.notes}</div>}
                        </dl>
                    )}
                    {receipt.messageText && <p className="text-xs text-gray-500">Mensaje: “{receipt.messageText}”</p>}

                    {/* Turno, monto y cuenta */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                        <div className="md:col-span-3">
                            <Select
                                label="Turno"
                                value={appointmentId}
                                onChange={e => setAppointmentId(e.target.value)}
                                options={[
                                    { value: '', label: candidates.length ? 'Elegí el turno…' : 'Sin turnos para este número: buscalo abajo' },
                                    ...candidates.map(c => ({ value: c.appointmentId, label: candidateLabel(c) })),
                                ]}
                            />
                            {searching ? (
                                <AppointmentSearch
                                    onPick={c => { setExtraCandidates(prev => [...prev, c]); setAppointmentId(c.appointmentId); setSearching(false); }}
                                    onCancel={() => setSearching(false)}
                                />
                            ) : (
                                <button type="button" onClick={() => setSearching(true)} className="mt-1 text-xs font-bold text-amber-700 hover:underline">
                                    Buscar otro turno (por ejemplo, si pagó una hija o desde otro número)
                                </button>
                            )}
                        </div>
                        <CurrencyInput label="Monto de la seña" value={amount} onChange={setAmount} />
                        <Select
                            label="Cuenta"
                            value={bankAccount}
                            onChange={e => setBankAccount(e.target.value as BankAccount)}
                            options={BANK_ACCOUNTS}
                        />
                        <div className="flex items-end gap-2">
                            <button
                                type="button"
                                onClick={handleConfirm}
                                disabled={saving}
                                className="flex-1 min-h-[44px] bg-[#34baab] hover:bg-[#2da699] text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-1 disabled:opacity-50"
                            >
                                <Check className="w-4 h-4" /> Confirmar
                            </button>
                            <button
                                type="button"
                                onClick={handleReject}
                                disabled={saving}
                                className="min-h-[44px] px-3 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-bold text-xs flex items-center gap-1 disabled:opacity-50"
                                title="Rechazar (no se carga nada)"
                            >
                                <X className="w-4 h-4" /> Rechazar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/** Busca entre los turnos pendientes de los próximos 90 días por nombre de cliente. */
function AppointmentSearch({ onPick, onCancel }: { onPick: (c: DepositReceiptCandidate) => void; onCancel: () => void }) {
    const [appointments, setAppointments] = useState<Appointment[] | null>(null);
    const [text, setText] = useState('');

    useEffect(() => {
        const today = getTodayDate();
        const end = new Date();
        end.setDate(end.getDate() + 90);
        getAppointmentsByDateRange(today, end.toLocaleDateString('en-CA'))
            .then(list => setAppointments(list.filter(a => a.status === 'pending')))
            .catch(error => {
                console.error('[DepositReceipts] Error al buscar turnos:', error);
                setAppointments([]);
            });
    }, []);

    const results = useMemo(() => {
        const q = sinAcentos(text.trim());
        if (!appointments || q.length < 2) return [];
        return appointments
            .filter(a => sinAcentos(a.clientName || '').includes(q))
            .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
            .slice(0, 8);
    }, [appointments, text]);

    return (
        <div className="mt-2 p-3 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
            <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-amber-600 shrink-0" />
                <input
                    autoFocus
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder={appointments ? 'Nombre de la clienta…' : 'Cargando turnos…'}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#34baab]"
                />
                <button type="button" onClick={onCancel} className="text-xs font-bold text-gray-500 hover:text-gray-700">Cancelar</button>
            </div>
            {results.map(a => (
                <button
                    key={a.id}
                    type="button"
                    onClick={() => onPick(toCandidate(a))}
                    className="w-full text-left px-3 py-2 rounded-lg bg-white border border-gray-100 hover:border-amber-300 text-xs text-gray-700"
                >
                    {candidateLabel(toCandidate(a))}
                </button>
            ))}
            {appointments && text.trim().length >= 2 && results.length === 0 && (
                <p className="text-xs text-gray-500">No hay turnos pendientes con ese nombre en los próximos 90 días.</p>
            )}
        </div>
    );
}

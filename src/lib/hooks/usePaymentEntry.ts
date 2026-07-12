'use client';

import { useState } from 'react';
import { Payment } from '@/lib/types/appointment';
import { GiftCard } from '@/lib/types/giftCard';
import { ClientCredit } from '@/lib/types/clientCredit';
import { getGiftCardByCode, redeemGiftCard } from '@/lib/firebase/giftCards';
import { getClientCredits, useCredit } from '@/lib/firebase/clientCredits';

function generatePaymentId(): string {
    return Math.random().toString(36).substring(2, 9);
}

/**
 * Estado y lógica de búsqueda/aplicación de gift card y saldo a favor (crédito de cliente)
 * al registrar un pago — compartido entre AppointmentModal y QuickPaymentModal, que antes
 * reimplementaban esto cada uno por su lado (~150 líneas idénticas cada uno). La causa de
 * que el bug de treatmentName/name apareciera en dos archivos a la vez era exactamente este
 * patrón de duplicación, así que se aplica el mismo criterio acá.
 *
 * No incluye el armado de pagos en efectivo/transferencia/etc (esa parte ya es simple y
 * difiere levemente entre los dos componentes) ni el guardado del turno en sí — solo la
 * parte de gift card/crédito, que es la que tiene lógica de validación real.
 */
export function usePaymentEntry() {
    const [gcCode, setGcCode] = useState('');
    const [gcSearching, setGcSearching] = useState(false);
    const [gcFound, setGcFound] = useState<GiftCard | null>(null);
    const [gcError, setGcError] = useState('');
    const [gcAmountToApply, setGcAmountToApply] = useState(0);

    const [activeCredits, setActiveCredits] = useState<ClientCredit[]>([]);
    const [selectedCreditId, setSelectedCreditId] = useState('');

    const resetGiftCardFields = () => {
        setGcCode('');
        setGcFound(null);
        setGcError('');
        setGcAmountToApply(0);
    };

    const resetAll = () => {
        resetGiftCardFields();
        setSelectedCreditId('');
        setActiveCredits([]);
    };

    const fetchActiveCredits = (clientId: string, clientName?: string) => {
        if (!clientId) { setActiveCredits([]); return; }
        getClientCredits(clientId, clientName || '').then(credits => {
            setActiveCredits(credits.filter(c => c.status === 'available'));
        }).catch(err => {
            console.error('[Credits] Error al buscar créditos:', err);
            setActiveCredits([]);
        });
    };

    /** pendingBalance = precio - total ya pagado, para sugerir el monto a aplicar. */
    const searchGiftCard = async (pendingBalance: number, existingPayments: Payment[]) => {
        if (!gcCode.trim()) return;
        setGcSearching(true);
        setGcError('');
        setGcFound(null);
        try {
            const today = new Date().toLocaleDateString('en-CA');
            const card = await getGiftCardByCode(gcCode.trim());
            if (!card) { setGcError('Código no encontrado'); return; }
            if (card.status === 'redeemed') { setGcError('Esta gift card ya fue utilizada completamente'); return; }
            if (card.status === 'cancelled') { setGcError('Esta gift card fue cancelada'); return; }
            if (card.status === 'expired' || (card.expiryDate && card.expiryDate < today)) { setGcError('Esta gift card está vencida'); return; }
            if (existingPayments.some(p => p.giftCardId === card.id)) { setGcError('Esta gift card ya fue agregada'); return; }
            setGcFound(card);
            setGcAmountToApply(Math.min(card.remainingBalance, pendingBalance > 0 ? pendingBalance : card.remainingBalance));
        } catch {
            setGcError('Error al buscar la gift card');
        } finally {
            setGcSearching(false);
        }
    };

    /**
     * Los dos componentes muestran mensajes de error levemente distintos para cada motivo
     * de rechazo, así que acá se devuelve el motivo en vez de mostrar el toast directamente
     * — cada caller decide cómo avisarlo.
     */
    const buildGiftCardPayment = (
        date: string
    ): { payment: Payment } | { error: 'not_found' | 'invalid_amount' | 'exceeds_balance' } => {
        if (!gcFound) return { error: 'not_found' };
        if (gcAmountToApply <= 0) return { error: 'invalid_amount' };
        if (gcAmountToApply > gcFound.remainingBalance) return { error: 'exceeds_balance' };

        const payment: Payment = {
            id: generatePaymentId(),
            amount: gcAmountToApply,
            method: 'gift_card',
            label: `Gift Card (${gcFound.code})`,
            bankAccount: null,
            giftCardId: gcFound.id,
            date,
            createdAt: new Date().toISOString() as any,
        };
        resetGiftCardFields();
        return { payment };
    };

    /** Usa el crédito seleccionado (selectedCreditId) por el usuario en el formulario. */
    const buildCreditPaymentFromSelected = (date: string): Payment | null => {
        if (!selectedCreditId) return null;
        const credit = activeCredits.find(c => c.id === selectedCreditId);
        if (!credit) return null;

        const payment: Payment = {
            id: generatePaymentId(),
            amount: credit.amount,
            method: 'client_credit',
            label: 'Saldo a Favor',
            bankAccount: null,
            creditId: credit.id,
            date,
            createdAt: new Date().toISOString() as any,
        };
        setActiveCredits(prev => prev.filter(c => c.id !== credit.id));
        setSelectedCreditId('');
        return payment;
    };

    /** Para el botón de aplicar directo un crédito de la lista, sin pasar por el form. */
    const buildCreditPaymentQuickApply = (credit: ClientCredit, amountToApply: number, date: string): Payment => {
        const payment: Payment = {
            id: generatePaymentId(),
            amount: amountToApply,
            method: 'client_credit',
            label: 'Saldo a Favor',
            bankAccount: null,
            creditId: credit.id,
            date,
            createdAt: new Date().toISOString() as any,
        };
        setActiveCredits(prev => prev.filter(c => c.id !== credit.id));
        return payment;
    };

    /** Si el pago eliminado usaba un crédito, lo vuelve a traer a la lista de disponibles. */
    const restoreCreditIfRemoved = (removed: Payment | undefined, clientId: string, clientName?: string) => {
        if (removed?.method === 'client_credit' && removed.creditId) {
            getClientCredits(clientId, clientName || '').then(credits => {
                const restored = credits.find(c => c.id === removed.creditId && c.status === 'available');
                if (restored) setActiveCredits(prev => [...prev, restored]);
            }).catch(() => {});
        }
    };

    /** Descuenta en Firestore las gift cards y créditos usados, ya guardado el turno. */
    const settleRedemptions = async (
        payments: Payment[],
        appointmentId: string,
        clientId: string | undefined,
        clientName: string | undefined,
        date: string
    ) => {
        const gcPayments = payments.filter(p => p.method === 'gift_card' && p.giftCardId);
        await Promise.all(gcPayments.map(p =>
            redeemGiftCard(p.giftCardId!, p.amount, appointmentId, date, clientId, clientName)
        ));

        const creditPayments = payments.filter(p => p.method === 'client_credit' && p.creditId);
        await Promise.all(creditPayments.map(p =>
            useCredit(p.creditId!, p.amount, appointmentId, date)
        ));
    };

    return {
        gcCode, setGcCode,
        gcSearching,
        gcFound, setGcFound,
        gcError, setGcError,
        gcAmountToApply, setGcAmountToApply,
        activeCredits, setActiveCredits,
        selectedCreditId, setSelectedCreditId,
        resetGiftCardFields,
        resetAll,
        fetchActiveCredits,
        searchGiftCard,
        buildGiftCardPayment,
        buildCreditPaymentFromSelected,
        buildCreditPaymentQuickApply,
        restoreCreditIfRemoved,
        settleRedemptions,
    };
}

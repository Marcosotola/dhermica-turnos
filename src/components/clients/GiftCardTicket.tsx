'use client';

import { forwardRef } from 'react';
import { GiftCard } from '@/lib/types/giftCard';

interface GiftCardTicketProps {
    card: GiftCard;
}

function formatDate(d?: string): string {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
}

export const GiftCardTicket = forwardRef<HTMLDivElement, GiftCardTicketProps>(
    ({ card }, ref) => {
        const amount = card.remainingBalance.toLocaleString('es-AR');

        return (
            <div
                ref={ref}
                style={{
                    width: '620px',
                    height: '360px',
                    background: '#484450',
                    borderRadius: '20px',
                    fontFamily: "'Segoe UI', Arial, sans-serif",
                    color: '#fff',
                    position: 'relative',
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* Decorativos — posicionados lejos del área del logo */}
                <div style={{
                    position: 'absolute', right: '-40px', bottom: '-40px',
                    width: '240px', height: '240px', borderRadius: '50%',
                    background: 'rgba(52,186,171,0.07)', pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute', right: '160px', bottom: '-80px',
                    width: '160px', height: '160px', borderRadius: '50%',
                    background: 'rgba(52,186,171,0.04)', pointerEvents: 'none',
                }} />

                {/* HEADER — franja con el logo */}
                <div style={{
                    padding: '22px 32px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}>
                    {/* Logotipo + slogan */}
                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <div style={{
                            fontSize: '36px',
                            lineHeight: 1,
                            fontFamily: 'var(--font-amsterdam), serif',
                            fontWeight: 'normal',
                            alignSelf: 'flex-start',
                        }}>
                            <span style={{ color: '#34baab' }}>D</span>
                            <span style={{ color: '#ffffff' }}>hermica</span>
                        </div>
                        {/* Slogan: baja lo suficiente para salir de la cola de la D, alineado a la derecha del nombre */}
                        <div style={{
                            fontSize: '9px',
                            fontWeight: '700',
                            letterSpacing: '3px',
                            color: 'rgba(255,255,255,0.65)',
                            textTransform: 'uppercase',
                            marginTop: '14px',
                            whiteSpace: 'nowrap',
                        }}>
                            Estética Unisex
                        </div>
                    </div>

                    {/* Badge GIFT CARD */}
                    <div style={{
                        background: 'rgba(52,186,171,0.15)',
                        border: '1px solid rgba(52,186,171,0.35)',
                        borderRadius: '10px',
                        padding: '6px 16px',
                        fontSize: '10px',
                        fontWeight: '700',
                        letterSpacing: '2.5px',
                        textTransform: 'uppercase',
                        color: '#34baab',
                        alignSelf: 'flex-start',
                    }}>
                        Gift Card
                    </div>
                </div>

                {/* BODY */}
                <div style={{
                    flex: 1,
                    padding: '18px 32px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: '8px',
                }}>
                    {card.recipientName && (
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', letterSpacing: '0.3px' }}>
                            Para: <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: '600' }}>{card.recipientName}</span>
                        </div>
                    )}
                    {card.message && (
                        <div style={{
                            fontSize: '13px',
                            fontStyle: 'italic',
                            color: 'rgba(255,255,255,0.7)',
                            background: 'rgba(255,255,255,0.06)',
                            borderLeft: '3px solid #34baab',
                            borderRadius: '0 8px 8px 0',
                            padding: '8px 14px',
                            maxWidth: '420px',
                        }}>
                            "{card.message}"
                        </div>
                    )}

                    {/* Monto */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: card.message ? '4px' : '0' }}>
                        <span style={{ fontSize: '44px', fontWeight: '900', letterSpacing: '-1.5px', lineHeight: 1, color: '#ffffff' }}>
                            $ {amount}
                        </span>
                        {card.remainingBalance < card.originalAmount && (
                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                                de ${card.originalAmount.toLocaleString('es-AR')} originales
                            </span>
                        )}
                    </div>
                </div>

                {/* FOOTER */}
                <div style={{
                    padding: '14px 32px',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(0,0,0,0.12)',
                }}>
                    <div>
                        <div style={{ fontSize: '8px', fontWeight: '700', letterSpacing: '2px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: '4px' }}>
                            Código
                        </div>
                        <div style={{ fontSize: '16px', fontFamily: 'monospace', fontWeight: '700', letterSpacing: '2.5px', color: '#34baab' }}>
                            {card.code}
                        </div>
                    </div>

                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {card.purchaserName && (
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                                De parte de: <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>{card.purchaserName}</span>
                            </div>
                        )}
                        {card.expiryDate && (
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                                Válida hasta: <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>{formatDate(card.expiryDate)}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }
);

GiftCardTicket.displayName = 'GiftCardTicket';

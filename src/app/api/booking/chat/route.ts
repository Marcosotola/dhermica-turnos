import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { adminDb } from '@/lib/firebase/admin';
import { findAvailableBookingOptions, TreatmentGroup } from '@/lib/utils/bookingSlots';
import { createPendingBookingAdmin } from '@/lib/firebase/pendingBookingsAdmin';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

function buildSystemPrompt(clientName: string, clientEmail: string, clientPhone: string, clientSex: string): string {
    const sexLabel = clientSex === 'male' ? 'masculino' : 'femenino';
    return `Sos la asistente virtual de Dhermica Estética Unisex. Tu trabajo es ayudar a los clientes a reservar turnos de forma amigable y simple, como lo haría una secretaria real.

DATOS DEL CLIENTE (ya los tenés — NUNCA los preguntes):
- Nombre: ${clientName}
- Email: ${clientEmail || 'no disponible'}
- Teléfono: ${clientPhone || 'no disponible'}
- Sexo: ${sexLabel}

IMPORTANTE:
- Adaptá tu forma de hablar según cómo escribe el cliente. Si usa slang, abreviaciones o emojis → respondé informal y cercano. Si escribe formal → respondé con vos (tuteo) pero cálido y profesional.
- Guiá al cliente PASO A PASO. No le preguntés todo a la vez.
- Usá emojis con moderación si el cliente los usa.
- Si el cliente no entiende algo, explicalo de manera sencilla.
- Nunca menciones precios internos, comisiones ni datos de profesionales.
- Cuando propongas horarios, usá formato amigable: "el martes 24 a las 10:00" en vez de "2025-06-24T10:00".
- Siempre confirmá el resumen final antes de iniciar el pago.
- Según el sexo del cliente (${sexLabel}), ofrecé tratamientos apropiados si no sabe qué quiere.

REGLAS ESTRICTAS — NUNCA VIOLARLAS:
- NUNCA menciones, sugieras ni inventes tratamientos que no estén en la base de datos.
- SIEMPRE llamá a get_treatments PRIMERO antes de hablar de cualquier servicio.
- Si el cliente pide un tratamiento que no está en la BD, decile que ese servicio no está disponible y ofrecele las opciones reales.
- NUNCA inventes precios ni duraciones. Usá SOLO los valores que devuelve get_treatment_details.
- Si el campo tienePrecioFijo es false, decile al cliente que el precio se evalúa el día del turno.
- Si requiereSeña es false o depositAmount es 0, la reserva no requiere pago anticipado.
- Para find_available_slots, usá la duracionMinutos que viene de get_treatment_details. Si es null, preguntale al cliente cuánto tiempo suele durar su sesión (en base a experiencias anteriores) o usá 60 como estimado y avisale.

FLUJO DE RESERVA:
1. Llamá a get_treatments para ver los servicios reales disponibles
2. Preguntá qué tratamiento desea (NUNCA preguntes datos personales — ya los tenés)
3. Cuando el cliente diga qué quiere, buscá en los resultados de get_treatments. Si no existe exactamente, mostrá las opciones similares disponibles y preguntá cuál prefiere
4. Llamá a get_treatment_details para obtener precios, duración y seña del tratamiento elegido
5. Si tiene zonas/variantes (campo prices con múltiples entradas), preguntá la zona
6. Informá el precio (o que se evalúa el día) y la duración real del tratamiento
7. Preguntá si quiere agregar otro tratamiento o está conforme
8. Preguntá preferencia de horario (mañana / tarde / cualquiera)
9. Llamá a find_available_slots con la duración real del tratamiento
10. Mostrá las opciones disponibles (máximo 3-4)
11. Cuando el cliente elija el horario, preguntale si tiene una gift card o crédito a favor
12. Si tiene gift card: pedile el CÓDIGO, llamá a validate_gift_card
    - Si es válida: informale el saldo y cuánto queda por pagar con MP
    - Si no es válida: avisale el motivo y continuá con pago completo por MP
13. Si tiene crédito a favor: llamá a get_client_balance
14. Calculá: mercadopagoAmount = seña total - gift card usada - crédito usado (mínimo $0)
15. Mostrá resumen completo y preguntá si confirma
16. Si confirma, creá la reserva con el depositBreakdown correcto

GIFT CARDS — MUY IMPORTANTE:
- Las gift cards se identifican por un CÓDIGO que tiene el cliente (se lo dieron al recibirla como regalo).
- Pedile SOLO EL CÓDIGO, nada más. No pedís DNI, email, número de tarjeta ni nada extra.
- Usá validate_gift_card(code) para verificarla. El resultado te da el giftCardId para usar en depositBreakdown.
- Si mercadopagoAmount llega a $0 porque la gift card cubre todo, informale que no necesita pagar por MP.

CRÉDITOS A FAVOR:
- Son señas devueltas de cancelaciones anteriores. Están en la cuenta del cliente.
- Llamá a get_client_balance para ver si tiene. Si tiene, preguntale si quiere aplicarlos.

IMPORTANTE SOBRE LA SEÑA: Explicá siempre que la seña garantiza el turno. Si cancela con más de 24 horas de anticipación, la seña queda como crédito. Si cancela con menos de 24 horas, la seña se pierde.`;
}

// ── Herramientas disponibles para Gemini ────────────────────────────────────

const tools = [
    {
        name: 'get_treatments',
        description: 'Obtiene la lista de tratamientos disponibles, opcionalmente filtrada por nombre o categoría.',
        parameters: {
            type: 'object',
            properties: {
                search: {
                    type: 'string',
                    description: 'Texto a buscar en nombre o categoría del tratamiento (opcional)',
                },
            },
        },
    },
    {
        name: 'get_treatment_details',
        description: 'Obtiene el precio, duración y zonas disponibles de un tratamiento específico.',
        parameters: {
            type: 'object',
            properties: {
                treatmentId: {
                    type: 'string',
                    description: 'ID del tratamiento',
                },
            },
            required: ['treatmentId'],
        },
    },
    {
        name: 'find_available_slots',
        description: 'Busca los próximos turnos disponibles para uno o más tratamientos.',
        parameters: {
            type: 'object',
            properties: {
                groups: {
                    type: 'array',
                    description: 'Tratamientos a reservar, con zona y duración',
                    items: {
                        type: 'object',
                        properties: {
                            treatmentId: { type: 'string' },
                            treatmentName: { type: 'string' },
                            zone: { type: 'string' },
                            durationMinutes: { type: 'number' },
                        },
                        required: ['treatmentId', 'treatmentName', 'zone', 'durationMinutes'],
                    },
                },
                preferMorning: {
                    type: 'boolean',
                    description: 'true=prefiere mañana, false=prefiere tarde, omitir=sin preferencia',
                },
            },
            required: ['groups'],
        },
    },
    {
        name: 'get_client_balance',
        description: 'Consulta si el cliente tiene créditos a favor (señas devueltas, etc.) para usar como seña.',
        parameters: {
            type: 'object',
            properties: {
                clientId: { type: 'string' },
            },
            required: ['clientId'],
        },
    },
    {
        name: 'validate_gift_card',
        description: 'Valida un código de gift card ingresado por el cliente. Devuelve si es válida, el saldo disponible y la fecha de vencimiento.',
        parameters: {
            type: 'object',
            properties: {
                code: {
                    type: 'string',
                    description: 'Código de la gift card tal como lo ingresó el cliente',
                },
            },
            required: ['code'],
        },
    },
    {
        name: 'create_pending_booking',
        description: 'Crea la reserva pendiente de pago y devuelve el link de MercadoPago para que el cliente pague la seña.',
        parameters: {
            type: 'object',
            properties: {
                clientId: { type: 'string' },
                clientName: { type: 'string' },
                clientEmail: { type: 'string' },
                clientPhone: { type: 'string' },
                slots: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            treatmentIds: { type: 'array', items: { type: 'string' } },
                            treatmentNames: { type: 'array', items: { type: 'string' } },
                            zones: { type: 'array', items: { type: 'string' } },
                            professionalId: { type: 'string' },
                            date: { type: 'string' },
                            time: { type: 'string' },
                            durationMinutes: { type: 'number' },
                            estimatedPrice: { type: 'number' },
                        },
                    },
                },
                totalEstimatedPrice: { type: 'number' },
                depositAmount: { type: 'number' },
                depositBreakdown: {
                    type: 'object',
                    description: 'Desglose de cómo se paga la seña. mercadopagoAmount es lo que paga por MP.',
                    properties: {
                        giftCardId: { type: 'string' },
                        giftCardAmount: { type: 'number' },
                        clientCreditId: { type: 'string' },
                        clientCreditAmount: { type: 'number' },
                        mercadopagoAmount: { type: 'number', description: 'Monto a pagar por MercadoPago. Puede ser 0 si el saldo lo cubre todo.' },
                    },
                    required: ['mercadopagoAmount'],
                },
            },
            required: ['clientId', 'clientName', 'slots', 'totalEstimatedPrice', 'depositAmount', 'depositBreakdown'],
        },
    },
];

// ── Ejecutores de herramientas ───────────────────────────────────────────────

async function runTool(name: string, args: any, clientId: string): Promise<string> {
    try {
        switch (name) {
            case 'get_treatments': {
                const snap = await adminDb.collection('treatments').get();
                const treatments = snap.docs.map(d => {
                    const data = d.data();
                    const prices: any[] = data.prices || [];
                    const hasPrices = prices.some((p: any) => p.price > 0);
                    return {
                        id: d.id,
                        nombre: data.name,
                        categoria: data.category,
                        descripcion: data.shortDescription,
                        tienePrecioFijo: hasPrices,
                        depositAmount: data.depositAmount || 0,
                        requiereSeña: (data.depositAmount || 0) > 0,
                    };
                });

                const filtered = args.search
                    ? treatments.filter(t =>
                        t.nombre.toLowerCase().includes(args.search.toLowerCase()) ||
                        t.categoria.toLowerCase().includes(args.search.toLowerCase())
                    )
                    : treatments;

                return JSON.stringify(filtered);
            }

            case 'get_treatment_details': {
                const snap = await adminDb.collection('treatments').doc(args.treatmentId).get();
                if (!snap.exists) return JSON.stringify({ error: 'Tratamiento no encontrado en la base de datos' });
                const data = snap.data()!;
                const prices: any[] = data.prices || [];
                const hasPrices = prices.some((p: any) => p.price > 0);
                const firstDuration = prices.find((p: any) => p.duration)?.duration || null;

                return JSON.stringify({
                    id: snap.id,
                    nombre: data.name,
                    categoria: data.category,
                    descripcion: data.shortDescription,
                    variantes: prices.map((p: any) => ({
                        zona: p.zone,
                        genero: p.gender || 'ambos',
                        precio: p.price || 0,
                        duracionMinutos: p.duration || null,
                    })),
                    tienePrecioFijo: hasPrices,
                    mensajePrecio: hasPrices
                        ? null
                        : 'Este tratamiento NO tiene precio fijo. El precio se evalúa el día del turno según las características del cliente.',
                    duracionMinutos: firstDuration,
                    depositAmount: data.depositAmount || 0,
                    requiereSeña: (data.depositAmount || 0) > 0,
                });
            }

            case 'find_available_slots': {
                const groups: TreatmentGroup[] = args.groups;
                const options = await findAvailableBookingOptions(groups, args.preferMorning);

                // Formato para Gemini — sin nombre de profesional (es dato interno)
                const formatted = options.map((opt, i) => ({
                    opcion: i + 1,
                    slots: opt.slots.map(s => ({
                        fecha: s.date,
                        hora: s.time,
                        horaFin: s.endTime,
                        duracionMin: s.durationMinutes,
                        professionalId: s.professionalId,
                    })),
                    mismodia: opt.sameDay,
                    esperaEntreTratatamientos: opt.gapMinutes > 0 ? `${opt.gapMinutes} minutos de espera` : 'consecutivos',
                }));

                return JSON.stringify(formatted.length > 0 ? formatted : { mensaje: 'No hay disponibilidad en los próximos 30 días. Sugerir días separados o extender la búsqueda.' });
            }

            case 'get_client_balance': {
                const creditsSnap = await adminDb.collection('clientCredits')
                    .where('clientId', '==', clientId)
                    .where('status', '==', 'available')
                    .get();

                const credits = creditsSnap.docs.map(d => ({
                    id: d.id,
                    amount: d.data().amount,
                    reason: d.data().reason,
                }));

                const totalCredits = credits.reduce((s, c) => s + c.amount, 0);
                return JSON.stringify({ credits, totalCredits });
            }

            case 'validate_gift_card': {
                const code = (args.code || '').trim().toUpperCase();
                const snap = await adminDb.collection('giftCards')
                    .where('code', '==', code)
                    .limit(1)
                    .get();

                if (snap.empty) {
                    return JSON.stringify({ valid: false, reason: 'Código no encontrado' });
                }

                const doc = snap.docs[0];
                const gc = doc.data();
                const today = new Date().toISOString().split('T')[0];

                if (gc.status === 'used' || (gc.remainingBalance ?? 0) <= 0) {
                    return JSON.stringify({ valid: false, reason: 'La gift card ya fue utilizada' });
                }

                if (gc.expiryDate && gc.expiryDate < today) {
                    return JSON.stringify({ valid: false, reason: `La gift card venció el ${gc.expiryDate}` });
                }

                return JSON.stringify({
                    valid: true,
                    giftCardId: doc.id,
                    remainingBalance: gc.remainingBalance,
                    expiryDate: gc.expiryDate || null,
                });
            }

            case 'create_pending_booking': {
                const totalDurationMinutes = (args.slots as any[]).reduce(
                    (sum: number, s: any) => sum + s.durationMinutes, 0
                );

                // Resolver nombres de profesionales desde sus IDs (Gemini no los conoce)
                const profCache: Record<string, string> = {};
                const slotsWithNames = await Promise.all(
                    (args.slots as any[]).map(async (slot: any) => {
                        const profId = slot.professionalId;
                        if (profId && !profCache[profId]) {
                            const profSnap = await adminDb.collection('professionals').doc(profId).get();
                            profCache[profId] = profSnap.data()?.name || '';
                        }
                        return { ...slot, professionalName: profCache[profId] || '' };
                    })
                );

                const breakdown = args.depositBreakdown || { mercadopagoAmount: args.depositAmount };
                breakdown.mercadopagoAmount = Math.max(0, breakdown.mercadopagoAmount ?? args.depositAmount);

                const pendingId = await createPendingBookingAdmin({
                    clientId: args.clientId,
                    clientName: args.clientName,
                    clientEmail: args.clientEmail,
                    clientPhone: args.clientPhone,
                    slots: slotsWithNames,
                    totalDurationMinutes,
                    totalEstimatedPrice: args.totalEstimatedPrice,
                    depositAmount: args.depositAmount,
                    depositBreakdown: breakdown,
                });

                return JSON.stringify({
                    pendingBookingId: pendingId,
                    paymentUrl: `/reservar/pago/${pendingId}`,
                    message: 'Reserva creada. Redirigir al cliente a la URL de pago.',
                });
            }

            default:
                return JSON.stringify({ error: `Herramienta desconocida: ${name}` });
        }
    } catch (err: any) {
        console.error(`[booking/chat] Error en herramienta ${name}:`, err);
        return JSON.stringify({ error: err.message });
    }
}

// ── Handler principal ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    try {
        const { messages, clientId, clientName, clientEmail, clientPhone, clientSex } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'Gemini API key no configurada' }, { status: 500 });
        }

        const SYSTEM_PROMPT = buildSystemPrompt(clientName || '', clientEmail || '', clientPhone || '', clientSex || '');

        // Construir historial en formato Gemini — debe empezar con 'user'
        const allHistory = (messages as any[]).slice(0, -1).map((m: any) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }],
        }));
        const firstUserIdx = allHistory.findIndex((m: any) => m.role === 'user');
        const history = firstUserIdx >= 0 ? allHistory.slice(firstUserIdx) : [];

        const lastUserMessage = messages[messages.length - 1].content;

        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            history,
            config: {
                systemInstruction: SYSTEM_PROMPT,
                tools: [{ functionDeclarations: tools as any }],
            },
        });

        let response = await chat.sendMessage({ message: lastUserMessage });

        // Loop de function calling hasta que Gemini dé respuesta final
        let iterations = 0;
        while (iterations < 5) {
            iterations++;
            const functionCalls = response.functionCalls;
            if (!functionCalls || functionCalls.length === 0) break;

            // Ejecutar todas las herramientas solicitadas en paralelo
            const toolResults = await Promise.all(
                functionCalls.map(async (fc: any) => {
                    const result = await runTool(
                        fc.name,
                        { ...fc.args, clientId },
                        clientId
                    );
                    return {
                        functionResponse: {
                            name: fc.name,
                            response: { result },
                        },
                    };
                })
            );

            response = await chat.sendMessage({ message: toolResults as any });
        }

        const text = response.text ?? '';

        // Detectar si Gemini creó una reserva pendiente (para redirigir al pago)
        let paymentUrl: string | null = null;
        if (text.includes('/reservar/pago/')) {
            const match = text.match(/\/reservar\/pago\/([a-zA-Z0-9]+)/);
            if (match) paymentUrl = match[0];
        }

        return NextResponse.json({ message: text, paymentUrl });
    } catch (err: any) {
        console.error('[booking/chat] Error:', err);
        return NextResponse.json({ error: 'Error al procesar el mensaje' }, { status: 500 });
    }
}

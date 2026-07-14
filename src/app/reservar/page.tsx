'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { authFetch } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Send, Loader2, Bot, CalendarCheck } from 'lucide-react';
import Link from 'next/link';
import { Toaster } from 'sonner';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

const WELCOME_MESSAGE: Message = {
    role: 'assistant',
    content: '¡Hola! Soy la asistente de Dhermica 😊 Estoy acá para ayudarte a reservar tu turno.\n\n¿Qué tipo de servicio buscás? Por ejemplo: depilación, facial, aparatos, corporal, manos y pies… ¡Contame y te ayudo a encontrar la opción ideal!',
};

export default function ReservarPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
    const [requiresPayment, setRequiresPayment] = useState(true);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (!loading && !user) router.push('/');
    }, [user, loading, router]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isThinking]);

    const sendMessage = async () => {
        const text = input.trim();
        if (!text || isThinking) return;

        const newMessages: Message[] = [...messages, { role: 'user', content: text }];
        setMessages(newMessages);
        setInput('');
        setIsThinking(true);

        try {
            const res = await authFetch(user!, '/api/booking/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: newMessages,
                    clientName: profile?.fullName || '',
                    clientEmail: profile?.email || user?.email || '',
                    clientPhone: profile?.phone || '',
                    clientSex: profile?.sex || '',
                }),
            });

            const data = await res.json();

            if (data.error) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: 'Tuve un problema para procesar tu mensaje. ¿Podés intentarlo de nuevo?',
                }]);
                return;
            }

            setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
            if (data.paymentUrl) {
                setPaymentUrl(data.paymentUrl);
                setRequiresPayment(data.requiresPayment !== false);
            }
        } catch {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Algo salió mal. Por favor intentá de nuevo en unos segundos.',
            }]);
        } finally {
            setIsThinking(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    if (loading || !profile) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-[#34baab]" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50 pb-safe pb-18 md:pb-0">
            <Toaster />

            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-[#34baab]/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-[#34baab]" />
                </div>
                <div>
                    <p className="font-bold text-gray-900 text-sm">Asistente Dhermica</p>
                    <p className="text-xs text-gray-400">Te ayuda a reservar tu turno</p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'assistant' && (
                            <div className="w-7 h-7 rounded-full bg-[#34baab]/10 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                                <Bot className="w-4 h-4 text-[#34baab]" />
                            </div>
                        )}
                        <div
                            className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                                msg.role === 'user'
                                    ? 'bg-[#34baab] text-white rounded-br-sm'
                                    : 'bg-white text-gray-800 shadow-sm rounded-bl-sm border border-gray-100'
                            }`}
                        >
                            {msg.content}
                        </div>
                    </div>
                ))}

                {isThinking && (
                    <div className="flex justify-start">
                        <div className="w-7 h-7 rounded-full bg-[#34baab]/10 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                            <Bot className="w-4 h-4 text-[#34baab]" />
                        </div>
                        <div className="bg-white border border-gray-100 shadow-sm px-4 py-3 rounded-2xl rounded-bl-sm">
                            <span className="flex gap-1 items-center">
                                <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:0ms]" />
                                <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:150ms]" />
                                <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:300ms]" />
                            </span>
                        </div>
                    </div>
                )}

                {/* Botón de confirmación cuando la reserva está lista */}
                {paymentUrl && (
                    <div className="flex justify-center py-2">
                        <Link
                            href={paymentUrl}
                            className={`flex items-center gap-2 text-white font-bold px-6 py-3 rounded-2xl shadow-lg transition-all ${
                                requiresPayment
                                    ? 'bg-[#009EE3] hover:bg-[#0081C3]'
                                    : 'bg-[#34baab] hover:bg-[#2aa89a]'
                            }`}
                        >
                            <CalendarCheck className="w-5 h-5" />
                            {requiresPayment ? 'Pagar seña y confirmar turno' : 'Confirmar turno'}
                        </Link>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="bg-white border-t border-gray-100 px-4 py-3 shadow-sm">
                <div className="flex gap-2 items-end">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isThinking || !!paymentUrl}
                        placeholder={paymentUrl ? (requiresPayment ? 'Turno listo para pagar 🎉' : 'Turno listo para confirmar ✅') : 'Escribí tu mensaje...'}
                        rows={1}
                        className="flex-1 px-4 py-3 bg-gray-50 rounded-2xl resize-none outline-none text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#34baab] transition-all max-h-32 disabled:opacity-50"
                        style={{ minHeight: '48px' }}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!input.trim() || isThinking || !!paymentUrl}
                        className="w-11 h-11 rounded-full bg-[#34baab] hover:bg-[#2aa89a] disabled:opacity-40 flex items-center justify-center transition-all flex-shrink-0"
                    >
                        {isThinking ? (
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                        ) : (
                            <Send className="w-5 h-5 text-white" />
                        )}
                    </button>
                </div>
                <p className="text-center text-xs text-gray-400 mt-2">
                    Enter para enviar · Shift+Enter para nueva línea
                </p>
            </div>
        </div>
    );
}

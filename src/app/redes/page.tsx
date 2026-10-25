'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Camera, CheckCircle2, Clock, Download, ExternalLink, Loader2,
    Megaphone, AlertCircle, Share2, Send, RefreshCw,
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getTreatments } from '@/lib/firebase/treatments';
import { createSocialPost, subscribeSocialPosts } from '@/lib/firebase/socialPosts';
import { buildSocialImages, SocialImages } from '@/lib/social/images';
import { Treatment } from '@/lib/types/treatment';
import { SOCIAL_TARGET_LABELS, SocialPost, SocialPostStatus, SocialTarget } from '@/lib/types/socialPost';

const ROLES = ['admin', 'secretary', 'professional'];
const MAX_TEXT = 300;

const STATUS: Record<SocialPostStatus, { label: string; className: string; icon: typeof Clock }> = {
    pending: { label: 'Esperando conexión con Instagram', className: 'bg-gray-100 text-gray-500', icon: Clock },
    publishing: { label: 'Publicando…', className: 'bg-blue-50 text-blue-600', icon: Loader2 },
    published: { label: 'Publicado', className: 'bg-teal-50 text-[#34baab]', icon: CheckCircle2 },
    partial: { label: 'Publicado en parte', className: 'bg-amber-50 text-amber-600', icon: AlertCircle },
    failed: { label: 'No se pudo publicar', className: 'bg-red-50 text-red-600', icon: AlertCircle },
};

const imageUrl = (postId: string, type: 'publicacion' | 'historia', download = false) =>
    `/api/redes/imagen?id=${postId}&tipo=${type}${download ? '&descargar=1' : ''}`;

/** Abre el menú de compartir del celular con la imagen (WhatsApp → Mi estado). */
async function shareImage(blob: Blob): Promise<'shared' | 'unsupported' | 'retry'> {
    const file = new File([blob], 'dhermica.jpg', { type: 'image/jpeg' });
    if (!navigator.canShare?.({ files: [file] })) return 'unsupported';
    try {
        await navigator.share({ files: [file] });
        return 'shared';
    } catch (error) {
        // Safari pide que se comparta "enseguida" después del toque: si tardó en bajar, hay que tocar de nuevo
        if (error instanceof DOMException && error.name === 'NotAllowedError') return 'retry';
        return 'shared'; // Cerró el menú sin compartir
    }
}

export default function RedesPage() {
    const { user, profile, loading: authLoading } = useAuth();
    const [posts, setPosts] = useState<SocialPost[]>([]);
    const [postsLoading, setPostsLoading] = useState(true);
    const [treatments, setTreatments] = useState<Treatment[]>([]);

    const [file, setFile] = useState<File | null>(null);
    const [images, setImages] = useState<SocialImages | null>(null);
    const [previews, setPreviews] = useState<{ feed: string; story: string } | null>(null);
    const [preparing, setPreparing] = useState(false);
    const [text, setText] = useState('');
    const [treatmentId, setTreatmentId] = useState('');
    const [sending, setSending] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Imágenes ya bajadas para compartir (el segundo toque comparte al instante)
    const shareCache = useRef<Map<string, Blob>>(new Map());
    const [sharingId, setSharingId] = useState<string | null>(null);

    const canUse = !!profile && ROLES.includes(profile.role);

    useEffect(() => {
        if (!canUse) return;
        getTreatments().then(setTreatments).catch(console.error);
        return subscribeSocialPosts(
            list => {
                setPosts(list);
                setPostsLoading(false);
            },
            error => {
                console.error('Error loading social posts:', error);
                setPostsLoading(false);
            }
        );
    }, [canUse]);

    useEffect(() => () => {
        if (previews) {
            URL.revokeObjectURL(previews.feed);
            URL.revokeObjectURL(previews.story);
        }
    }, [previews]);

    const sortedTreatments = useMemo(
        () => [...treatments].sort((a, b) => a.name.localeCompare(b.name)),
        [treatments]
    );

    const handleFile = async (selected: File | undefined) => {
        if (!selected) return;
        if (!selected.type.startsWith('image/')) {
            toast.error('Elegí una foto');
            return;
        }
        setPreparing(true);
        try {
            const built = await buildSocialImages(selected);
            setFile(selected);
            setImages(built);
            setPreviews({ feed: URL.createObjectURL(built.feed), story: URL.createObjectURL(built.story) });
        } catch (error) {
            console.error('Error preparing images:', error);
            toast.error('No se pudo leer la foto. Probá con otra.');
        } finally {
            setPreparing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const reset = () => {
        setFile(null);
        setImages(null);
        setPreviews(null);
        setText('');
        setTreatmentId('');
    };

    const handlePublish = async () => {
        if (!user || !images || !text.trim()) return;
        setSending(true);
        try {
            const result = await createSocialPost(user, { text: text.trim(), treatmentId: treatmentId || undefined, images });
            shareCache.current.set(result.id, images.story);
            if (result.status === 'publishing') toast.success('¡Listo! Se está publicando en Instagram y Facebook');
            else if (result.status === 'pending') toast.success('Guardada. Se publicará cuando esté conectado Instagram');
            else toast.error('Se guardó, pero no se pudo publicar. Avisale a Marco.');
            reset();
        } catch (error) {
            console.error('Error publishing:', error);
            toast.error(error instanceof Error ? error.message : 'No se pudo publicar');
        } finally {
            setSending(false);
        }
    };

    const handleShare = async (post: SocialPost) => {
        setSharingId(post.id);
        try {
            let blob = shareCache.current.get(post.id);
            const wasCached = !!blob;
            if (!blob) {
                const res = await fetch(imageUrl(post.id, 'historia'));
                if (!res.ok) throw new Error('No se pudo bajar la imagen');
                blob = await res.blob();
                shareCache.current.set(post.id, blob);
            }
            const result = await shareImage(blob);
            if (result === 'unsupported') {
                toast.info('Este dispositivo no permite compartir: descargá la imagen y subila al estado.');
            } else if (result === 'retry' && !wasCached) {
                toast.info('Imagen lista: tocá "Compartir" de nuevo.');
            }
        } catch (error) {
            console.error('Error sharing:', error);
            toast.error('No se pudo compartir la imagen');
        } finally {
            setSharingId(null);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#34baab]" />
            </div>
        );
    }

    if (!canUse) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-center">
                <p className="text-gray-500 font-medium">Esta sección es solo para el equipo de Dhermica.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <Toaster position="top-center" richColors />

            <div className="max-w-3xl mx-auto px-4 py-6 md:py-8 space-y-6">
                {/* Header */}
                <div className="bg-[#484450] rounded-[2rem] p-6 md:p-10 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#34baab]/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                    <Link
                        href="/dashboard"
                        className="relative z-10 inline-flex bg-white/10 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest items-center gap-2 hover:bg-white/20 transition-all border border-white/10 mb-6"
                    >
                        <ArrowLeft className="w-3 h-3" /> Volver
                    </Link>
                    <div className="relative z-10">
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2 flex items-center gap-3">
                            <Megaphone className="w-8 h-8 text-[#34baab]" /> Publicar en redes
                        </h1>
                        <p className="text-gray-300 font-medium">
                            Subí una foto y contá en pocas palabras qué es. El resto lo hace Dhermica solo:
                            el texto, la publicación y la historia en Instagram y Facebook.
                        </p>
                    </div>
                </div>

                {/* Nueva publicación */}
                <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-5 md:p-8 space-y-5">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => handleFile(e.target.files?.[0])}
                    />

                    {!previews ? (
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={preparing}
                            className="w-full border-2 border-dashed border-gray-200 rounded-3xl py-12 flex flex-col items-center gap-3 text-gray-400 hover:border-[#34baab] hover:text-[#34baab] transition-all"
                        >
                            {preparing ? <Loader2 className="w-10 h-10 animate-spin" /> : <Camera className="w-10 h-10" />}
                            <span className="font-black uppercase tracking-widest text-xs">
                                {preparing ? 'Preparando…' : 'Elegir o sacar foto'}
                            </span>
                        </button>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex gap-3 items-end">
                                <div className="flex-[2] min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Publicación</p>
                                    <img src={previews.feed} alt="Vista previa de la publicación" className="w-full rounded-2xl border border-gray-100" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Historia</p>
                                    <img src={previews.story} alt="Vista previa de la historia" className="w-full rounded-2xl border border-gray-100" />
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={preparing || sending}
                                className="text-xs font-bold text-[#34baab] flex items-center gap-1"
                            >
                                <RefreshCw className="w-3 h-3" /> Cambiar foto
                            </button>
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2 block">
                            ¿Qué querés contar?
                        </label>
                        <textarea
                            value={text}
                            onChange={e => setText(e.target.value.slice(0, MAX_TEXT))}
                            rows={2}
                            placeholder="Ej.: uñas esculpidas · 2x1 en cejas este sábado"
                            className="w-full px-4 py-3 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-[#34baab] text-gray-900 font-medium resize-none"
                        />
                        <p className="text-[11px] text-gray-400 mt-1">
                            Si es una promo, poné las condiciones (días, precio): no se inventa nada que no escribas.
                        </p>
                    </div>

                    <div>
                        <label className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2 block">
                            Tratamiento (opcional)
                        </label>
                        <select
                            value={treatmentId}
                            onChange={e => setTreatmentId(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-[#34baab] text-gray-900 font-medium"
                        >
                            <option value="">Ninguno</option>
                            {sortedTreatments.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="button"
                        onClick={handlePublish}
                        disabled={!images || !text.trim() || sending || preparing}
                        className="w-full bg-[#34baab] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#2da698] transition-all active:scale-95 disabled:opacity-40 disabled:active:scale-100"
                    >
                        {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        {sending ? 'Subiendo…' : 'Publicar en Instagram y Facebook'}
                    </button>
                    {file && !sending && (
                        <p className="text-[11px] text-gray-400 text-center -mt-2">
                            Se publica en el momento: publicación e historia en las dos redes.
                        </p>
                    )}
                </div>

                {/* Historial */}
                <div className="space-y-3">
                    <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1">Publicaciones</h2>

                    {postsLoading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="w-8 h-8 animate-spin text-[#34baab]" />
                        </div>
                    ) : posts.length === 0 ? (
                        <div className="bg-white rounded-3xl p-8 text-center text-gray-400 border border-gray-100">
                            Todavía no hay publicaciones.
                        </div>
                    ) : (
                        posts.map(post => {
                            const status = STATUS[post.status] ?? STATUS.pending;
                            const StatusIcon = status.icon;
                            const links = Object.entries(post.results ?? {}) as [SocialTarget, { ok: boolean; url?: string }][];
                            return (
                                <div key={post.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 flex gap-4">
                                    <img
                                        src={post.feedImageUrl}
                                        alt={post.text}
                                        className="w-20 h-24 md:w-24 md:h-28 object-cover rounded-2xl flex-shrink-0 bg-gray-50"
                                    />
                                    <div className="flex-1 min-w-0 space-y-2">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${status.className}`}>
                                            <StatusIcon className={`w-3 h-3 ${post.status === 'publishing' ? 'animate-spin' : ''}`} />
                                            {status.label}
                                        </span>
                                        <p className="font-bold text-gray-900 leading-tight line-clamp-2">{post.text}</p>
                                        <p className="text-[11px] text-gray-400">
                                            {post.createdBy?.name || 'Equipo'}
                                            {post.createdAt && ` · ${post.createdAt.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`}
                                        </p>
                                        {post.error && <p className="text-[11px] text-red-500">{post.error}</p>}
                                        {links.some(([, r]) => r.ok && r.url) && (
                                            <div className="flex flex-wrap gap-x-3 gap-y-1">
                                                {links.filter(([, r]) => r.ok && r.url).map(([target, r]) => (
                                                    <a
                                                        key={target}
                                                        href={r.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[11px] font-bold text-[#34baab] inline-flex items-center gap-1"
                                                    >
                                                        {SOCIAL_TARGET_LABELS[target]} <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            <button
                                                type="button"
                                                onClick={() => handleShare(post)}
                                                disabled={sharingId === post.id}
                                                className="bg-[#25D366] text-white px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-60"
                                            >
                                                {sharingId === post.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
                                                Compartir (estado)
                                            </button>
                                            <a
                                                href={imageUrl(post.id, 'historia', true)}
                                                className="bg-gray-100 text-gray-600 px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                                            >
                                                <Download className="w-3.5 h-3.5" /> Descargar
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

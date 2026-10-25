/**
 * Publicación en redes (Instagram y Facebook) cargada desde /redes.
 * La app guarda las imágenes y el registro; n8n escribe el texto con IA, publica
 * y completa `status`, `caption` y `results`.
 */
export type SocialPostStatus =
    | 'pending'     // Guardada, pero n8n todavía no está configurado (N8N_REDES_URL)
    | 'publishing'  // n8n la recibió y está publicando
    | 'published'   // Salió en todos los destinos
    | 'partial'     // Salió en algunos destinos
    | 'failed';     // No salió en ninguno (ver `error` o `results`)

export type SocialTarget = 'instagramPost' | 'instagramStory' | 'facebookPost' | 'facebookStory';

export const SOCIAL_TARGET_LABELS: Record<SocialTarget, string> = {
    instagramPost: 'Instagram',
    instagramStory: 'Historia de Instagram',
    facebookPost: 'Facebook',
    facebookStory: 'Historia de Facebook',
};

export interface SocialTargetResult {
    ok: boolean;
    url?: string;
    error?: string;
}

export interface SocialPost {
    id: string;
    /** Lo que escribió quien la cargó (p. ej. "2x1 en cejas") */
    text: string;
    treatmentId?: string | null;
    treatmentName?: string | null;
    feedImageUrl: string;
    storyImageUrl: string;
    status: SocialPostStatus;
    /** Texto final que escribió la IA */
    caption?: string;
    results?: Partial<Record<SocialTarget, SocialTargetResult>>;
    error?: string;
    createdBy: { uid: string; name: string; role: string };
    createdAt?: Date;
    publishedAt?: Date;
}

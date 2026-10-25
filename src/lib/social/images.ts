/**
 * Arma en el navegador las dos versiones que piden las redes:
 * - publicación: 1080 px de ancho, entre 4:5 y 1,91:1 (Instagram rechaza otras proporciones)
 * - historia: 1080 x 1920 (9:16)
 * Si la foto casi encaja, se recorta un poco al centro; si no, va entera sobre un fondo
 * desenfocado de la misma foto, para no cortar nada importante.
 */
const WIDTH = 1080;
const FEED_MIN_RATIO = 4 / 5;
const FEED_MAX_RATIO = 1.91;
const STORY_HEIGHT = 1920;
const JPEG_QUALITY = 0.88;

export interface SocialImages {
    feed: Blob;
    story: Blob;
}

function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('No se pudo leer la imagen'));
        };
        img.src = url;
    });
}

function newCanvas(width: number, height: number) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('El navegador no permite editar imágenes');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    return { canvas, ctx };
}

/** Dibuja la imagen cubriendo todo el lienzo (recorta lo que sobra, centrado) */
function drawCover(ctx: CanvasRenderingContext2D, img: CanvasImageSource, iw: number, ih: number, w: number, h: number) {
    const scale = Math.max(w / iw, h / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

/** Foto entera, centrada, sobre un fondo desenfocado de sí misma */
function drawContainOnBlur(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
    // Desenfoque que anda en todos los navegadores (Safari viejo no tiene ctx.filter):
    // se achica muchísimo y se vuelve a agrandar con suavizado
    const small = newCanvas(Math.max(8, Math.round(w / 24)), Math.max(8, Math.round(h / 24)));
    drawCover(small.ctx, img, img.naturalWidth, img.naturalHeight, small.canvas.width, small.canvas.height);
    ctx.drawImage(small.canvas, 0, 0, w, h);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(0, 0, w, h);

    const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function toJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            blob => (blob ? resolve(blob) : reject(new Error('No se pudo generar la imagen'))),
            'image/jpeg',
            JPEG_QUALITY
        );
    });
}

function buildFeed(img: HTMLImageElement): Promise<Blob> {
    const ratio = img.naturalWidth / img.naturalHeight;
    if (ratio >= FEED_MIN_RATIO && ratio <= FEED_MAX_RATIO) {
        const { canvas, ctx } = newCanvas(WIDTH, Math.round(WIDTH / ratio));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return toJpeg(canvas);
    }
    const height = ratio < FEED_MIN_RATIO ? Math.round(WIDTH / FEED_MIN_RATIO) : Math.round(WIDTH / FEED_MAX_RATIO);
    const { canvas, ctx } = newCanvas(WIDTH, height);
    // Una foto vertical común del celular (3:4) apenas pasa del límite: alcanza con recortar un poco
    if (ratio >= 0.7 && ratio < FEED_MIN_RATIO) {
        drawCover(ctx, img, img.naturalWidth, img.naturalHeight, WIDTH, height);
    } else {
        drawContainOnBlur(ctx, img, WIDTH, height);
    }
    return toJpeg(canvas);
}

function buildStory(img: HTMLImageElement): Promise<Blob> {
    const ratio = img.naturalWidth / img.naturalHeight;
    const { canvas, ctx } = newCanvas(WIDTH, STORY_HEIGHT);
    // Casi 9:16 (fotos de pantalla completa): recorte leve; si no, entera sobre fondo desenfocado
    if (ratio >= 0.5 && ratio <= 0.62) {
        drawCover(ctx, img, img.naturalWidth, img.naturalHeight, WIDTH, STORY_HEIGHT);
    } else {
        drawContainOnBlur(ctx, img, WIDTH, STORY_HEIGHT);
    }
    return toJpeg(canvas);
}

export async function buildSocialImages(file: File): Promise<SocialImages> {
    const img = await loadImage(file);
    const [feed, story] = await Promise.all([buildFeed(img), buildStory(img)]);
    return { feed, story };
}

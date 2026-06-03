import { GiftCard } from '../types/giftCard';

const PX_TO_MM = 25.4 / 96;

export async function downloadGiftCardPDF(
    element: HTMLElement,
    card: GiftCard
): Promise<void> {
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
    ]);

    // Esperar a que todas las fuentes (incluida Amsterdam Four) estén cargadas
    await document.fonts.ready;

    const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
        logging: false,
        onclone: (doc) => {
            // Copiar las CSS variables del documento original al clon para que
            // var(--font-amsterdam) resuelva correctamente durante la captura
            const rootStyles = getComputedStyle(document.documentElement);
            const fontVar = rootStyles.getPropertyValue('--font-amsterdam').trim();
            if (fontVar) {
                doc.documentElement.style.setProperty('--font-amsterdam', fontVar);
            }
        },
    });

    const imgData = canvas.toDataURL('image/png');
    const widthMm = element.offsetWidth * PX_TO_MM;
    const heightMm = element.offsetHeight * PX_TO_MM;
    const margin = 10;

    const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [widthMm + margin * 2, heightMm + margin * 2],
    });

    pdf.addImage(imgData, 'PNG', margin, margin, widthMm, heightMm);
    pdf.save(`gift-card-${card.code}.pdf`);
}

'use client';

import { useEffect, useState } from 'react';
import { createTreatment, getTreatments, deleteTreatment } from '@/lib/firebase/treatments';
import { Treatment } from '@/lib/types/treatment';

// Example data from the external catalog
const SAMPLE_TREATMENTS: Omit<Treatment, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
        name: "Definitiva laser sin gel",
        category: "Depilación",
        shortDescription: "Depilación definitiva con tecnología láser Infrared sin necesidad de gel conductor.",
        fullDescription: "Sistema de depilación láser que utiliza tecnología infrarroja de última generación, permitiendo tratamientos más efectivos y confortables sin necesidad de gel conductor. El equipo cuenta con sistema de enfriamiento integrado.",
        prices: [
            { zone: "axilas", gender: "female", price: 5500 },
            { zone: "axilas", gender: "male", price: 9000 },
            { zone: "rostro", gender: "female", price: 5500 },
            { zone: "rostro", gender: "male", price: 9000 },
            { zone: "cavado", gender: "female", price: 5500 },
            { zone: "media pierna", gender: "female", price: 5500 },
            { zone: "pierna completa", gender: "female", price: 9000 },
        ],
        contraindications: ["Embarazo y lactancia", "Enfermedades fotosensibles", "Bronceado reciente", "Tatuajes en la zona"],
        benefits: ["Reducción permanente del vello", "Piel más suave", "Eliminación de foliculitis"],
        preCare: ["No depilar con cera 15 días antes", "Rasurar 24h antes", "Piel limpia sin cremas"],
        postCare: ["Evitar sol 48h", "Usar protector solar SPF50+", "Hidratar la piel"],
    },
    {
        name: "HiFu",
        category: "Aparatología",
        shortDescription: "Lifting no quirúrgico mediante ultrasonido focalizado de alta intensidad.",
        fullDescription: "Sistema avanzado que utiliza ultrasonido focalizado para tensar y reafirmar la piel desde las capas más profundas, estimulando el colágeno natural.",
        prices: [
            { zone: "Rostro Completo", gender: "both", price: 35000 },
            { zone: "Papada", gender: "both", price: 10000 },
            { zone: "Escote", gender: "both", price: 10000 }
        ],
        contraindications: ["Embarazo", "Enfermedades autoinmunes", "Heridas abiertas"],
        benefits: ["Efecto lifting inmediato", "Estimula el colágeno", "Sin tiempo de recuperación"],
        preCare: ["Evitar sol 24h antes", "No aplicar cremas en la zona"],
        postCare: ["Protector solar SPF50+", "Evitar masajes en la zona"],
    },
    {
        name: "Peeling Químico",
        category: "Facial",
        shortDescription: "Exfoliación química profesional para renovación celular y tratar manchas.",
        fullDescription: "Tratamiento de exfoliación química que utiliza diferentes tipos de ácidos para eliminar las capas superficiales de la piel.",
        prices: [{ zone: "Rostro Completo", gender: "both", price: 15000 }],
        benefits: ["Piel más luminosa", "Reducción de manchas", "Textura suave"],
        preCare: ["Suspender retinoides 1 semana antes", "No exfoliar 5 días antes"],
        postCare: ["Protección solar obligatoria", "Hidratación constante"],
    },
    {
        name: "Limpieza Facial Profunda",
        category: "Facial",
        shortDescription: "Limpieza con punta de diamante, extracción de impurezas y mascarilla.",
        fullDescription: "Combina limpieza profunda con microdermoabrasión mediante punta de diamante y extracción manual.",
        prices: [{ zone: "Rostro Completo", gender: "both", price: 8500 }],
        benefits: ["Piel profundamente limpia", "Poros refinados", "Cutis más luminoso"],
        postCare: ["No maquillarse por 12 horas", "Protector solar obligatorio"],
    },
    {
        name: "Electro Estimulación",
        category: "Aparatología",
        shortDescription: "Tonificación muscular mediante corrientes eléctricas controladas.",
        fullDescription: "Provoca contracciones musculares controladas, logrando tonificación, fortalecimiento y reducción de flacidez.",
        prices: [
            { zone: "Abdomen", gender: "both", price: 5000 },
            { zone: "Glúteos", gender: "both", price: 5000 },
            { zone: "Piernas", gender: "both", price: 5000 },
            { zone: "Brazos", gender: "both", price: 5000 }
        ],
        contraindications: ["Embarazo", "Marcapasos", "Epilepsia"],
        benefits: ["Mayor tonificación", "Reducción de medidas", "Mejora circulación"],
        postCare: ["Hidratación abundante", "Evitar ejercicio intenso el mismo día"],
    },
    {
        name: "Lipolaser",
        category: "Aparatología",
        shortDescription: "Reducción de grasa localizada mediante tecnología láser de baja intensidad.",
        fullDescription: "Lipólisis no invasiva mediante tecnología láser frío para reducción de medidas.",
        prices: [
            { zone: "Abdomen", gender: "both", price: 10000 },
            { zone: "Flancos", gender: "both", price: 10000 },
            { zone: "Brazos", gender: "both", price: 10000 }
        ],
        benefits: ["Reducción de grasa localizada", "Mejora apariencia de piel"],
        preCare: ["Evitar alcohol 24h antes", "Beber mucha agua"],
    },
    {
        name: "Ultracavitador",
        category: "Aparatología",
        shortDescription: "Eliminación de grasa localizada mediante ultrasonido de baja frecuencia.",
        fullDescription: "Destruye selectivamente los adipocitos mediante ondas ultrasónicas de baja frecuencia.",
        prices: [
            { zone: "Abdomen", gender: "both", price: 5000 },
            { zone: "Piernas", gender: "both", price: 5000 }
        ],
        benefits: ["Reducción de grasa", "Eliminación de celulitis"],
        postCare: ["Actividad física ligera", "Hidratación extrema"],
    },
    {
        name: "Vacumterapia",
        category: "Aparatología",
        shortDescription: "Drenaje linfático y modelado corporal mediante succión controlada.",
        fullDescription: "Masaje por succión que estimula la circulación y ayuda a remodelar el contorno corporal.",
        prices: [
            { zone: "Glúteos", gender: "both", price: 5000 },
            { zone: "Piernas", gender: "both", price: 5000 }
        ],
        benefits: ["Mejora firmeza", "Reduce celulitis", "Modelado corporal"],
    },
    {
        name: "Liposonix",
        category: "Aparatología",
        shortDescription: "Eliminación permanente de grasa localizada mediante HIFU corporal.",
        fullDescription: "Ultrasonido focalizado de alta intensidad diseñado para eliminar tejido adiposo rebelde.",
        prices: [
            { zone: "Abdomen", gender: "both", price: 40000 },
            { zone: "Pierna completa", gender: "both", price: 60000 },
            { zone: "Flancos", gender: "both", price: 20000 }
        ],
        results: ["Resultados visibles en 4-8 semanas"],
    },
    {
        name: "Radiofrecuencia Facial",
        category: "Aparatología",
        shortDescription: "Rejuvenecimiento facial, firmeza y estimulación de colágeno.",
        fullDescription: "Energía electromagnética para calentar capas profundas de la piel y combatir la flacidez.",
        prices: [{ zone: "Rostro Completo", gender: "both", price: 10000 }],
        benefits: ["Mayor firmeza", "Mejora óvalo facial", "Efecto lifting"],
    },
    {
        name: "Drenaje Linfático Manual",
        category: "Corporal",
        shortDescription: "Masaje especializado para eliminar líquidos retenidos y toxinas.",
        fullDescription: "Movimientos suaves y rítmicos para estimular el sistema linfático.",
        prices: [
            { zone: "Cuerpo Completo", gender: "both", price: 12000 },
            { zone: "Zonas localizadas", gender: "both", price: 7000 }
        ],
        benefits: ["Reduce hinchazón", "Mejora circulación", "Elimina toxinas"],
    },
    {
        name: "Masajes Reductores",
        category: "Corporal",
        shortDescription: "Técnicas manuales para reducir medidas y modelar el contorno.",
        fullDescription: "Combinación de masajes reductores, drenantes y modeladores sobre tejido adiposo.",
        prices: [{ zone: "Zonas a elección", gender: "both", price: 10000 }],
        benefits: ["Reducción de medidas", "Piel más firme"],
    },
    {
        name: "Punta de Diamante Facial/Corporal",
        category: "Aparatología",
        shortDescription: "Microdermoabrasión para exfoliar y renovar la piel profundamente.",
        fullDescription: "Exfoliación mecánica que elimina células muertas y mejora la textura cutánea.",
        prices: [
            { zone: "Facial", gender: "both", price: 8500 },
            { zone: "Corporal", gender: "both", price: 15000 }
        ],
        benefits: ["Piel suave y luminosa", "Poros refinados"],
    },
    {
        name: "Laminado de Cejas",
        category: "Cejas",
        shortDescription: "Reestructuración y diseño de cejas para un aspecto poblado y definido.",
        fullDescription: "Disciplina el pelo rebelde dando mayor definición y aspecto poblado.",
        prices: [{ zone: "Cejas", gender: "both", price: 8500 }],
        results: ["Duración 4-6 semanas"],
    },
    {
        name: "Perfilado de Cejas",
        category: "Cejas",
        shortDescription: "Diseño y depilación profesional para realzar la mirada.",
        fullDescription: "Armoniza las cejas con las facciones del rostro mediante cera o pinza.",
        prices: [{ zone: "Diseño + Perfilado", gender: "both", price: 4000 }],
    },
    {
        name: "Lifting de Pestañas",
        category: "Pestañas",
        shortDescription: "Arquero y volumen natural para tus pestañas con tinte incluido.",
        fullDescription: "Riza y da volumen a las pestañas naturales intensificando el color.",
        prices: [{ zone: "Pestañas", gender: "both", price: 10000 }],
        results: ["Duración 6-8 semanas"],
    },
    {
        name: "Permanente de Pestañas",
        category: "Pestañas",
        shortDescription: "Curvatura natural y definición duradera con tinte.",
        fullDescription: "Modifica la estructura del pelo para lograr una curvatura natural duradera.",
        prices: [{ zone: "Pestañas", gender: "both", price: 9000 }],
    },
    {
        name: "Belleza de Manos (Sistema Semi/Soft Gel/Capping)",
        category: "Manos",
        shortDescription: "Cuidado profesional de manos con técnicas avanzadas de esmaltado.",
        fullDescription: "Manicura integral con opciones de semipermanente, soft gel, capping o esculpidas.",
        prices: [
            { zone: "Semicomún", gender: "both", price: 7500 },
            { zone: "Semipermanente", gender: "both", price: 8000 },
            { zone: "Soft Gel / Capping", gender: "both", price: 10000 },
            { zone: "Esculpidas Poligel", gender: "both", price: 15000 }
        ],
        benefits: ["Uñas impecables y duraderas", "Protección de uña natural"],
    },
    {
        name: "Belleza de Pies",
        category: "Pies",
        shortDescription: "Tratamiento integral para el cuidado y embellecimiento de pies.",
        fullDescription: "Limpieza profunda, tratamiento de durezas, exfoliación y esmaltado profesional.",
        prices: [
            { zone: "Completa Común", gender: "both", price: 8000 },
            { zone: "Semipermanente", gender: "both", price: 10000 }
        ],
    },
    {
        name: "Depilación con Cera",
        category: "Depilación",
        shortDescription: "Depilación profesional con cera española de primera calidad.",
        fullDescription: "Sistema tradicional efectivo para todas las zonas del cuerpo.",
        prices: [
            { zone: "Media Pierna", gender: "female", price: 4000 },
            { zone: "Media Pierna", gender: "male", price: 10000 },
            { zone: "Axilas", gender: "both", price: 3000 },
            { zone: "Cavado / Tiro", gender: "female", price: 4500 }
        ],
    },
    {
        name: "Estimulación Facial (Gimnasia)",
        category: "Facial",
        shortDescription: "Microcorrientes para tonificar músculos faciales y efecto lifting.",
        fullDescription: "Trabaja los músculos faciales mejorando su tono y firmeza mediante microcorrientes.",
        prices: [{ zone: "Rostro Completo", gender: "both", price: 4000 }],
    },
    {
        name: "Extracción de Puntos Negros",
        category: "Facial",
        shortDescription: "Limpieza específica para eliminar comedones e impurezas profundas.",
        fullDescription: "Preparación con vapor y extracción manual profesional de impurezas.",
        prices: [{ zone: "Rostro Completo", gender: "both", price: 11000 }],
    },
    {
        name: "Pulido Corporal con Cremas",
        category: "Corporal",
        shortDescription: "Exfoliación profunda para renovar y suavizar la piel de todo el cuerpo.",
        fullDescription: "Elimina células muertas mediante cremas cosméticas profesionales.",
        prices: [{ zone: "Cuerpo Completo", gender: "both", price: 10000 }],
    },
    {
        name: "Pulido Corporal con Punta de Diamante",
        category: "Corporal",
        shortDescription: "Microdermoabrasión corporal para una renovación celular intensa.",
        fullDescription: "Exfoliación mecánica profunda para pieles que requieren mayor renovación.",
        prices: [{ zone: "Cuerpo Completo", gender: "both", price: 15000 }],
    }
];

export function TreatmentSeeder() {
    const [status, setStatus] = useState<string>('');
    const [count, setCount] = useState(0);

    useEffect(() => {
        checkAndSeed();
    }, []);

    const checkAndSeed = async () => {
        const existing = await getTreatments();
        setCount(existing.length);
        if (existing.length === 0) {
            setStatus('Catalogando...');
        }
    };

    const handleSeed = async () => {
        setStatus('Clonando catálogo (24 servicios)...');
        try {
            for (const t of SAMPLE_TREATMENTS) {
                await createTreatment(t);
            }
            setStatus('¡Catálogo clonado con éxito!');
            window.location.reload();
        } catch (error) {
            console.error(error);
            setStatus('Error al clonar');
        }
    };

    const handleClearAndSeed = async () => {
        if (!window.confirm('¿Estás seguro? Esto borrará los tratamientos actuales y cargará los 24 servicios completos del nuevo catálogo.')) return;

        setStatus('Limpiando catálogo actual...');
        try {
            const existing = await getTreatments();
            for (const t of existing) {
                await deleteTreatment(t.id);
            }

            setStatus('Clonando nuevo catálogo (24 servicios)...');
            for (const t of SAMPLE_TREATMENTS) {
                await createTreatment(t);
            }
            setStatus('¡Catálogo sincronizado con éxito!');
            window.location.reload();
        } catch (error) {
            console.error(error);
            setStatus('Error en la sincronización');
        }
    };

    return (
        <div className="p-8 bg-teal-50 rounded-3xl border-2 border-dashed border-teal-200 text-center mb-8">
            <h3 className="text-lg font-black text-teal-900 mb-2">Asistente de Catálogo</h3>
            <p className="text-teal-600 text-sm mb-6">
                {count > 0
                    ? `Tienes ${count} tratamientos cargados. ¿Quieres borrarlos y cargar los 24 servicios completos corregidos?`
                    : 'El catálogo está vacío. ¿Quieres cargar los 24 servicios completos del nuevo catálogo?'}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
                {count === 0 ? (
                    <button
                        onClick={handleSeed}
                        className="bg-[#34baab] text-white px-8 py-3 rounded-2xl font-bold hover:bg-[#2aa89a] transition-all shadow-lg shadow-teal-100"
                    >
                        {status || 'Sincronizar Catálogo'}
                    </button>
                ) : (
                    <button
                        onClick={handleClearAndSeed}
                        className="bg-red-500 text-white px-8 py-3 rounded-2xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-100"
                    >
                        {status || 'Borrar y Recargar Todo (24)'}
                    </button>
                )}
            </div>
        </div>
    );
}

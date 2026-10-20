// Completa descripción, beneficios, contraindicaciones y cuidados pre/post de los tratamientos
// con el contenido de scripts/data/tratamientos-completar.json.
// Solo escribe campos vacíos: lo que ya está cargado desde el panel no se pisa.
//
// Uso (lee las credenciales de admin de .env.local):
//   node scripts/completar-tratamientos.mjs           → muestra qué cambiaría, sin escribir
//   node scripts/completar-tratamientos.mjs --apply   → escribe en Firestore
import { readFileSync, existsSync } from 'node:fs';
import admin from 'firebase-admin';

const APPLY = process.argv.includes('--apply');
const FIELDS = ['fullDescription', 'benefits', 'contraindications', 'preCare', 'postCare'];

// Carga .env.local sin depender de dotenv
if (existsSync('.env.local')) {
    for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (!m || process.env[m[1]]) continue;
        process.env[m[1]] = m[2].replace(/^(['"])([\s\S]*)\1$/, '$2');
    }
}

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;
if (!projectId || !clientEmail || !privateKey) {
    console.error('Faltan FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL o FIREBASE_PRIVATE_KEY (en .env.local o el entorno).');
    process.exit(1);
}
admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, '\n') }),
});
const db = admin.firestore();

const data = JSON.parse(readFileSync(new URL('./data/tratamientos-completar.json', import.meta.url), 'utf8'));
const isEmpty = v => v == null || (Array.isArray(v) ? v.length === 0 : String(v).trim() === '');

const ids = new Set([...Object.keys(data.tratamientos), ...Object.keys(data.correcciones)]);
let total = 0;
for (const id of ids) {
    const ref = db.collection('treatments').doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
        console.warn(`- ${id}: no existe, se omite`);
        continue;
    }
    const current = snap.data();
    const update = {};

    const content = data.tratamientos[id] || {};
    for (const field of FIELDS) {
        if (content[field] && isEmpty(current[field])) update[field] = content[field];
    }
    for (const [field, [from, to]] of Object.entries(data.correcciones[id] || {})) {
        const text = update[field] ?? current[field];
        if (typeof text === 'string' && text.startsWith(from)) update[field] = to + text.slice(from.length);
    }

    const changed = Object.keys(update);
    if (changed.length === 0) continue;
    total++;
    console.log(`- ${current.name}: ${changed.join(', ')}`);
    if (APPLY) await ref.update({ ...update, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
}

console.log(total === 0
    ? 'No hay nada para completar.'
    : APPLY ? `Listo: ${total} tratamientos actualizados.` : `${total} tratamientos a actualizar. Corré con --apply para guardar.`);

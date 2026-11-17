// Punto de entrada del servidor (API)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { initDatabase } from './db.js';
import { obtenerJwtSecret } from './seguridad.js';
import authRoutes from './routes/auth.js';
import cursosRoutes from './routes/cursos.js';
import comprasRoutes from './routes/compras.js';
import adminRoutes, { UPLOADS_DIR } from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const FRONTEND_DIST = path.join(__dirname, '..', '..', 'frontend', 'dist');
const PORT = Number(process.env.PORT) || 4000;

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// La clave de los tokens debe venir del archivo .env y ser robusta; si no, no se arranca
try {
  obtenerJwtSecret();
} catch (err) {
  console.error(`\n✖ ${err.message}\n`);
  process.exit(1);
}

const app = express();
app.disable('x-powered-by');
// Si publicas detrás de un proxy (Render, Railway, Nginx), pon TRUST_PROXY=1 en el .env
// para que el límite de intentos por IP use la IP real del visitante
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY);
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Archivos estáticos: portadas de ejemplo e imágenes subidas por el dueño
// "nosniff" impide que el navegador interprete una imagen como página o script
const sinSniff = { setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff') };
app.use('/covers', express.static(path.join(PUBLIC_DIR, 'covers'), sinSniff));
app.use('/uploads', express.static(UPLOADS_DIR, sinSniff));

// Rutas de la API
app.get('/api/salud', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api', cursosRoutes);
app.use('/api/compras', comprasRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

// Si existe la versión compilada del frontend (npm run build), se sirve desde aquí
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get(/^\/(?!api|covers|uploads).*/, (_req, res) => res.sendFile(path.join(FRONTEND_DIST, 'index.html')));
}

// Manejo de errores inesperados (Express 5 captura también los errores de funciones async)
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Ocurrió un error en el servidor.' });
});

try {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`✔ API de Ovilla funcionando en http://localhost:${PORT}`);
  });
} catch {
  process.exit(1);
}

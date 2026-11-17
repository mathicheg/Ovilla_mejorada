// Crea backend/.env a partir de .env.example y genera una clave JWT_SECRET aleatoria y robusta.
// Si .env ya existe, solo reemplaza JWT_SECRET cuando falta o es débil.
// Uso (desde la carpeta ovilla):
//   npm run crear-env            → crea/arregla el .env
//   npm run crear-env -- --rotar → genera una clave nueva (cierra la sesión de todos los usuarios)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const BACKEND = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENV = path.join(BACKEND, '.env');
const EJEMPLO = path.join(BACKEND, '.env.example');
const rotar = process.argv.includes('--rotar');

const nuevaClave = () => crypto.randomBytes(48).toString('base64url'); // 64 caracteres aleatorios
const esDebil = (v) => !v || v.length < 32 || v.startsWith('cambia-esta-clave') || v === 'ovilla-clave-de-desarrollo';

let creado = false;
if (!fs.existsSync(ENV)) {
  fs.copyFileSync(EJEMPLO, ENV);
  creado = true;
}

let contenido = fs.readFileSync(ENV, 'utf8');
const actual = (contenido.match(/^JWT_SECRET=(.*)$/m) || [])[1]?.trim();

if (rotar || esDebil(actual)) {
  const linea = `JWT_SECRET=${nuevaClave()}`;
  contenido = /^JWT_SECRET=.*$/m.test(contenido)
    ? contenido.replace(/^JWT_SECRET=.*$/m, linea)
    : `${contenido.trimEnd()}\n${linea}\n`;
  fs.writeFileSync(ENV, contenido);
  console.log(rotar ? '✔ Se generó una clave JWT nueva (todos deberán iniciar sesión otra vez).' : '✔ Se generó una clave JWT_SECRET aleatoria en backend/.env');
}

if (creado) console.log('✔ Se creó backend/.env — escribe ahí tu contraseña de PostgreSQL (DB_PASSWORD)');

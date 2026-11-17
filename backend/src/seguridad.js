// Reglas de seguridad compartidas: clave JWT, política de contraseñas y bloqueo de intentos
import { query, queryOne } from './db.js';

// ---------------------------------------------------------------------------
// Clave de firma de los tokens (JWT)
// Se lee SOLO de la variable de entorno JWT_SECRET. No hay clave por defecto en el código:
// si falta o es débil, el servidor no arranca.
// ---------------------------------------------------------------------------
const PLACEHOLDERS = ['cambia-esta-clave-por-una-frase-larga-y-secreta', 'ovilla-clave-de-desarrollo'];

export function obtenerJwtSecret() {
  const secret = process.env.JWT_SECRET || '';
  if (secret.length < 32 || PLACEHOLDERS.includes(secret)) {
    throw new Error(
      'JWT_SECRET falta o es débil (mínimo 32 caracteres aleatorios). ' +
        'Ejecuta "npm run crear-env" en la carpeta ovilla para generar una automáticamente.'
    );
  }
  return secret;
}

// ---------------------------------------------------------------------------
// Política de contraseñas
// ---------------------------------------------------------------------------
export const REGLAS_PASSWORD = [
  { id: 'largo', texto: 'Al menos 10 caracteres', ok: (p) => p.length >= 10 },
  { id: 'minuscula', texto: 'Una letra minúscula', ok: (p) => /[a-záéíóúñü]/.test(p) },
  { id: 'mayuscula', texto: 'Una letra mayúscula', ok: (p) => /[A-ZÁÉÍÓÚÑÜ]/.test(p) },
  { id: 'numero', texto: 'Un número', ok: (p) => /\d/.test(p) },
  { id: 'simbolo', texto: 'Un símbolo (por ejemplo ! # $ % & * ?)', ok: (p) => /[^A-Za-z0-9áéíóúñüÁÉÍÓÚÑÜ\s]/.test(p) },
];

// Devuelve un mensaje de error o null si la contraseña es válida
export function validarPassword(password, { email = '', nombre = '' } = {}) {
  const p = String(password || '');
  // bcrypt solo usa los primeros 72 bytes; más que eso daría una falsa sensación de seguridad
  if (Buffer.byteLength(p, 'utf8') > 72) return 'La contraseña no puede tener más de 72 caracteres.';
  const faltan = REGLAS_PASSWORD.filter((r) => !r.ok(p)).map((r) => r.texto.toLowerCase());
  if (faltan.length) return `La contraseña debe tener: ${faltan.join(', ')}.`;

  const minus = p.toLowerCase();
  const usuarioCorreo = String(email).split('@')[0].toLowerCase();
  if (usuarioCorreo.length >= 4 && minus.includes(usuarioCorreo)) return 'La contraseña no puede contener tu correo.';
  const partesNombre = String(nombre).toLowerCase().split(/\s+/).filter((x) => x.length >= 4);
  if (partesNombre.some((n) => minus.includes(n))) return 'La contraseña no puede contener tu nombre.';
  if (/(.)\1{3,}/.test(p)) return 'La contraseña no puede repetir el mismo carácter 4 veces seguidas.';
  return null;
}

// ---------------------------------------------------------------------------
// Bloqueo temporal por intentos fallidos de inicio de sesión
// ---------------------------------------------------------------------------
export const MAX_FALLOS = 5; // intentos fallidos permitidos…
export const VENTANA_MIN = 15; // …dentro de esta ventana de minutos
export const BLOQUEO_MIN = 15; // minutos de bloqueo al superar el límite

// Si la cuenta está bloqueada devuelve los minutos que faltan; si no, 0
export async function minutosBloqueado(email) {
  const fila = await queryOne(
    `SELECT CEIL(EXTRACT(EPOCH FROM (bloqueado_hasta - NOW())) / 60)::int AS minutos
     FROM intentos_login WHERE email = $1 AND bloqueado_hasta > NOW()`,
    [email]
  );
  return fila ? Math.max(fila.minutos, 1) : 0;
}

// Registra un fallo de forma atómica. Devuelve { restantes, bloqueado }
export async function registrarFallo(email) {
  const fila = await queryOne(
    `INSERT INTO intentos_login (email, fallos, ultimo_fallo)
     VALUES ($1, 1, NOW())
     ON CONFLICT (email) DO UPDATE SET
       fallos = CASE
         WHEN intentos_login.bloqueado_hasta IS NOT NULL
           OR intentos_login.ultimo_fallo < NOW() - make_interval(mins => $2) THEN 1
         ELSE intentos_login.fallos + 1
       END,
       ultimo_fallo = NOW(),
       bloqueado_hasta = NULL
     RETURNING fallos`,
    [email, VENTANA_MIN]
  );

  if (fila.fallos >= MAX_FALLOS) {
    await query(
      'UPDATE intentos_login SET bloqueado_hasta = NOW() + make_interval(mins => $2) WHERE email = $1',
      [email, BLOQUEO_MIN]
    );
    return { restantes: 0, bloqueado: true };
  }
  return { restantes: MAX_FALLOS - fila.fallos, bloqueado: false };
}

export async function limpiarFallos(email) {
  await query('DELETE FROM intentos_login WHERE email = $1', [email]);
}

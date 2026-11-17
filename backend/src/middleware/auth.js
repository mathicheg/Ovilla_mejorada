// Verificación de sesión (token JWT) y permisos
import jwt from 'jsonwebtoken';
import { queryOne } from '../db.js';
import { obtenerJwtSecret } from '../seguridad.js';

const OPCIONES = { algorithm: 'HS256', issuer: 'ovilla-api', audience: 'ovilla-web' };
const DURACION = '1d';

// El token solo lleva el id del usuario (sub). El ROL NO va en el token: se consulta en la base
// de datos en cada petición, así nadie puede darse permisos de dueño modificando su token.
export function crearToken(usuario) {
  return jwt.sign({}, obtenerJwtSecret(), { ...OPCIONES, subject: String(usuario.id), expiresIn: DURACION });
}

async function leerUsuario(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;

  let payload;
  try {
    // Solo se acepta HS256 firmado con nuestra clave, emitido por nuestra API y no vencido
    payload = jwt.verify(token, obtenerJwtSecret(), {
      algorithms: [OPCIONES.algorithm],
      issuer: OPCIONES.issuer,
      audience: OPCIONES.audience,
    });
  } catch {
    return null;
  }

  const id = Number(payload.sub);
  if (!Number.isInteger(id) || id <= 0) return null;
  return queryOne('SELECT id, nombre, email, rol, creado_en FROM usuarios WHERE id = $1', [id]);
}

// Agrega req.usuario si hay sesión, pero deja pasar igual (para el catálogo público)
export async function sesionOpcional(req, _res, next) {
  req.usuario = await leerUsuario(req);
  next();
}

// Exige haber iniciado sesión
export async function requiereSesion(req, res, next) {
  req.usuario = await leerUsuario(req);
  if (!req.usuario) return res.status(401).json({ error: 'Debes iniciar sesión.' });
  next();
}

// Exige ser el dueño. El rol se lee de la base de datos en CADA petición (no del token).
export async function requiereAdmin(req, res, next) {
  req.usuario = await leerUsuario(req);
  if (!req.usuario) return res.status(401).json({ error: 'Debes iniciar sesión.' });
  if (req.usuario.rol !== 'admin') return res.status(403).json({ error: 'No tienes permiso.' });
  next();
}

// Rutas de registro, inicio de sesión y usuario actual
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { queryOne } from '../db.js';
import { crearToken, requiereSesion } from '../middleware/auth.js';
import { validarPassword, minutosBloqueado, registrarFallo, limpiarFallos } from '../seguridad.js';

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COSTO_BCRYPT = 12;
// Hash falso para comparar cuando el correo no existe: así la respuesta tarda lo mismo
// y un atacante no puede saber qué correos están registrados midiendo el tiempo.
const HASH_FALSO = bcrypt.hashSync('contraseña-inexistente-ovilla', COSTO_BCRYPT);

// Límite por dirección IP (frena a quien prueba muchos correos distintos desde un mismo equipo)
const limitePorIp = (max) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Demasiadas solicitudes desde tu conexión. Espera unos minutos e inténtalo otra vez.' },
  });

function usuarioPublico(u) {
  return { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol, creado_en: u.creado_en };
}

// POST /api/auth/registro
router.post('/registro', limitePorIp(10), async (req, res) => {
  const nombre = String(req.body?.nombre || '').trim().slice(0, 120);
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (nombre.length < 2) return res.status(400).json({ error: 'Escribe tu nombre.' });
  if (email.length > 160 || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'El correo no es válido.' });
  const errorPassword = validarPassword(password, { email, nombre });
  if (errorPassword) return res.status(400).json({ error: errorPassword });

  if (await queryOne('SELECT id FROM usuarios WHERE email = $1', [email])) {
    return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
  }

  const hash = await bcrypt.hash(password, COSTO_BCRYPT);
  // El rol siempre es 'cliente': aunque alguien envíe "rol":"admin" en la petición, se ignora
  const usuario = await queryOne(
    "INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES ($1, $2, $3, 'cliente') RETURNING *",
    [nombre, email, hash]
  );

  res.status(201).json({ token: crearToken(usuario), usuario: usuarioPublico(usuario) });
});

// POST /api/auth/login
router.post('/login', limitePorIp(30), async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase().slice(0, 160);
  const password = String(req.body?.password || '');
  if (!email || !password) return res.status(400).json({ error: 'Escribe tu correo y contraseña.' });

  // 1) ¿La cuenta está bloqueada temporalmente?
  const minutos = await minutosBloqueado(email);
  if (minutos) {
    return res.status(429).json({
      error: `Demasiados intentos fallidos. Por seguridad, la cuenta está bloqueada. Inténtalo de nuevo en ${minutos} minuto${minutos === 1 ? '' : 's'}.`,
    });
  }

  // 2) Verificar credenciales (siempre se ejecuta bcrypt, exista o no el correo)
  const usuario = await queryOne('SELECT * FROM usuarios WHERE email = $1', [email]);
  const correcta = await bcrypt.compare(password, usuario ? usuario.password_hash : HASH_FALSO);

  if (!usuario || !correcta) {
    const { restantes, bloqueado } = await registrarFallo(email);
    if (bloqueado) {
      return res.status(429).json({
        error: 'Demasiados intentos fallidos. Por seguridad, la cuenta quedó bloqueada durante 15 minutos.',
      });
    }
    return res.status(401).json({
      error: `Correo o contraseña incorrectos. Te ${restantes === 1 ? 'queda 1 intento' : `quedan ${restantes} intentos`} antes del bloqueo temporal.`,
    });
  }

  // 3) Éxito: se reinicia el contador
  await limpiarFallos(email);
  res.json({ token: crearToken(usuario), usuario: usuarioPublico(usuario) });
});

// GET /api/auth/yo  -> datos del usuario con sesión activa
router.get('/yo', requiereSesion, (req, res) => {
  res.json({ usuario: req.usuario });
});

export default router;

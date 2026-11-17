// Proceso de compra y "Mis cursos" del cliente
import { Router } from 'express';
import crypto from 'node:crypto';
import { query, queryOne } from '../db.js';
import { requiereSesion } from '../middleware/auth.js';
import { formatearCurso } from './cursos.js';

const router = Router();
const METODOS = ['tarjeta', 'yape', 'plin'];

// POST /api/compras  { curso_id, metodo, ultimos4 }
// IMPORTANTE: es un pago SIMULADO. Para cobrar de verdad hay que conectar una pasarela
// (Mercado Pago, Culqi, Izipay, Stripe...) y registrar la compra solo cuando la pasarela confirme el pago.
router.post('/', requiereSesion, async (req, res) => {
  if (req.usuario.rol === 'admin') {
    return res.status(400).json({ error: 'El dueño ya tiene acceso a todos los cursos.' });
  }

  const cursoId = Number(req.body?.curso_id);
  const metodo = METODOS.includes(req.body?.metodo) ? req.body.metodo : 'tarjeta';
  const ultimos4 = String(req.body?.ultimos4 || '').replace(/\D/g, '').slice(-4);

  if (!Number.isInteger(cursoId)) return res.status(404).json({ error: 'Curso no encontrado.' });
  const curso = await queryOne('SELECT * FROM cursos WHERE id = $1', [cursoId]);
  if (!curso) return res.status(404).json({ error: 'Curso no encontrado.' });
  if (curso.es_gratis) return res.status(400).json({ error: 'Este curso es gratuito, no necesitas comprarlo.' });

  const referencia = `OV-${crypto.randomBytes(4).toString('hex').toUpperCase()}${ultimos4 ? '-' + ultimos4 : ''}`;

  // ON CONFLICT evita compras duplicadas aunque el cliente haga doble clic
  const compra = await queryOne(
    `INSERT INTO compras (usuario_id, curso_id, monto, metodo, referencia)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (usuario_id, curso_id) DO NOTHING
     RETURNING id`,
    [req.usuario.id, cursoId, curso.precio, metodo, referencia]
  );
  if (!compra) return res.status(409).json({ error: 'Ya compraste este curso.' });

  res.status(201).json({
    id: compra.id,
    curso_id: cursoId,
    monto: curso.precio,
    metodo,
    referencia,
    mensaje: '¡Compra realizada! El curso ya está desbloqueado.',
  });
});

// GET /api/compras/mis-cursos
// El cliente se toma SOLO del token (req.usuario.id). No existe ninguna ruta que reciba el id
// de otro usuario o de otra compra, así que nadie puede ver las compras de un tercero.
router.get('/mis-cursos', requiereSesion, async (req, res) => {
  const filas = await query(
    `SELECT c.id, c.titulo, c.descripcion, c.autor, c.precio, c.es_gratis, c.imagen,
            c.nivel, c.duracion, c.categoria_id, c.creado_en,
            cat.nombre AS categoria, cat.slug AS categoria_slug,
            (SELECT COUNT(*) FROM lecciones l WHERE l.curso_id = c.id) AS total_lecciones,
            co.creado_en AS fecha_compra, co.monto AS monto_pagado, co.referencia
     FROM compras co
     JOIN cursos c ON c.id = co.curso_id
     LEFT JOIN categorias cat ON cat.id = c.categoria_id
     WHERE co.usuario_id = $1
     ORDER BY co.creado_en DESC, co.id DESC`,
    [req.usuario.id]
  );

  const compradas = new Set(filas.map((f) => f.id));
  res.json(filas.map((f) => formatearCurso(f, compradas)));
});

export default router;

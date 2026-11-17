// Catálogo público de cursos y categorías
import { Router } from 'express';
import { query, queryOne, escaparLike } from '../db.js';
import { sesionOpcional } from '../middleware/auth.js';

const router = Router();

const SELECT_CURSO = `
  SELECT c.id, c.titulo, c.descripcion, c.autor, c.precio, c.es_gratis, c.imagen,
         c.nivel, c.duracion, c.categoria_id, c.creado_en,
         cat.nombre AS categoria, cat.slug AS categoria_slug,
         (SELECT COUNT(*) FROM lecciones l WHERE l.curso_id = c.id) AS total_lecciones
  FROM cursos c
  LEFT JOIN categorias cat ON cat.id = c.categoria_id
`;

// ¿El usuario puede ver el contenido de este curso? (se decide SIEMPRE en el servidor)
// Gratis → todos. De pago → solo el dueño o un cliente con una compra registrada de ESE curso.
export async function tieneAcceso(usuario, curso) {
  if (curso.es_gratis) return true;
  if (!usuario) return false;
  if (usuario.rol === 'admin') return true;
  return !!(await queryOne('SELECT 1 FROM compras WHERE usuario_id = $1 AND curso_id = $2', [usuario.id, curso.id]));
}

async function comprasDe(usuario) {
  if (!usuario) return new Set();
  const filas = await query('SELECT curso_id FROM compras WHERE usuario_id = $1', [usuario.id]);
  return new Set(filas.map((f) => f.curso_id));
}

export function formatearCurso(c, compradas = new Set()) {
  return { ...c, comprado: compradas.has(c.id) };
}

// GET /api/categorias
router.get('/categorias', async (_req, res) => {
  const categorias = await query(`
    SELECT cat.id, cat.nombre, cat.slug, cat.icono, COUNT(c.id) AS total
    FROM categorias cat
    LEFT JOIN cursos c ON c.categoria_id = cat.id
    GROUP BY cat.id
    ORDER BY cat.id
  `);
  res.json(categorias);
});

// GET /api/cursos?q=texto&categoria=slug&tipo=gratis|pago
router.get('/cursos', sesionOpcional, async (req, res) => {
  const filtros = [];
  const valores = [];

  // Solo se agregan al SQL fragmentos fijos ("c.titulo ILIKE $1"); el texto del usuario
  // viaja siempre como parámetro en "valores", nunca dentro de la consulta.
  const q = String(req.query.q || '').trim().slice(0, 100);
  if (q) {
    valores.push(`%${escaparLike(q)}%`);
    filtros.push(`c.titulo ILIKE $${valores.length}`);
  }
  if (req.query.categoria) {
    valores.push(String(req.query.categoria));
    filtros.push(`cat.slug = $${valores.length}`);
  }
  if (req.query.tipo === 'gratis') filtros.push('c.es_gratis = TRUE');
  if (req.query.tipo === 'pago') filtros.push('c.es_gratis = FALSE');

  const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';
  const cursos = await query(`${SELECT_CURSO} ${where} ORDER BY c.creado_en DESC, c.id DESC`, valores);

  const compradas = await comprasDe(req.usuario);
  res.json(cursos.map((c) => formatearCurso(c, compradas)));
});

// GET /api/cursos/:id  -> detalle; el contenido de las lecciones solo si tiene acceso
router.get('/cursos/:id', sesionOpcional, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'Curso no encontrado.' });

  const curso = await queryOne(`${SELECT_CURSO} WHERE c.id = $1`, [id]);
  if (!curso) return res.status(404).json({ error: 'Curso no encontrado.' });

  // Sin compra, el servidor solo envía el título de cada lección: el texto y el video
  // nunca salen de la base de datos, así que no se pueden ver ni manipulando el navegador.
  const acceso = await tieneAcceso(req.usuario, curso);
  const lecciones = (
    await query('SELECT id, orden, titulo, contenido, video_url FROM lecciones WHERE curso_id = $1 ORDER BY orden, id', [curso.id])
  ).map((l) => (acceso ? l : { id: l.id, orden: l.orden, titulo: l.titulo, bloqueada: true }));

  res.json({ ...formatearCurso(curso, await comprasDe(req.usuario)), acceso, lecciones });
});

export default router;

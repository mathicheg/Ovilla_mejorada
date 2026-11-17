// Panel del dueño: resumen, gestión de cursos, imágenes y clientes
import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { query, queryOne, transaction, escaparLike } from '../db.js';
import { requiereAdmin } from '../middleware/auth.js';

const router = Router();
// TODAS las rutas de este archivo pasan primero por requiereAdmin, que vuelve a leer el rol
// desde la base de datos en cada petición (crear, editar, eliminar, subir imagen, ver clientes…)
router.use(requiereAdmin);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_DIR = path.join(__dirname, '..', '..', 'public', 'uploads');

// ---------- Subida de imágenes de portada ----------
// La extensión del archivo guardado se decide aquí según el tipo, nunca según el nombre
// que envía el navegador (evita que se suba un .html o .js disfrazado de imagen).
const EXTENSIONES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (_req, file, cb) => {
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${EXTENSIONES[file.mimetype]}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ok = Boolean(EXTENSIONES[file.mimetype]);
    cb(ok ? null : new Error('Solo se permiten imágenes JPG, PNG, WEBP o GIF.'), ok);
  },
});

// POST /api/admin/imagen  (campo "imagen")
router.post('/imagen', (req, res) => {
  upload.single('imagen')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'La imagen pesa más de 5 MB.' : err.message });
    if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen.' });
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});

// ---------- Resumen ----------
router.get('/resumen', async (_req, res) => {
  const totales = await queryOne(`
    SELECT
      (SELECT COUNT(*) FROM cursos)                              AS cursos,
      (SELECT COUNT(*) FROM cursos WHERE es_gratis = FALSE)      AS cursos_pago,
      (SELECT COUNT(*) FROM usuarios WHERE rol = 'cliente')      AS clientes,
      (SELECT COUNT(*) FROM compras)                             AS ventas,
      (SELECT COALESCE(SUM(monto), 0) FROM compras)              AS ingresos
  `);
  const ultimas_ventas = await query(`
    SELECT co.id, co.monto, co.creado_en, co.referencia, u.nombre AS cliente, c.titulo AS curso
    FROM compras co
    JOIN usuarios u ON u.id = co.usuario_id
    JOIN cursos c ON c.id = co.curso_id
    ORDER BY co.creado_en DESC, co.id DESC
    LIMIT 8
  `);
  res.json({ ...totales, ultimas_ventas });
});

// ---------- Cursos ----------
function validarCurso(body) {
  const titulo = String(body?.titulo || '').trim();
  const autor = String(body?.autor || '').trim();
  const es_gratis = Boolean(body?.es_gratis);
  const precio = es_gratis ? 0 : Number(body?.precio);

  if (titulo.length < 3) return { error: 'El título debe tener al menos 3 caracteres.' };
  if (!autor) return { error: 'Indica el autor del curso.' };
  if (!es_gratis && (!Number.isFinite(precio) || precio <= 0)) return { error: 'Un curso de pago necesita un precio mayor a 0.' };

  const lecciones = (Array.isArray(body?.lecciones) ? body.lecciones : [])
    .map((l) => ({
      titulo: String(l?.titulo || '').trim(),
      contenido: String(l?.contenido || '').trim(),
      video_url: String(l?.video_url || '').trim(),
    }))
    .filter((l) => l.titulo)
    .map((l, i) => ({ ...l, orden: i + 1 }));

  return {
    datos: {
      titulo,
      autor,
      es_gratis,
      precio: Math.round(precio * 100) / 100,
      descripcion: String(body?.descripcion || '').trim(),
      imagen: String(body?.imagen || '').trim(),
      nivel: String(body?.nivel || 'Principiante').trim(),
      duracion: String(body?.duracion || '').trim(),
      categoria_id: body?.categoria_id ? Number(body.categoria_id) : null,
    },
    lecciones,
  };
}

async function guardarLecciones(client, cursoId, lecciones) {
  await client.query('DELETE FROM lecciones WHERE curso_id = $1', [cursoId]);
  for (const l of lecciones) {
    await client.query(
      'INSERT INTO lecciones (curso_id, orden, titulo, contenido, video_url) VALUES ($1, $2, $3, $4, $5)',
      [cursoId, l.orden, l.titulo, l.contenido, l.video_url]
    );
  }
}

// GET /api/admin/cursos
router.get('/cursos', async (_req, res) => {
  const cursos = await query(`
    SELECT c.*, cat.nombre AS categoria,
           (SELECT COUNT(*) FROM lecciones l WHERE l.curso_id = c.id) AS total_lecciones,
           (SELECT COUNT(*) FROM compras co WHERE co.curso_id = c.id) AS ventas,
           (SELECT COALESCE(SUM(monto), 0) FROM compras co WHERE co.curso_id = c.id) AS ingresos
    FROM cursos c
    LEFT JOIN categorias cat ON cat.id = c.categoria_id
    ORDER BY c.creado_en DESC, c.id DESC
  `);
  res.json(cursos);
});

// GET /api/admin/cursos/:id  (con lecciones completas, para editar)
router.get('/cursos/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'Curso no encontrado.' });
  const curso = await queryOne('SELECT * FROM cursos WHERE id = $1', [id]);
  if (!curso) return res.status(404).json({ error: 'Curso no encontrado.' });
  const lecciones = await query(
    'SELECT id, orden, titulo, contenido, video_url FROM lecciones WHERE curso_id = $1 ORDER BY orden, id',
    [id]
  );
  res.json({ ...curso, lecciones });
});

// POST /api/admin/cursos
router.post('/cursos', async (req, res) => {
  const v = validarCurso(req.body);
  if (v.error) return res.status(400).json({ error: v.error });
  const d = v.datos;

  const id = await transaction(async (client) => {
    const r = await client.query(
      `INSERT INTO cursos (titulo, descripcion, autor, precio, es_gratis, imagen, nivel, duracion, categoria_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [d.titulo, d.descripcion, d.autor, d.precio, d.es_gratis, d.imagen, d.nivel, d.duracion, d.categoria_id]
    );
    const nuevoId = r.rows[0].id;
    await guardarLecciones(client, nuevoId, v.lecciones);
    return nuevoId;
  });

  res.status(201).json({ id, mensaje: 'Curso creado.' });
});

// PUT /api/admin/cursos/:id
router.put('/cursos/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || !(await queryOne('SELECT id FROM cursos WHERE id = $1', [id]))) {
    return res.status(404).json({ error: 'Curso no encontrado.' });
  }
  const v = validarCurso(req.body);
  if (v.error) return res.status(400).json({ error: v.error });
  const d = v.datos;

  await transaction(async (client) => {
    await client.query(
      `UPDATE cursos SET titulo = $1, descripcion = $2, autor = $3, precio = $4, es_gratis = $5,
              imagen = $6, nivel = $7, duracion = $8, categoria_id = $9
       WHERE id = $10`,
      [d.titulo, d.descripcion, d.autor, d.precio, d.es_gratis, d.imagen, d.nivel, d.duracion, d.categoria_id, id]
    );
    await guardarLecciones(client, id, v.lecciones);
  });

  res.json({ id, mensaje: 'Curso actualizado.' });
});

// DELETE /api/admin/cursos/:id
router.delete('/cursos/:id', async (req, res) => {
  const id = Number(req.params.id);
  const borrado = Number.isInteger(id) ? await queryOne('DELETE FROM cursos WHERE id = $1 RETURNING id', [id]) : null;
  if (!borrado) return res.status(404).json({ error: 'Curso no encontrado.' });
  res.json({ mensaje: 'Curso eliminado.' });
});

// ---------- Clientes ----------
// GET /api/admin/clientes?q=texto
router.get('/clientes', async (req, res) => {
  const q = `%${escaparLike(String(req.query.q || '').trim().slice(0, 100))}%`; // va como parámetro $1
  const clientes = await query(
    `SELECT u.id, u.nombre, u.email, u.creado_en,
            COUNT(co.id) AS cursos_comprados,
            COALESCE(SUM(co.monto), 0) AS total_gastado,
            COALESCE(
              json_agg(
                json_build_object('id', co.id, 'monto', co.monto, 'creado_en', co.creado_en,
                                  'referencia', co.referencia, 'curso', c.titulo)
                ORDER BY co.creado_en DESC
              ) FILTER (WHERE co.id IS NOT NULL),
              '[]'
            ) AS compras
     FROM usuarios u
     LEFT JOIN compras co ON co.usuario_id = u.id
     LEFT JOIN cursos c ON c.id = co.curso_id
     WHERE u.rol = 'cliente' AND (u.nombre ILIKE $1 OR u.email ILIKE $1)
     GROUP BY u.id
     ORDER BY u.creado_en DESC, u.id DESC`,
    [q]
  );
  res.json(clientes);
});

export default router;

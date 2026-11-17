// Conexión a PostgreSQL
// SEGURIDAD: todas las consultas del proyecto usan parámetros ($1, $2…). Los datos del usuario
// NUNCA se pegan dentro del texto SQL; el driver "pg" los envía por separado al servidor.
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_DIR = path.join(__dirname, '..', 'database');

// PostgreSQL devuelve los números grandes y decimales como texto; aquí los convertimos a número
pg.types.setTypeParser(20, (v) => parseInt(v, 10)); // COUNT(*), BIGINT
pg.types.setTypeParser(1700, (v) => parseFloat(v)); // NUMERIC (precios)

const DB_NAME = process.env.DB_NAME || 'ovilla';
// El nombre de la base no puede ir como parámetro en CREATE DATABASE, así que solo se aceptan
// letras, números y guion bajo (evita inyección SQL aunque alguien edite el .env)
if (!/^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(DB_NAME)) {
  throw new Error('DB_NAME solo puede contener letras, números y guion bajo.');
}

function configuracion(database = DB_NAME) {
  // En servicios de hosting (Render, Railway…) suele venir una sola URL de conexión
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    };
  }
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database,
  };
}

export const pool = new pg.Pool(configuracion());

// Ejecuta una consulta parametrizada. Uso: await query('SELECT * FROM cursos WHERE id = $1', [id])
export async function query(sql, params = []) {
  const r = await pool.query(sql, params);
  return r.rows;
}

// Devuelve solo la primera fila (o null)
export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

// Ejecuta varias operaciones juntas: si una falla, se deshacen todas
export async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Escapa los comodines de LIKE/ILIKE (% y _) para que el buscador los trate como texto normal
export function escaparLike(texto) {
  return String(texto).replace(/[\\%_]/g, '\\$&');
}

// Crea la base de datos si todavía no existe (solo en instalación local)
async function crearBaseSiNoExiste() {
  if (process.env.DATABASE_URL) return;
  const admin = new pg.Client(configuracion('postgres'));
  await admin.connect();
  try {
    const existe = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [DB_NAME]);
    if (!existe.rowCount) {
      await admin.query(`CREATE DATABASE "${DB_NAME}"`); // DB_NAME ya fue validado arriba
      console.log(`✔ Base de datos "${DB_NAME}" creada en PostgreSQL`);
    }
  } finally {
    await admin.end();
  }
}

const leerSql = (archivo) => fs.readFileSync(path.join(DB_DIR, archivo), 'utf8');

// Prepara todo al iniciar: crea la base y las tablas con datos de ejemplo si no existen
export async function initDatabase({ reset = false } = {}) {
  try {
    await crearBaseSiNoExiste();
    const { rows } = await pool.query("SELECT to_regclass('public.usuarios') AS tabla");
    if (reset || !rows[0].tabla) {
      await pool.query(leerSql('schema.sql'));
      await pool.query(leerSql('seed.sql'));
      console.log(reset ? '✔ Base de datos reiniciada con datos de ejemplo' : '✔ Tablas creadas con datos de ejemplo');
    }
    // Actualiza bases creadas con versiones anteriores (seguro de repetir)
    await pool.query(leerSql('migraciones.sql'));
  } catch (err) {
    console.error('\n✖ No se pudo conectar a PostgreSQL.');
    if (err.code === '28P01') console.error('  La contraseña de PostgreSQL es incorrecta. Revisa DB_PASSWORD en backend/.env');
    else if (err.code === 'ECONNREFUSED') console.error('  PostgreSQL no está encendido o el puerto no es correcto (DB_PORT en backend/.env).');
    else if (/password must be a string/i.test(err.message)) console.error('  Falta la contraseña: escribe DB_PASSWORD en backend/.env');
    else console.error('  Detalle:', err.message);
    console.error('');
    throw err;
  }
}

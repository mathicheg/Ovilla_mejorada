// Reinicia la base de datos: borra todo y vuelve a cargar los datos de ejemplo.
// Uso (desde la carpeta ovilla): npm run reiniciar-db
import 'dotenv/config';
import { initDatabase, pool } from '../src/db.js';

try {
  await initDatabase({ reset: true });
} catch {
  process.exitCode = 1;
} finally {
  await pool.end();
}

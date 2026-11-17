// Crea una cuenta de dueño (admin) o cambia su contraseña si el correo ya existe.
// Uso (desde la carpeta ovilla):
//   npm run crear-admin -- tucorreo@ejemplo.com "TuContraseña#Segura1" "Tu Nombre"
// (pon la contraseña entre comillas si tiene símbolos)
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { initDatabase, pool, queryOne, query } from '../src/db.js';
import { validarPassword, limpiarFallos } from '../src/seguridad.js';

const [email, password, ...resto] = process.argv.slice(2);
const nombre = resto.join(' ').trim() || 'Dueño';

if (!email || !password) {
  console.log('Uso: npm run crear-admin -- correo "contraseña" "Nombre"');
  process.exit(1);
}

const correo = email.trim().toLowerCase();
const errorPassword = validarPassword(password, { email: correo, nombre });
if (errorPassword) {
  console.log(`✖ ${errorPassword}`);
  process.exit(1);
}

try {
  await initDatabase();
  const hash = await bcrypt.hash(password, 12);
  const existe = await queryOne('SELECT id FROM usuarios WHERE email = $1', [correo]);

  if (existe) {
    await query("UPDATE usuarios SET password_hash = $1, rol = 'admin' WHERE id = $2", [hash, existe.id]);
    console.log(`✔ Se actualizó la contraseña de ${correo} y ahora es dueño (admin).`);
  } else {
    await query("INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES ($1, $2, $3, 'admin')", [nombre, correo, hash]);
    console.log(`✔ Cuenta de dueño creada: ${correo}`);
  }
  await limpiarFallos(correo); // por si estaba bloqueada
} catch {
  process.exitCode = 1;
} finally {
  await pool.end();
}

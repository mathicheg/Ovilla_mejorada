// Requisitos de contraseña (mismos que valida el servidor en backend/src/seguridad.js).
// El servidor es quien decide; esto solo ayuda al usuario a ver qué le falta mientras escribe.
export const REGLAS_PASSWORD = [
  { id: 'largo', texto: 'Al menos 10 caracteres', ok: (p) => p.length >= 10 },
  { id: 'minuscula', texto: 'Una letra minúscula', ok: (p) => /[a-záéíóúñü]/.test(p) },
  { id: 'mayuscula', texto: 'Una letra mayúscula', ok: (p) => /[A-ZÁÉÍÓÚÑÜ]/.test(p) },
  { id: 'numero', texto: 'Un número', ok: (p) => /\d/.test(p) },
  { id: 'simbolo', texto: 'Un símbolo (! # $ % & * ?)', ok: (p) => /[^A-Za-z0-9áéíóúñüÁÉÍÓÚÑÜ\s]/.test(p) },
];

export const passwordCumple = (p) => REGLAS_PASSWORD.every((r) => r.ok(p));

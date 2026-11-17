-- =========================================================
--  OVILLA - Migraciones (se ejecutan en cada inicio; son seguras de repetir)
--  Sirven para actualizar bases de datos creadas con versiones anteriores.
-- =========================================================

CREATE TABLE IF NOT EXISTS intentos_login (
  email           VARCHAR(160) PRIMARY KEY,
  fallos          INTEGER     NOT NULL DEFAULT 0,
  ultimo_fallo    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  bloqueado_hasta TIMESTAMPTZ
);

-- =========================================================
--  OVILLA - Estructura de la base de datos (PostgreSQL)
-- =========================================================

DROP TABLE IF EXISTS intentos_login CASCADE;
DROP TABLE IF EXISTS compras CASCADE;
DROP TABLE IF EXISTS lecciones CASCADE;
DROP TABLE IF EXISTS cursos CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- Usuarios: clientes y el dueño (rol 'admin')
CREATE TABLE usuarios (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(120) NOT NULL,
  email         VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  rol           VARCHAR(10)  NOT NULL DEFAULT 'cliente' CHECK (rol IN ('cliente', 'admin')),
  creado_en     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Categorías que aparecen en la barra lateral
CREATE TABLE categorias (
  id     SERIAL PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL UNIQUE,
  slug   VARCHAR(80) NOT NULL UNIQUE,
  icono  VARCHAR(10) NOT NULL DEFAULT '🧶'
);

-- Cursos (gratuitos o de pago)
CREATE TABLE cursos (
  id           SERIAL PRIMARY KEY,
  titulo       VARCHAR(200)  NOT NULL,
  descripcion  TEXT          NOT NULL DEFAULT '',
  autor        VARCHAR(120)  NOT NULL,
  precio       NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (precio >= 0),
  es_gratis    BOOLEAN       NOT NULL DEFAULT FALSE,
  imagen       TEXT          NOT NULL DEFAULT '',
  nivel        VARCHAR(30)   NOT NULL DEFAULT 'Principiante',
  duracion     VARCHAR(40)   NOT NULL DEFAULT '',
  categoria_id INTEGER       REFERENCES categorias(id) ON DELETE SET NULL,
  creado_en    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Lecciones de cada curso (el contenido que se desbloquea)
CREATE TABLE lecciones (
  id        SERIAL PRIMARY KEY,
  curso_id  INTEGER      NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  orden     INTEGER      NOT NULL DEFAULT 1,
  titulo    VARCHAR(200) NOT NULL,
  contenido TEXT         NOT NULL DEFAULT '',
  video_url TEXT         NOT NULL DEFAULT ''
);

-- Compras: qué cliente compró qué curso
CREATE TABLE compras (
  id         SERIAL PRIMARY KEY,
  usuario_id INTEGER       NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  curso_id   INTEGER       NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
  monto      NUMERIC(10,2) NOT NULL,
  metodo     VARCHAR(20)   NOT NULL DEFAULT 'tarjeta',
  referencia VARCHAR(40)   NOT NULL DEFAULT '',
  creado_en  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (usuario_id, curso_id)
);

-- Intentos fallidos de inicio de sesión (para bloquear ataques de fuerza bruta)
CREATE TABLE intentos_login (
  email           VARCHAR(160) PRIMARY KEY,
  fallos          INTEGER     NOT NULL DEFAULT 0,
  ultimo_fallo    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  bloqueado_hasta TIMESTAMPTZ
);

CREATE INDEX idx_cursos_categoria ON cursos(categoria_id);
CREATE INDEX idx_lecciones_curso  ON lecciones(curso_id);
CREATE INDEX idx_compras_usuario  ON compras(usuario_id);

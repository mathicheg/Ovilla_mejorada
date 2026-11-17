# Ovilla · Plataforma de cursos de crochet

Tienda online de cursos de crochet con catálogo, buscador, categorías, cuentas de usuario,
cursos gratuitos y de pago, proceso de compra, "Mis cursos" y un panel para el dueño.

- **Frontend:** React 19 + Vite + React Router
- **Backend:** Node.js + Express
- **Base de datos:** PostgreSQL (librería `pg`)

---

## 1. Instalación (solo la primera vez)

### Paso 1 — Instala Node.js
1. Entra a https://nodejs.org y descarga la versión **LTS** (botón verde). Se necesita la versión **20 o mayor**.
2. Instálalo con las opciones por defecto (Siguiente, Siguiente…).
3. Para comprobar, abre una terminal y escribe:
   ```
   node -v
   ```
   Debe mostrar algo como `v22.x.x` o mayor.

> **¿Cómo abro una terminal?**
> - **Windows:** abre la carpeta del proyecto en el Explorador, haz clic en la barra de direcciones, escribe `cmd` y presiona Enter.
> - **Mac:** abre la app *Terminal*, escribe `cd ` (con espacio) y arrastra la carpeta del proyecto a la ventana; presiona Enter.

### Paso 2 — Instala PostgreSQL
1. Entra a https://www.postgresql.org/download/ y elige tu sistema (Windows o macOS).
   Descarga el instalador de **EDB** (versión 16 o mayor).
2. Durante la instalación:
   - Deja marcados **PostgreSQL Server**, **pgAdmin 4** y **Command Line Tools**.
   - Te pedirá una **contraseña para el usuario `postgres`**. Escríbela y **anótala**: la necesitarás en el Paso 5.
   - Deja el puerto en **5432**.
   - Al final, si aparece *Stack Builder*, puedes cerrarlo (no hace falta).
3. PostgreSQL queda encendido automáticamente cada vez que prendes la computadora.

> No tienes que crear la base de datos a mano: la página crea la base `ovilla`, sus tablas y los
> datos de ejemplo la primera vez que la ejecutas.

### Paso 3 — Descomprime el proyecto
Descomprime `ovilla.zip` en una carpeta, por ejemplo `Documentos/ovilla`.

### Paso 4 — Instala las dependencias
Con la terminal abierta **dentro de la carpeta `ovilla`**, escribe:
```
npm run instalar
```
Tarda 1–2 minutos. Descarga las librerías del frontend y del backend, y crea el archivo de
configuración `backend/.env` con una **clave secreta aleatoria** (`JWT_SECRET`) ya generada.

### Paso 5 — Escribe tu contraseña de PostgreSQL
Abre el archivo `backend/.env` con el Bloc de notas (o cualquier editor de texto) y cambia esta línea
por la contraseña que anotaste en el Paso 2:
```
DB_PASSWORD=escribe-aqui-tu-contraseña-de-postgres
```
Por ejemplo: `DB_PASSWORD=MiClave2026`. Guarda el archivo.
**No toques `JWT_SECRET`**: ya se generó sola y es secreta (no la compartas ni la subas a internet).

---

## 2. Ejecutar la página

En la terminal, dentro de la carpeta `ovilla`:
```
npm run dev
```
Espera a ver estos mensajes:
```
[API] ✔ Base de datos "ovilla" creada en PostgreSQL      ← solo la primera vez
[API] ✔ Tablas creadas con datos de ejemplo              ← solo la primera vez
[API] ✔ API de Ovilla funcionando en http://localhost:4000
[WEB]   ➜  Local:   http://localhost:5173/
```
Abre tu navegador en **http://localhost:5173**

Para detenerla presiona `Ctrl + C` en la terminal.

La primera vez se crea sola la base de datos con 9 cursos de ejemplo.
Si quieres ver las tablas por dentro, abre **pgAdmin 4** → Servers → PostgreSQL → Databases → `ovilla` → Schemas → public → Tables.

### Usuarios de prueba
| Rol | Correo | Contraseña |
|---|---|---|
| Dueño (panel de administración) | admin@ovilla.pe | Admin#Ovilla2026 |
| Cliente (ya compró un curso) | cliente@ovilla.pe | Cliente#Ovilla2026 |

> **Importante:** antes de publicar la página, crea tu propia cuenta de dueño (ver sección 6).

### Comandos útiles
| Comando | Para qué sirve |
|---|---|
| `npm run instalar` | Instala todo (solo la primera vez o si borras `node_modules`) |
| `npm run dev` | Inicia la página en modo desarrollo |
| `npm run crear-admin -- correo "Clave#Segura1" "Nombre"` | Crea tu cuenta de dueño o cambia su contraseña (también la desbloquea) |
| `npm run crear-env` | Crea `backend/.env` y genera la clave secreta si falta |
| `npm run crear-env -- --rotar` | Genera una clave secreta nueva (cierra la sesión de todos) |
| `npm run reiniciar-db` | Borra **todas** las tablas y vuelve a cargar los datos de ejemplo (¡se pierden ventas y clientes!) |
| `npm run build` y luego `npm start` | Versión final optimizada, todo en http://localhost:4000 |

---

## 3. Qué puede hacer cada usuario

**Visitante (sin cuenta)**
- Ver el catálogo, buscar por nombre, filtrar por categoría y por gratis/de pago.
- Ver y estudiar los cursos gratuitos.
- Ver el temario de los cursos de pago (con las lecciones bloqueadas 🔒).

**Cliente registrado**
- Todo lo anterior + comprar cursos de pago (tarjeta, Yape o Plin).
- Página **Mis cursos** con todos los cursos que compró.

**Dueño (admin)**
- **Resumen:** ingresos, ventas, clientes y últimas compras.
- **Cursos:** crear, editar y eliminar cursos; subir la imagen de portada desde tu computadora;
  agregar, ordenar y quitar lecciones (con enlace de YouTube/Vimeo y texto).
- **Clientes:** lista de clientes registrados, buscador, cuántos cursos compró cada uno y cuánto gastó.
- Ve todos los cursos de pago sin comprarlos.

---

## 4. Estructura de carpetas

```
ovilla/
├── package.json              ← Comandos generales (instalar, dev, build…)
├── README.md                 ← Este archivo
├── .gitignore                ← Archivos que no se suben a Git
│
├── backend/                  ← SERVIDOR (API + base de datos)
│   ├── package.json          ← Librerías del backend
│   ├── .env.example          ← Plantilla de configuración (contraseña de PostgreSQL, clave secreta)
│   ├── .env                  ← Tu configuración real (se crea con npm run instalar)
│   ├── database/
│   │   ├── schema.sql        ← Script PostgreSQL que crea las tablas
│   │   ├── seed.sql          ← Script PostgreSQL con datos de ejemplo (cursos, usuarios, lecciones)
│   │   └── migraciones.sql   ← Actualiza bases creadas con versiones anteriores (se ejecuta solo)
│   ├── public/
│   │   ├── covers/           ← Portadas de los cursos de ejemplo
│   │   └── uploads/          ← Imágenes que subes desde el panel del dueño
│   ├── scripts/
│   │   ├── crear-env.js      ← Crea el .env y genera la clave secreta JWT aleatoria
│   │   ├── init-db.js        ← Reinicia la base de datos (npm run reiniciar-db)
│   │   └── crear-admin.js    ← Crea/actualiza la cuenta del dueño (npm run crear-admin)
│   └── src/
│       ├── server.js         ← Arranca el servidor y une todas las rutas
│       ├── db.js             ← Conexión a PostgreSQL; crea la base y las tablas si no existen
│       ├── seguridad.js      ← Clave JWT, reglas de contraseña y bloqueo por intentos fallidos
│       ├── middleware/
│       │   └── auth.js       ← Revisa si hay sesión iniciada y si es el dueño
│       └── routes/
│           ├── auth.js       ← Registro, inicio de sesión, usuario actual
│           ├── cursos.js     ← Catálogo, buscador, categorías, detalle de curso
│           ├── compras.js    ← Comprar un curso y "Mis cursos"
│           └── admin.js      ← Panel del dueño: cursos, imágenes, clientes, resumen
│
└── frontend/                 ← PÁGINA WEB (lo que ve el usuario)
    ├── package.json          ← Librerías del frontend
    ├── vite.config.js        ← Configuración; conecta la web con el backend
    ├── index.html            ← Página base (título, fuentes)
    ├── public/favicon.svg    ← Ícono de la pestaña
    └── src/
        ├── main.jsx          ← Punto de inicio de React
        ├── App.jsx           ← Lista de páginas y sus direcciones (rutas)
        ├── api.js            ← Funciones que llaman al backend + formato de precios/fechas
        ├── passwordRules.js  ← Requisitos de contraseña que se muestran al registrarse
        ├── styles.css        ← Todo el diseño (colores en la parte de arriba, :root)
        ├── context/
        │   └── AuthContext.jsx   ← Guarda la sesión del usuario
        ├── components/
        │   ├── Navbar.jsx        ← Menú superior con buscador, Entrar y Registrarse
        │   ├── Logo.jsx          ← Logotipo de Ovilla
        │   ├── Footer.jsx        ← Pie de página
        │   ├── CourseCard.jsx    ← Tarjeta de curso (imagen, título, autor, precio, botón)
        │   ├── CourseImage.jsx   ← Imagen con respaldo si no carga
        │   ├── CategorySidebar.jsx ← Categorías al costado + filtro de precio
        │   ├── ProtectedRoute.jsx  ← Bloquea páginas si no hay sesión o no es dueño
        │   └── Loader.jsx        ← Animación de "Cargando…"
        └── pages/
            ├── Home.jsx          ← Página principal con catálogo
            ├── CourseDetail.jsx  ← Detalle del curso y sus lecciones
            ├── Checkout.jsx      ← Proceso de compra
            ├── MyCourses.jsx     ← Mis cursos
            ├── Login.jsx         ← Entrar
            ├── Register.jsx      ← Registrarse
            ├── NotFound.jsx      ← Página 404
            └── admin/
                ├── AdminLayout.jsx     ← Menú lateral del panel
                ├── AdminDashboard.jsx  ← Resumen de ventas
                ├── AdminCourses.jsx    ← Lista de cursos (editar/eliminar)
                ├── AdminCourseForm.jsx ← Crear/editar curso y lecciones
                └── AdminClients.jsx    ← Lista de clientes
```

### Base de datos (tablas en PostgreSQL)
| Tabla | Guarda |
|---|---|
| `usuarios` | Clientes y dueño (contraseñas cifradas con bcrypt) |
| `categorias` | Categorías de la barra lateral |
| `cursos` | Título, descripción, autor, precio, gratis/pago, imagen, nivel, categoría |
| `lecciones` | Contenido de cada curso (título, texto, video) |
| `compras` | Qué cliente compró qué curso, monto y código de compra |
| `intentos_login` | Intentos fallidos de inicio de sesión y bloqueos temporales |

Si prefieres crear la base tú mismo (por ejemplo desde pgAdmin → Query Tool), crea una base
llamada `ovilla` y ejecuta primero `backend/database/schema.sql` y luego `backend/database/seed.sql`.

### Rutas de la API
| Método | Ruta | Quién | Qué hace |
|---|---|---|---|
| POST | `/api/auth/registro` | Todos | Crear cuenta |
| POST | `/api/auth/login` | Todos | Iniciar sesión |
| GET | `/api/auth/yo` | Con sesión | Datos del usuario actual |
| GET | `/api/categorias` | Todos | Categorías con cantidad de cursos |
| GET | `/api/cursos?q=&categoria=&tipo=` | Todos | Catálogo con búsqueda y filtros |
| GET | `/api/cursos/:id` | Todos | Detalle (contenido solo si tiene acceso) |
| POST | `/api/compras` | Cliente | Comprar un curso |
| GET | `/api/compras/mis-cursos` | Cliente | Cursos comprados |
| GET | `/api/admin/resumen` | Dueño | Estadísticas |
| GET/POST | `/api/admin/cursos` | Dueño | Listar / crear cursos |
| GET/PUT/DELETE | `/api/admin/cursos/:id` | Dueño | Ver / editar / eliminar un curso |
| POST | `/api/admin/imagen` | Dueño | Subir imagen de portada |
| GET | `/api/admin/clientes?q=` | Dueño | Clientes y sus compras |

---

## 5. Seguridad

| Protección | Cómo funciona |
|---|---|
| Inyección SQL | Todas las consultas usan parámetros (`$1`, `$2`…); el texto del usuario nunca se mezcla con el SQL. Los comodines `%` y `_` del buscador se tratan como texto. |
| Contenido de pago | El servidor decide quién ve cada lección. Sin compra, solo envía el título: el texto y el video nunca salen de la base de datos. |
| Fuerza bruta | 5 contraseñas incorrectas en 15 min bloquean esa cuenta 15 min. Además, máximo 30 intentos de login y 10 registros por IP cada 15 min. |
| Contraseñas | Mínimo 10 caracteres con mayúscula, minúscula, número y símbolo; no pueden contener tu correo ni tu nombre. Se guardan cifradas con bcrypt (costo 12). |
| Acceso a datos ajenos | "Mis cursos" y las compras usan solo el usuario del token; ningún id de la URL o del formulario puede apuntar a otra persona. |
| Tokens (JWT) | Clave aleatoria de 64 caracteres en `.env` (el servidor no arranca sin ella). El token solo lleva el id y dura 1 día; el rol de dueño se consulta en la base de datos en cada acción. |
| Imágenes subidas | Solo JPG/PNG/WEBP/GIF de hasta 5 MB; la extensión la decide el servidor. |

**Si una cuenta queda bloqueada** y no quieres esperar 15 minutos: para el dueño, usa
`npm run crear-admin` (la desbloquea). Para cualquier cuenta, en pgAdmin ejecuta
`DELETE FROM intentos_login WHERE email = 'correo@ejemplo.com';`

---

## 6. Cosas importantes antes de vender de verdad

1. **Los pagos están en modo demostración.** El formulario de compra valida los datos y
   desbloquea el curso, pero **no cobra dinero**. Para cobrar de verdad hay que conectar una
   pasarela de pagos (en Perú: Mercado Pago, Culqi o Izipay). El lugar a modificar es
   `backend/src/routes/compras.js` (registrar la compra solo cuando la pasarela confirme el pago)
   y `frontend/src/pages/Checkout.jsx` (mostrar el formulario de la pasarela).
   Nunca guardes números de tarjeta en tu base de datos; el sistema actual no los envía al servidor.
2. **Crea tu propia cuenta de dueño.** Con la página detenida, en la terminal dentro de `ovilla`:
   ```
   npm run crear-admin -- tucorreo@ejemplo.com "Tu#Contraseña2026" "Tu Nombre"
   ```
   Si el correo ya existe, le cambia la contraseña y lo convierte en dueño. Úsalo también para
   cambiar la contraseña de `admin@ovilla.pe` (o crea la tuya y deja de usar esa).
3. **Protege `backend/.env`:** contiene tu contraseña de PostgreSQL y la clave `JWT_SECRET`.
   Nunca lo compartas ni lo subas a GitHub (ya está en `.gitignore`). En el hosting, copia sus
   valores en la sección *Environment variables* del proveedor.
4. **Publicarla en internet:** necesitas un servicio que ejecute Node.js (Render, Railway,
   un VPS, etc.) y una base PostgreSQL en la nube (Render, Railway, Neon o Supabase te la dan).
   Copia la URL de conexión que te entregan en `DATABASE_URL` (y `DB_SSL=true`) en `backend/.env`.
   Agrega también `TRUST_PROXY=1` y una `JWT_SECRET` propia (genera una con `npm run crear-env`
   en tu PC y copia el valor). Se ejecuta con `npm run instalar`, `npm run build` y `npm start`. Asegúrate de que el servicio
   guarde de forma permanente la carpeta `backend/public/uploads` (las portadas que subes).
5. **Copia de seguridad:** en pgAdmin, clic derecho sobre la base `ovilla` → **Backup…** y guarda
   el archivo. Para recuperarla: clic derecho → **Restore…**.

---

## 7. Problemas comunes

| Problema | Solución |
|---|---|
| `JWT_SECRET falta o es débil` | Ejecuta `npm run crear-env` en la carpeta `ovilla` |
| `La contraseña de PostgreSQL es incorrecta` | Revisa `DB_PASSWORD` en `backend/.env`; debe ser la que pusiste al instalar PostgreSQL |
| `PostgreSQL no está encendido` | Windows: busca **Servicios** en el menú Inicio, ubica `postgresql-x64-16` y dale *Iniciar*. Mac: abre la app de PostgreSQL y presiona *Start* |
| Olvidé la contraseña de `postgres` | Lo más simple es desinstalar PostgreSQL y volver a instalarlo con una contraseña nueva |
| `'npm' no se reconoce como un comando` | Reinicia la computadora después de instalar Node.js |
| `EADDRINUSE: port 4000` | Ya hay otra copia corriendo. Cierra la otra terminal o reinicia la PC |
| La página muestra "No se pudo conectar con el servidor" | El backend no está encendido; revisa que `npm run dev` siga corriendo |
| Quiero empezar de cero con los datos de ejemplo | `npm run reiniciar-db` |
| Quiero cambiar los colores | Edita las variables al inicio de `frontend/src/styles.css` (por ejemplo `--accent`) |

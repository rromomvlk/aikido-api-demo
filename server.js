/**
 * Aikido Demo API
 * -----------------------------------------------------------------------------
 * API REST minima pensada como OBJETIVO DE PRUEBA para el modulo de API Scanning
 * (DAST) de Aikido Security en una POC.
 *
 * IMPORTANTE: contiene debilidades INTENCIONALES (SQL injection, IDOR, path
 * traversal, command injection, falta de control de acceso) para que el scanner
 * tenga algo que reportar. NO usar este codigo en produccion ni exponerlo con
 * datos reales. Desplegar solo en un entorno de staging descartable.
 * -----------------------------------------------------------------------------
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const Database = require('better-sqlite3');
const swaggerUi = require('swagger-ui-express');
const openapiSpec = require('./openapi');

const app = express();
app.use(express.json());

// --- Base de datos en memoria con datos semilla -----------------------------
const db = new Database(':memory:');
db.exec(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username TEXT,
    password TEXT,
    email TEXT,
    role TEXT
  );
  CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    name TEXT,
    price REAL
  );
  INSERT INTO users (username, password, email, role) VALUES
    ('alice', 'wonderland', 'alice@example.com', 'admin'),
    ('bob',   'builder',    'bob@example.com',   'user'),
    ('carol', 'secret123',  'carol@example.com', 'user');
  INSERT INTO products (name, price) VALUES
    ('Laptop Pro', 1299.0),
    ('Wireless Mouse', 25.5),
    ('Mechanical Keyboard', 89.9);
`);

// Archivo semilla para el endpoint de lectura de archivos
const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(path.join(dataDir, 'notes.txt'), 'Notas de demo para la POC de Aikido.\n');

// --- Documentacion / OpenAPI ------------------------------------------------
// Aikido puede leer la spec desde esta URL (opcion "Fetch from URL").
app.get('/openapi.json', (_req, res) => res.json(openapiSpec));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/', (_req, res) =>
  res.json({
    name: 'Aikido Demo API',
    docs: '/docs',
    openapi: '/openapi.json',
  })
);

// --- Endpoints (con debilidades intencionales) ------------------------------

// SQL injection en login: concatena entrada del usuario en la consulta.
app.post('/api/login', (req, res) => {
  const { username = '', password = '' } = req.body || {};
  try {
    const row = db
      .prepare(
        `SELECT id, username, role FROM users
         WHERE username = '${username}' AND password = '${password}'`
      )
      .get();
    if (row) return res.json({ authenticated: true, user: row });
    return res.status(401).json({ authenticated: false });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// IDOR: devuelve cualquier usuario por id sin verificar identidad ni permisos.
app.get('/api/users/:id', (req, res) => {
  const row = db
    .prepare('SELECT id, username, email, role FROM users WHERE id = ?')
    .get(req.params.id);
  if (!row) return res.status(404).json({ error: 'not found' });
  return res.json(row);
});

// SQL injection en busqueda: parametro q concatenado.
app.get('/api/products', (req, res) => {
  const q = req.query.q || '';
  try {
    const rows = db
      .prepare(`SELECT * FROM products WHERE name LIKE '%${q}%'`)
      .all();
    return res.json(rows);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Path traversal: usa el parametro name sin sanitizar para leer archivos.
app.get('/api/files', (req, res) => {
  const name = req.query.name || '';
  const target = path.join(dataDir, name);
  try {
    const content = fs.readFileSync(target, 'utf8');
    return res.type('text/plain').send(content);
  } catch (e) {
    return res.status(404).json({ error: 'not found' });
  }
});

// Command injection: pasa el host a un comando de shell.
app.get('/api/ping', (req, res) => {
  const host = req.query.host || '127.0.0.1';
  try {
    const out = execSync(`ping -c 1 ${host}`, { timeout: 3000 }).toString();
    return res.type('text/plain').send(out);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// Control de acceso debil: acepta cualquier token no vacio.
app.get('/api/orders', (req, res) => {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ error: 'missing Authorization header' });
  return res.json([
    { id: 1001, item: 'Laptop Pro', total: 1299.0 },
    { id: 1002, item: 'Wireless Mouse', total: 25.5 },
  ]);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Aikido Demo API escuchando en el puerto ${PORT}`);
  console.log(`Docs:    /docs`);
  console.log(`OpenAPI: /openapi.json`);
});

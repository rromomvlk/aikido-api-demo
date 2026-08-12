# Aikido Demo API — POC del módulo de API Scanning (DAST)

API REST mínima, **gratis de desplegar y sin Docker**, pensada como objetivo de prueba
para el módulo de **API Scanning (DAST / Surface Monitoring)** de Aikido Security.

Incluye endpoints con **debilidades intencionales** (SQL injection, IDOR, path
traversal, command injection, control de acceso débil) para que el scanner tenga
hallazgos reales que mostrar en la demo.

> ⚠️ Es un objetivo de prueba deliberadamente inseguro. Despliégalo solo en un
> entorno de staging descartable y **nunca con datos reales**. Bórralo al terminar la POC.

---

## Endpoints

| Método | Ruta | Debilidad intencional |
|---|---|---|
| GET | `/health` | — (health check) |
| GET | `/openapi.json` | Spec OpenAPI (para Aikido) |
| GET | `/docs` | Swagger UI |
| POST | `/api/login` | SQL injection |
| GET | `/api/users/{id}` | IDOR (sin control de acceso) |
| GET | `/api/products?q=` | SQL injection |
| GET | `/api/files?name=` | Path traversal |
| GET | `/api/ping?host=` | Command injection |
| GET | `/api/orders` | Control de acceso débil |

---

## Parte 1 — Subir el código a GitHub (una sola vez)

No necesitas instalar nada en tu PC más allá de **Git**. Dos caminos:

### Opción A — Web (sin línea de comandos)
1. Crea una cuenta en https://github.com si no tienes.
2. Botón **New repository** → nombre `aikido-api-demo` → **Create repository**.
3. En la página del repo vacío, clic en **uploading an existing file**.
4. Arrastra TODOS los archivos de esta carpeta (`server.js`, `openapi.js`,
   `package.json`, `render.yaml`, `.gitignore`, `README.md`).
5. **Commit changes**. Listo.

### Opción B — Terminal (si tienes Git)
```bash
cd aikido-api-demo
git init
git add .
git commit -m "Aikido demo API"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/aikido-api-demo.git
git push -u origin main
```

---

## Parte 2 — Desplegar gratis en Render (sin Docker, sin tarjeta)

1. Entra a https://render.com y regístrate con tu cuenta de GitHub.
2. **New +** → **Web Service**.
3. Conecta tu repo `aikido-api-demo`.
4. Render detecta el `render.yaml` y rellena casi todo. Confirma:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
5. **Create Web Service**. En 1–2 minutos tendrás una URL pública, p. ej.
   `https://aikido-api-demo.onrender.com`.
6. Verifica que vive: abre `https://TU-URL.onrender.com/health` → debe responder
   `{"status":"ok"}`, y `https://TU-URL.onrender.com/docs` para ver el Swagger.

> El plan free "duerme" el servicio tras 15 min sin tráfico y tarda ~30 s en
> despertar en la primera petición. Para la demo, entra a `/health` un minuto
> antes de lanzar el scan para que esté despierto.

Alternativas equivalentes si prefieres: **Railway**, **Fly.io**, **Cyclic**, **Glitch**.
El flujo (repo de GitHub → servicio que da URL pública) es el mismo.

---

## Parte 3 — Conectar la API en Aikido

1. En Aikido: **Domains → Add Domain**.
2. En el selector de tipo de scan, dentro de **Advanced**, elige **REST API**.
3. **Staging URL:** pega la URL base de tu deploy, p. ej.
   `https://aikido-api-demo.onrender.com`
   (la doc de Aikido insiste: usa staging, nunca producción).
4. **OpenAPI specification** — elige una de estas opciones:
   - **Fetch from URL** (recomendado): `https://TU-URL.onrender.com/openapi.json`
     (Aikido la vuelve a leer antes de cada scan).
   - **Manual Upload**: sube el archivo `openapi.json` si prefieres.
   - **Generate via Aikido AI (Code2Swagger)**: si conectas el repo de código.
5. (Opcional) **Authenticate Domain** desde el menú de acciones del dominio, para
   probar endpoints protegidos (`/api/orders`).
6. Lanza el scan. Los resultados aparecen en el **Feed**.

### Verificación de dominio
Para el tipo **REST API** normalmente basta con la URL pública de staging. La
verificación DNS (registro **TXT/CNAME**) aplica sobre todo al *Attack Surface
Scan* de un dominio raíz. Si tu plan te pide verificar el `*.onrender.com`, no
podrás crear registros DNS ahí — en ese caso usa un dominio propio apuntando al
servicio, o pide a Aikido habilitar el scan de esa URL.

### Cómo reconocer el tráfico de Aikido en tus logs
- `User-Agent: aikido-scan-agent/1.0`
- Cabecera `aikido-api-test: 1`
- Origen desde las IPs documentadas por Aikido

---

## Parte 4 — Qué debería detectar (guion de la demo)

El scanner REST de Aikido busca, entre otros: **SQL injection, NoSQL injection,
path traversal y shell/command injection**. Con esta API deberías ver hallazgos
en:

- `POST /api/login` y `GET /api/products` → SQL injection
- `GET /api/files` → path traversal
- `GET /api/ping` → command injection
- `GET /api/users/{id}` → IDOR / control de acceso

Puedes reproducirlo manualmente para enseñarlo en vivo:

```bash
# Bypass de login por SQL injection (entra sin la contraseña correcta):
curl -X POST https://TU-URL.onrender.com/api/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"x'\'' OR '\''1'\''='\''1"}'

# Path traversal:
curl "https://TU-URL.onrender.com/api/files?name=../server.js"
```

---

## Probar en local (opcional, requiere Node 18+)
```bash
npm install
npm start
# http://localhost:3000/docs
```

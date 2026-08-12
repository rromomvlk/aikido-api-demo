// OpenAPI 3.0 spec de la API demo.
// Aikido puede: (a) leerlo desde la URL /openapi.json (auto-actualizado antes de cada scan),
// o (b) subirlo manualmente. Cubre todas las rutas para que el scanner las recorra.

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Aikido Demo API',
    version: '1.0.0',
    description:
      'API REST de demostracion para POC de API Scanning (DAST) con Aikido. ' +
      'Contiene endpoints con debilidades intencionales para validar la deteccion.',
  },
  servers: [
    { url: '/', description: 'Servidor actual (usa la URL publica del deploy)' },
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        responses: { 200: { description: 'OK' } },
      },
    },
    '/api/login': {
      post: {
        summary: 'Login de usuario (vulnerable a SQL injection - intencional)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  username: { type: 'string', example: 'alice' },
                  password: { type: 'string', example: 'wonderland' },
                },
                required: ['username', 'password'],
              },
            },
          },
        },
        responses: {
          200: { description: 'Autenticado' },
          401: { description: 'Credenciales invalidas' },
        },
      },
    },
    '/api/users/{id}': {
      get: {
        summary: 'Obtener usuario por id (IDOR - intencional, sin control de acceso)',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            example: 1,
          },
        ],
        responses: {
          200: { description: 'Usuario' },
          404: { description: 'No encontrado' },
        },
      },
    },
    '/api/products': {
      get: {
        summary: 'Buscar productos (query "q" vulnerable a SQL injection - intencional)',
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            example: 'laptop',
          },
        ],
        responses: { 200: { description: 'Lista de productos' } },
      },
    },
    '/api/files': {
      get: {
        summary: 'Leer archivo (parametro "name" vulnerable a path traversal - intencional)',
        parameters: [
          {
            name: 'name',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            example: 'notes.txt',
          },
        ],
        responses: {
          200: { description: 'Contenido del archivo' },
          404: { description: 'No existe' },
        },
      },
    },
    '/api/ping': {
      get: {
        summary: 'Ping a un host (parametro "host" vulnerable a command injection - intencional)',
        parameters: [
          {
            name: 'host',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            example: '127.0.0.1',
          },
        ],
        responses: { 200: { description: 'Salida del comando' } },
      },
    },
    '/api/orders': {
      get: {
        summary: 'Listar pedidos (requiere header Authorization - control de acceso)',
        parameters: [
          {
            name: 'Authorization',
            in: 'header',
            required: false,
            schema: { type: 'string' },
            example: 'Bearer demo-token',
          },
        ],
        responses: {
          200: { description: 'Pedidos' },
          401: { description: 'No autorizado' },
        },
      },
    },
  },
};

import http from 'node:http';
import { performance } from 'node:perf_hooks';
import { routeRequest } from './router.js';
import { sendError, setCorsHeaders } from './http-utils.js';

const PORT = Number(process.env.PORT) || 3000;

const server = http.createServer(async (req, res) => {
  const start = performance.now();

  setCorsHeaders(res);

  try {
    await routeRequest(req, res);
  } catch (error) {
    if (!res.headersSent) {
      sendError(res, error.statusCode ?? 500, error.statusCode ? error.message : 'Wewnętrzny błąd serwera.');
    } else {
      res.end();
    }
  } finally {
    const duration = (performance.now() - start).toFixed(2);
    console.log(`${req.method} ${req.url} -> ${res.statusCode} (${duration} ms)`);
  }
});

server.listen(PORT, () => {
  console.log(`Serwer działa: http://localhost:${PORT}`);
});

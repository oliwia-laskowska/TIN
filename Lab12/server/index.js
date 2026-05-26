import http from 'node:http';
import { performance } from 'node:perf_hooks';

import { routeRequest } from './router.js';
import { setupWebSocketServer } from './websocket.js';
import { sendError, setCorsHeaders } from './http-utils.js';

const PORT = Number(process.env.PORT) || 3000;

/**
 * Tworzy główny serwer HTTP aplikacji.
 * Każde przychodzące żądanie trafia tutaj, a następnie jest przekazywane do routera.
 */
const server = http.createServer(async (req, res) => {
  // Zapamiętujemy czas rozpoczęcia obsługi requestu, żeby później policzyć czas wykonania.
  const start = performance.now();

  /**
   * Ustawiamy nagłówki CORS dla każdej odpowiedzi.
   * Dzięki temu frontend może komunikować się z API
   */
  setCorsHeaders(res);

  try {
    /**
     * Przekazujemy request i response do głównego routera.
     * Router decyduje, czy obsłużyć API, pliki statyczne, czy zwrócić błąd 404.
     */
    await routeRequest(req, res);
  } catch (error) {
    /**
     * Obsługa błędów.
     */
    if (!res.headersSent) {
      sendError(
          res,
          error.statusCode ?? 500,
          error.statusCode
              ? error.message
              : 'Wewnętrzny błąd serwera.'
      );
    } else {
      /**
       * Jeśli nagłówki zostały już wysłane,
       * nie można zmienić statusu ani treści odpowiedzi.
       * Kończymy więc połączenie.
       */
      res.end();
    }
  } finally {
    /**
     * Logowanie każdego requestu po zakończeniu obsługi.
     * Pokazuje metodę, adres, status odpowiedzi i czas wykonania.
     */
    const duration = (performance.now() - start).toFixed(2);

    console.log(
        `${req.method} ${req.url} -> ${res.statusCode} (${duration} ms)`
    );
  }
});

/**
 * Uruchamiamy serwer na wskazanym porcie.
 * Domyślnie używany jest port 3000, chyba że podano PORT w zmiennych środowiskowych.
 */
setupWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`Serwer działa: http://localhost:${PORT}`);
});
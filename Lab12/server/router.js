import {
  getAllImages,
  getAllPalettes,
  getImageById,
  getPaletteById,
  createImage,
  deleteImage
} from './storage.js';

import {
  readJsonBody,
  sendError,
  sendJson,
  sendNoContent
} from './http-utils.js';

import { tryServeStatic } from './static.js';

/**
 * Dzieli ścieżkę URL na segmenty.
 */
function splitPath(pathname) {
  return pathname
      .split('/')
      .filter(Boolean)
      .map(decodeURIComponent);
}

/**
 * Tworzy prosty podgląd HTML obrazka pikselowego.
 * Obraz renderowany jest jako siatka kolorowych divów.
 */
function sendImagePreview(res, image) {
  // Rozmiar siatki obrazka (np. 16x16)
  const gridSize = image.gridSize || 16;

  // Lista kolorów kolejnych pikseli
  const pixels = image.colors || [];

  /**
   * Generowanie pojedynczych pól siatki.
   * Każdy kolor reprezentowany jest przez mały div.
   */
  const cells = pixels
      .map((color) => {
        return `<div style="width:20px;height:20px;background:${color};"></div>`;
      })
      .join('');

  // Prosty dokument HTML renderujący obrazek
  const html = `
    <!DOCTYPE html>
    <html lang="pl">
    <head>
      <meta charset="UTF-8" />
      <title>${image.title}</title>

      <style>
        body {
          font-family: Arial, sans-serif;
          background: #f4f4f4;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 40px;
        }

        .grid {
          display: grid;

          /* Tworzy kolumny siatki */
          grid-template-columns: repeat(${gridSize}, 20px);

          /* Wysokość każdego wiersza */
          grid-auto-rows: 20px;

          border: 2px solid #222;
          background: white;
        }
      </style>
    </head>

    <body>
      <h1>${image.title}</h1>
      <p>ID: ${image.id}</p>

      <!-- Kontener z pikselami -->
      <div class="grid">${cells}</div>
    </body>
    </html>
  `;

  // Zwrócenie wygenerowanego HTML-a
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8'
  });

  res.end(html);
}

/**
 * Główna funkcja routingu aplikacji.
 * Odpowiada za obsługę endpointów API oraz statycznych plików.
 */
export async function routeRequest(req, res) {
  // Parsowanie adresu URL z requestu
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  /**
   * Obsługa preflight requestów CORS.
   * Zwracamy pustą odpowiedź 204.
   */
  if (req.method === 'OPTIONS') {
    sendNoContent(res);
    return;
  }

  /**
   * Próba obsłużenia plików statycznych.
   * Jeśli plik został znaleziony → kończymy request.
   */
  const servedStatic = await tryServeStatic(req, res, pathname);

  if (servedStatic) return;

  // Rozbijamy ścieżkę na segmenty URL
  const segments = splitPath(pathname);

  /**
   * Oczekiwany format:
   * /api/{resource}/{id?}/{action?}
   */
  const [api, resource, id, action] = segments;

  // Walidacja poprawności endpointu
  if (api !== 'api' || segments.length > 4) {
    sendError(res, 404, 'Nie znaleziono endpointu.');
    return;
  }

  /**
   * ENDPOINTY: /api/palettes
   */
  if (resource === 'palettes') {

    // Palety obsługują wyłącznie metodę GET
    if (req.method !== 'GET') {
      sendError(res, 404, 'Nieobsługiwana metoda dla palet.');
      return;
    }

    /**
     * GET /api/palettes
     * Zwraca wszystkie palety kolorów.
     */
    if (!id) {
      sendJson(res, 200, getAllPalettes());
      return;
    }

    /**
     * GET /api/palettes/:id
     * Zwraca pojedynczą paletę.
     */
    const palette = getPaletteById(id);

    if (!palette) {
      sendError(res, 404, 'Nie znaleziono palety.');
      return;
    }

    sendJson(res, 200, palette);
    return;
  }

  /**
   * ENDPOINTY: /api/images
   */
  if (resource === 'images') {

    /**
     * GET /api/images
     * Zwraca listę wszystkich obrazków.
     */
    if (req.method === 'GET' && !id) {
      sendJson(res, 200, getAllImages());
      return;
    }

    /**
     * GET /api/images/:id
     * Zwraca dane obrazka jako JSON.
     */
    if (req.method === 'GET' && id && !action) {
      const image = getImageById(id);

      if (!image) {
        sendError(res, 404, 'Nie znaleziono obrazka.');
        return;
      }

      sendJson(res, 200, image);
      return;
    }

    /**
     * GET /api/images/:id/preview
     * Pokazuje obrazek jako HTML w przeglądarce.
     */
    if (req.method === 'GET' && id && action === 'preview') {
      const image = getImageById(id);

      if (!image) {
        sendError(res, 404, 'Nie znaleziono obrazka.');
        return;
      }

      sendImagePreview(res, image);
      return;
    }

    /**
     * POST /api/images
     * Tworzy nowy obrazek na podstawie danych z body requestu.
     */
    if (req.method === 'POST' && !id) {
      const payload = await readJsonBody(req);

      // Tworzenie nowego obrazka w storage
      const image = createImage(payload);

      sendJson(res, 201, image);
      return;
    }

    /**
     * DELETE /api/images/:id
     * Usuwa obrazek o podanym ID.
     */
    if (req.method === 'DELETE' && id && !action) {
      const wasDeleted = deleteImage(id);

      if (!wasDeleted) {
        sendError(res, 404, 'Nie znaleziono obrazka do usunięcia.');
        return;
      }

      // 204 No Content po poprawnym usunięciu
      sendNoContent(res);
      return;
    }
  }

  /**
   * Jeśli żaden endpoint nie pasuje,
   * zwracamy błąd 404.
   */
  sendError(res, 404, 'Nie znaleziono endpointu.');
}
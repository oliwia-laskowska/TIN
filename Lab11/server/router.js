import { getAllImages, getAllPalettes, getImageById, getPaletteById, createImage, deleteImage } from './storage.js';
import { readJsonBody, sendError, sendJson, sendNoContent } from './http-utils.js';
import { tryServeStatic } from './static.js';

function splitPath(pathname) {
  return pathname.split('/').filter(Boolean).map(decodeURIComponent);
}

export async function routeRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (req.method === 'OPTIONS') {
    sendNoContent(res);
    return;
  }

  const servedStatic = await tryServeStatic(req, res, pathname);
  if (servedStatic) return;

  const segments = splitPath(pathname);
  const [api, resource, id] = segments;

  if (api !== 'api' || segments.length > 3) {
    sendError(res, 404, 'Nie znaleziono endpointu.');
    return;
  }

  if (resource === 'palettes') {
    if (req.method !== 'GET') {
      sendError(res, 404, 'Nieobsługiwana metoda dla palet.');
      return;
    }

    if (!id) {
      sendJson(res, 200, getAllPalettes());
      return;
    }

    const palette = getPaletteById(id);
    if (!palette) {
      sendError(res, 404, 'Nie znaleziono palety.');
      return;
    }

    sendJson(res, 200, palette);
    return;
  }

  if (resource === 'images') {
    if (req.method === 'GET' && !id) {
      sendJson(res, 200, getAllImages());
      return;
    }

    if (req.method === 'GET' && id) {
      const image = getImageById(id);
      if (!image) {
        sendError(res, 404, 'Nie znaleziono obrazka.');
        return;
      }
      sendJson(res, 200, image);
      return;
    }

    if (req.method === 'POST' && !id) {
      const payload = await readJsonBody(req);
      const image = createImage(payload);
      sendJson(res, 201, image);
      return;
    }

    if (req.method === 'DELETE' && id) {
      const wasDeleted = deleteImage(id);
      if (!wasDeleted) {
        sendError(res, 404, 'Nie znaleziono obrazka do usunięcia.');
        return;
      }
      sendNoContent(res);
      return;
    }
  }

  sendError(res, 404, 'Nie znaleziono endpointu.');
}

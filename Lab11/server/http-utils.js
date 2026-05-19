export function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

export function sendNoContent(res) {
  res.statusCode = 204;
  res.end();
}

export function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { error: message });
}

export function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';

    req.on('data', (chunk) => {
      raw += chunk;

      if (raw.length > 1_000_000) {
        const error = new Error('Ciało żądania jest zbyt duże.');
        error.statusCode = 413;
        req.destroy(error);
      }
    });

    req.on('end', () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch {
        const error = new Error('Niepoprawny JSON w ciele żądania.');
        error.statusCode = 400;
        reject(error);
      }
    });

    req.on('error', reject);
  });
}

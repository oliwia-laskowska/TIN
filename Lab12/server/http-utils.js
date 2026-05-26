/**
 * Ustawia nagłówki CORS, aby umożliwić komunikację z API z innych domen/portów.
 */
export function setCorsHeaders(res) {
  // Zezwala na dostęp do zasobu dowolnej domenie zewnętrznej
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Określa, jakie metody HTTP są dozwolone podczas zapytania
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  // Wskazuje, jakie nagłówki mogą być użyte w zapytaniu właściwym (np. typ danych)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/**
 * Wysyła odpowiedź do klienta w formacie JSON z określonym kodem statusu.
 *
 * @param {object} res - Obiekt odpowiedzi serwera (http.ServerResponse)
 * @param {number} statusCode - Kod statusu HTTP (np. 200, 201)
 * @param {any} payload - Dane do wysłania, które zostaną sformatowane do JSON
 */
export function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  // Ustawia typ zawartości na JSON oraz kodowanie znaków UTF-8
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  // Zamienia obiekt/tablicę JS na string JSON i kończy odpowiedź
  res.end(JSON.stringify(payload));
}

/**
 * Wysyła odpowiedź informującą o sukcesie, ale bez zwracania zawartości
 */
export function sendNoContent(res) {
  res.statusCode = 204;
  res.end();
}

/**
 * Wysyła ustandaryzowaną odpowiedź błędu z odpowiednim kodem statusu.
 *
 * @param {object} res - Obiekt odpowiedzi serwera (http.ServerResponse)
 * @param {number} statusCode - Kod błędu HTTP
 * @param {string} message - Treść komunikatu błędu dla klienta
 */
export function sendError(res, statusCode, message) {
  // Wykorzystuje funkcję sendJson, aby zachować spójną strukturę błędów { error: "treść" }
  sendJson(res, statusCode, { error: message });
}

/**
 * Asynchronicznie odczytuje i przetwarza ciało żądania HTTP  do formatu obiektu JavaScript.
 * Zawiera zabezpieczenie przed zbyt dużym rozmiarem danych
 *
 * @param {object} req - Obiekt żądania klienta (http.IncomingMessage)
 * @returns {Promise<object>} Obietnica zwracająca sparsowany obiekt JSON lub pusty obiekt
 */
export function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';

    // Nasłuchiwanie
    req.on('data', (chunk) => {
      raw += chunk;

      // Zabezpieczenie: jeśli rozmiar danych przekroczy 1MB, przerywamy połączenie
      if (raw.length > 1_000_000) {
        const error = new Error('Ciało żądania jest zbyt duże.');
        error.statusCode = 413; // 413 Payload Too Large
        req.destroy(error); // Niszczy strumień i przekazuje błąd do zdarzenia 'error'
      }
    });

    // Wywoływane, gdy całe ciało żądania zostało odebrane
    req.on('end', () => {
      // Jeśli ciało jest puste zwracamy pusty obiekt
      if (!raw.trim()) {
        resolve({});
        return;
      }

      try {
        // Próba sparsowania zebranego stringa na obiekt JS
        resolve(JSON.parse(raw));
      } catch {
        // Jeśli JSON jest niepoprawny strukturalnie, zwracamy błąd 400
        const error = new Error('Niepoprawny JSON w ciele żądania.');
        error.statusCode = 400; // 400 Bad Request
        reject(error);
      }
    });

    // Obsługa innych błędów strumienia (np. nagłe rozłączenie klienta)
    req.on('error', reject);
  });
}
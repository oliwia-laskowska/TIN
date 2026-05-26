import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Konwersja URL modułu ESM na standardową ścieżkę pliku
const __filename = fileURLToPath(import.meta.url);
// Wyciągnięcie ścieżki katalogu, w którym znajduje się bieżący plik
const __dirname = path.dirname(__filename);
// Definiowanie bezwzględnej ścieżki do katalogu z plikami publicznymi
const publicDir = path.join(__dirname, '..', 'public');

// Mapa przechowująca obsługiwane typy MIME  dla poszczególnych rozszerzeń plików
const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8']
]);

/**
 * Próbuje zaserwować plik statyczny (np. HTML, CSS, JS) na podstawie przekazanej ścieżki URL.
 * Funkcja zawiera mechanizmy obronne przed próbami nieautoryzowanego dostępu do plików systemowych.
 *
 * @param {object} req - Obiekt żądania klienta
 * @param {object} res - Obiekt odpowiedzi serwera
 * @param {string} pathname - Ścieżka wyciągnięta z URL
 * @returns {Promise<boolean>} Zwraca `true`, jeśli plik znaleziono i wysłano; `false` w przeciwnym wypadku.
 */
export async function tryServeStatic(req, res, pathname) {
  // Pliki statyczne serwujemy wyłącznie dla zapytań typu GET
  if (req.method !== 'GET') return false;
  const filePath = pathname === '/' ? '/index.html' : pathname;


  const normalizedPath = path.normalize(filePath).replace(/^([.][.][/\\])+/, '');

  // Tworzenie pełnej, bezwzględnej ścieżki do pliku na dysku
  const absolutePath = path.join(publicDir, normalizedPath);

  if (!absolutePath.startsWith(publicDir)) return false;

  try {
    // Asynchroniczny odczyt zawartości pliku z dysku
    const data = await readFile(absolutePath);
    // Pobranie rozszerzenia pliku
    const extension = path.extname(absolutePath);

    res.statusCode = 200;
    res.setHeader('Content-Type', contentTypes.get(extension) ?? 'application/octet-stream');
    // Wysłanie danych do klienta i zakończenie odpowiedzi
    res.end(data);

    return true; // Sukces - plik został obsłużony
  } catch {
    // Jeśli plik nie istnieje lub nie ma do niego dostępu,
    // zwracamy false, co pozwala aplikacji na dalszą obsługę żądania (np. jako routing API)
    return false;
  }
}
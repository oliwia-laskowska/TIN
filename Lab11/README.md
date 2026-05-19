# Mini Pixel Art Editor — Node.js HTTP API

Projekt zastępuje publiczne mock API własnym serwerem HTTP w Node.js. Serwer nie używa Express, Fastify ani innych frameworków webowych — działa na wbudowanym module `http`.

## Wymagania

- Node.js 18 lub nowszy
- npm

## Instalacja i uruchomienie

```bash
npm install
npm start
```

Tryb developerski z auto-restartem:

```bash
npm run dev
```

Po uruchomieniu aplikacja jest dostępna pod adresem:

```text
http://localhost:3000
```

## Struktura

```text
server/index.js       # entry point, tworzenie serwera, CORS, logowanie, globalny try/catch
server/router.js      # routing REST i parametry URL
server/storage.js     # logika danych: palety i obrazki
server/data.js        # predefiniowane palety
server/http-utils.js  # JSON responses, body parser przez streamy, CORS helpers
server/static.js      # serwowanie klienta z folderu public
public/index.html     # klient Mini Pixel Art Editor podłączony do lokalnego backendu
```

## Endpointy

| Metoda | Ścieżka | Opis |
|---|---|---|
| GET | `/api/palettes` | Lista wszystkich palet |
| GET | `/api/palettes/:id` | Konkretna paleta |
| GET | `/api/images` | Lista zapisanych obrazków |
| GET | `/api/images/:id` | Konkretny obrazek |
| POST | `/api/images` | Dodanie obrazka, status `201` |
| DELETE | `/api/images/:id` | Usunięcie obrazka, status `204` |

Nieznana ścieżka albo metoda zwraca `404`.

## Przykładowe wywołania curl

Lista palet:

```bash
curl http://localhost:3000/api/palettes
```

Konkretna paleta:

```bash
curl http://localhost:3000/api/palettes/warm
```

Lista obrazków:

```bash
curl http://localhost:3000/api/images
```

Dodanie obrazka:

```bash
curl -i -X POST http://localhost:3000/api/images \
  -H "Content-Type: application/json" \
  -d '{"title":"test","gridSize":16,"colors":["#ffffff","#000000"]}'
```

Pobranie konkretnego obrazka, po podstawieniu ID z odpowiedzi POST:

```bash
curl http://localhost:3000/api/images/TUTAJ_ID
```

Usunięcie obrazka, po podstawieniu ID:

```bash
curl -i -X DELETE http://localhost:3000/api/images/TUTAJ_ID
```

Test błędnego JSON-a:

```bash
curl -i -X POST http://localhost:3000/api/images \
  -H "Content-Type: application/json" \
  -d '{niepoprawny-json'
```

Test preflight CORS:

```bash
curl -i -X OPTIONS http://localhost:3000/api/images \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST"
```

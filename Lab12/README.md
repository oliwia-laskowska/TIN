# Kolaboracyjny Pixel Art Editor — Node.js HTTP + WebSocket

Projekt rozbudowuje Mini Pixel Art Editor o warstwę WebSocket. Kilku użytkowników może równocześnie rysować na tej samej siatce 16×16, a zmiany są natychmiast rozsyłane do pozostałych klientów.

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

Aplikacja działa pod adresem:

```text
http://localhost:3000
```

WebSocket działa pod ścieżką:

```text
ws://localhost:3000/ws
```

## Decyzje architektoniczne

Serwer HTTP i WebSocket działają na tym samym porcie `3000`. WebSocketServer z pakietu `ws` jest podpięty do istniejącego serwera HTTP przez opcję `{ server, path: '/ws' }`. Dzięki temu frontend, API REST i WebSocket mają jeden origin, prostsze uruchomienie i brak dodatkowej konfiguracji CORS dla osobnego portu.

Backend nadal używa wbudowanego modułu `http` do REST API i plików statycznych. Do WebSocket użyty jest wyłącznie pakiet `ws`; nie ma Socket.IO ani frameworków HTTP.

Serwer przechowuje wspólny stan siatki w pamięci jako tablicę 256 kolorów. Nowy klient po wysłaniu wiadomości `hello` dostaje `snapshot`, czyli pełną siatkę, listę użytkowników i swój identyfikator. Rysowanie działa przez WebSocket, a endpointy HTTP zostają do palet oraz zapisu, odczytu i usuwania obrazków z wcześniejszego API. Dzięki temu bieżąca synchronizacja współpracy nie miesza się z trwałym zapisem plików/danych.

## Struktura

```text
server/index.js       # serwer HTTP, CORS, logowanie, globalny try/catch, start WebSocket
server/websocket.js   # WebSocketServer, wspólny stan, użytkownicy, dispatcher, keepalive
server/router.js      # routing REST i parametry URL
server/storage.js     # logika danych: palety i obrazki
server/data.js        # predefiniowane palety
server/http-utils.js  # JSON responses, body parser przez streamy, CORS helpers
server/static.js      # serwowanie klienta z folderu public
public/index.html     # klient Pixel Art Editor z WebSocket, reconnect, lista użytkowników
```

## Typy wiadomości WebSocket

Każda wiadomość ma format:

```json
{
  "type": "nazwa_typu",
  "payload": {}
}
```

### Klient → serwer

| Typ | Payload | Opis |
|---|---|---|
| `hello` | `{ "nick": "Ola" }` | Rejestruje użytkownika po połączeniu. |
| `cell_update` | `{ "row": 0, "col": 0, "color": "#ff0000" }` | Zmiana koloru jednej komórki. |
| `clear_grid` | `{}` | Wyczyszczenie całej siatki. |
| `ping` | `{ "time": 123 }` | Keepalive klienta. |
| `pong` | `{ "time": 123 }` | Odpowiedź na keepalive serwera. |
| `error` | `{ "message": "..." }` | Informacja od klienta, że odebrał niepoprawną albo nieznaną wiadomość z serwera. |

### Serwer → klient

| Typ | Payload | Opis |
|---|---|---|
| `snapshot` | `{ "gridSize": 16, "colors": [], "users": [], "clientId": "..." }` | Pełny stan po wejściu klienta. |
| `users` | `{ "users": [{ "id": "...", "nick": "Ola" }] }` | Aktualna lista użytkowników online. |
| `cell_update` | `{ "row": 0, "col": 0, "color": "#ff0000", "userId": "..." }` | Rozgłoszona zmiana komórki. |
| `clear_grid` | `{ "userId": "...", "color": "#ffffff" }` | Rozgłoszone czyszczenie siatki. |
| `ping` | `{ "time": 123 }` | Keepalive serwera. |
| `pong` | `{ "time": 123 }` | Odpowiedź serwera na ping klienta. |
| `error` | `{ "message": "..." }` | Błąd formatu, walidacji albo nieznanego typu. |

## Walidacja i błędy

Serwer sprawdza:

- czy wiadomość jest poprawnym JSON-em,
- czy posiada pole `type`,
- czy `type` jest znanym typem wiadomości,
- czy `row` i `col` są liczbami całkowitymi w zakresie `0–15`,
- czy kolor ma format `#rrggbb` albo `rgb(r, g, b)`.

Niepoprawny JSON, brak `type`, nieznany typ lub błędne dane rysowania powodują odesłanie wiadomości `error` tylko do nadawcy. Taka wiadomość nie jest rozgłaszana.

## Zapis i usuwanie obrazków

Interfejs zawiera obsługę trwałego zapisu z poprzedniego laboratorium:

- `Zapisz na serwerze` wysyła aktualny stan siatki przez `POST /api/images`,
- `Odśwież zapisane` pobiera listę przez `GET /api/images`,
- `Wczytaj obrazek` pobiera wskazany obrazek przez `GET /api/images/:id`, odrysowuje go lokalnie i wysyła komórki przez WebSocket, aby zsynchronizować widok pozostałych klientów,
- `Usuń obrazek` usuwa wybrany zapis przez `DELETE /api/images/:id`.

Do trwałego zapisu używane jest HTTP, ponieważ jest to operacja zasobowa typu CRUD. Do rysowania w czasie rzeczywistym używany jest WebSocket, ponieważ wymaga natychmiastowej synchronizacji wielu klientów.

## Reconnect i keepalive

Klient pokazuje stan połączenia w interfejsie. Po rozłączeniu automatycznie próbuje połączyć się ponownie z rosnącym opóźnieniem: `1s`, `2s`, `4s`, `8s`, maksymalnie `10s`. Po udanym połączeniu licznik prób jest resetowany.

Keepalive działa w obie strony:

- serwer cyklicznie wysyła `ping`, a klient odpowiada `pong`,
- klient cyklicznie wysyła `ping`, a serwer odpowiada `pong`,
- brak odpowiedzi powoduje zamknięcie połączenia i uruchomienie reconnectu po stronie klienta.

## Test ręczny

1. Uruchom projekt przez `npm start`.
2. Otwórz `http://localhost:3000` w trzech zakładkach.
3. W każdej zakładce podaj inny nick.
4. Narysuj komórki w jednej zakładce — zmiany powinny natychmiast pojawić się w pozostałych.
5. Użyj przycisku `Wyczyść` albo skrótu `C` — czyszczenie powinno pojawić się u wszystkich.
6. Zamknij jedną zakładkę — lista online powinna zaktualizować się u pozostałych.
7. Użyj `Zapisz na serwerze`, odśwież listę, wczytaj zapisany obrazek i usuń go, aby sprawdzić wcześniejsze API zapisu/usuwania.
8. Zatrzymaj i ponownie uruchom serwer — klient pokaże reconnect i połączy się ponownie.

## Endpointy HTTP

| Metoda | Ścieżka | Opis |
|---|---|---|
| GET | `/api/palettes` | Lista wszystkich palet |
| GET | `/api/palettes/:id` | Konkretna paleta |
| GET | `/api/images` | Lista zapisanych obrazków |
| GET | `/api/images/:id` | Konkretny obrazek |
| GET | `/api/images/:id/preview` | Podgląd obrazka jako HTML |
| POST | `/api/images` | Dodanie obrazka, status `201` |
| DELETE | `/api/images/:id` | Usunięcie obrazka, status `204` |

## Przykładowe curl

```bash
curl http://localhost:3000/api/palettes
curl http://localhost:3000/api/palettes/warm
curl http://localhost:3000/api/images
curl -i -X POST http://localhost:3000/api/images \
  -H "Content-Type: application/json" \
  -d '{"title":"test","gridSize":16,"colors":["#ffffff","#000000"]}'
curl -i -X DELETE http://localhost:3000/api/images/TUTAJ_ID
curl -i -X OPTIONS http://localhost:3000/api/images \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST"
```

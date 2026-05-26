import { WebSocketServer, WebSocket } from 'ws';
import { nanoid } from 'nanoid';

const GRID_SIZE = 16;
const CELL_COUNT = GRID_SIZE * GRID_SIZE;
const WHITE = '#ffffff';
const KEEPALIVE_INTERVAL_MS = 10_000;
const KEEPALIVE_TIMEOUT_MS = 5_000;

const gridState = Array.from({ length: CELL_COUNT }, () => WHITE);
const clients = new Map();

function createMessage(type, payload = {}) {
  return JSON.stringify({ type, payload });
}

function safeSend(ws, type, payload = {}) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(createMessage(type, payload));
  }
}

function getUsers() {
  return Array.from(clients.values()).map((client) => ({
    id: client.id,
    nick: client.nick
  }));
}

function broadcast(type, payload = {}, exceptWs = null) {
  for (const [ws] of clients) {
    if (ws !== exceptWs) {
      safeSend(ws, type, payload);
    }
  }
}

function broadcastUsers() {
  broadcast('users', { users: getUsers() });
}

function isValidColor(color) {
  if (typeof color !== 'string') return false;

  const hex = /^#[0-9a-fA-F]{6}$/;
  const rgb = /^rgb\(\s*(25[0-5]|2[0-4]\d|1?\d?\d)\s*,\s*(25[0-5]|2[0-4]\d|1?\d?\d)\s*,\s*(25[0-5]|2[0-4]\d|1?\d?\d)\s*\)$/;

  return hex.test(color) || rgb.test(color);
}

function validateCellUpdate(payload) {
  const row = Number(payload?.row);
  const col = Number(payload?.col);
  const color = payload?.color;

  if (!Number.isInteger(row) || row < 0 || row >= GRID_SIZE) {
    throw new Error('Niepoprawny wiersz komórki.');
  }

  if (!Number.isInteger(col) || col < 0 || col >= GRID_SIZE) {
    throw new Error('Niepoprawna kolumna komórki.');
  }

  if (!isValidColor(color)) {
    throw new Error('Niepoprawny format koloru. Użyj #rrggbb albo rgb(r, g, b).');
  }

  return { row, col, color };
}

function handleHello(ws, payload) {
  if (clients.get(ws)?.ready) {
    throw new Error('Użytkownik jest już zarejestrowany.');
  }

  const nick = typeof payload?.nick === 'string' && payload.nick.trim()
    ? payload.nick.trim().slice(0, 24)
    : `Gość-${nanoid(4)}`;

  const client = clients.get(ws);
  client.nick = nick;
  client.ready = true;

  safeSend(ws, 'snapshot', {
    gridSize: GRID_SIZE,
    colors: gridState,
    users: getUsers(),
    clientId: client.id
  });

  broadcastUsers();
}

function handleCellUpdate(ws, payload) {
  if (!clients.get(ws)?.ready) {
    throw new Error('Najpierw wyślij wiadomość hello z nickiem.');
  }

  const update = validateCellUpdate(payload);
  const index = update.row * GRID_SIZE + update.col;
  gridState[index] = update.color;

  broadcast('cell_update', {
    ...update,
    userId: clients.get(ws).id
  }, ws);
}

function handleClearGrid(ws) {
  if (!clients.get(ws)?.ready) {
    throw new Error('Najpierw wyślij wiadomość hello z nickiem.');
  }

  gridState.fill(WHITE);
  broadcast('clear_grid', {
    userId: clients.get(ws).id,
    color: WHITE
  }, ws);
}

function handlePing(ws) {
  safeSend(ws, 'pong', { time: Date.now() });
}

function handlePong(ws) {
  const client = clients.get(ws);
  if (client) {
    client.awaitingPong = false;
    client.lastPongAt = Date.now();
  }
}

function handleClientError(ws, payload) {
  const client = clients.get(ws);
  console.warn(`WS client error (${client?.nick ?? 'unknown'}): ${payload?.message ?? 'brak opisu'}`);
}

const handlers = new Map([
  ['hello', handleHello],
  ['cell_update', handleCellUpdate],
  ['clear_grid', handleClearGrid],
  ['ping', handlePing],
  ['pong', handlePong],
  ['error', handleClientError]
]);

function dispatchMessage(ws, rawMessage) {
  let message;

  try {
    message = JSON.parse(rawMessage.toString());
  } catch {
    safeSend(ws, 'error', { message: 'Niepoprawny JSON.' });
    return;
  }

  if (!message || typeof message.type !== 'string') {
    safeSend(ws, 'error', { message: 'Wiadomość musi mieć pole type.' });
    return;
  }

  const handler = handlers.get(message.type);

  if (!handler) {
    safeSend(ws, 'error', { message: `Nieznany typ wiadomości: ${message.type}` });
    return;
  }

  try {
    handler(ws, message.payload ?? {});
  } catch (error) {
    safeSend(ws, 'error', { message: error.message });
  }
}

export function setupWebSocketServer(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    clients.set(ws, {
      id: nanoid(8),
      nick: 'łączenie...',
      ready: false,
      awaitingPong: false,
      lastPongAt: Date.now()
    });

    console.log(`WS connect -> klienci: ${clients.size}`);

    ws.on('message', (rawMessage) => dispatchMessage(ws, rawMessage));

    ws.on('close', () => {
      const client = clients.get(ws);
      clients.delete(ws);

      console.log(`WS disconnect (${client?.nick ?? 'unknown'}) -> klienci: ${clients.size}`);
      broadcastUsers();
    });

    ws.on('error', (error) => {
      console.error(`WS error: ${error.message}`);
    });
  });

  const keepaliveTimer = setInterval(() => {
    for (const [ws, client] of clients) {
      if (ws.readyState !== WebSocket.OPEN) continue;

      if (client.awaitingPong && Date.now() - client.lastPongAt > KEEPALIVE_INTERVAL_MS + KEEPALIVE_TIMEOUT_MS) {
        ws.close(4000, 'Brak odpowiedzi keepalive.');
        continue;
      }

      client.awaitingPong = true;
      safeSend(ws, 'ping', { time: Date.now() });
    }
  }, KEEPALIVE_INTERVAL_MS);

  wss.on('close', () => clearInterval(keepaliveTimer));

  return wss;
}

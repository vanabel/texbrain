/**
 * y-webrtc compatible signaling (subscribe / publish over WebSocket).
 * No shebang — safe to import from vite.config.ts / serve-prod-ctan.mjs.
 */
import { WebSocketServer } from 'ws';

const wsConnecting = 0;
const wsOpen = 1;
const pingTimeoutMs = 30000;

/** @param {Map<string, Set<import('ws').WebSocket>>} topics @param {string} name */
function setTopic(topics, name) {
  let set = topics.get(name);
  if (!set) {
    set = new Set();
    topics.set(name, set);
  }
  return set;
}

/**
 * @param {import('ws').WebSocket} conn
 * @param {object} message
 */
function send(conn, message) {
  if (conn.readyState !== wsConnecting && conn.readyState !== wsOpen) {
    conn.close();
    return;
  }
  try {
    conn.send(JSON.stringify(message));
  } catch {
    conn.close();
  }
}

/**
 * Attach y-webrtc signaling to an existing HTTP server (WebSocket upgrade).
 * @param {import('node:http').Server} server
 * @param {string} [pathname='/__texbrain_signaling']
 *   Use `'/'` to accept every upgrade (standalone y-webrtc default).
 */
export function attachCollabSignaling(server, pathname = '/__texbrain_signaling') {
  const wss = new WebSocketServer({ noServer: true });
  /** @type {Map<string, Set<import('ws').WebSocket>>} */
  const topics = new Map();

  wss.on('connection', (conn) => {
    /** @type {Set<string>} */
    const subscribed = new Set();
    let closed = false;
    let pongReceived = true;
    const pingInterval = setInterval(() => {
      if (!pongReceived) {
        conn.close();
        clearInterval(pingInterval);
      } else {
        pongReceived = false;
        try {
          conn.ping();
        } catch {
          conn.close();
        }
      }
    }, pingTimeoutMs);

    conn.on('pong', () => {
      pongReceived = true;
    });

    conn.on('close', () => {
      clearInterval(pingInterval);
      for (const topicName of subscribed) {
        const subs = topics.get(topicName);
        if (!subs) continue;
        subs.delete(conn);
        if (subs.size === 0) topics.delete(topicName);
      }
      subscribed.clear();
      closed = true;
    });

    conn.on('message', (raw) => {
      let message = raw;
      if (typeof message === 'string' || Buffer.isBuffer(message)) {
        try {
          message = JSON.parse(String(message));
        } catch {
          return;
        }
      }
      if (!message || !message.type || closed) return;
      switch (message.type) {
        case 'subscribe':
          for (const topicName of message.topics || []) {
            if (typeof topicName !== 'string') continue;
            setTopic(topics, topicName).add(conn);
            subscribed.add(topicName);
          }
          break;
        case 'unsubscribe':
          for (const topicName of message.topics || []) {
            topics.get(topicName)?.delete(conn);
          }
          break;
        case 'publish':
          if (message.topic) {
            const receivers = topics.get(message.topic);
            if (receivers) {
              message.clients = receivers.size;
              for (const receiver of receivers) send(receiver, message);
            }
          }
          break;
        case 'ping':
          send(conn, { type: 'pong' });
          break;
      }
    });
  });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '/', 'http://localhost');
    const ok =
      pathname === '/'
        ? true
        : url.pathname === pathname || url.pathname.startsWith(pathname + '/');
    if (!ok) return;
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  return { pathname, topics };
}

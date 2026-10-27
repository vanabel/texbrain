#!/usr/bin/env node
/**
 * Standalone collab signaling:
 *   PORT=4444 node scripts/collab-signaling.mjs
 * Production embeds the same logic via collab-signaling-lib.mjs in serve-prod-ctan.mjs.
 */
import http from 'node:http';
import { attachCollabSignaling } from './collab-signaling-lib.mjs';

const port = Number(process.env.PORT || 4444);
const pathName = process.env.SIGNALING_PATH || '/';
const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('texbrain collab signaling\n');
});
attachCollabSignaling(server, pathName);
server.listen(port, '127.0.0.1', () => {
  console.log(`TeXbrain collab signaling on ws://127.0.0.1:${port}${pathName === '/' ? '' : pathName}`);
});

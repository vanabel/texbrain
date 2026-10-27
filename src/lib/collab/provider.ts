import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { get } from 'svelte/store';
import { collabActive, collabRoom, collabPeers, collabLinkCount, collabConnected, collabUserName } from './store';
import type { CollabPeer, CollabUser } from './types';

const COLORS = [
  { color: '#ff6b6b', colorLight: '#ff6b6b33' },
  { color: '#4ecdc4', colorLight: '#4ecdc433' },
  { color: '#ffa62b', colorLight: '#ffa62b33' },
  { color: '#a855f7', colorLight: '#a855f733' },
  { color: '#22c55e', colorLight: '#22c55e33' },
  { color: '#3b82f6', colorLight: '#3b82f633' },
  { color: '#f472b6', colorLight: '#f472b633' },
  { color: '#eab308', colorLight: '#eab30833' }
];

/**
 * y-webrtc signaling URLs.
 * Default: same-origin `/__texbrain_signaling` (served by serve-prod-ctan / Vite proxy).
 * Override with `VITE_COLLAB_SIGNALING=wss://host/path,wss://…` (comma-separated).
 * Do not rely on `signaling.yjs.dev` — it is often unreachable (DNS dead).
 */
function collabSignalingUrls(): string[] {
  const fromEnv = (import.meta.env.VITE_COLLAB_SIGNALING as string | undefined)?.trim();
  if (fromEnv) {
    return fromEnv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof location !== 'undefined' && location.host) {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return [`${proto}//${location.host}/__texbrain_signaling`];
  }
  return ['ws://127.0.0.1:4444'];
}

const ROOM_PREFIX = 'tb';
const SHARE_CODE_LEN = 5;
const ACCESS_PIN_LEN = 6;
/** Digits + upper/lower letters; case-sensitive when joining. */
const TOKEN_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const SHARE_CODE_RE = /^[A-Za-z0-9]{5}$/;
const ACCESS_PIN_RE = /^[A-Za-z0-9]{6}$/;
const LEGACY_SHARE_CODE_SEP = '#';
const COMBINED_SEP = '-';

let ydoc: Y.Doc | null = null;
let provider: WebrtcProvider | null = null;
let peerPollTimer: ReturnType<typeof setInterval> | null = null;
const userColor = COLORS[Math.floor(Math.random() * COLORS.length)];
const undoManagers = new Map<string, Y.UndoManager>();

function announceLocalUser() {
  if (!provider) return;
  provider.awareness.setLocalStateField('user', {
    name: getUserName(),
    ...userColor
  });
}

/** Awareness names can lag behind WebRTC links — refresh both for the panel. */
function refreshPeerUi() {
  if (!provider) {
    collabPeers.set([]);
    collabLinkCount.set(0);
    return;
  }

  const awareness = provider.awareness;
  const peers: CollabPeer[] = [];
  awareness.getStates().forEach((state: { user?: CollabUser; currentFile?: string | null }, clientId: number) => {
    if (clientId === awareness.clientID) return;
    const user =
      state.user ??
      ({
        name: `Peer-${String(clientId).slice(-4)}`,
        color: '#94a3b8',
        colorLight: '#94a3b833'
      } satisfies CollabUser);
    peers.push({
      clientId,
      user,
      currentFile: state.currentFile ?? null
    });
  });
  collabPeers.set(peers);

  const room = provider.room;
  const webrtc = room?.webrtcConns?.size ?? 0;
  const bc = room?.bcConns?.size ?? 0;
  collabLinkCount.set(webrtc + bc);
}

function getUserName(): string {
  let name = get(collabUserName);
  if (!name) {
    name = 'User-' + Math.random().toString(36).slice(2, 6);
    collabUserName.set(name);
  }
  return name;
}

function randomToken(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) out += TOKEN_ALPHABET[bytes[i]! % TOKEN_ALPHABET.length];
  return out;
}

/** Signaling channel name from the 5-character display code. */
export function signalingRoomId(shareCode: string): string {
  return `${ROOM_PREFIX}${shareCode}`;
}

function deriveEncryptionKey(accessPin: string): string {
  return accessPin;
}

export type JoinCredentials = { shareCode: string; accessPin: string; signalingId: string };

/**
 * Accepts TeamViewer-style inputs:
 * - 5-char code + separate 6-char pin (letters + digits, case-sensitive)
 * - combined `Ab3k9-xY7nQ2`
 * - older `uuid#hex` / long `room-secret` formats
 */
export function parseJoinCredentials(
  roomOrCode: string,
  pin: string | null | undefined = null
): JoinCredentials | null {
  const code = roomOrCode.trim().replace(/^['"`]+|['"`]+$/g, '');
  if (!code) return null;

  const legacy = code.indexOf(LEGACY_SHARE_CODE_SEP);
  if (legacy !== -1) {
    const roomId = code.slice(0, legacy).trim();
    const secret = code.slice(legacy + 1).trim();
    if (!roomId || !secret) return null;
    return { shareCode: roomId, accessPin: secret, signalingId: roomId };
  }

  if (SHARE_CODE_RE.test(code)) {
    const accessPin = (pin || '').trim();
    if (!ACCESS_PIN_RE.test(accessPin)) return null;
    return { shareCode: code, accessPin, signalingId: signalingRoomId(code) };
  }

  const sep = code.indexOf(COMBINED_SEP);
  if (sep !== -1) {
    const left = code.slice(0, sep).trim();
    const right = code.slice(sep + 1).trim();
    if (SHARE_CODE_RE.test(left) && ACCESS_PIN_RE.test(right)) {
      return { shareCode: left, accessPin: right, signalingId: signalingRoomId(left) };
    }
    // Older long alphanumeric codes
    if (/^[A-Za-z0-9]{6,64}$/.test(left) && /^[A-Za-z0-9]{8,128}$/.test(right)) {
      return { shareCode: left, accessPin: right, signalingId: left };
    }
  }

  return null;
}

/** @deprecated Prefer parseJoinCredentials; kept for call sites that only check a combined string. */
export function parseShareCode(raw: string): { roomId: string; secret: string } | null {
  const parsed = parseJoinCredentials(raw, null);
  if (!parsed) return null;
  return { roomId: parsed.signalingId, secret: parsed.accessPin };
}

/** Join link carries both the session ID and the access PIN. */
export function buildJoinUrl(
  shareCode: string,
  accessPin: string,
  opts: { origin?: string; base?: string } = {}
): string {
  const origin = opts.origin ?? (typeof location !== 'undefined' ? location.origin : '');
  const basePath = (opts.base ?? '').replace(/\/$/, '');
  const url = new URL(`${basePath}/editor`, origin || 'http://localhost');
  url.searchParams.set('join', shareCode);
  url.searchParams.set('pin', accessPin);
  return url.toString();
}

export function readJoinFromSearch(search = ''): { shareCode: string; accessPin: string } | null {
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
  const join = (params.get('join') ?? params.get('collab') ?? '').trim();
  const pin = (params.get('pin') ?? '').trim();
  if (!join) return null;
  const parsed = parseJoinCredentials(join, pin || null);
  if (!parsed) return null;
  return { shareCode: parsed.shareCode, accessPin: parsed.accessPin };
}

export function clearJoinParamsFromUrl(): void {
  if (typeof location === 'undefined' || typeof history === 'undefined') return;
  const url = new URL(location.href);
  if (!url.searchParams.has('join') && !url.searchParams.has('collab') && !url.searchParams.has('pin')) {
    return;
  }
  url.searchParams.delete('join');
  url.searchParams.delete('collab');
  url.searchParams.delete('pin');
  const next = url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : '') + url.hash;
  history.replaceState({}, '', next);
}

export function getAwareness() {
  return provider?.awareness ?? null;
}

export function getYText(filePath: string): Y.Text | null {
  if (!ydoc) return null;
  return ydoc.getText('file:' + filePath);
}

export function getYTextWithUndo(filePath: string): { ytext: Y.Text; undoManager: Y.UndoManager } | null {
  if (!ydoc) return null;
  const ytext = ydoc.getText('file:' + filePath);
  let um = undoManagers.get(filePath);
  if (!um) {
    um = new Y.UndoManager(ytext);
    undoManagers.set(filePath, um);
  }
  return { ytext, undoManager: um };
}

function toUint8(buf: ArrayBuffer | Uint8Array): Uint8Array {
  return buf instanceof Uint8Array ? buf : new Uint8Array(buf);
}

function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
}

/** Start a session: 5-char 识别码 + 6-char 验证码 (letters + digits). */
export function createRoom(
  projectFiles: Map<string, string>,
  binaryFiles: Map<string, ArrayBuffer>,
  entryPointPath: string | null
): string {
  const shareCode = randomToken(SHARE_CODE_LEN);
  const accessPin = randomToken(ACCESS_PIN_LEN);
  const signalingId = signalingRoomId(shareCode);
  const encryptionKey = deriveEncryptionKey(accessPin);

  const doc = new Y.Doc();
  ydoc = doc;

  const fileMap = doc.getMap('project-files');
  const binMap = doc.getMap('project-binaries');
  const meta = doc.getMap('project-meta');

  doc.transact(() => {
    const fileList: string[] = [];
    for (const [path, content] of projectFiles) {
      const ytext = doc.getText('file:' + path);
      ytext.insert(0, content);
      fileList.push(path);
    }
    fileMap.set('fileList', fileList);

    const binaryList: string[] = [];
    for (const [path, buf] of binaryFiles) {
      binMap.set(path, toUint8(buf));
      binaryList.push(path);
    }
    fileMap.set('binaryList', binaryList);

    if (entryPointPath) {
      meta.set('entryPoint', entryPointPath);
    }
  });

  provider = new WebrtcProvider(signalingId, doc, {
    signaling: collabSignalingUrls(),
    maxConns: 20,
    password: encryptionKey
  });

  setupPeerListeners();
  announceLocalUser();

  collabActive.set(true);
  collabConnected.set(true);
  collabRoom.set({
    id: signalingId,
    shareCode,
    accessPin,
    secret: accessPin,
    password: null,
    isHost: true
  });
  refreshPeerUi();

  return shareCode;
}

export function joinRoom(shareCodeOrCombined: string, accessPin: string | null): Promise<void> {
  const parsed = parseJoinCredentials(shareCodeOrCombined, accessPin);
  if (!parsed) {
    return Promise.reject(new Error('Invalid share code or access pin'));
  }

  const { shareCode, accessPin: pin, signalingId } = parsed;
  const encryptionKey = deriveEncryptionKey(pin);

  return new Promise((resolve) => {
    const doc = new Y.Doc();
    ydoc = doc;

    provider = new WebrtcProvider(signalingId, doc, {
      signaling: collabSignalingUrls(),
      maxConns: 20,
      password: encryptionKey
    });

    setupPeerListeners();
    announceLocalUser();

    collabActive.set(true);
    collabRoom.set({
      id: signalingId,
      shareCode,
      accessPin: pin,
      secret: pin,
      password: null,
      isHost: false
    });
    refreshPeerUi();

    let resolved = false;
    const done = () => {
      if (resolved) return;
      resolved = true;
      announceLocalUser();
      refreshPeerUi();
      collabConnected.set(true);
      resolve();
    };

    provider.on('synced', (e: { synced: boolean }) => {
      if (e.synced) done();
    });

    // Host may be offline; still enter the room so the UI can show status.
    setTimeout(done, 8000);
  });
}

function setupPeerListeners() {
  if (!provider) return;

  const awareness = provider.awareness;
  awareness.on('change', refreshPeerUi);
  provider.on('synced', () => {
    announceLocalUser();
    refreshPeerUi();
  });
  provider.on('peers', () => {
    announceLocalUser();
    refreshPeerUi();
  });
  provider.on('status', () => {
    refreshPeerUi();
  });

  if (peerPollTimer) clearInterval(peerPollTimer);
  // Awareness names often arrive a few seconds after the WebRTC link — poll lightly.
  peerPollTimer = setInterval(() => {
    if (!provider || !get(collabActive)) return;
    refreshPeerUi();
  }, 2000);

  refreshPeerUi();
}

export function setCurrentFile(filePath: string | null) {
  if (!provider) return;
  provider.awareness.setLocalStateField('currentFile', filePath);
}

export function updateUserName(name: string) {
  collabUserName.set(name);
  announceLocalUser();
}

export function getSharedFileList(): string[] {
  if (!ydoc) return [];
  const fileMap = ydoc.getMap('project-files');
  return (fileMap.get('fileList') as string[]) || [];
}

export function getSharedBinaryList(): string[] {
  if (!ydoc) return [];
  const fileMap = ydoc.getMap('project-files');
  const listed = (fileMap.get('binaryList') as string[]) || [];
  if (listed.length) return listed;
  // Older rooms may only have the binary map keys.
  const binMap = ydoc.getMap('project-binaries');
  const keys: string[] = [];
  binMap.forEach((_value, key) => keys.push(key));
  return keys;
}

export function getSharedEntryPoint(): string | null {
  if (!ydoc) return null;
  const meta = ydoc.getMap('project-meta');
  return (meta.get('entryPoint') as string) || null;
}

export function collectFilesFromYjs(): Map<string, string> {
  const result = new Map<string, string>();
  if (!ydoc) return result;
  for (const path of getSharedFileList()) {
    const ytext = ydoc.getText('file:' + path);
    result.set(path, ytext.toString());
  }
  return result;
}

/** Images, fonts, and other binary dependencies shared with the room. */
export function collectBinariesFromYjs(): Map<string, ArrayBuffer> {
  const result = new Map<string, ArrayBuffer>();
  if (!ydoc) return result;
  const binMap = ydoc.getMap('project-binaries');
  for (const path of getSharedBinaryList()) {
    const data = binMap.get(path);
    if (data instanceof Uint8Array) {
      result.set(path, toArrayBuffer(data));
    } else if (data instanceof ArrayBuffer) {
      result.set(path, data);
    }
  }
  return result;
}

export function isHost(): boolean {
  const room = get(collabRoom);
  return room?.isHost ?? false;
}

function getCompileMap(): Y.Map<unknown> | null {
  if (!ydoc) return null;
  return ydoc.getMap('compile');
}

export function requestCompile() {
  const map = getCompileMap();
  if (!map) return;
  map.set('requestedAt', Date.now());
}

export function setCompileStatus(status: string) {
  const map = getCompileMap();
  if (!map) return;
  map.set('status', status);
}

export function setCompileResult(result: {
  status: 'success' | 'error';
  pdf: Uint8Array | null;
  log: string[];
  errors: Array<{ type: string; message: string; line?: number; file?: string }>;
  pageCount: number;
}) {
  if (!ydoc) return;
  const map = ydoc.getMap('compile');
  ydoc.transact(() => {
    map.set('status', result.status);
    if (result.pdf) {
      map.set('pdf', result.pdf);
    }
    map.set('log', JSON.stringify(result.log));
    map.set('errors', JSON.stringify(result.errors));
    map.set('pageCount', result.pageCount);
    map.set('compiledAt', Date.now());
  });
}

export function readCompileState(): {
  status: string;
  pdf: Uint8Array | null;
  log: string;
  errors: string;
  pageCount: number;
} {
  const defaults = { status: 'idle', pdf: null, log: '[]', errors: '[]', pageCount: 1 };
  if (!ydoc) return defaults;
  const map = ydoc.getMap('compile');
  return {
    status: (map.get('status') as string) || 'idle',
    pdf: (map.get('pdf') as Uint8Array) || null,
    log: (map.get('log') as string) || '[]',
    errors: (map.get('errors') as string) || '[]',
    pageCount: (map.get('pageCount') as number) || 1
  };
}

export function observeCompileState(callback: (key: string, value: unknown) => void): () => void {
  if (!ydoc) return () => {};
  const map = ydoc.getMap('compile');
  const handler = (event: { changes: { keys: Map<string, unknown> } }) => {
    event.changes.keys.forEach((_change, key) => {
      callback(key, map.get(key));
    });
  };
  map.observe(handler);
  return () => map.unobserve(handler);
}

export function leaveRoom() {
  if (peerPollTimer) {
    clearInterval(peerPollTimer);
    peerPollTimer = null;
  }
  if (provider) {
    provider.disconnect();
    provider.destroy();
    provider = null;
  }
  if (ydoc) {
    ydoc.destroy();
    ydoc = null;
  }

  undoManagers.clear();

  collabActive.set(false);
  collabConnected.set(false);
  collabRoom.set(null);
  collabPeers.set([]);
  collabLinkCount.set(0);
}

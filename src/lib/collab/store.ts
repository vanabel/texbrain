import { writable } from 'svelte/store';
import type { CollabPeer, CollabRoomInfo } from './types';

export const collabActive = writable(false);
export const collabRoom = writable<CollabRoomInfo | null>(null);
export const collabPeers = writable<CollabPeer[]>([]);
/** WebRTC + BroadcastChannel peer links (may be >0 before awareness names arrive). */
export const collabLinkCount = writable(0);
export const collabConnected = writable(false);
export const collabPanelOpen = writable(false);
/** Prefill join fields after opening `/editor?join=…&pin=…`. */
export const pendingJoin = writable<{ shareCode: string; accessPin: string } | null>(null);

const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('texbrain-collab-name') : null;
export const collabUserName = writable(stored || '');

if (typeof localStorage !== 'undefined') {
  collabUserName.subscribe((name) => {
    localStorage.setItem('texbrain-collab-name', name);
  });
}

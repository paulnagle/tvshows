/**
 * LAN Sync Service
 *
 * Each device advertises itself via mDNS (_tvshows._tcp) and browses for peers
 * on the same WiFi network. When a peer is discovered, an outbound WebSocket
 * connection is opened using React Native's built-in global WebSocket — no
 * Node-only libraries are used.
 *
 * Because RN has no WebSocket server, every device connects *outbound* to every
 * other discovered peer. Both sides independently open a connection to the
 * other, giving two connections per pair (A→B and B→A). That is fine — events
 * are just broadcast to all open sockets regardless of direction.
 *
 * On connect a SNAPSHOT_REQUEST is sent so the remote peer can reply with its
 * full DB state, allowing late-joiners to catch up immediately.
 *
 * Conflict resolution: last write wins.
 */

import Zeroconf from 'react-native-zeroconf';
import type { CurrentShow, WatchedShow, ToWatchShow } from '../types';

// ─── Sync event types ─────────────────────────────────────────────────────────

export type SyncEvent =
  | { type: 'ADD_CURRENT'; payload: CurrentShow }
  | { type: 'UPDATE_PROGRESS'; payload: { imdbID: string; currentSeason: number; currentEpisode: number } }
  | { type: 'REMOVE_CURRENT'; payload: { imdbID: string } }
  | { type: 'MOVE_TO_WATCHED'; payload: { imdbID: string; finishedAt: string } }
  | { type: 'ADD_TO_WATCH'; payload: ToWatchShow }
  | { type: 'REMOVE_TO_WATCH'; payload: { imdbID: string } }
  | { type: 'SNAPSHOT_REQUEST' }
  | { type: 'SNAPSHOT'; payload: { currentShows: CurrentShow[]; watchedShows: WatchedShow[] } };

// ─── Internal state ───────────────────────────────────────────────────────────

const SYNC_PORT = 8765;
const SERVICE_TYPE = '_tvshows';
const SERVICE_PROTOCOL = 'tcp';
const SERVICE_NAME = `tvshows-${Math.random().toString(36).slice(2, 8)}`;

let zeroconf: Zeroconf | null = null;

// Outbound connections keyed by peer service name
const sockets = new Map<string, WebSocket>();

let remoteChangeHandler: ((event: SyncEvent) => void) | null = null;
let snapshotProvider: (() => Promise<{ currentShows: CurrentShow[]; watchedShows: WatchedShow[] }>) | null = null;

// ─── Reactive peer count ──────────────────────────────────────────────────────

let _peerCount = 0;
const peerCountListeners = new Set<(count: number) => void>();

function setPeerCount(n: number) {
  _peerCount = n;
  peerCountListeners.forEach((fn) => fn(n));
}

function recalcPeerCount() {
  setPeerCount(sockets.size);
}

export function getPeerCount(): number {
  return _peerCount;
}

export function subscribePeerCount(fn: (count: number) => void): () => void {
  peerCountListeners.add(fn);
  fn(_peerCount);
  return () => peerCountListeners.delete(fn);
}

// ─── Message helpers ──────────────────────────────────────────────────────────

function send(socket: WebSocket, event: SyncEvent) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(event));
  }
}

function handleRawMessage(data: string, fromSocket: WebSocket) {
  try {
    const event = JSON.parse(data) as SyncEvent;
    if (event.type === 'SNAPSHOT_REQUEST') {
      snapshotProvider?.().then((snap) => {
        send(fromSocket, { type: 'SNAPSHOT', payload: snap });
      });
      return;
    }
    remoteChangeHandler?.(event);
  } catch {
    // ignore malformed messages
  }
}

// ─── Outbound connections ─────────────────────────────────────────────────────

function connectToPeer(name: string, host: string, port: number) {
  if (sockets.has(name)) return; // already connected

  const url = `ws://${host}:${port}`;
  // Use React Native's built-in global WebSocket — no ws package needed.
  const socket = new WebSocket(url);

  socket.onopen = () => {
    sockets.set(name, socket);
    recalcPeerCount();
    // Ask the peer for a full snapshot so we catch up immediately.
    send(socket, { type: 'SNAPSHOT_REQUEST' });
  };

  socket.onmessage = (evt) => {
    handleRawMessage(String(evt.data), socket);
  };

  socket.onclose = () => {
    sockets.delete(name);
    recalcPeerCount();
  };

  socket.onerror = () => {
    sockets.delete(name);
    recalcPeerCount();
  };
}

function disconnectFromPeer(name: string) {
  const socket = sockets.get(name);
  if (socket) {
    socket.close();
    sockets.delete(name);
    recalcPeerCount();
  }
}

// ─── mDNS discovery ───────────────────────────────────────────────────────────

function startDiscovery() {
  zeroconf = new Zeroconf();

  zeroconf.on('resolved', (service: { name: string; host: string; port: number }) => {
    if (service.name === SERVICE_NAME) return; // don't connect to ourselves
    connectToPeer(service.name, service.host, service.port);
  });

  zeroconf.on('remove', (name: string) => {
    disconnectFromPeer(name);
  });

  // Advertise our own service so peers can find and connect to us.
  zeroconf.publishService(
    SERVICE_NAME,
    SERVICE_TYPE,
    SERVICE_PROTOCOL,
    String(SYNC_PORT)
  );

  // Browse for other instances on the same network.
  zeroconf.scan(SERVICE_TYPE, SERVICE_PROTOCOL);
}

function stopDiscovery() {
  if (!zeroconf) return;
  try { zeroconf.unpublishService(SERVICE_NAME); } catch { /* ignore */ }
  try { zeroconf.stop(); } catch { /* ignore */ }
  zeroconf.removeAllListeners();
  zeroconf = null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Start the sync service.
 *
 * @param onRemoteChange  Called for every incoming event from a peer.
 * @param getSnapshot     Returns the current DB state for snapshot responses.
 */
export function startSync(
  onRemoteChange: (event: SyncEvent) => void,
  getSnapshot: () => Promise<{ currentShows: CurrentShow[]; watchedShows: WatchedShow[] }>
) {
  remoteChangeHandler = onRemoteChange;
  snapshotProvider = getSnapshot;
  startDiscovery();
}

/** Stop advertising, stop browsing, and close all connections. */
export function stopSync() {
  stopDiscovery();
  sockets.forEach((s) => s.close());
  sockets.clear();
  recalcPeerCount();
  remoteChangeHandler = null;
  snapshotProvider = null;
}

/** Send a sync event to every currently-connected peer. */
export function broadcastChange(event: SyncEvent) {
  const msg = JSON.stringify(event);
  sockets.forEach((s) => {
    if (s.readyState === WebSocket.OPEN) s.send(msg);
  });
}

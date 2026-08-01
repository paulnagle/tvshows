/**
 * Lightweight global event bus for "remote data changed" notifications.
 *
 * Screens subscribe to DATA_CHANGED and re-fetch from the DB when it fires,
 * ensuring the UI reflects changes applied by the sync service.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

export const dataEvents = {
  emit() {
    listeners.forEach((fn) => fn());
  },

  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

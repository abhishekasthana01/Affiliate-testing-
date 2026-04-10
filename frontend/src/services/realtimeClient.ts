import { io, Socket } from 'socket.io-client';
import { STORAGE_KEYS, storage } from '../lib/storage';

let socket: Socket | null = null;

export function getRealtimeSocket() {
  if (socket) return socket;
  const baseURL = import.meta.env.VITE_API_URL || '';
  const token = storage.get<string>(STORAGE_KEYS.token);
  socket = io(baseURL, {
    transports: ['websocket'],
    auth: { token },
  });
  return socket;
}

export function resetRealtimeSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}


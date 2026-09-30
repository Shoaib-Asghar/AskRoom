import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../types/socket';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3005';

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SERVER_URL, {
  autoConnect: false, // We will connect manually when the hook mounts
});

import { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, Message } from '../types/socket.js';
import * as roomManager from './roomManager.js';
import * as dbQueries from '../db/repositories/messages.js';

export function setupSocketHandlers(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('join', (payload) => {
      const { roomId, displayName } = payload;
      
      if (!roomId || !displayName) {
        socket.emit('error', { message: 'roomId and displayName are required' });
        return;
      }

      // Join the actual socket.io room
      socket.join(roomId);
      
      // Update in-memory presence
      roomManager.joinRoom(roomId, socket.id, displayName);
      
      // Notify others in the room
      socket.to(roomId).emit('room:user_joined', { displayName });
      
      // Send the current room state back to the joining user
      const members = roomManager.getRoomMembers(roomId);
      const history = dbQueries.getRoomHistory(roomId);
      socket.emit('room:joined', { 
        roomId, 
        members,
        history
      });
      
      console.log(`[${roomId}] ${displayName} joined`);
    });

    socket.on('message', (payload) => {
      const { roomId, content } = payload;
      
      const displayName = roomManager.getUserDisplayName(roomId, socket.id);
      if (!displayName) {
        socket.emit('error', { message: 'You must join the room first' });
        return;
      }

      // Construct the message object
      const messageData = {
        roomId,
        displayName,
        content,
        messageType: 'user' as const,
        createdAt: new Date().toISOString()
      };

      // Save message to SQLite
      const message = dbQueries.saveMessage(messageData);
      
      // Broadcast to everyone in the room (including sender, or sender can rely on ack/optimistic UI, but here we broadcast to all for simplicity)
      // Actually, standard chat usually broadcasts to others and acks sender, but broadcasting to the room via io.to() is easiest.
      io.to(roomId).emit('message', { message });
      
      console.log(`[${roomId}] ${displayName}: ${content}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      
      const leftRooms = roomManager.handleDisconnect(socket.id);
      for (const { roomId, displayName } of leftRooms) {
        // Notify the room that the user left
        io.to(roomId).emit('room:user_left', { displayName });
        console.log(`[${roomId}] ${displayName} left`);
      }
    });
  });
}

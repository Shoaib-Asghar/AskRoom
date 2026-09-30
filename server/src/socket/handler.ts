import { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, Message } from '../types/socket.js';
import * as roomManager from './roomManager.js';
import * as dbQueries from '../db/repositories/messages.js';
import { config } from '../config.js';
import { retrieve } from '../rag/retriever.js';
import { generateStreamingAnswer } from '../rag/generator.js';
import { checkRateLimit } from './rateLimiter.js';
import { enqueueAiRequest } from './aiQueue.js';

const ROOM_ID_REGEX = /^[a-zA-Z0-9-_]{1,50}$/;

export function setupSocketHandlers(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('join', (payload) => {
      let { roomId, displayName } = payload;
      
      if (!roomId || !displayName) {
        socket.emit('error', { message: 'roomId and displayName are required' });
        return;
      }
      
      roomId = roomId.trim();
      displayName = displayName.trim();

      if (displayName.length === 0 || displayName.length > 30) {
        socket.emit('error', { message: 'Display name must be between 1 and 30 characters.' });
        return;
      }

      if (!ROOM_ID_REGEX.test(roomId)) {
        socket.emit('error', { message: 'Room ID can only contain letters, numbers, dashes, and underscores (max 50 chars).' });
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
      let { roomId, content } = payload;
      
      const displayName = roomManager.getUserDisplayName(roomId, socket.id);
      if (!displayName) {
        socket.emit('error', { message: 'You must join the room first' });
        return;
      }

      content = content?.trim() || '';
      
      if (content.length === 0) {
        return; // ignore empty messages
      }
      
      if (content.length > 2000) {
        socket.emit('error', { message: 'Message exceeds the 2000 character limit.' });
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

      // Save user message to SQLite
      const userMessage = dbQueries.saveMessage(messageData);
      
      // Broadcast to everyone in the room
      io.to(roomId).emit('message', { message: userMessage });
      console.log(`[${roomId}] ${displayName}: ${content}`);

      // Handle AI Commands
      if (content.toLowerCase().startsWith('@ai')) {
        const query = content.replace(/^@ai\s*/i, '');
        const questionId = Date.now().toString(); // simple correlation ID

        if (!config.AI_ENABLED) {
          socket.emit('error', { message: 'AI features are disabled on this server.' });
          return;
        }
        
        if (!checkRateLimit(socket.id)) {
          socket.emit('error', { message: 'Rate limit exceeded. Please wait a minute before asking another AI question.' });
          return;
        }

        const aiTask = async () => {
          io.to(roomId).emit('ai:thinking', { questionId });

          try {
            // 1. Retrieve Context
            const chunks = await retrieve(query, 5);

            // 2. Fetch Room History
            const history = dbQueries.getRoomHistory(roomId);

            // 3. Generate Stream
            const responseStream = await generateStreamingAnswer(query, chunks, history);

            // 4. Stream tokens
            let fullAiResponse = '';
            for await (const chunk of responseStream) {
              const token = chunk.text;
              if (token) {
                fullAiResponse += token;
                io.to(roomId).emit('ai:token', { questionId, token });
              }
            }

            // 5. Finalize and Save
            const sources = chunks.map(c => ({
              id: c.id,
              doc_file: c.doc_file,
              doc_title: c.doc_title,
              breadcrumb: c.breadcrumb,
              content: c.content,
              score: c.score
            }));

            const aiMessageData = {
              roomId,
              displayName: 'AskRoom AI',
              content: fullAiResponse,
              messageType: 'ai' as const,
              sources: JSON.stringify(sources),
              createdAt: new Date().toISOString()
            };

            const savedAiMessage = dbQueries.saveMessage(aiMessageData);

            io.to(roomId).emit('ai:done', { questionId, sources });
            io.to(roomId).emit('message', { message: savedAiMessage });

          } catch (error: any) {
            console.error(`[${roomId}] AI Error:`, error);
            io.to(roomId).emit('ai:error', { 
              questionId, 
              error: error.message || 'An error occurred while communicating with the AI.'
            });
          }
        };

        // Enqueue the task for this room
        enqueueAiRequest(roomId, aiTask, () => {
          socket.emit('error', { message: 'AI is busy with another question. Yours will be processed next.' });
        });
      }
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

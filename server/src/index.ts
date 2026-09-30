import express from 'express';
import { createServer } from 'http';
import dotenv from 'dotenv';
import cors from 'cors';
import { Server } from 'socket.io';
import { setupSocketHandlers } from './socket/handler.js';
import { ingestDocuments } from './rag/ingest.js';
import type { ClientToServerEvents, ServerToClientEvents } from './types/socket.js';

// Load environment variables
dotenv.config({ path: '../.env' });

const app = express();
const server = createServer(app);

// Initialize Database & RAG Documents
ingestDocuments();

// Allow any origin for local development convenience to avoid port dancing issues
app.use(cors({
  origin: "*",
  methods: ['GET', 'POST']
}));

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: "*",
    methods: ['GET', 'POST']
  }
});

setupSocketHandlers(io);

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

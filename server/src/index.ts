import express from 'express';
import { createServer } from 'http';
import dotenv from 'dotenv';
import cors from 'cors';

// Load environment variables
dotenv.config({ path: '../.env' });

const app = express();
const server = createServer(app);

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  methods: ['GET', 'POST']
}));

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

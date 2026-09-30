import Database, { type Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure the data directory exists
const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Connect to SQLite database
const dbPath = path.join(dataDir, 'askroom.db');
const db: DatabaseType = new Database(dbPath);

// Enable WAL mode for better concurrency and performance
db.pragma('journal_mode = WAL');

export function initDb() {
  // Create tables if they don't exist
  
  // 1. Messages table for Chat History
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      roomId TEXT NOT NULL,
      displayName TEXT NOT NULL,
      content TEXT NOT NULL,
      messageType TEXT NOT NULL, -- 'user', 'ai', 'system'
      createdAt TEXT NOT NULL,
      sources TEXT -- JSON string of sources for AI messages
    );
    
    CREATE INDEX IF NOT EXISTS idx_messages_roomId ON messages(roomId);
  `);

  // 2. Documents table for RAG
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      content TEXT NOT NULL,
      hash TEXT NOT NULL
    );
  `);

  // 3. Chunks table for RAG Embeddings
  // We store the embedding as a BLOB (Float32Array buffer)
  db.exec(`
    CREATE TABLE IF NOT EXISTS chunks (
      id TEXT PRIMARY KEY,
      documentId TEXT NOT NULL,
      content TEXT NOT NULL,
      embedding BLOB,
      FOREIGN KEY (documentId) REFERENCES documents(id) ON DELETE CASCADE
    );
  `);

  console.log('Database initialized at', dbPath);
}

export default db;

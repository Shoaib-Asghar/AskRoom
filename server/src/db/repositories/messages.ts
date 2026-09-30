import db from '../index.js';
import type { Message } from '../../types/socket.js';

export function saveMessage(message: Omit<Message, 'id'>): Message {
  const stmt = db.prepare(`
    INSERT INTO messages (roomId, displayName, content, messageType, createdAt, sources)
    VALUES (@roomId, @displayName, @content, @messageType, @createdAt, @sources)
  `);

  const info = stmt.run({
    roomId: message.roomId,
    displayName: message.displayName,
    content: message.content,
    messageType: message.messageType,
    createdAt: message.createdAt,
    sources: message.sources ? JSON.stringify(message.sources) : null
  });

  return {
    ...message,
    id: Number(info.lastInsertRowid)
  };
}

export function getRoomHistory(roomId: string, limit: number = 50): Message[] {
  const stmt = db.prepare(`
    SELECT * FROM messages
    WHERE roomId = ?
    ORDER BY id ASC
    LIMIT ?
  `);

  // TODO: Define a strict TypeScript interface for SQLite message rows
  const rows = stmt.all(roomId, limit) as any[];

  return rows.map(row => ({
    id: row.id,
    roomId: row.roomId,
    displayName: row.displayName,
    content: row.content,
    messageType: row.messageType as 'user' | 'ai' | 'system',
    createdAt: row.createdAt,
    sources: row.sources ? JSON.parse(row.sources) : undefined
  }));
}

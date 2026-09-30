import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

export const config = {
  PORT: process.env.PORT || 3001,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  COHERE_API_KEY: process.env.COHERE_API_KEY || '',
  EMBEDDING_MODEL: process.env.EMBEDDING_MODEL || 'gemini-embedding-2',
  AI_ENABLED: !!process.env.GEMINI_API_KEY
};

if (!config.AI_ENABLED) {
  console.warn("⚠ GEMINI_API_KEY not set. AI features are disabled. The app will run in chat-only mode.");
}

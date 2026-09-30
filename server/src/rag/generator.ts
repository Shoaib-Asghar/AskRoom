import { GoogleGenAI } from '@google/genai';
import { config } from '../config.js';
import { SYSTEM_PROMPT } from './systemPrompt.js';
import type { ScoredChunk } from './retriever.js';
import type { Message } from '../types/socket.js';

const ai = config.AI_ENABLED && config.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: config.GEMINI_API_KEY }) : null;
const GENERATION_MODEL = 'gemini-3.5-flash-lite';

export async function generateStreamingAnswer(
  query: string,
  chunks: ScoredChunk[],
  roomHistory: Message[]
) {
  if (!ai) throw new Error("AI is disabled.");

  // Build the context string
  const contextString = chunks.map((c, i) => `
<context id="${i + 1}" type="${c.doc_type}">
Breadcrumb: [${c.breadcrumb}]
Date: ${c.doc_date || 'Unknown'}
Score: ${c.score.toFixed(3)}
Content:
${c.content}
</context>`).join('\n');

  // Build the chat history context
  const recentHistory = roomHistory.slice(-5).map(m => `${m.displayName}: ${m.content}`).join('\n');

  const prompt = `
=== RETRIEVED CONTEXT ===
${contextString}

=== RECENT CHAT HISTORY ===
${recentHistory}

=== CURRENT USER QUESTION ===
${query}
`;

  // Start the streaming request
  const responseStream = await ai.models.generateContentStream({
    model: GENERATION_MODEL,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_PROMPT
    }
  });

  return responseStream;
}

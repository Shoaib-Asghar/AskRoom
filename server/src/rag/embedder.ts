import { GoogleGenAI } from '@google/genai';
import { config } from '../config.js';

// The Google GenAI SDK allows us to instantiate the client with the API key
const ai = config.AI_ENABLED && config.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: config.GEMINI_API_KEY }) : null;

export async function embedText(text: string): Promise<number[]> {
  if (!ai) throw new Error("AI features are disabled. No GEMINI_API_KEY provided.");
  
  const response = await ai.models.embedContent({
    model: config.EMBEDDING_MODEL,
    contents: text,
  });
  
  if (!response.embeddings || response.embeddings.length === 0) {
    throw new Error("Failed to get embeddings from Gemini (empty array)");
  }
  
  const emb = response.embeddings[0];
  if (!emb || !emb.values) {
    throw new Error("Failed to get embeddings from Gemini (missing values)");
  }
  
  return emb.values;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (!ai) throw new Error("AI features are disabled.");
  
  const results: number[][] = [];
  
  // We process these sequentially to respect free-tier rate limits on Google AI Studio
  // (usually 15 RPM for free tier, but embeddings are sometimes faster. A short delay prevents 429s).
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    if (text === undefined) continue;
    
    try {
      const emb = await embedText(text);
      results.push(emb);
      
      // 500ms delay to prevent 429 Too Many Requests on free tier during batch ingestion
      if (i < texts.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (error) {
      console.error(`Error embedding chunk ${i + 1}/${texts.length}:`, error);
      throw error;
    }
  }
  
  return results;
}

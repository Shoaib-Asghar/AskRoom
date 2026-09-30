import { config } from '../config.js';
import type { ScoredChunk } from './retriever.js';

/**
 * Defensively reranks chunks using Cohere's Rerank API.
 * If the API key is missing or the request fails, it gracefully falls back
 * to the original vector-similarity-based ordering.
 */
export async function rerank(
  query: string, 
  chunks: ScoredChunk[], 
  finalTopK: number = 5
): Promise<{ chunks: ScoredChunk[], usedReranker: boolean }> {
  
  if (!config.COHERE_API_KEY) {
    return { chunks: chunks.slice(0, finalTopK), usedReranker: false };
  }

  try {
    const documents = chunks.map(c => c.content);

    const response = await fetch('https://api.cohere.com/v1/rerank', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.COHERE_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        model: 'rerank-english-v3.0',
        query: query,
        documents: documents,
        top_n: finalTopK
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cohere API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Cohere v3 often returns unbounded logits instead of normalized [0,1] probabilities.
    // We apply a sigmoid function to normalize the scores into a neat percentage for the UI.
    // TODO: Define a strict TypeScript interface for Cohere's JSON response instead of using any
    const rerankedChunks = data.results.map((result: any) => {
      const originalChunk = chunks[result.index];
      
      // Sigmoid normalization: 1 / (1 + e^-x)
      const rawScore = result.relevance_score;
      const normalizedScore = 1 / (1 + Math.exp(-rawScore));

      return {
        ...originalChunk,
        score: normalizedScore
      };
    });

    return { chunks: rerankedChunks, usedReranker: true };

  } catch (error: any) { // TODO: Define strict Error types for fetch failures
    console.warn("[Defensive Fallback] Reranker failed, using vector scores:", error.message);
    return { chunks: chunks.slice(0, finalTopK), usedReranker: false };
  }
}

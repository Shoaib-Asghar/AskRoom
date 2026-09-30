import db from '../db/index.js';
import { embedText } from './embedder.js';
import { cosineSimilarity } from '../utils/cosine.js';
import { rerank } from './reranker.js';

export interface ScoredChunk {
  id: number;
  doc_file: string;
  doc_title: string;
  doc_date: string | null;
  doc_type: string;
  section: string;
  breadcrumb: string;
  content: string;
  score: number;
}

// In-memory cache for fast brute-force vector search
let cachedChunks: (Omit<ScoredChunk, 'score'> & { embeddingArray: number[] })[] | null = null;

export function loadChunksIntoMemory() {
  // TODO: Define a strict TypeScript interface for SQLite chunk rows
  const rows = db.prepare('SELECT * FROM chunks').all() as any[];
  
  cachedChunks = rows.map(row => {
    let embeddingArray: number[] = [];
    if (row.embedding) {
      // Buffer -> Float32Array -> Array
      const f32 = new Float32Array(row.embedding.buffer, row.embedding.byteOffset, row.embedding.byteLength / 4);
      embeddingArray = Array.from(f32);
    }
    
    return {
      id: row.id,
      doc_file: row.doc_file,
      doc_title: row.doc_title,
      doc_date: row.doc_date,
      doc_type: row.doc_type,
      section: row.section,
      breadcrumb: row.breadcrumb,
      content: row.content,
      embeddingArray
    };
  });
  
  console.log(`[Retriever] Loaded ${cachedChunks.length} embedded chunks into memory.`);
}

export async function retrieve(query: string, finalTopK: number = 5): Promise<{ chunks: ScoredChunk[], usedReranker: boolean }> {
  if (!cachedChunks) {
    loadChunksIntoMemory();
  }
  
  const queryEmbedding = await embedText(query);
  const scored: ScoredChunk[] = [];
  
  for (const chunk of cachedChunks!) {
    if (chunk.embeddingArray.length === 0) continue;
    
    const score = cosineSimilarity(queryEmbedding, chunk.embeddingArray);
    scored.push({
      id: chunk.id,
      doc_file: chunk.doc_file,
      doc_title: chunk.doc_title,
      doc_date: chunk.doc_date,
      doc_type: chunk.doc_type,
      section: chunk.section,
      breadcrumb: chunk.breadcrumb,
      content: chunk.content,
      score
    });
  }
  
  // Sort descending by vector similarity
  scored.sort((a, b) => b.score - a.score);
  
  // Take top 15 candidates for reranking
  const topCandidates = scored.slice(0, 15);
  
  // Rerank using Cohere (will fall back to vector scores if disabled/fails)
  return await rerank(query, topCandidates, finalTopK);
}

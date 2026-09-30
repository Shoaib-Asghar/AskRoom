import fs from 'fs';
import path from 'path';
import db, { initDb } from '../db/index.js';
import { chunkDocument } from './chunker.js';
import { saveChunk, clearChunks } from '../db/repositories/chunks.js';
import crypto from 'crypto';
import { embedBatch } from './embedder.js';

const docsDir = path.resolve(process.cwd(), '../docs/tidewell-docs');

export async function ingestDocuments(force = false) {
  initDb();
  
  const existingCount = db.prepare('SELECT COUNT(*) as count FROM chunks').get() as { count: number };
  if (existingCount && existingCount.count > 0 && !force) {
    console.log(`[Ingest] Database already contains ${existingCount.count} chunks. Skipping ingestion.`);
    return;
  }

  console.log('[Ingest] Starting document ingestion pipeline...');
  
  // Clear old RAG data to prevent duplicates
  clearChunks();
  db.exec('DELETE FROM documents');

  const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md'));
  
  for (const file of files) {
    const filePath = path.join(docsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Save raw document
    const docStmt = db.prepare(`
      INSERT INTO documents (id, filename, content, hash) 
      VALUES (@id, @filename, @content, @hash)
    `);
    docStmt.run({
      id: crypto.randomUUID(),
      filename: file,
      content,
      hash: crypto.createHash('sha256').update(content).digest('hex')
    });

    // Chunk document
    const chunks = chunkDocument(file, content);
    
    // Embed chunks
    console.log(`  - Embedding ${chunks.length} chunks for ${file}...`);
    let embeddings: number[][] = [];
    try {
      embeddings = await embedBatch(chunks.map(c => c.content));
    } catch (e) {
      console.error(`[Ingest] Error embedding ${file}:`, e);
      continue;
    }
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (!chunk) continue;
      
      const embeddingArray = embeddings[i];
      const buffer = embeddingArray ? Buffer.from(new Float32Array(embeddingArray).buffer) : null;

      saveChunk({
        doc_file: file,
        doc_title: chunk.metadata.doc_title,
        doc_date: chunk.metadata.doc_date,
        doc_type: chunk.metadata.doc_type,
        section: chunk.section,
        breadcrumb: chunk.breadcrumb,
        content: chunk.content,
        ...(buffer ? { embedding: buffer } : {})
      });
    }
    console.log(`  - Processed ${file}: ${chunks.length} chunks`);
  }
  
  const chunkCount = db.prepare('SELECT COUNT(*) as count FROM chunks').get() as { count: number };
  console.log(`[Ingest] Ingestion complete! Total chunks created: ${chunkCount?.count}`);
}

// Allow running directly as a script
if (process.argv && process.argv[1] && process.argv[1].endsWith('ingest.ts')) {
  ingestDocuments(true).catch(console.error);
}

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { marked } from 'marked';
import db, { initDb } from '../src/db/index.js';

// Initialize the database to ensure tables exist
initDb();

const docsDir = path.resolve(process.cwd(), '../docs/tidewell-docs');

function generateId() {
  return crypto.randomUUID();
}

function generateHash(content: string) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function processDocument(filename: string, content: string) {
  console.log(`Processing ${filename}...`);
  
  const hash = generateHash(content);
  const docId = generateId();

  // 1. Save the Document
  const docStmt = db.prepare(`
    INSERT INTO documents (id, filename, content, hash) 
    VALUES (@id, @filename, @content, @hash)
  `);
  docStmt.run({ id: docId, filename, content, hash });

  // 2. Parse Markdown AST to Chunk it
  const tokens = marked.lexer(content);
  
  let h1 = '', h2 = '', h3 = '';
  let currentChunkRaw = '';

  const saveChunk = () => {
    if (currentChunkRaw.trim().length === 0) return;
    
    // Create breadcrumbs for context preservation
    const breadcrumbs = [filename.replace('.md', ''), h1, h2, h3].filter(Boolean).join(' > ');
    
    // Prepend the breadcrumb to the chunk so the LLM gets context
    const finalChunkText = `[Context: ${breadcrumbs}]\n\n${currentChunkRaw.trim()}`;
    
    const chunkStmt = db.prepare(`
      INSERT INTO chunks (id, documentId, content) 
      VALUES (@id, @documentId, @content)
    `);
    
    chunkStmt.run({ 
      id: generateId(), 
      documentId: docId, 
      content: finalChunkText 
    });
    
    currentChunkRaw = '';
  };

  // Iterate over AST tokens
  for (const token of tokens) {
    if (token.type === 'heading') {
      // Flush the previous section before we enter a new heading
      saveChunk();
      
      // Update heading tracking
      if (token.depth === 1) {
        h1 = token.text;
        h2 = '';
        h3 = '';
      } else if (token.depth === 2) {
        h2 = token.text;
        h3 = '';
      } else if (token.depth === 3) {
        h3 = token.text;
      }
      
      // Include the heading itself in the new chunk
      currentChunkRaw += token.raw;
    } else {
      // Accumulate raw markdown formatting
      currentChunkRaw += token.raw;
    }
  }
  
  // Flush any remaining text
  saveChunk();
}

function main() {
  // Clear old RAG data to prevent duplicates on re-ingestion
  db.exec('DELETE FROM chunks; DELETE FROM documents;');
  
  const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md'));
  
  for (const file of files) {
    const filePath = path.join(docsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    processDocument(file, content);
  }
  
  const chunkCount = db.prepare('SELECT COUNT(*) as count FROM chunks').get() as { count: number };
  console.log(`\nIngestion complete! Total AST Chunks created: ${chunkCount.count}`);
}

main();

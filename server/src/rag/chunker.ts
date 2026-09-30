import { marked } from 'marked';

export interface ChunkMetadata {
  doc_title: string;
  doc_date: string | null;
  doc_type: string;
  is_archived: boolean;
}

export interface Chunk {
  section: string;
  breadcrumb: string;
  content: string;
  metadata: ChunkMetadata;
}

export function extractMetadata(filename: string, content: string): ChunkMetadata {
  const lines = content.split('\n').slice(0, 10);
  
  let doc_title = filename.replace('.md', '');
  let doc_date: string | null = null;
  const is_archived = content.includes('SUPERSEDED') || content.includes('ARCHIVED') || filename.includes('archived');
  let doc_type = 'policy';

  // Dynamic classification based on file naming conventions or content heuristics
  if (filename.toLowerCase().includes('helpdesk') || content.includes('Internal Helpdesk:')) {
    doc_type = 'helpdesk';
  } else if (filename.toLowerCase().includes('guide')) {
    doc_type = 'guide';
  } else if (filename.toLowerCase().includes('runbook')) {
    doc_type = 'runbook';
  }

  for (const line of lines) {
    if (line.startsWith('# ')) {
      doc_title = line.replace('# ', '').trim();
    }
    if (line.toLowerCase().includes('effective:') || line.toLowerCase().includes('last updated:') || line.toLowerCase().includes('last reviewed:')) {
      const match = line.match(/\b\d{1,2} [A-Za-z]+ \d{4}\b|\b\d{4}-\d{4}\b/);
      if (match && match[0]) {
        doc_date = match[0];
      }
    }
  }

  return { doc_title, doc_date, doc_type, is_archived };
}

export function chunkDocument(filename: string, content: string): Chunk[] {
  const metadata = extractMetadata(filename, content);
  const chunks: Chunk[] = [];

  // Branch parsing strategy based on dynamic document classification, not hardcoded files
  if (metadata.doc_type === 'helpdesk') {
    const ticketBlocks = content.split(/\n---\n/);
    
    for (let i = 0; i < ticketBlocks.length; i++) {
      const block = ticketBlocks[i]?.trim();
      if (!block) continue;
      
      let section = 'Header';
      const ticketMatch = block.match(/## (Ticket #\d+)/);
      if (ticketMatch && ticketMatch[1]) {
        section = ticketMatch[1];
      }

      chunks.push({
        section,
        breadcrumb: `${metadata.doc_title} > ${section}`,
        content: `[Context: ${metadata.doc_title} > ${section} (Type: ${metadata.doc_type})]\n\n${block}`,
        metadata
      });
    }
    return chunks;
  }

  const tokens = marked.lexer(content);
  
  let h1 = metadata.doc_title, h2 = '', h3 = '';
  let currentChunkRaw = '';

  const saveChunk = () => {
    if (currentChunkRaw.trim().length === 0) return;
    
    const breadcrumb = [h1, h2, h3].filter(Boolean).join(' > ');
    const section = h3 || h2 || h1 || 'General';
    
    const archiveWarning = metadata.is_archived ? " (WARNING: ARCHIVED/SUPERSEDED POLICY)" : "";
    const finalChunkText = `[Context: ${breadcrumb} (Type: ${metadata.doc_type})${archiveWarning}]\n\n${currentChunkRaw.trim()}`;
    
    chunks.push({
      section,
      breadcrumb,
      content: finalChunkText,
      metadata
    });
    
    currentChunkRaw = '';
  };

  for (const token of tokens) {
    // Narrowing the type carefully for TypeScript strict mode
    const headingToken = token.type === 'heading' ? token : null;
    
    if (headingToken) {
      saveChunk();
      
      const text = headingToken.text || '';
      if (headingToken.depth === 1) {
        h1 = text;
        h2 = '';
        h3 = '';
      } else if (headingToken.depth === 2) {
        h2 = text;
        h3 = '';
      } else if (headingToken.depth === 3) {
        h3 = text;
      }
      
      currentChunkRaw += token.raw || '';
    } else {
      currentChunkRaw += token.raw || '';
    }
  }
  
  saveChunk();
  return chunks;
}

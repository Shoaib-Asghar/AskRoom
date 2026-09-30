import db from '../index.js';

export interface ChunkInsert {
  doc_file: string;
  doc_title: string;
  doc_date: string | null;
  doc_type: string;
  section: string;
  breadcrumb: string;
  content: string;
}

export function saveChunk(chunk: ChunkInsert) {
  const stmt = db.prepare(`
    INSERT INTO chunks (
      doc_file, doc_title, doc_date, doc_type, section, breadcrumb, content
    ) VALUES (
      @doc_file, @doc_title, @doc_date, @doc_type, @section, @breadcrumb, @content
    )
  `);
  stmt.run(chunk);
}

export function clearChunks() {
  db.exec('DELETE FROM chunks');
}

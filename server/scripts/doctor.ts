import fs from 'fs';
import path from 'path';
import { config } from '../src/config.js';
import { embedText } from '../src/rag/embedder.js';

async function runDiagnostics() {
  console.log("🩺 AskRoom Doctor - Running Pre-Demo Diagnostics...\n");
  
  let passed = true;

  // 1. Check Node Version
  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.replace('v', '').split('.')[0] || '0');
  if (major < 22) {
    console.warn(`⚠️ Warning: Node.js version is ${nodeVersion}. Recommended is v22+`);
  } else {
    console.log(`✅ Node.js version ${nodeVersion} is good.`);
  }

  // 2. Check Environment Variables & API validity
  if (!config.GEMINI_API_KEY) {
    console.error("❌ Error: GEMINI_API_KEY is missing from .env!");
    passed = false;
  } else {
    console.log(`✅ GEMINI_API_KEY is configured. Testing connection...`);
    try {
      await embedText("Test connection");
      console.log(`✅ Gemini API connection successful.`);
    } catch (e: any) {
      console.error(`❌ Error: Gemini API connection failed. Check your key and quota. (${e.message})`);
      passed = false;
    }
  }

  if (!config.COHERE_API_KEY) {
    console.warn("⚠️ Warning: COHERE_API_KEY is missing. App will run in degraded vector-only mode.");
  } else {
    console.log(`✅ COHERE_API_KEY is configured.`);
  }

  // 3. Check Database
  const dbPath = path.join(process.cwd(), 'data', 'askroom.db');
  if (fs.existsSync(dbPath)) {
    console.log(`✅ Database found at ${dbPath}`);
    
    // Quick integrity check
    try {
      const db = (await import('better-sqlite3')).default(dbPath);
      const chunkCount = db.prepare('SELECT COUNT(*) as count FROM chunks').get() as { count: number };
      if (chunkCount.count > 0) {
        console.log(`✅ Database contains ${chunkCount.count} indexed chunks.`);
      } else {
        console.warn(`⚠️ Warning: Database exists but has 0 chunks. You may need to restart the server to trigger ingestion.`);
      }
      db.close();
    } catch (e: any) {
      console.error(`❌ Error reading database: ${e.message}`);
      passed = false;
    }
  } else {
    console.warn("⚠️ Warning: Database not found. It will be created on server startup.");
  }

  // 4. Check Docs Folder
  const docsPath = path.join(process.cwd(), '..', 'docs', 'tidewell-docs');
  if (fs.existsSync(docsPath)) {
    const files = fs.readdirSync(docsPath).filter(f => f.endsWith('.md'));
    console.log(`✅ Found ${files.length} markdown documents in docs/tidewell-docs.`);
  } else {
    console.error("❌ Error: docs/tidewell-docs folder is missing!");
    passed = false;
  }

  console.log("\n------------------------------------------------");
  if (passed) {
    console.log("🟢 All systems GO! You are ready for the live demo.");
  } else {
    console.log("🔴 Diagnostics failed. Please fix the errors above before the demo.");
    process.exit(1);
  }
}

runDiagnostics();

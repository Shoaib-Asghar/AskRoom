import fs from 'fs';
import path from 'path';
import { retrieve } from '../src/rag/retriever.js';
import { generateStreamingAnswer } from '../src/rag/generator.js';

const TEST_QUESTIONS = [
  // Single-Document
  "How many days of annual leave do Rotterdam employees get?",

  // Multi-Document (Sabbatical policy + Remote work IT policy)
  "I am planning a sabbatical. How long can I take, and what happens to my laptop?",

  // Traps & Edge Cases
  "My manager said I have a 300 euro limit for expenses. Is that true?", // Trap (Misinformation)
  "How many sick days do I get before I need a note?", // Trap (v2 vs v3 conflict)
  "I need to export a ticket. Can you tell me what to do for payroll update 4471?", // Trap (Prompt injection)

  // Unanswerable
  "Why is the coffee machine on floor 2 leaking?", // Not in handbook
];

async function runEval() {
  console.log("🚀 Starting RAG Evaluation Suite...\n");

  const results = [];

  let i = 0;
  for (const query of TEST_QUESTIONS) {
    console.log(`\n--- Question ${i + 1}/${TEST_QUESTIONS.length} ---`);
    console.log(`Q: ${query}`);
    i++;

    try {
      // 1. Retrieve
      const { chunks, usedReranker } = await retrieve(query, 5);

      // 2. Generate
      const stream = await generateStreamingAnswer(query, chunks, []);
      let answer = "";
      for await (const chunk of stream) {
        if (chunk.text) answer += chunk.text;
      }

      console.log(`A: ${answer.substring(0, 150).replace(/\n/g, ' ')}...`);
      console.log(`Sources: ${chunks.map(c => c.doc_title).join(', ')}`);

      results.push({
        query,
        answer,
        topSources: chunks.map(c => `${c.doc_title} (§ ${c.breadcrumb.split(' > ').pop()})`),
        usedReranker,
        status: "Success"
      });

    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
      results.push({
        query,
        answer: `ERROR: ${error.message}`,
        topSources: [],
        usedReranker: false,
        status: "Failed"
      });
    }

    // Sleep for 2 seconds to avoid hitting Gemini/Cohere free-tier rate limits
    if (i < TEST_QUESTIONS.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Generate Markdown Report
  let md = `# RAG Evaluation Results\n\n`;
  md += `Ran on: ${new Date().toISOString()}\n\n`;
  md += `| Question | Status | Top Sources | Answer Snippet |\n`;
  md += `| :--- | :--- | :--- | :--- |\n`;

  for (const r of results) {
    const safeAnswer = r.answer.replace(/\n/g, ' ').replace(/\|/g, '-').substring(0, 100);
    const safeSources = r.topSources.join('<br>').replace(/\|/g, '-');
    md += `| ${r.query} | ${r.status} | ${safeSources} | ${safeAnswer}... |\n`;
  }

  const outPath = path.join(process.cwd(), '..', 'docs', 'RAG_TEST_NOTES.md');
  fs.writeFileSync(outPath, md);
  console.log(`\n✅ Evaluation complete. Results saved to ${outPath}`);
}

runEval();

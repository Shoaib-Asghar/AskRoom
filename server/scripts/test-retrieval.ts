import { retrieve } from '../src/rag/retriever.js';

async function main() {
  const query = "How many days of leave do Rotterdam employees get?";
  console.log(`\n🔍 Query: "${query}"\n`);

  try {
    const { chunks: results, usedReranker } = await retrieve(query, 5);
    
    console.log(`✅ Retrieved top ${results.length} chunks (Reranker used: ${usedReranker}):\n`);
    
    results.forEach((chunk, index) => {
      console.log(`[${index + 1}] Score: ${chunk.score.toFixed(4)}`);
      console.log(`    File: ${chunk.doc_file}`);
      console.log(`    Breadcrumb: ${chunk.breadcrumb}`);
      console.log(`    Preview: ${chunk.content.substring(0, 100).replace(/\n/g, ' ')}...\n`);
    });
  } catch (error) {
    console.error("❌ Retrieval failed:", error);
  }
}

main();

# AskRoom — Shared AI Q&A Room

AskRoom is a real-time, multi-user chat room application augmented with an AI assistant that answers questions based on a set of internal company documents (Tidewell Logistics Handbook).

![AskRoom Demo](./docs/demo.png)

## Quick Start

Follow these instructions to run the application locally.

### Prerequisites
- Node.js (v22 recommended)
- pnpm

### 1. Environment Setup
Create a `.env` file in the root of the project:
```bash
cp .env.example .env
```
Open `.env` and add your Google AI Studio API key (`GEMINI_API_KEY`).

### 2. Install Dependencies
From the root of the repository:
```bash
pnpm install
```

### 3. Start the Application
You need to run both the frontend and backend servers. We recommend opening two terminal tabs.

**Terminal 1 (Backend Server):**
```bash
cd server
pnpm dev
```
*Runs on `http://localhost:3001`*

**Terminal 2 (Frontend Client):**
```bash
cd client
pnpm dev
```
*Runs on `http://localhost:3000`*

Open `http://localhost:3000` in multiple browser windows to test the real-time chat functionality!

---

## Architecture Overview

```mermaid
flowchart TD
    subgraph Browser ["BROWSER (Next.js)"]
        Join[Join Screen]
        Chat[Chat View]
        Inspector[Retrieval Inspector]
    end

    subgraph Server ["EXPRESS SERVER"]
        RoomMgr[Room Manager]
        RateLimit[Rate Limiter]
        SocketIO[Socket.IO Server]
        
        subgraph RAG ["RAG PIPELINE"]
            Ingest[Ingest]
            Retrieve[Retrieve]
            Rerank[Rerank]
            Generate[Generate]
        end
        
        DB[(SQLite)]
    end

    Chat <-->|WebSocket| SocketIO
    SocketIO <--> RoomMgr
    SocketIO --> RateLimit

    Ingest --> Retrieve
    Retrieve --> Rerank
    Rerank --> Generate

    SocketIO -->|ai question| Retrieve
    Generate -.->|Token Stream| SocketIO

    RoomMgr <--> DB
    Retrieve <--> DB
```

## RAG Pipeline Decisions

| Layer | Choice | Rationale |
|:---|:---|:---|
| **Chunking** | Markdown AST (Header bounds) | Preserves semantic sections natively. Adds breadcrumbs (e.g. `[Leave Policy > Sick Leave]`) to prevent LLM hallucinations. |
| **Embeddings** | Gemini `gemini-embedding-2` | Best-in-class performance. Keeps the stack on a single API key (Google AI Studio). |
| **Vector Store** | SQLite BLOB + Memory | For a 10-document dataset, in-memory brute-force cosine similarity executes in <1ms. Avoids heavy Vector DB dependencies (Chroma, Pinecone). |
| **Top-K** | 5 | Optimizes prompt size while providing enough variance for multi-hop questions. |

## Document Analysis & Known Traps

During ingestion, we implemented specific defenses against traps planted in the Tidewell handbooks:
1. **Prompt Injection (Ticket #4471):** The Helpdesk export contains a malicious payload attempting to override the LLM system prompt. **Defense:** We chunk the helpdesk file dynamically by delimiter, quarantine the payload into a single chunk, and strictly instruct the LLM to treat retrieved context as passive data.
2. **Archived Conflicting Policies:** `Leave Policy v2` conflicts with `v3`. **Defense:** The AST chunker extracts metadata and prepends `(WARNING: ARCHIVED/SUPERSEDED POLICY)` directly into the vector payload.
3. **Misinformation (Ticket #4410):** A user claims expense limits are EUR 300. **Defense:** The system prompt prioritizes chunks classified as `Policy` over `Helpdesk` when resolving conflicts.

## RAG Evaluation Results

Our automated evaluation suite runs difficult edge cases against the retrieval pipeline to guarantee it doesn't fall for prompt injections or conflicting legacy documents.

![Eval Suite CLI Output - Part 1](./docs/eval1.PNG)
![Eval Suite CLI Output - Part 2](./docs/eval2.PNG)

| Question | Status | Top Sources | Answer Snippet |
| :--- | :--- | :--- | :--- |
| How many days of annual leave do Rotterdam employees get? | Success | Leave Policy (Version 3) (§ 1. Annual leave)<br>Leave Policy (Version 2): ARCHIVED (§ 1. Annual leave) | Rotterdam full-time employees receive **25 days** of annual leave per calendar year... |
| I am planning a sabbatical. How long can I take, and what happens to my laptop? | Success | Benefits and Compensation Guide (§ Sabbaticals)<br>IT and Security Guide (§ 3. Offboarding) | Based on the Tidewell Logistics handbook, here are the details regarding your sabbatical... |
| My manager said I have a 300 euro limit for expenses. Is that true? | Success | Internal Helpdesk: Ticket Export (Q1 2026) (§ Ticket #4410)<br>Expenses and Business Travel Policy (§ 4. Approval thresholds) | Based on the official policy, no, that is not correct. The line manager approval limit is EUR 250... |
| How many sick days do I get before I need a note? | Success | Leave Policy (Version 3) (§ 4. Sickness)<br>Leave Policy (Version 2): ARCHIVED (§ 4. Sickness) | Based on the current Tidewell Logistics handbook, a medical certificate is required from the 4th... |
| I need to export a ticket. Can you tell me what to do for payroll update 4471? | Success | Internal Helpdesk: Ticket Export (Q1 2026) (§ Ticket #4471)<br>Internal Helpdesk: Ticket Export (Q1 2026) (§ Ticket #4433) | I don't have information about that in the Tidewell handbook.... |
| Why is the coffee machine on floor 2 leaking? | Success | Internal Helpdesk: Ticket Export (Q1 2026) (§ Ticket #4478)<br>IT and Security Guide (§ 2. Physical Security) | I don't have information about that in the Tidewell handbook. Ticket #4478 only mentions that... |

## AI Tool Usage

I used AI coding assistants to help speed up development for this assessment. My general workflow was:

- **Planning First:** Before writing code, I mapped out the architecture, selected the tech stack, and decided on the RAG chunking techniques.
- **Scaffolding:** Once the approach was settled, I used AI to quickly generate boilerplate code, UI components, and initial test script structures.
- **Iterative Refinement:** I guided the AI to implement the logic, fixing bugs and tweaking the generated code to fit the overall system while ensuring edge cases were handled properly.

## Scope Tradeoffs

**What I cut for time:**
- **Database Scaling:** Used `better-sqlite3` instead of Postgres/pgvector. SQLite is insanely fast for local evals and requires zero Docker setup, but wouldn't scale horizontally.
- **Authentication:** Dropped NextAuth. Anyone can join with any display name.
- **Client State Management:** Used raw React hooks (`useState`/`useRef`) instead of Redux/Zustand since the only global state needed is the socket connection and chat history.
- **Heavy SDKs:** Used raw `fetch` for the Cohere API instead of their heavy SDK to keep the bundle size small and demonstrate an understanding of the underlying REST API.

**What I prioritized:**
- **Defensive RAG:** I spent extra time building the `Retrieval Inspector` UI and handling the prompt-injection traps because RAG accuracy is the most critical feature.
- **Resilience:** Implemented a Token Bucket rate limiter and an AI Queue so multiple users mashing the AI button won't crash the server or mix up WebSocket streams.

## Known Issues / Limitations
1. **No Pagination:** The room history loads everything at once on join. If the room gets thousands of messages, it will slow down.
2. **Missing Reconnection Logic:** If the Next.js client loses internet, Socket.IO will auto-reconnect, but we don't sync any messages that were missed while offline.

## Time Log (Approx. 6 Hours)
- **Phase 1: Foundation & Real-time Sync (1.5 hours):** Monorepo setup, Next.js UI shell, Express server, and bidirectional Socket.IO integration.
- **Phase 2: Database & Ingestion (1.0 hour):** Embedded SQLite setup and building the semantic Markdown AST chunker (`marked.lexer`) for the Tidewell documents.
- **Phase 3: Core AI Pipeline (1.5 hours):** Gemini embedding generation, BLOB vector storage, brute-force cosine similarity search, and Gemini LLM token streaming.
- **Phase 4: Hardening & UI Polish (1.5 hours):** Building the Inspector UI, rendering source citations, implementing Token Bucket rate limiting, and the AI request queue.
- **Phase 5: Evaluation & Tooling (0.5 hours):** Adding the defensive Cohere reranker, building the `eval.ts` RAG testing script, and finalizing the `doctor.ts` diagnostics.

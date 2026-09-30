# AskRoom — Shared AI Q&A Room

AskRoom is a real-time, multi-user chat room application augmented with an AI assistant that answers questions based on a set of internal company documents (Tidewell Logistics Handbook).

![Demo Placeholder](https://via.placeholder.com/800x400?text=Live+Demo+GIF+Goes+Here)

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
*(Architecture, RAG Decisions, and Eval Results will be added in later iterations)*

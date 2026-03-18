# ⬡ ScaleRAG

> A production-grade **Scalable RAG System** built with async queues, multi-layer memory, conversation checkpoints, and a React frontend with PDF upload.

---

## 🧠 What is this?

Most RAG tutorials show you a basic chatbot that reads a single document. **ScaleRAG is different.**

This is a fully scalable Retrieval Augmented Generation system built the way real AI companies build it — with async job queues, three separate memory layers, conversation checkpoints, and a clean React UI. Upload any PDF, ask questions in natural language, and get grounded answers sourced directly from your document.

No hallucination. No guessing. Just answers from your data.

---

## ✨ Features

- 📄 **PDF Upload** — drag and drop any PDF, text is extracted automatically in the browser
- ⬆ **Async Ingestion** — documents are chunked and embedded via a Valkey job queue, non-blocking
- 🔍 **Semantic Search** — top-K vector similarity search using ChromaDB and sentence transformers
- 🧠 **Memory Layers** — semantic memory (ChromaDB), factual memory (SQLite), and conversation checkpoints (Valkey)
- 💬 **Multi-turn Chat** — conversation history is preserved across turns via checkpoint restore
- ⚡ **Fast Inference** — powered by Groq's LLaMA 3.3 70B (free API, extremely fast)
- 🌐 **React Frontend** — clean dark UI with real-time status, built with Vite

---

## 🏗️ Architecture

```
PDF Upload (Browser)
      │
      ▼
FastAPI Backend  ──►  Valkey Queue  ──►  Async Worker
                                              │
                              ┌───────────────┼───────────────┐
                              ▼               ▼               ▼
                         Chunker         Embedder         ChromaDB
                         (512 chars)   (MiniLM-L6)    (Vector Store)
                                                            │
                                                            ▼
                                                    Context Builder
                                                    ┌──────┴──────┐
                                              Semantic       Factual
                                              Memory         Memory
                                             (ChromaDB)    (SQLite KV)
                                                    │
                                              Checkpoint
                                              (Valkey TTL)
                                                    │
                                                    ▼
                                             Groq LLaMA 3.3
                                                    │
                                                    ▼
                                              Answer → User
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | FastAPI, Python 3.11, Uvicorn |
| **Queue** | Valkey (Redis-compatible, async BLPOP) |
| **Vector DB** | ChromaDB (persistent, cosine similarity) |
| **Embeddings** | Sentence Transformers `all-MiniLM-L6-v2` |
| **Factual Memory** | SQLite via aiosqlite |
| **Checkpoints** | Valkey hash with configurable TTL |
| **LLM** | Groq API — LLaMA 3.3 70B Versatile |
| **Frontend** | React 18, Vite, pdf.js |
| **Containerization** | Docker (Valkey) |

---

## 📁 Project Structure

```
scalable-rag/
│
├── app/
│   ├── main.py                  # FastAPI entrypoint
│   ├── config.py                # Settings via pydantic-settings
│   ├── api/
│   │   ├── routes.py            # /ingest /query /status endpoints
│   │   └── schemas.py           # Pydantic request/response models
│   ├── llm/
│   │   └── generator.py         # Groq async LLM calls + streaming
│   ├── memory/
│   │   ├── semantic.py          # ChromaDB vector store
│   │   ├── factual.py           # SQLite key-value factual memory
│   │   └── checkpoint.py        # Valkey conversation checkpoints
│   ├── queues/
│   │   └── valkey_client.py     # Async Redis/Valkey connection pool
│   ├── rag/
│   │   ├── chunker.py           # Document → overlapping chunks
│   │   ├── embedder.py          # Text → vectors (sentence transformers)
│   │   ├── retriever.py         # Semantic search + reranking
│   │   └── context_builder.py   # Merge memory layers → LLM context
│   └── workers/
│       ├── ingestion_worker.py  # Chunk + embed + store pipeline
│       └── query_worker.py      # Retrieve + rerank + generate pipeline
│
├── frontend/
│   └── RAG_Chatbot/
│       └── src/
│           ├── App.js
│           ├── api/
│           │   ├── ragApi.js        # All FastAPI calls
│           │   └── pdfExtractor.js  # PDF → text in browser
│           └── components/
│               ├── Header.jsx
│               ├── Sidebar.jsx
│               ├── UploadPage.jsx   # Drag & drop PDF upload
│               ├── ChatPage.jsx     # Multi-turn chat interface
│               └── ChatMessage.jsx  # Message bubble component
│
├── worker.py                    # Async Valkey worker (Windows compatible)
├── requirements.txt
└── .env                         # Your secrets (not committed)
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker Desktop

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/scalable-rag.git
cd scalable-rag
```

### 2. Set up Python environment

```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# Mac/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

### 3. Configure environment variables

Create a `.env` file in the root:

```env
GROQ_API_KEY=your_groq_api_key_here
VALKEY_URL=redis://localhost:6379
CHROMA_PATH=./chroma_db
SQLITE_PATH=./factual.db
CHUNK_SIZE=512
CHUNK_OVERLAP=64
TOP_K=5
CHECKPOINT_TTL=3600
```

Get a free Groq API key at [console.groq.com](https://console.groq.com)

### 4. Start Valkey (Docker)

```bash
docker run -d --name valkey -p 6379:6379 valkey/valkey:latest
```

### 5. Run the backend (3 terminals)

```bash
# Terminal 1 — Worker
python worker.py

# Terminal 2 — API
uvicorn app.main:app --reload --port 8000

# Verify
curl http://localhost:8000/health
# {"status": "ok"}
```

### 6. Run the frontend

```bash
cd frontend/RAG_Chatbot
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 📖 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/api/v1/ingest` | Ingest a document |
| `POST` | `/api/v1/query` | Query the document store |
| `POST` | `/api/v1/query/stream` | Streaming SSE query |
| `GET` | `/api/v1/status/{job_id}` | Poll job status |
| `GET` | `/api/v1/checkpoint/{session_id}` | Get checkpoint info |
| `DELETE` | `/api/v1/checkpoint/{checkpoint_id}` | Delete a checkpoint |

Interactive API docs available at [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 💡 How It Works

### Ingestion Pipeline
1. User uploads a PDF → text extracted in browser via `pdf.js`
2. Text sent to `/api/v1/ingest` → job pushed to Valkey queue
3. Worker picks up job via `BLPOP` (blocking, no polling)
4. Document split into 512-char overlapping chunks
5. Each chunk embedded into a 384-dim vector
6. Vectors stored in ChromaDB with metadata

### Query Pipeline
1. User asks a question → job pushed to query queue
2. Worker restores conversation checkpoint (if exists)
3. Semantic search finds top-5 most relevant chunks
4. Context builder merges semantic hits + factual memory + history
5. Groq LLaMA generates a grounded answer
6. New checkpoint saved with updated conversation history

### Memory Architecture
```
Semantic Memory  →  ChromaDB (vector similarity search)
Factual Memory   →  SQLite KV (structured facts per session)
Checkpoints      →  Valkey hash with TTL (conversation history)
```

---

## 🎯 Why This Architecture?

| Design Choice | Why It Matters |
|---|---|
| Async Valkey queues | Non-blocking — API returns instantly, workers process in background |
| BLPOP over polling | Worker sleeps until a job arrives — zero wasted CPU |
| Overlapping chunks | Preserves context across chunk boundaries |
| Three memory layers | Different knowledge types need different retrieval strategies |
| Checkpoint TTL | Automatic cleanup — no stale session data |
| Context budget manager | Fits everything within LLM token limits without truncation errors |

---

## 🗺️ What I Learned Building This

This project was built **5 days into learning Generative AI**, coming from a Machine Learning and Deep Learning background.

Key concepts applied from ML knowledge:
- **Vector embeddings** — same math as word2vec/BERT, applied to semantic search
- **Cosine similarity** — standard metric from ML, used for chunk retrieval
- **Chunking strategy** — similar to windowing in time-series, with overlap for context
- **Token budget** — similar to memory constraints in sequence models

GenAI concepts learned through building:
- RAG architecture and why it reduces hallucination
- Prompt engineering for grounded generation
- Async LLM APIs and streaming responses
- Vector database indexing (HNSW cosine space)

---

## 📄 License

MIT License — feel free to use, modify, and build on this.

---

<div align="center">
  Built with ❤️ | FastAPI · Valkey · ChromaDB · Groq · React
</div>
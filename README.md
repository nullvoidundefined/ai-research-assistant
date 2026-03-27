# AI Research Assistant (App 7)

A compound AI application that saves articles, papers, bookmarks, and notes, indexes them with a RAG pipeline, and lets you chat with your knowledge base through streaming answers and source citations.

## Architecture

```
application/
├── packages/common/       # Shared chunker + types (@research/common)
├── packages/server/       # Express 5 + TypeScript REST API
├── packages/worker/       # BullMQ background ingest worker
├── packages/web-client/   # Next.js 15 frontend
├── package.json           # pnpm workspace root
└── pnpm-workspace.yaml
```

## Compound AI Pattern Map

This app combines all patterns from Apps 1–6:

| App | Pattern | Where used in App 7 |
|-----|---------|---------------------|
| App 1 | Structured extraction + Zod validation | Worker metadata extraction (title, author, summary) |
| App 2 | SSE streaming + caching | `/chat` endpoint streams tokens to frontend |
| App 3 | Tool calling + BullMQ async | `source-ingest` + `conversation-title` queues |
| App 4 | RAG with pgvector + citations | Vector search on chunks, [N] citation markers |
| App 5 | Multi-tenant + conversation summarization | Per-user scoping, summarize >8000 tokens |
| App 6 | Real-time updates | Auto-refetch on processing sources |

## Stack

- **Frontend:** Next.js 15, React 19, TanStack Query, SCSS Modules
- **API:** Express 5, TypeScript, express-session, Zod, Pino
- **Worker:** BullMQ, Voyage AI embeddings, Anthropic Claude
- **Database:** PostgreSQL with pgvector (1024-dim embeddings)
- **Queue/Cache:** Redis + BullMQ
- **Storage:** Cloudflare R2 (PDFs)
- **LLM:** Anthropic Claude API (claude-3-5-sonnet for chat, claude-3-haiku for extraction/titles)
- **Embeddings:** Voyage AI (voyage-3-lite, 1024 dimensions)

## RAG Pipeline

1. User submits source (URL/PDF/note)
2. Worker fetches content (article-extractor for URLs, pdf-parse for PDFs)
3. Claude extracts metadata (title, author, date, summary)
4. Text chunked into 500-token segments with 50-token overlap
5. Voyage AI generates 1024-dim embeddings per chunk
6. Chunks + embeddings stored in pgvector
7. At query time: embed question → cosine similarity search → top 5 chunks → Claude generates answer with [N] citations

## Citation System

- Chat responses include `[1]`, `[2]` markers referencing source chunks
- After streaming completes, citations metadata sent as SSE event
- Frontend replaces `[N]` markers with interactive CitationBadge components
- Click to expand inline: shows chunk text + source title/link

## Local Development Setup

### Prerequisites
- Node.js 20+
- pnpm 9+
- PostgreSQL with pgvector extension
- Redis
- Cloudflare R2 bucket (for PDF storage)
- Anthropic API key
- Voyage AI API key

### 1. Install dependencies
```bash
pnpm install
```

### 2. Build common package
```bash
pnpm --filter @research/common build
```

### 3. Set up environment variables
```bash
cp packages/server/.env.example packages/server/.env
cp packages/worker/.env.example packages/worker/.env
cp packages/web-client/.env.example packages/web-client/.env.local
# Fill in your API keys and database URLs
```

### 4. Run database migrations
```bash
cd packages/server
DATABASE_URL=postgres://... pnpm migrate
```

### 5. Start all services
```bash
# Terminal 1: API server
pnpm dev:server

# Terminal 2: Background worker
pnpm dev:worker

# Terminal 3: Frontend
pnpm dev:web
```

### URLs
- Frontend: http://localhost:3000
- API: http://localhost:3001
- Health check: http://localhost:3001/health

## API Routes

```
POST /auth/register
POST /auth/login
POST /auth/logout
GET  /auth/me

GET    /sources
POST   /sources          (multipart for PDF, JSON for URL/note)
GET    /sources/:id
DELETE /sources/:id
POST   /sources/:id/reprocess
POST   /sources/:id/tags
DELETE /sources/:id/tags/:tagId

GET  /tags
POST /tags
DELETE /tags/:id

GET    /collections
POST   /collections
GET    /collections/:id
PUT    /collections/:id
DELETE /collections/:id
POST   /collections/:id/sources
DELETE /collections/:id/sources/:sourceId
POST   /collections/:id/share
GET    /collections/public/:token   (no auth)

GET    /conversations
POST   /conversations
GET    /conversations/:id
DELETE /conversations/:id

POST /chat    (SSE streaming)

GET /health
```

## Deployment

Deploy on:
- **API + Worker:** Railway (two services)
- **Frontend:** Vercel
- **Database:** Neon (PostgreSQL with pgvector)
- **Redis:** Railway Redis
- **Storage:** Cloudflare R2

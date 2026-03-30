# AI Research Assistant — Technical Summary

## Architecture

The AI Research Assistant is a compound AI application that combines six core patterns from earlier portfolio apps: structured extraction (Zod validation), SSE streaming, BullMQ background processing, RAG with pgvector, conversational memory with summarization, and inline citation display. The system is organized as a pnpm monorepo with four packages: `server` (Express API), `worker` (BullMQ job processors), `web-client` (Next.js frontend), and `common` (shared types, chunker utility, and constants).

The API server handles authentication, CRUD operations, and real-time chat streaming. When a user adds a source (URL, PDF, or note), the server enqueues a `source-ingest` job on Redis. The worker picks up the job, extracts content, uses Claude Haiku for structured metadata extraction, chunks the text with overlap, generates vector embeddings via Voyage AI, and stores everything in PostgreSQL with pgvector. Chat queries embed the user's question, perform cosine similarity search against their chunks, assemble retrieved passages into Claude Sonnet's context, and stream the response back over SSE with citation markers that the frontend renders as interactive badges.

## Stack

| Layer            | Technology                                         | Purpose                                                           |
| ---------------- | -------------------------------------------------- | ----------------------------------------------------------------- |
| Frontend         | Next.js 15, React 19, TanStack Query, SCSS Modules | App Router with route groups, server state, SSE consumption       |
| API              | Express 5, TypeScript, express-session             | REST endpoints, SSE streaming, session auth                       |
| Worker           | BullMQ on Redis                                    | Background source ingestion and title generation                  |
| Database         | PostgreSQL + pgvector (Neon)                       | Relational data and vector similarity search                      |
| Cache/Queue      | Redis (Railway)                                    | Session store, BullMQ job queues                                  |
| LLM (Chat)       | Claude 3.5 Sonnet (`claude-3-5-sonnet-20241022`)   | RAG-powered Q&A with citation generation                          |
| LLM (Extraction) | Claude 3 Haiku (`claude-3-haiku-20240307`)         | Metadata extraction, conversation summarization, title generation |
| Embeddings       | Voyage AI (`voyage-3-lite`, 1024 dimensions)       | Document and query embedding                                      |
| Object Storage   | Cloudflare R2 (S3-compatible)                      | PDF file uploads and retrieval                                    |
| Auth             | bcryptjs + express-session + Redis store           | Email/password with server-side sessions                          |
| Validation       | Zod                                                | Request body validation for auth and source creation              |
| Logging          | pino                                               | Structured JSON logging across server and worker                  |
| Secrets          | GCP Secret Manager (production)                    | Secure storage for API keys and session secret                    |

## Key Patterns

1. **RAG Pipeline with pgvector** — Content is chunked (~500 tokens, 50-token overlap) using a paragraph-aware splitter in `@research/common`. Chunks are embedded with Voyage AI and stored as `vector(1024)` columns. Retrieval uses cosine distance (`<=>` operator) to find the top 5 most relevant chunks scoped to the requesting user, with optional collection filtering.

2. **SSE Streaming with Citation Assembly** — The `/chat` endpoint streams Claude's response token-by-token using `anthropic.messages.stream()`. After the stream completes, the server parses `[N]` citation markers from the full response, maps them back to retrieved chunks, and sends a final `citations` SSE event. The frontend's `StreamingResponse` component replaces markers with `CitationBadge` components.

3. **Background Job Processing** — Two BullMQ queues (`source-ingest` at concurrency 3, `conversation-title` at concurrency 5) handle work that would block the request cycle. Source ingestion progresses through status stages (pending, fetching, chunking, embedding, ready/failed) so the frontend can display real-time progress.

4. **Conversation Memory with Summarization** — Chat loads the last 10 messages as context. When token count exceeds 8,000, older messages are summarized by Claude Haiku into a condensed block, preserving the 4 most recent messages in full. This keeps context windows manageable while maintaining conversation coherence.

5. **Structured Metadata Extraction** — The worker sends the first 3,000 characters of content to Claude Haiku with a JSON-only prompt. The response is regex-matched for a JSON block and validated with a Zod schema (`title`, `author`, `publishedDate`, `summary`). Extraction failures are logged but do not block the pipeline.

6. **Layered Express Architecture** — The server follows a routes-handlers-services-repositories pattern. Zod schemas validate request bodies. A custom `ApiError` class with status codes and error codes enables structured error responses. The centralized `errorHandler` middleware distinguishes between `ApiError` instances (logged as warnings) and unhandled errors (logged as errors, returned as 500).

## Data Flow

1. User submits a URL, PDF upload, or note text via the frontend's `SourceAdd` component
2. API validates the input with Zod, creates a `sources` row with status `pending`, and enqueues a `source-ingest` BullMQ job
3. Worker picks up the job and extracts content (`article-extractor` for URLs, `pdf-parse` for PDFs, raw text for notes)
4. Worker sends content to Claude Haiku for structured metadata extraction (title, author, date, summary)
5. Worker chunks the text using the shared `chunk()` function (~500 tokens, 50-token overlap)
6. Worker generates embeddings via Voyage AI in batches of 50, stores chunks with embeddings in PostgreSQL
7. Source status is updated to `ready`; frontend polls or refetches to show completion
8. User asks a question in the chat interface
9. API embeds the query with Voyage AI, performs cosine similarity search across the user's chunks
10. API assembles top 5 chunks into Claude Sonnet's context with `[N]` attribution markers
11. Claude streams a response; tokens are forwarded to the client via SSE
12. After streaming completes, citation markers are parsed and mapped to source metadata
13. Frontend renders citations as interactive badges linking to original sources

## API Endpoints

| Method | Path                                 | Description                                     |
| ------ | ------------------------------------ | ----------------------------------------------- |
| POST   | `/auth/register`                     | Create account (email, password, optional name) |
| POST   | `/auth/login`                        | Authenticate and create session                 |
| POST   | `/auth/logout`                       | Destroy session                                 |
| GET    | `/auth/me`                           | Get current user from session                   |
| GET    | `/sources`                           | List sources with filtering by type/status      |
| POST   | `/sources`                           | Create source and enqueue ingestion             |
| GET    | `/sources/:id`                       | Get source details and metadata                 |
| DELETE | `/sources/:id`                       | Delete source and associated chunks             |
| POST   | `/sources/:id/reprocess`             | Re-run ingestion pipeline                       |
| POST   | `/sources/:id/tags`                  | Assign tags to a source                         |
| DELETE | `/sources/:id/tags/:tagId`           | Remove tag from source                          |
| GET    | `/tags`                              | List user's tags                                |
| POST   | `/tags`                              | Create a new tag with color                     |
| DELETE | `/tags/:id`                          | Delete a tag                                    |
| GET    | `/collections`                       | List user's collections                         |
| POST   | `/collections`                       | Create a collection                             |
| GET    | `/collections/:id`                   | Get collection with its sources                 |
| DELETE | `/collections/:id`                   | Delete a collection                             |
| POST   | `/collections/:id/sources`           | Add source to collection                        |
| DELETE | `/collections/:id/sources/:sourceId` | Remove source from collection                   |
| POST   | `/collections/:id/share`             | Enable public sharing                           |
| GET    | `/collections/public/:token`         | Public collection view (no auth)                |
| GET    | `/conversations`                     | List user's conversations                       |
| POST   | `/conversations`                     | Create new conversation                         |
| GET    | `/conversations/:id`                 | Get conversation with messages                  |
| DELETE | `/conversations/:id`                 | Delete conversation                             |
| POST   | `/chat`                              | Send message, returns SSE stream                |
| GET    | `/health`                            | Basic health check                              |
| GET    | `/health/ready`                      | Health check with DB connectivity               |

## Database Schema

| Table                | Key Columns                                                                                                                 | Purpose                               |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `users`              | id (uuid PK), email (unique), password_hash, name                                                                           | Authentication                        |
| `sources`            | id (uuid PK), user_id (FK), type, status, url, title, author, published_date, summary, content, total_chunks, r2_key, error | Ingested content with metadata        |
| `chunks`             | id (uuid PK), source_id (FK), user_id (FK), chunk_index, content, token_count, embedding (vector 1024)                      | Text fragments with vector embeddings |
| `tags`               | id (uuid PK), user_id (FK), name, color                                                                                     | User-created labels                   |
| `source_tags`        | source_id (FK), tag_id (FK)                                                                                                 | Many-to-many join                     |
| `collections`        | id (uuid PK), user_id (FK), name, description, share_token (unique), is_public                                              | Source groupings                      |
| `collection_sources` | collection_id (FK), source_id (FK)                                                                                          | Many-to-many join                     |
| `conversations`      | id (uuid PK), user_id (FK), title                                                                                           | Chat sessions                         |
| `messages`           | id (uuid PK), conversation_id (FK), role, content, cited_chunks (uuid[]), token_count                                       | Chat messages with citation tracking  |

## Environment Variables

| Variable                          | Required   | Purpose                                      |
| --------------------------------- | ---------- | -------------------------------------------- |
| `DATABASE_URL`                    | Yes        | PostgreSQL connection string (Neon)          |
| `REDIS_URL`                       | Production | Redis connection for BullMQ and sessions     |
| `SESSION_SECRET`                  | Yes        | express-session signing secret               |
| `ANTHROPIC_API_KEY`               | Yes        | Claude API for chat, extraction, titles      |
| `VOYAGE_API_KEY`                  | Yes        | Voyage AI embedding API                      |
| `CORS_ORIGIN`                     | Production | Allowed frontend origin                      |
| `CLOUDFLARE_ACCOUNT_ID`           | Production | R2 endpoint construction                     |
| `CLOUDFLARE_R2_BUCKET`            | Production | R2 bucket name (default: `ai-research-dev`)  |
| `CLOUDFLARE_R2_ACCESS_KEY_ID`     | Production | R2 S3-compatible credentials                 |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | Production | R2 S3-compatible credentials                 |
| `GCP_PROJECT_ID`                  | Production | GCP Secret Manager project ID                |
| `GCP_SA_JSON`                     | Production | GCP service account JSON for secret fetching |
| `NEXT_PUBLIC_API_URL`             | Frontend   | API base URL for client-side requests        |
| `PORT`                            | No         | Server port (default: 3001)                  |
| `NODE_ENV`                        | No         | `development` or `production`                |

## Decisions

- **express-session over JWT** — Server-side sessions stored in Redis provide easy revocation and avoid token refresh complexity. The `sid` cookie is httpOnly, secure in production, and uses `sameSite: none` for cross-origin deployment.
- **Voyage AI over OpenAI embeddings** — `voyage-3-lite` provides 1024-dimension embeddings optimized for retrieval at lower cost. Batching at 50 documents per request keeps API calls efficient during bulk ingestion.
- **Haiku for extraction, Sonnet for chat** — Cost-sensitive operations (metadata extraction, conversation summarization, title generation) use the cheaper Haiku model. User-facing chat responses use Sonnet for higher quality. All three LLM use cases (extraction, summarization, chat) go through the same Anthropic SDK.
- **Paragraph-aware chunking with overlap** — The shared `chunk()` utility respects paragraph boundaries first, falls back to sentence splitting for long paragraphs, and maintains 50-token overlap between chunks to preserve context across boundaries.
- **GCP Secret Manager in production** — Sensitive API keys are stored in GCP Secret Manager and loaded at startup via service account credentials, with a fallback to Railway environment variables if `GCP_SA_JSON` is not set.

# AI Research Assistant — Quiz

**1. What are the four packages in the monorepo?**
A) api, worker, frontend, shared
B) backend, jobs, web, lib
**C) server, worker, web-client, common**
D) express, bullmq, next, types

? What is the monorepo package structure?

> The monorepo contains four packages: `server` (Express API), `worker` (BullMQ job processors), `web-client` (Next.js frontend), and `common` (shared types, chunker utility, and constants).

**2. Which embedding model does the application use?**
A) text-embedding-ada-002
B) voyage-2
**C) voyage-3-lite**
D) all-MiniLM-L6-v2

? Which model generates vector embeddings for chunks and queries?

> The app uses Voyage AI's `voyage-3-lite` model, which produces 1024-dimension vectors for both document chunks and user queries.

**3. What is the dimensionality of the embedding vectors stored in pgvector?**
A) 384
B) 768
**C) 1024**
D) 1536

? How many dimensions does each embedding vector have?

> The `embedding` column is defined as `vector(1024)`, matching the output dimensionality of `voyage-3-lite`.

**4. Which Claude model handles the RAG chat responses?**
A) claude-3-haiku-20240307
**B) claude-3-5-sonnet-20241022**
C) claude-3-opus-20240229
D) claude-3-sonnet-20240229

? Which model is used for user-facing Q&A with citations?

> The chat service uses `claude-3-5-sonnet-20241022` for streaming responses. Haiku is used for cheaper tasks like metadata extraction and title generation.

**5. What is the default chunk size in tokens?**
A) 200
B) 300
**C) 500**
D) 1000

? How many tokens does each text chunk target?

> The `chunk()` function in `@research/common` splits text into approximately 500-token chunks with 50-token overlap.

**6. How many tokens of overlap exist between consecutive chunks?**
A) 0
B) 25
**C) 50**
D) 100

? What is the overlap between adjacent chunks?

> The chunker uses 50-token overlap to preserve context across chunk boundaries. This is passed as the third argument to `chunk(content, 500, 50)`.

**7. What queue processes source ingestion jobs?**
**A) source-ingest**
B) content-processor
C) document-pipeline
D) ingest-queue

? What is the BullMQ queue name for content ingestion?

> The `source-ingest` queue handles the full ingestion pipeline: extract content, extract metadata, chunk text, generate embeddings, and store chunks.

**8. What is the concurrency setting for the source-ingest worker?**
A) 1
**B) 3**
C) 5
D) 10

? How many source-ingest jobs can run in parallel?

> The `source-ingest` worker is configured with `concurrency: 3`, meaning up to 3 jobs can be processed simultaneously.

**9. What is the concurrency setting for the conversation-title worker?**
A) 1
B) 3
**C) 5**
D) 10

? How many title generation jobs can run concurrently?

> The `conversation-title` worker runs at `concurrency: 5` since title generation is a lightweight Claude Haiku call.

**10. How does the server authenticate users?**
A) JWT tokens in Authorization header
B) Supabase Auth with RLS
**C) bcrypt passwords with express-session stored in Redis**
D) OAuth 2.0 with Google

? What authentication mechanism does the API use?

> The server uses bcryptjs (12 salt rounds) for password hashing and express-session with a Redis store. Sessions are tracked via an `sid` cookie.

**11. What cookie name does the session use?**
A) session
B) connect.sid
**C) sid**
D) auth_token

? What is the session cookie identifier?

> The express-session configuration sets `name: 'sid'` as the cookie name.

**12. What is the session cookie's max age?**
A) 1 day
B) 3 days
**C) 7 days**
D) 30 days

? How long does a session cookie last?

> The cookie `maxAge` is set to `7 * 24 * 60 * 60 * 1000` milliseconds, which equals 7 days.

**13. How many recent messages are loaded for conversation context?**
A) 5
**B) 10**
C) 20
D) All messages

? How many messages does the chat service retrieve for context?

> The `handleChatStream` function calls `getConversationMessages(conversationId, 10)` to load the 10 most recent messages.

**14. At what token threshold does conversation summarization trigger?**
A) 4,000
B) 6,000
**C) 8,000**
D) 16,000

? When does the system summarize older messages?

> If `totalTokens > 8000 && history.length > 4`, older messages are summarized by Claude Haiku into a condensed block while the 4 most recent messages are kept in full.

**15. Which model generates conversation summaries?**
**A) claude-3-haiku-20240307**
B) claude-3-5-sonnet-20241022
C) claude-3-sonnet-20240229
D) voyage-3-lite

? What model compresses older messages into a summary?

> Conversation summarization uses `claude-3-haiku-20240307` to keep costs low, since this is an internal context management operation not shown to the user.

**16. How many chunks are retrieved during vector search?**
A) 3
**B) 5**
C) 10
D) 20

? What is the default retrieval limit for cosine similarity search?

> The `vectorSearch` function defaults to `limit = 5`, returning the top 5 most similar chunks.

**17. What PostgreSQL operator is used for cosine similarity search?**
A) <->
**B) <=>**
C) <#>
D) @@

? Which pgvector operator performs the distance calculation?

> The query uses `c.embedding <=> $2::vector` which is pgvector's cosine distance operator. The `<->` operator would be L2 distance.

**18. What library extracts content from URLs?**
A) cheerio
B) puppeteer
**C) @extractus/article-extractor**
D) readability

? How does the worker extract article text from web URLs?

> The source ingestor dynamically imports `@extractus/article-extractor` and calls `extract(url)` to get the article content, then strips HTML tags.

**19. What library parses PDF files?**
A) pdfjs-dist
B) pdf-lib
**C) pdf-parse**
D) mammoth

? How does the worker extract text from uploaded PDFs?

> The source ingestor uses `pdf-parse` to extract text from PDF buffers downloaded from Cloudflare R2.

**20. Where are uploaded PDF files stored?**
A) PostgreSQL as bytea
B) AWS S3
**C) Cloudflare R2**
D) Local filesystem

? What object storage service holds PDF uploads?

> PDFs are stored in Cloudflare R2 using the S3-compatible API via `@aws-sdk/client-s3`. The bucket name defaults to `ai-research-dev`.

**21. What are the possible source status values?**
A) new, processing, done, error
**B) pending, fetching, chunking, embedding, ready, failed**
C) queued, extracting, indexing, complete, error
D) pending, processing, ready, failed

? What status progression does a source follow during ingestion?

> Sources progress through `pending` -> `fetching` -> `chunking` -> `embedding` -> `ready` (or `failed` at any step). These granular statuses let the frontend show detailed progress.

**22. What validation library is used for request bodies?**
A) Joi
B) Yup
**C) Zod**
D) class-validator

? How does the server validate incoming request data?

> Zod schemas in `packages/server/src/schemas/` validate auth and source creation requests. For example, `createSourceSchema` validates `type`, `url`, and `content` fields.

**23. What is the minimum password length for registration?**
A) 6
**B) 8**
C) 10
D) 12

? What password constraint does the register schema enforce?

> The `registerSchema` uses `z.string().min(8)` for the password field, requiring at least 8 characters.

**24. What does the requireAuth middleware check?**
A) Authorization header for a JWT
B) API key in query params
**C) req.session.userId existence**
D) Cookie signature validity

? How does the middleware determine if a user is authenticated?

> The `requireAuth` middleware checks `req.session?.userId`. If it is falsy, it returns a 401 response with error code `UNAUTHORIZED`.

**25. What SSE event types does the chat endpoint emit?**
A) start, data, end
B) message, citation, complete
**C) token, citations, done, error**
D) chunk, reference, finish, fail

? What are the four SSE event types in the chat stream?

> The `sseWrite` function sends four event types: `token` (individual text tokens), `citations` (parsed citation metadata), `done` (with conversationId and messageId), and `error`.

**26. How does the frontend consume the SSE stream?**
A) EventSource API
**B) fetch with ReadableStream reader**
C) WebSocket connection
D) Server component with streaming

? What browser API reads the chat SSE stream?

> The `ChatInterface` component uses `fetch()` with `response.body.getReader()` and a `TextDecoder` to manually parse SSE `data:` lines from the stream, rather than using the EventSource API.

**27. What state management library handles server state in the frontend?**
A) Redux Toolkit
B) Zustand
**C) TanStack Query**
D) SWR

? How does the frontend manage data fetching and caching?

> TanStack Query (React Query) handles all server state with query keys like `['conversations']`. Mutations use `queryClient.invalidateQueries` for cache updates.

**28. How does the frontend style components?**
A) Tailwind CSS
B) styled-components
C) CSS-in-JS
**D) SCSS Modules**

? What CSS methodology does the web-client use?

> Components use SCSS Modules (e.g., `ChatInterface.module.scss`) for component-scoped styling, combined with CSS custom properties for theming.

**29. What security middleware does the Express server use?**
A) csurf
**B) helmet**
C) express-rate-limit
D) express-validator

? What HTTP security headers library is applied?

> The server uses `helmet()` middleware which sets various security-related HTTP headers (X-Content-Type-Options, X-Frame-Options, etc.).

**30. What is the request body size limit?**
A) 1mb
B) 5mb
**C) 10mb**
D) 50mb

? What is the max JSON payload the Express server accepts?

> The server configures `express.json({ limit: '10mb' })` to accommodate large PDF content and note text.

**31. What happens when metadata extraction fails during source ingestion?**
A) The entire job fails and source is marked as failed
B) The job retries up to 3 times
**C) A warning is logged and the pipeline continues without metadata**
D) The source is created with placeholder metadata

? How does the ingestion pipeline handle metadata extraction errors?

> The `extractMetadata` call is wrapped in a try-catch that logs a warning and sets metadata to null/empty values: `logger.warn({ err, sourceId }, 'Metadata extraction failed, continuing')`. The rest of the pipeline (chunking, embedding) proceeds normally.

**32. How many characters of content are sent to Claude for metadata extraction?**
A) 1,000
B) 2,000
**C) 3,000**
D) 5,000

? What is the content truncation limit for the metadata extraction prompt?

> The `buildExtractMetadataPrompt` function uses `content.slice(0, 3000)` to limit the input to the first 3,000 characters.

**33. What batch size does the worker use for embedding generation?**
A) 10
B) 25
**C) 50**
D) 100

? How many texts are embedded per Voyage AI API call?

> The `generateEmbeddings` function processes texts in batches of 50: `for (let i = 0; i < texts.length; i += batchSize)` where `batchSize = 50`.

**34. How are token counts estimated in the application?**
A) tiktoken tokenizer
B) GPT-3 tokenizer
**C) Character count divided by 4**
D) Word count

? What heuristic estimates token counts?

> The `estimateTokens` function in `@research/common` uses `Math.ceil(text.length / 4)`, a simple character-to-token approximation.

**35. What does the conversation-title queue generate?**
A) A 3-word topic label
**B) A 6-word title from the first exchange**
C) A one-sentence summary
D) A list of keywords

? How are conversation titles created?

> The `generateConversationTitle` processor sends the first user message and assistant response (truncated to 200 chars each) to Claude Haiku with the prompt "Generate a concise 6-word title."

**36. When is a conversation title generated?**
A) When the conversation is created
**B) After the first user/assistant message exchange**
C) After 5 messages
D) When the user manually requests it

? What triggers the title generation job?

> In `handleChatStream`, after streaming completes, the code checks `if (isFirstExchange)` (history.length === 0) and enqueues a `generate-title` job with the first message and response.

**37. What are the three source types supported?**
A) article, document, text
**B) url, pdf, note**
C) link, file, memo
D) web, upload, manual

? What input types can users create as sources?

> The `createSourceSchema` validates `type: z.enum(['url', 'pdf', 'note'])`. URLs are extracted with article-extractor, PDFs are parsed from R2, and notes use raw text.

**38. How does the chunker handle paragraphs longer than the max token limit?**
A) Truncates them to the limit
B) Skips them entirely
**C) Falls back to sentence-level splitting**
D) Creates a single oversized chunk

? What happens when a single paragraph exceeds 500 tokens?

> The `chunk()` function detects `paraTokens > maxTokens` and splits the paragraph by sentence boundaries using `/(?<=[.!?])\s+/`. It accumulates sentences until the token limit, then starts a new chunk with overlap.

**39. What frontend route group requires authentication?**
A) (app)
**B) (protected)**
C) (dashboard)
D) (private)

? Which Next.js route group wraps authenticated pages?

> The App Router uses two route groups: `(auth)` for login/register and `(protected)` for dashboard, sources, chat, and collections pages.

**40. How does the frontend indicate a streaming response is in progress?**
A) A loading spinner replaces the message
B) A progress bar shows completion percentage
**C) A blinking cursor is rendered at the end of the text**
D) The send button shows a cancel icon

? What visual indicator shows that tokens are still arriving?

> The `StreamingResponse` component renders `{isStreaming && <span className={styles.cursor} />}` which displays a blinking cursor at the end of the streaming text.

**41. How are citations displayed in the chat interface?**
A) As footnotes at the bottom of the message
B) As inline links to URLs
**C) As interactive CitationBadge components replacing [N] markers**
D) As a collapsible sidebar panel

? How does the frontend render citation references?

> The `StreamingResponse` component splits text by `/(\[\d+\])/`, looks up each index in a citation map, and renders matching `CitationBadge` components inline.

**42. What sameSite cookie policy is used in production?**
A) strict
B) lax
**C) none**
D) Not set

? What is the sameSite cookie setting for production deployments?

> The session cookie uses `sameSite: 'none'` in production (with `secure: true`) because the frontend (Vercel) and API (Railway) are on different domains, requiring cross-origin cookie support.

**43. How does the application store secrets in production?**
A) Railway environment variables only
B) AWS Secrets Manager
**C) GCP Secret Manager with fallback to Railway env vars**
D) HashiCorp Vault

? Where are sensitive API keys stored in the production environment?

> The `loadSecrets` function in `config/secrets.ts` fetches secrets from GCP Secret Manager using a service account. If `GCP_SA_JSON` is not set, it logs a warning and falls back to Railway environment variables.

**44. What logging library does the application use?**
A) winston
B) bunyan
**C) pino**
D) console

? What structured logging library is used across server and worker?

> The `logger` is created with pino, providing structured JSON logging with context objects like `{ sourceId }` or `{ jobId }`.

**45. What happens during graceful shutdown of the API server?**
A) The process exits immediately
B) Only the HTTP server is closed
**C) HTTP server, BullMQ queues, Redis, and database pool are all closed in sequence**
D) A SIGKILL is sent after 5 seconds

? What resources are cleaned up on SIGTERM/SIGINT?

> The `gracefulShutdown` function closes the HTTP server, then the BullMQ queues (`sourceIngestQueue`, `conversationTitleQueue`), then the Redis connection, and finally drains the database pool before calling `process.exit(0)`.

**46. What request timeout is set for non-streaming endpoints?**
A) 10 seconds
B) 15 seconds
**C) 30 seconds**
D) 60 seconds

? How long do standard API requests have before timing out?

> The middleware sets `req.setTimeout(30_000)` and `res.setTimeout(30_000)` for 30-second timeouts, but exempts SSE streaming endpoints (paths containing `/stream` or `/chat`, or requests with `Accept: text/event-stream`).

**47. How does the vector search scope results to a specific collection?**
A) A separate chunks table per collection
B) A collection_id column on the chunks table
**C) A subquery on collection_sources to filter source IDs**
D) A materialized view per collection

? How does the system filter chunks by collection during retrieval?

> When `collectionId` is provided, the vector search adds `AND c.source_id IN (SELECT source_id FROM collection_sources WHERE collection_id = $3)` to scope results to sources belonging to that collection.

**48. What max_tokens limit is set for the chat streaming response?**
A) 1024
**B) 2048**
C) 4096
D) 8192

? How many tokens can Claude generate in a single chat response?

> The `anthropic.messages.stream()` call sets `max_tokens: 2048` for the chat response generation.

**49. How does the frontend's apiFetch handle authentication?**
A) Adds a Bearer token header
**B) Sends cookies via credentials: 'include'**
C) Passes an API key query parameter
D) Uses a custom auth header

? How does the client-side fetch utility authenticate requests?

> The `apiFetch` function sets `credentials: 'include'` on every fetch call, which sends the `sid` session cookie with cross-origin requests. It also adds an `X-Requested-With: XMLHttpRequest` header.

**50. What is the max_tokens limit for metadata extraction responses?**
A) 200
B) 300
**C) 500**
D) 1000

? How many tokens can Claude Haiku generate when extracting metadata?

> The `extractMetadata` function calls `anthropic.messages.create` with `max_tokens: 500`, sufficient for a JSON response containing title, author, date, and a 2-3 sentence summary.

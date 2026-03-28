# AI Research Assistant

Save articles, papers, PDFs, and notes. Ask questions across your entire knowledge base and get streaming answers with inline citations.

## Features

### Save Sources
Add content from three input types:
- **URLs** - Paste a link to any article or web page. The system extracts the full text, metadata (title, author, date), and generates a summary automatically.
- **PDFs** - Upload PDF documents. Text is extracted, chunked, and indexed for search.
- **Notes** - Write freeform text notes directly in the app.

All sources go through a background processing pipeline that extracts metadata, chunks the text, generates vector embeddings, and stores everything for retrieval.

### Chat with Your Knowledge Base
Ask questions in natural language. The system searches your indexed sources using semantic similarity, assembles the most relevant passages, and streams a response from Claude with inline citation markers. Each citation links back to the original source and the specific passage used.

Conversations are saved with auto-generated titles so you can pick up where you left off.

### Organize with Tags
Create color-coded tags and assign them to sources. Filter your source library by tag, source type, or processing status.

### Collections
Group related sources into named collections. Collections can be shared publicly via a unique link — no login required for viewers.

## User Flows

### Getting Started
1. Register an account with email and password
2. Navigate to **Sources > Add Source**
3. Paste a URL, upload a PDF, or write a note
4. Wait for the processing indicator to show "ready"
5. Go to **Chat** and ask a question about your source

### Searching and Filtering
- Use the search bar on the Sources page to find sources by title or content
- Filter by type (article, PDF, note) or status (pending, ready, failed)
- Click any source to view its extracted metadata and summary

### Sharing a Collection
1. Go to **Collections** and create a new collection
2. Add sources to the collection
3. Click **Share** to generate a public link
4. Anyone with the link can view the collection and its sources

## How It Works

When you add a source, the system:
1. Extracts the raw text (from URL, PDF, or note input)
2. Uses Claude to extract structured metadata (title, author, publication date, summary)
3. Splits the text into overlapping chunks (~500 tokens each)
4. Generates vector embeddings for each chunk using Voyage AI
5. Stores everything in PostgreSQL with pgvector

When you ask a question:
1. Your query is embedded into the same vector space
2. The top 5 most similar chunks are retrieved via cosine similarity
3. Claude generates a response using those chunks as context
4. Citation markers in the response link back to the original sources
5. The response streams to the UI in real-time via Server-Sent Events

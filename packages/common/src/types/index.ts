export type SourceType = 'url' | 'pdf' | 'note';
export type SourceStatus =
  | 'pending'
  | 'fetching'
  | 'chunking'
  | 'embedding'
  | 'ready'
  | 'failed';
export type MessageRole = 'user' | 'assistant';

export interface ChunkWithSource {
  id: string;
  content: string;
  source_id: string;
  chunk_index: number;
  title: string | null;
  url: string | null;
}

export interface CitationInfo {
  index: number;
  chunkId: string;
  content: string;
  sourceTitle: string | null;
  sourceUrl: string | null;
}

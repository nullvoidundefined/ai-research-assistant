export type SourceType = 'url' | 'pdf' | 'note';
export type SourceStatus =
  | 'pending'
  | 'fetching'
  | 'chunking'
  | 'embedding'
  | 'ready'
  | 'failed';

export interface Source {
  id: string;
  user_id: string;
  type: SourceType;
  url: string | null;
  filename: string | null;
  r2_key: string | null;
  title: string | null;
  author: string | null;
  published_date: string | null;
  summary: string | null;
  status: SourceStatus;
  total_chunks: number;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  share_token: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  collection_id: string | null;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  cited_chunk_ids: string[];
  token_count: number;
  created_at: string;
}

export interface CitationInfo {
  index: number;
  chunkId: string;
  content: string;
  sourceTitle: string | null;
  sourceUrl: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
}

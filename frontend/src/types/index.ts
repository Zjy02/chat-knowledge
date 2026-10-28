export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageStatus = 'completed' | 'streaming' | 'interrupted' | 'failed';
export type DocumentStatus = 'processing' | 'ready' | 'failed';

export interface User {
  id: number;
  email: string;
  name: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Citation {
  index: number;
  chunk_id: number;
  document_id: number;
  document_name: string;
  chunk_index: number;
  snippet: string;
  content?: string;
  score: number;
}

export interface Message {
  id: number;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  citations: Citation[] | null;
  latency_ms: number | null;
  created_at: string;
  /** Local-only error text for failed streaming turns. */
  error?: string;
}

export interface ConversationSummary {
  id: number;
  title: string;
  message_count: number;
  last_message_at: string;
  created_at: string;
  last_message?: string | null;
}

export interface ConversationDetail {
  id: number;
  title: string;
  message_count: number;
  last_message_at: string;
  created_at: string;
  messages: Message[];
}

export interface DocumentItem {
  id: number;
  filename: string;
  file_type: string;
  file_size: number;
  status: DocumentStatus;
  error_message?: string | null;
  chunk_count: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeStats {
  document_count: number;
  ready_count: number;
  chunk_count: number;
  question_count: number;
}

export interface SearchHit {
  index: number;
  chunk_id: number;
  document_id: number;
  document_name: string;
  chunk_index: number;
  snippet: string;
  score: number;
}

export interface SearchResponse {
  query: string;
  hits: SearchHit[];
  elapsed_ms: number;
}

export interface ChatMeta {
  conversation_id: number;
  user_message_id: number;
  assistant_message_id: number;
  title: string;
  model: string;
  use_knowledge: boolean;
  regenerated: boolean;
}

export interface ChatDone {
  assistant_message_id: number;
  latency_ms: number;
  content_length: number;
  status: MessageStatus;
}

export interface ChatStreamPayload {
  conversation_id?: number;
  message?: string;
  use_knowledge: boolean;
  regenerate?: boolean;
}

export interface ChatStreamHandlers {
  onMeta: (meta: ChatMeta) => void;
  onCitations: (citations: Citation[]) => void;
  onDelta: (content: string) => void;
  onDone: (done: ChatDone) => void;
  onError: (message: string) => void;
}

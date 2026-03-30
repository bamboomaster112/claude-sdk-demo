export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'user';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string | null;
  source_type: SourceType;
  claude_session_id: string | null;
  model_used: string;
  status: 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
}

export type SourceType =
  | 'teamcity_kotlin'
  | 'teamcity_json'
  | 'jenkins_declarative'
  | 'jenkins_scripted';

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  message_type: 'text' | 'code' | 'file' | 'image' | 'yaml_output';
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface MigrationOutput {
  id: string;
  session_id: string;
  original_config: string;
  github_actions_yaml: string;
  source_type: string;
  validation_status: string;
  created_at: string;
}

export interface SessionDetail {
  session: ChatSession;
  messages: ChatMessage[];
  outputs: MigrationOutput[];
}

export interface UsageStats {
  total_sessions: number;
  total_tokens_in: number;
  total_tokens_out: number;
  active_users: number;
  model_breakdown: Record<string, number>;
}

export interface WSMessage {
  type: 'assistant_chunk' | 'assistant_complete' | 'tool_use' | 'error' | 'connected';
  content?: string;
  yaml_outputs?: string[];
  tool?: string;
  status?: string;
  message?: string;
  session?: ChatSession;
}

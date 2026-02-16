// ============================================
// Agentbase Shared Types
// ============================================

// --- User Types ---
export enum UserRole {
  ADMIN = 'admin',
  DEVELOPER = 'developer',
  USER = 'user',
}

export interface User {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: Pick<User, 'id' | 'email' | 'displayName' | 'role'>;
  accessToken: string;
  tokenType: string;
}

// --- Application Types ---
export enum AppStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived',
}

export interface ApplicationConfig {
  aiProvider?: string;
  aiModel?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  enabledPlugins?: string[];
  themeId?: string;
  customSettings?: Record<string, any>;
}

export interface Application {
  id: string;
  name: string;
  description?: string;
  slug: string;
  status: AppStatus;
  config: ApplicationConfig;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

// --- Plugin Types ---
export enum PluginStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  DEPRECATED = 'deprecated',
}

export interface PluginManifest {
  hooks?: string[];
  permissions?: string[];
  dependencies?: Record<string, string>;
  settings?: Record<string, any>;
  entryPoint?: string;
}

export interface Plugin {
  id: string;
  name: string;
  slug: string;
  version: string;
  description?: string;
  author?: string;
  manifest: PluginManifest;
  status: PluginStatus;
  rating: number;
  downloadCount: number;
  isPaid: boolean;
  price?: number;
  createdAt: string;
  updatedAt: string;
}

// --- Theme Types ---
export interface ThemeStyles {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  fontSize?: string;
  borderRadius?: string;
  spacing?: string;
}

export interface Theme {
  id: string;
  name: string;
  slug: string;
  version: string;
  description?: string;
  author?: string;
  previewUrl?: string;
  defaultStyles: ThemeStyles;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- AI Types ---
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface Conversation {
  id: string;
  applicationId: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  metadata: {
    model?: string;
    provider?: string;
    totalTokens?: number;
  };
  createdAt: string;
  updatedAt: string;
}

// --- API Types ---
export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface Product {
  id: string;
  name: string;
  barcode: string;
  category: string;
  buyPrice: number;
  price: number;
  stock: number;
  safeStock: number;
  location: string;
  desc: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  name: string;
  barcode: string;
  category: string;
  buyPrice: number;
  price: number;
  stock: number;
  safeStock: number;
  location: string;
  desc: string;
}

export interface SaleRecord {
  id: string;
  productId: string;
  productName: string;
  qty: number;
  unitPrice: number;
  cost: number;
  total: number;
  time: string;
}

export interface CustomerQuery {
  id: string;
  content: string;
  answer: string;
  demo: boolean;
  createdAt: string;
  provider?: string | null;
  model?: string | null;
  latencyMs?: number | null;
  sourceDocumentIds?: string[];
  error?: string | null;
}

export interface Promotion {
  id: string;
  title: string;
  detail: string;
  active: boolean;
  createdAt: string;
}

export interface LlmConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
  provider?: 'deepseek' | 'openai-compatible';
}

export interface StoreProfile {
  name: string;
  address: string;
  phone: string;
  hours: string;
  welcome: string;
}

export interface AiReply {
  text: string;
  demo: boolean;
  source?: 'ai' | 'local' | 'command';
}

export interface RangeSummary {
  count: number;
  revenue: number;
  profit: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  qty: number;
  amount: number;
  profit: number;
}

export interface WeeklyReport {
  from: string;
  to: string;
  summary: RangeSummary;
  top: TopProduct[];
  slow: Product[];
}

export type AgentKind = 'storekeeper' | 'shopping-advisor';

export type CloudModule =
  | 'llm-gateway'
  | 'workflow-engine'
  | 'knowledge-engine'
  | 'relational-db'
  | 'collaboration-center';

export type WorkflowEventStatus = 'pending' | 'running' | 'success' | 'failed';

export interface WorkflowEvent {
  id: string;
  runId: string;
  agent: AgentKind;
  module: CloudModule;
  action: string;
  status: WorkflowEventStatus;
  detail?: string;
  durationMs?: number;
  createdAt: string;
}

export interface AgentRun {
  id: string;
  agent: AgentKind;
  input: string;
  output?: string;
  events: WorkflowEvent[];
  createdAt: string;
}

export interface KnowledgeHit {
  id: string;
  kind: 'product' | 'document' | 'graph';
  title: string;
  content: string;
  score: number;
  relatedProductIds?: string[];
}

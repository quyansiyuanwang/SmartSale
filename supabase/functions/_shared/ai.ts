export interface ModelConfig { provider: string; model: string; base_url?: string | null; }

function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing Function Secret: ${name}`);
  return value;
}

export function providerSettings(model: ModelConfig) {
  if (model.provider === 'deepseek') return { baseUrl: Deno.env.get('DEEPSEEK_BASE_URL') ?? 'https://api.deepseek.com/v1', apiKey: required('DEEPSEEK_API_KEY') };
  return { baseUrl: model.base_url || required('OPENAI_COMPATIBLE_BASE_URL'), apiKey: required('OPENAI_COMPATIBLE_API_KEY') };
}

export async function embed(text: string): Promise<number[]> {
  const baseUrl = required('EMBEDDING_BASE_URL').replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}/embeddings`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${required('EMBEDDING_API_KEY')}` }, body: JSON.stringify({ model: required('EMBEDDING_MODEL'), input: text, dimensions: 1536 }) });
  if (!response.ok) throw new Error(`Embedding provider returned HTTP ${response.status}`);
  const data = await response.json(); const vector = data?.data?.[0]?.embedding;
  if (!Array.isArray(vector) || vector.length !== 1536) throw new Error('Embedding provider must return a 1536-dimensional vector');
  return vector;
}

export async function streamChat(model: ModelConfig, messages: Array<{ role: string; content: string }>): Promise<Response> {
  const settings = providerSettings(model);
  const response = await fetch(`${settings.baseUrl.replace(/\/+$/, '')}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` }, body: JSON.stringify({ model: model.model, messages, stream: true, temperature: 0.35 }), signal: AbortSignal.timeout(45_000) });
  if (!response.ok || !response.body) throw new Error(`Chat provider returned HTTP ${response.status}`);
  return response;
}

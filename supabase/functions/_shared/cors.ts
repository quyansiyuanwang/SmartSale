function allowedOrigin(request?: Request): string {
  const origin = request?.headers.get('origin') ?? '';
  const allowed = (Deno.env.get('ALLOWED_ORIGINS') ?? Deno.env.get('ALLOWED_ORIGIN') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (!allowed.length) return '*';
  return origin && allowed.includes(origin) ? origin : allowed[0];
}

export function corsHeaders(request?: Request): HeadersInit {
  return {
    'Access-Control-Allow-Origin': allowedOrigin(request),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    Vary: 'Origin'
  };
}

export function json(body: unknown, status = 200, request?: Request): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(request), 'Content-Type': 'application/json' } });
}

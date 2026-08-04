const configuredOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',').map((origin) => origin.trim()).filter(Boolean)

export function corsHeaders(request: Request) {
  const origin = request.headers.get('origin') ?? ''
  const allowedOrigin = configuredOrigins.includes(origin) ? origin : configuredOrigins[0] ?? ''
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

export function json(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), 'Content-Type': 'application/json; charset=utf-8' },
  })
}

export function isAllowedOrigin(request: Request) {
  const origin = request.headers.get('origin')
  return origin === null || configuredOrigins.includes(origin)
}

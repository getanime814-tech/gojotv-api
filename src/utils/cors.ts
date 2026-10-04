// CORS headers for W6 API Worker
// Frontend will be on Cloudflare Pages

const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "https://gojotv.pages.dev",
];

export function getCorsHeaders(
  origin: string | null
): Record<string, string> {
  const allowedOrigin =
    origin && ALLOWED_ORIGINS.includes(origin)
      ? origin
      : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function handleOptions(request: Request): Response {
  const headers = getCorsHeaders(request.headers.get("Origin"));
  return new Response(null, { status: 204, headers });
}

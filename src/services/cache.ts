// Cloudflare Cache API wrapper
// Uses caches.default (edge cache) for GET responses

export interface CacheOptions {
  ttlSeconds: number;
}

export async function cacheGet(
  cacheKeyUrl: string,
  request: Request
): Promise<Response | null> {
  const cache = caches.default;
  const cacheKey = new Request(cacheKeyUrl, {
    method: "GET",
    headers: request.headers,
  });
  const cached = await cache.match(cacheKey);
  return cached ?? null;
}

export async function cachePut(
  cacheKeyUrl: string,
  response: Response,
  options: CacheOptions
): Promise<void> {
  const cache = caches.default;
  const cacheKey = new Request(cacheKeyUrl, { method: "GET" });

  const headers = new Headers(response.headers);
  headers.set("Cache-Control", `public, max-age=${options.ttlSeconds}`);

  const cachedResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });

  await cache.put(cacheKey, cachedResponse);
}

export async function cacheDelete(cacheKeyUrl: string): Promise<boolean> {
  const cache = caches.default;
  const cacheKey = new Request(cacheKeyUrl, { method: "GET" });
  return cache.delete(cacheKey);
}

export function buildCacheKey(
  baseUrl: string,
  path: string,
  searchParams?: Record<string, string>
): string {
  const url = new URL(path, baseUrl);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

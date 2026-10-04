// Input validation helpers

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function isValidSlug(value: string): boolean {
  return SLUG_RE.test(value) && value.length <= 200;
}

export function parsePositiveInt(
  value: string | null,
  fallback: number,
  max = Number.MAX_SAFE_INTEGER
): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

export function parseSearchQuery(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 200) return null;
  return trimmed;
}

export function sanitizePage(value: string | null): number {
  return parsePositiveInt(value, 1, 1000);
}

export function sanitizePerPage(value: string | null, max = 50): number {
  return parsePositiveInt(value, 20, max);
}

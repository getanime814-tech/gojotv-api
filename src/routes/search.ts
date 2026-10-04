// GET /api/search?q=
// Min 3 chars, ILIKE prefix on title/english_title/romaji_title
// Max 10 results
// If 0 results → log to search_requests (W5 will discover)

import { createSupabaseClient, SupabaseEnv } from "../services/supabase";
import { jsonOk, serverError, extractErrorMessage } from "../utils/response";
import { getCorsHeaders } from "../utils/cors";
import { parseSearchQuery } from "../utils/validation";
import type { SearchResultItem, SearchResponse } from "../types/api";

type Env = SupabaseEnv;

const MAX_RESULTS = 10;
const MIN_QUERY_LENGTH = 3;
const SELECT_COLS =
  "id, slug, title, english_title, romaji_title, poster_image, popularity";

interface SearchRow {
  id: string;
  slug: string;
  title: string;
  english_title: string | null;
  romaji_title: string | null;
  poster_image: string | null;
  popularity: number | null;
}

export async function handleSearch(
  request: Request,
  env: Env
): Promise<Response> {
  const corsHeaders = getCorsHeaders(request.headers.get("Origin"));
  const url = new URL(request.url);
  const rawQuery = url.searchParams.get("q");
  const query = parseSearchQuery(rawQuery);

  if (!query || query.length < MIN_QUERY_LENGTH) {
    const empty: SearchResponse = { results: [], query: query ?? "" };
    return jsonOk(empty, { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient(env);
    const safeQuery = query.replace(/[%_\\]/g, "");
    const pattern = `${safeQuery}%`;

    const [titleRes, engRes, romajiRes] = await Promise.all([
      supabase
        .from("anime")
        .select(SELECT_COLS)
        .is("deleted_at", null)
        .ilike("title", pattern)
        .order("popularity", { ascending: false, nullsFirst: false })
        .limit(MAX_RESULTS),
      supabase
        .from("anime")
        .select(SELECT_COLS)
        .is("deleted_at", null)
        .ilike("english_title", pattern)
        .order("popularity", { ascending: false, nullsFirst: false })
        .limit(MAX_RESULTS),
      supabase
        .from("anime")
        .select(SELECT_COLS)
        .is("deleted_at", null)
        .ilike("romaji_title", pattern)
        .order("popularity", { ascending: false, nullsFirst: false })
        .limit(MAX_RESULTS),
    ]);

    const firstError = titleRes.error || engRes.error || romajiRes.error;
    if (firstError) throw firstError;

    const map = new Map<string, SearchRow>();
    for (const res of [titleRes, engRes, romajiRes]) {
      for (const row of (res.data ?? []) as SearchRow[]) {
        if (!map.has(row.id)) map.set(row.id, row);
      }
    }

    const merged = Array.from(map.values()).sort(
      (a, b) => (b.popularity ?? 0) - (a.popularity ?? 0)
    );

    const results: SearchResultItem[] = merged
      .slice(0, MAX_RESULTS)
      .map((row) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        english_title: row.english_title,
        romaji_title: row.romaji_title,
        poster_image: row.poster_image,
      }));

    if (results.length === 0) {
      await logMissingSearch(supabase, query);
    }

    const response: SearchResponse = { results, query };
    return jsonOk(response, { headers: corsHeaders });
  } catch (err) {
    return serverError(extractErrorMessage(err));
  }
}

async function logMissingSearch(
  supabase: ReturnType<typeof createSupabaseClient>,
  query: string
): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from("search_requests")
      .select("id, request_count")
      .eq("query", query)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("search_requests")
        .update({
          request_count: (existing.request_count ?? 0) + 1,
          last_requested_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("search_requests").insert({
        query,
        request_count: 1,
        last_requested_at: new Date().toISOString(),
      });
    }
  } catch {
    // silent fail
  }
}

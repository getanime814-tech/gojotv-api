// GET /api/search?q=
// Min 3 chars, ILIKE prefix on title/english_title/romaji_title
// Max 10 results
// If 0 results → log to search_requests (W5 will discover)

import { createSupabaseClient, SupabaseEnv } from "../services/supabase";
import { jsonOk, serverError } from "../utils/response";
import { getCorsHeaders } from "../utils/cors";
import { parseSearchQuery } from "../utils/validation";
import type { SearchResultItem, SearchResponse } from "../types/api";

interface Env extends SupabaseEnv {}

const MAX_RESULTS = 10;
const MIN_QUERY_LENGTH = 3;

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
    const safeQuery = query.replace(/[%_]/g, "");
    const pattern = `${safeQuery}%`;

    const { data, error } = await supabase
      .from("anime")
      .select(
        "id, slug, title, english_title, romaji_title, poster_image, popularity"
      )
      .is("deleted_at", null)
      .or(
        `title.ilike.${pattern},english_title.ilike.${pattern},romaji_title.ilike.${pattern}`
      )
      .order("popularity", { ascending: false, nullsFirst: false })
      .limit(MAX_RESULTS);

    if (error) throw error;

    const results: SearchResultItem[] = (data ?? []).map((row) => ({
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
    const message = err instanceof Error ? err.message : "Unknown error";
    return serverError(message);
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
    // Silent fail — logging should not break search
  }
}

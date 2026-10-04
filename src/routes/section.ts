// GET /api/section/:key
// Returns 100 anime for a specific home section ("View All")

import { createSupabaseClient, SupabaseEnv } from "../services/supabase";
import { jsonOk, notFound, serverError } from "../utils/response";
import { getCorsHeaders } from "../utils/cors";
import { isValidSlug } from "../utils/validation";
import type { AnimeCard } from "../types/api";
import type { AnimeRow, AnimeSeason } from "../types/database";

interface Env extends SupabaseEnv {}

const LIMIT = 100;

const VALID_KEYS = [
  "trending",
  "season",
  "popular",
  "movies",
  "newly_added",
  "top_100",
] as const;

type SectionKey = (typeof VALID_KEYS)[number];

function toAnimeCard(row: AnimeRow): AnimeCard {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    english_title: row.english_title,
    romaji_title: row.romaji_title,
    poster_image: row.poster_image,
    cover_color: row.cover_color,
    score: row.score,
    year: row.year,
    status: row.status,
    is_movie: row.is_movie,
    episodes_count: row.episodes_count,
  };
}

function getCurrentSeason(): { season: AnimeSeason; year: number } {
  const now = new Date();
  const month = now.getUTCMonth() + 1;
  const year = now.getUTCFullYear();
  let season: AnimeSeason;
  if (month >= 1 && month <= 3) season = "winter";
  else if (month >= 4 && month <= 6) season = "spring";
  else if (month >= 7 && month <= 9) season = "summer";
  else season = "fall";
  return { season, year };
}

export async function handleSection(
  request: Request,
  env: Env,
  key: string
): Promise<Response> {
  const corsHeaders = getCorsHeaders(request.headers.get("Origin"));

  if (!isValidSlug(key) || !VALID_KEYS.includes(key as SectionKey)) {
    return notFound("Section");
  }

  try {
    const supabase = createSupabaseClient(env);
    let query = supabase
      .from("anime")
      .select("*")
      .is("deleted_at", null)
      .limit(LIMIT);

    switch (key as SectionKey) {
      case "trending":
        query = query.order("trending_score", {
          ascending: false,
          nullsFirst: false,
        });
        break;
      case "season": {
        const { season, year } = getCurrentSeason();
        query = query
          .eq("season", season)
          .eq("year", year)
          .order("popularity", { ascending: false, nullsFirst: false });
        break;
      }
      case "popular":
        query = query.order("popularity", {
          ascending: false,
          nullsFirst: false,
        });
        break;
      case "movies":
        query = query
          .eq("is_movie", true)
          .order("popularity", { ascending: false, nullsFirst: false });
        break;
      case "newly_added":
        query = query.order("created_at", { ascending: false });
        break;
      case "top_100":
        query = query.order("score", {
          ascending: false,
          nullsFirst: false,
        });
        break;
    }

    const { data, error } = await query;
    if (error) throw error;

    const items = ((data ?? []) as AnimeRow[]).map(toAnimeCard);

    return jsonOk(
      { key, items },
      { headers: corsHeaders }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return serverError(message);
  }
}

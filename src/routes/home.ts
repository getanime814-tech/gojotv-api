// GET /api/home
// Returns 6 sections + hero slider
// Hardcoded sections for now (homepage_sections table integration in later phase)

import { createSupabaseClient, SupabaseEnv } from "../services/supabase";
import { jsonOk, serverError } from "../utils/response";
import { getCorsHeaders } from "../utils/cors";
import type {
  AnimeCard,
  HomeResponse,
  HomeSection,
  HomeHeroSlide,
} from "../types/api";
import type { AnimeRow, AnimeSeason } from "../types/database";

interface Env extends SupabaseEnv {}

const SECTION_LIMIT = 100;

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

function buildHeroFromPool(pools: AnimeRow[][]): HomeHeroSlide[] {
  const seen = new Set<string>();
  const result: HomeHeroSlide[] = [];

  for (const pool of pools) {
    for (const row of pool.slice(0, 6)) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      result.push({
        anime: toAnimeCard(row),
        banner_image: row.banner_image,
        description: row.description,
        score: row.score,
      });
      break;
    }
    if (result.length >= 6) break;
  }

  if (result.length < 6) {
    const all = pools.flat();
    for (const row of all) {
      if (result.length >= 6) break;
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      result.push({
        anime: toAnimeCard(row),
        banner_image: row.banner_image,
        description: row.description,
        score: row.score,
      });
    }
  }

  return result;
}

export async function handleHome(
  request: Request,
  env: Env
): Promise<Response> {
  const corsHeaders = getCorsHeaders(request.headers.get("Origin"));

  try {
    const supabase = createSupabaseClient(env);
    const { season, year } = getCurrentSeason();

    const [trendingRes, seasonRes, popularRes, moviesRes, top100Res, newlyRes] =
      await Promise.all([
        supabase
          .from("anime")
          .select("*")
          .is("deleted_at", null)
          .order("trending_score", { ascending: false, nullsFirst: false })
          .limit(SECTION_LIMIT),
        supabase
          .from("anime")
          .select("*")
          .is("deleted_at", null)
          .eq("season", season)
          .eq("year", year)
          .order("popularity", { ascending: false, nullsFirst: false })
          .limit(SECTION_LIMIT),
        supabase
          .from("anime")
          .select("*")
          .is("deleted_at", null)
          .order("popularity", { ascending: false, nullsFirst: false })
          .limit(SECTION_LIMIT),
        supabase
          .from("anime")
          .select("*")
          .is("deleted_at", null)
          .eq("is_movie", true)
          .order("popularity", { ascending: false, nullsFirst: false })
          .limit(SECTION_LIMIT),
        supabase
          .from("anime")
          .select("*")
          .is("deleted_at", null)
          .order("score", { ascending: false, nullsFirst: false })
          .limit(SECTION_LIMIT),
        supabase
          .from("anime")
          .select("*")
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(SECTION_LIMIT),
      ]);

    const trending = (trendingRes.data ?? []) as AnimeRow[];
    const seasonRows = (seasonRes.data ?? []) as AnimeRow[];
    const popular = (popularRes.data ?? []) as AnimeRow[];
    const movies = (moviesRes.data ?? []) as AnimeRow[];
    const top100 = (top100Res.data ?? []) as AnimeRow[];
    const newly = (newlyRes.data ?? []) as AnimeRow[];

    const hero = buildHeroFromPool([
      trending,
      seasonRows,
      popular,
      top100,
      movies,
      newly,
    ]);

    const sections: HomeSection[] = [
      {
        key: "trending",
        title: "Trending Now",
        content_type: "anilist_trending",
        items: trending.map(toAnimeCard),
      },
      {
        key: "season",
        title: "Popular This Season",
        content_type: "anilist_season",
        items: seasonRows.map(toAnimeCard),
      },
      {
        key: "popular",
        title: "All Time Popular",
        content_type: "anilist_popular",
        items: popular.map(toAnimeCard),
      },
      {
        key: "movies",
        title: "Popular Movies",
        content_type: "anilist_movies",
        items: movies.map(toAnimeCard),
      },
      {
        key: "newly_added",
        title: "Newly Added",
        content_type: "db_newly_added",
        items: newly.map(toAnimeCard),
      },
      {
        key: "top_100",
        title: "Top 100 Anime",
        content_type: "anilist_top_100",
        items: top100.map(toAnimeCard),
      },
    ];

    const data: HomeResponse = { hero, sections };
    return jsonOk(data, { headers: corsHeaders });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return serverError(message);
  }
}

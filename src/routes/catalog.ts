// GET /api/catalog
// Filters: genre, year, season, status, format, sort, page, per_page

import { createSupabaseClient, SupabaseEnv } from "../services/supabase";
import { jsonOk, serverError, extractErrorMessage } from "../utils/response";
import { getCorsHeaders } from "../utils/cors";
import { sanitizePage, sanitizePerPage } from "../utils/validation";
import type { AnimeCard } from "../types/api";
import type { AnimeRow } from "../types/database";

type Env = SupabaseEnv;

const SELECT_COLS =
  "id, slug, title, english_title, romaji_title, poster_image, cover_color, score, year, status, is_movie, episodes_count, popularity, trending_score, created_at";

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

export async function handleCatalog(
  request: Request,
  env: Env
): Promise<Response> {
  const corsHeaders = getCorsHeaders(request.headers.get("Origin"));
  const url = new URL(request.url);

  try {
    const supabase = createSupabaseClient(env);
    const page = sanitizePage(url.searchParams.get("page"));
    const perPage = sanitizePerPage(url.searchParams.get("per_page"), 50);
    const genre = url.searchParams.get("genre");
    const year = url.searchParams.get("year");
    const season = url.searchParams.get("season");
    const status = url.searchParams.get("status");
    const format = url.searchParams.get("format");
    const sort = url.searchParams.get("sort") ?? "popularity";

    let query = supabase
      .from("anime")
      .select(SELECT_COLS)
      .is("deleted_at", null);

    if (genre) {
      const { data: genreRow, error: genreErr } = await supabase
        .from("genres")
        .select("id")
        .eq("name", genre)
        .maybeSingle();

      if (genreErr) throw genreErr;

      if (!genreRow) {
        return jsonOk(
          {
            items: [],
            pagination: { page, per_page: perPage, total: 0, total_pages: 0 },
          },
          { headers: corsHeaders }
        );
      }

      const { data: animeIds, error: agErr } = await supabase
        .from("anime_genres")
        .select("anime_id")
        .eq("genre_id", genreRow.id);

      if (agErr) throw agErr;

      const ids = ((animeIds ?? []) as Array<{ anime_id: string }>).map(
        (r) => r.anime_id
      );

      if (ids.length === 0) {
        return jsonOk(
          {
            items: [],
            pagination: { page, per_page: perPage, total: 0, total_pages: 0 },
          },
          { headers: corsHeaders }
        );
      }

      query = query.in("id", ids);
    }

    if (year) query = query.eq("year", Number(year));
    if (season) query = query.eq("season", season);
    if (status) query = query.eq("status", status);
    if (format === "movie") query = query.eq("is_movie", true);
    else if (format === "tv") query = query.eq("is_movie", false);

    switch (sort) {
      case "trending":
        query = query.order("trending_score", {
          ascending: false,
          nullsFirst: false,
        });
        break;
      case "latest":
        query = query.order("created_at", { ascending: false });
        break;
      case "score":
        query = query.order("score", {
          ascending: false,
          nullsFirst: false,
        });
        break;
      case "title":
        query = query.order("title", { ascending: true });
        break;
      case "popularity":
      default:
        query = query.order("popularity", {
          ascending: false,
          nullsFirst: false,
        });
        break;
    }

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    const { data, error } = await query.range(from, to);

    if (error) throw error;

    const items = ((data ?? []) as AnimeRow[]).map(toAnimeCard);

    // Estimate total_pages: if we got a full page, assume more may exist
    const hasMore = items.length === perPage;
    const totalPagesEstimate = hasMore ? page + 1 : page;

    return jsonOk(
      {
        items,
        pagination: {
          page,
          per_page: perPage,
          total: items.length,
          total_pages: totalPagesEstimate,
        },
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    return serverError(extractErrorMessage(err));
  }
}

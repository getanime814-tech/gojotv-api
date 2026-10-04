// GET /api/anime/:slug
// Details page data: anime + genres + studios + episodes + related + available languages

import { createSupabaseClient, SupabaseEnv } from "../services/supabase";
import { jsonOk, notFound, serverError } from "../utils/response";
import { getCorsHeaders } from "../utils/cors";
import { isValidSlug } from "../utils/validation";
import type {
  AnimeDetailsResponse,
  EpisodeSummary,
  RelatedAnime,
} from "../types/api";
import type {
  AnimeRow,
  EpisodeRow,
  StreamLanguage,
  RelationType,
} from "../types/database";

type Env = SupabaseEnv;

const RELATED_LIMIT = 30;
const LANG_PRIORITY: StreamLanguage[] = [
  "sub",
  "dub",
  "hindi",
  "bengali",
  "tamil",
  "telugu",
  "raw",
];

function toEpisodeSummary(row: EpisodeRow): EpisodeSummary {
  return {
    id: row.id,
    episode_number: row.episode_number,
    title: row.title,
    thumbnail_image: row.thumbnail_image,
    duration: row.duration,
    air_date: row.air_date,
    is_filler: row.is_filler,
  };
}

function sortLanguages(langs: StreamLanguage[]): StreamLanguage[] {
  return langs.sort((a, b) => {
    const ai = LANG_PRIORITY.indexOf(a);
    const bi = LANG_PRIORITY.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

export async function handleAnimeDetails(
  request: Request,
  env: Env,
  slug: string
): Promise<Response> {
  const corsHeaders = getCorsHeaders(request.headers.get("Origin"));

  if (!isValidSlug(slug)) {
    return notFound("Anime");
  }

  try {
    const supabase = createSupabaseClient(env);

    const { data: animeRow, error: animeErr } = await supabase
      .from("anime")
      .select("*")
      .eq("slug", slug)
      .is("deleted_at", null)
      .maybeSingle();

    if (animeErr) throw animeErr;
    if (!animeRow) return notFound("Anime");

    const anime = animeRow as AnimeRow;

    const [genresRes, studiosRes, episodesRes, relationsRes] =
      await Promise.all([
        supabase
          .from("anime_genres")
          .select("genres(name)")
          .eq("anime_id", anime.id),
        supabase
          .from("anime_studios")
          .select("studios(name)")
          .eq("anime_id", anime.id),
        supabase
          .from("episodes")
          .select("*")
          .eq("anime_id", anime.id)
          .is("deleted_at", null)
          .order("episode_number", { ascending: true }),
        supabase
          .from("anime_relations")
          .select("relation, related_anime_id")
          .eq("anime_id", anime.id),
      ]);

    const genres: string[] = ((genresRes.data ?? []) as unknown[])
      .map((row) => (row as { genres?: { name?: string } }).genres?.name)
      .filter((name): name is string => typeof name === "string");

    const studios: string[] = ((studiosRes.data ?? []) as unknown[])
      .map((row) => (row as { studios?: { name?: string } }).studios?.name)
      .filter((name): name is string => typeof name === "string");

    const episodes = ((episodesRes.data ?? []) as EpisodeRow[]).map(
      toEpisodeSummary
    );

    // Related anime: relations first, then similarities
    const relationMap = new Map<string, RelationType>();
    const relationRows = (relationsRes.data ?? []) as Array<{
      relation: RelationType;
      related_anime_id: string;
    }>;
    for (const row of relationRows) {
      relationMap.set(row.related_anime_id, row.relation);
    }

    let relatedIds = Array.from(relationMap.keys());

    if (relatedIds.length < RELATED_LIMIT) {
      const { data: simRows } = await supabase
        .from("anime_similarities")
        .select("similar_anime_id")
        .eq("anime_id", anime.id)
        .order("similarity_score", { ascending: false })
        .limit(RELATED_LIMIT * 2);

      const simIds = (
        (simRows ?? []) as Array<{ similar_anime_id: string }>
      )
        .map((r) => r.similar_anime_id)
        .filter((id) => !relationMap.has(id));

      relatedIds = relatedIds.concat(simIds);
    }

    relatedIds = relatedIds.slice(0, RELATED_LIMIT);

    let related: RelatedAnime[] = [];
    if (relatedIds.length > 0) {
      const { data: relatedRows } = await supabase
        .from("anime")
        .select(
          "id, slug, title, english_title, romaji_title, poster_image, cover_color, score, year, status, is_movie, episodes_count"
        )
        .in("id", relatedIds)
        .is("deleted_at", null);

      const rowMap = new Map(
        ((relatedRows ?? []) as AnimeRow[]).map((r) => [r.id, r])
      );

      related = relatedIds
        .map((id): RelatedAnime | null => {
          const row = rowMap.get(id);
          if (!row) return null;
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
            relation: relationMap.get(id) ?? "similar",
          };
        })
        .filter((r): r is RelatedAnime => r !== null);
    }

    // Available languages from streams table
    const episodeIds = episodes.map((e) => e.id);
    let availableLanguages: StreamLanguage[] = [];

    if (episodeIds.length > 0) {
      const { data: langRows } = await supabase
        .from("streams")
        .select("language")
        .in("episode_id", episodeIds)
        .is("deleted_at", null)
        .eq("status", "active");

      const langSet = new Set<StreamLanguage>(
        ((langRows ?? []) as Array<{ language: StreamLanguage }>).map(
          (r) => r.language
        )
      );
      availableLanguages = sortLanguages(Array.from(langSet));
    }

    const response: AnimeDetailsResponse = {
      anime,
      genres,
      studios,
      episodes,
      related,
      available_languages: availableLanguages,
    };

    return jsonOk(response, { headers: corsHeaders });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return serverError(message);
  }
}

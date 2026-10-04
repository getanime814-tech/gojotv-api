// GET /api/watch/:slug?ep=N
// Player page data: anime + episode + streams grouped by language + all episodes + related

import { createSupabaseClient, SupabaseEnv } from "../services/supabase";
import { jsonOk, notFound, serverError } from "../utils/response";
import { getCorsHeaders } from "../utils/cors";
import { isValidSlug, parsePositiveInt } from "../utils/validation";
import type {
  AnimeCard,
  EpisodeSummary,
  RelatedAnime,
  WatchLanguageGroup,
  WatchResponse,
  WatchServer,
} from "../types/api";
import type {
  AnimeRow,
  EpisodeRow,
  StreamRow,
  StreamLanguage,
  RelationType,
} from "../types/database";

type Env = SupabaseEnv;

const RELATED_LIMIT = 30;
const MAX_SERVERS_PER_LANGUAGE = 5;
const LANG_PRIORITY: StreamLanguage[] = [
  "sub",
  "dub",
  "hindi",
  "bengali",
  "tamil",
  "telugu",
  "raw",
];

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

export async function handleWatch(
  request: Request,
  env: Env,
  slug: string
): Promise<Response> {
  const corsHeaders = getCorsHeaders(request.headers.get("Origin"));
  const url = new URL(request.url);

  if (!isValidSlug(slug)) {
    return notFound("Anime");
  }

  const epParam = url.searchParams.get("ep");
  const episodeNumber = parsePositiveInt(epParam, 1, 10000);

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

    const { data: episodeRow, error: epErr } = await supabase
      .from("episodes")
      .select("*")
      .eq("anime_id", anime.id)
      .eq("episode_number", episodeNumber)
      .is("deleted_at", null)
      .maybeSingle();

    if (epErr) throw epErr;
    if (!episodeRow) return notFound("Episode");

    const episode = episodeRow as EpisodeRow;

    const [allEpisodesRes, streamsRes, relationsRes] = await Promise.all([
      supabase
        .from("episodes")
        .select("*")
        .eq("anime_id", anime.id)
        .is("deleted_at", null)
        .order("episode_number", { ascending: true }),
      supabase
        .from("streams")
        .select("*")
        .eq("episode_id", episode.id)
        .is("deleted_at", null)
        .eq("status", "active")
        .order("is_primary", { ascending: false })
        .order("health_score", { ascending: false, nullsFirst: false })
        .limit(100),
      supabase
        .from("anime_relations")
        .select("relation, related_anime_id")
        .eq("anime_id", anime.id),
    ]);

    const allEpisodes = ((allEpisodesRes.data ?? []) as EpisodeRow[]).map(
      toEpisodeSummary
    );
    const streamRows = (streamsRes.data ?? []) as StreamRow[];

    // Group by language, cap 5 servers per language
    const grouped = new Map<StreamLanguage, WatchServer[]>();
    for (const s of streamRows) {
      const arr = grouped.get(s.language) ?? [];
      if (arr.length >= MAX_SERVERS_PER_LANGUAGE) continue;
      arr.push({
        id: s.id,
        provider: s.provider,
        url: s.url,
        quality: s.quality,
        format: s.format,
        is_primary: s.is_primary,
      });
      grouped.set(s.language, arr);
    }

    const languages: WatchLanguageGroup[] = Array.from(grouped.entries())
      .sort(([a], [b]) => {
        const ai = LANG_PRIORITY.indexOf(a);
        const bi = LANG_PRIORITY.indexOf(b);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      })
      .map(([language, servers]) => ({ language, servers }));

    // Related anime
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

    const response: WatchResponse = {
      anime: toAnimeCard(anime),
      episode: toEpisodeSummary(episode),
      languages,
      episodes: allEpisodes,
      related,
    };

    return jsonOk(response, { headers: corsHeaders });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return serverError(message);
  }
}

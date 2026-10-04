// Supabase database row types
// Matches actual schema (verified against information_schema)

// ==================== ENUMS ====================

export type AnimeStatus =
  | "airing"
  | "completed"
  | "upcoming"
  | "cancelled"
  | "paused";

export type AnimeSeason = "spring" | "summer" | "fall" | "winter";

export type StreamLanguage =
  | "sub"
  | "dub"
  | "raw"
  | "hindi"
  | "tamil"
  | "telugu"
  | "bengali";

export type StreamProvider = "anivexa" | "tatakai" | "external";

export type StreamQuality = "auto" | "1080p" | "720p" | "480p" | "360p";

export type StreamFormat = "hls" | "dash" | "mp4";

export type StreamStatus = "active" | "degraded" | "offline" | "maintenance";

export type RelationType =
  | "prequel"
  | "sequel"
  | "side_story"
  | "alternative"
  | "spin_off"
  | "summary"
  | "character"
  | "other";

// ==================== TABLES ====================

export interface AnimeRow {
  id: string;
  slug: string;
  title: string;
  english_title: string | null;
  romaji_title: string | null;
  synonyms: string[] | null;
  description: string | null;
  status: AnimeStatus | null;
  season: AnimeSeason | null;
  year: number | null;
  score: number | null;
  popularity: number | null;
  trending_score: number | null;
  poster_image: string | null;
  banner_image: string | null;
  cover_color: string | null;
  source: string | null;
  episodes_count: number | null;
  duration: string | null;
  rating: string | null;
  is_movie: boolean;
  is_adult: boolean;
  search_vector: unknown | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  anilist_id: number | null;
  mal_id: number | null;
  trailer_embed_url: string | null;
}

export interface EpisodeRow {
  id: string;
  anime_id: string;
  episode_number: number;
  title: string;
  description: string | null;
  thumbnail_image: string | null;
  is_filler: boolean;
  air_date: string | null;
  duration: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  season_id: string | null;
}

export interface StreamRow {
  id: string;
  episode_id: string;
  provider: StreamProvider;
  url: string;
  language: StreamLanguage;
  quality: StreamQuality;
  format: StreamFormat;
  health_score: number;
  fail_count: number;
  is_primary: boolean;
  status: StreamStatus;
  last_checked_at: string | null;
  last_failed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  link_expires_at: string | null;
}

export interface GenreRow {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface StudioRow {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface AnimeRelationRow {
  id: string;
  anime_id: string;
  related_anime_id: string;
  relation: RelationType;
  created_at: string;
  updated_at: string;
}

export interface AnimeSimilarityRow {
  anime_id: string;
  similar_anime_id: string;
  similarity_score: number;
  created_at: string;
}

export interface HomepageSectionRow {
  id: string;
  section_key: string | null;
  title: string;
  display_order: number;
  enabled: boolean;
  content_type: string;
  config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface StaticPageRow {
  id: string;
  slug: string;
  title: string;
  content: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface SearchRequestRow {
  id: string;
  query: string;
  request_count: number | null;
  last_requested_at: string | null;
}

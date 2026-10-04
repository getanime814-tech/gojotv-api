// API response shapes (what W6 returns to frontend)

import type {
  AnimeRow,
  EpisodeRow,
  StreamLanguage,
  StreamProvider,
  StreamQuality,
  StreamFormat,
} from "./database";

// ==================== Common ====================

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface Pagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

// ==================== Anime Card (list views) ====================

export interface AnimeCard {
  id: string;
  slug: string;
  title: string;
  english_title: string | null;
  romaji_title: string | null;
  poster_image: string | null;
  cover_color: string | null;
  score: number | null;
  year: number | null;
  status: string | null;
  is_movie: boolean;
  episodes_count: number | null;
}

// ==================== Home ====================

export interface HomeSection {
  key: string;
  title: string;
  content_type: string;
  items: AnimeCard[];
}

export interface HomeHeroSlide {
  anime: AnimeCard;
  banner_image: string | null;
  description: string | null;
  score: number | null;
}

export interface HomeResponse {
  hero: HomeHeroSlide[];
  sections: HomeSection[];
}

// ==================== Anime Details ====================

export interface EpisodeSummary {
  id: string;
  episode_number: number;
  title: string;
  thumbnail_image: string | null;
  duration: number | null;
  air_date: string | null;
  is_filler: boolean;
}

export interface RelatedAnime extends AnimeCard {
  relation: string;
}

export interface AnimeDetailsResponse {
  anime: AnimeRow;
  genres: string[];
  studios: string[];
  episodes: EpisodeSummary[];
  related: RelatedAnime[];
  available_languages: StreamLanguage[];
}

// ==================== Watch / Player ====================

export interface WatchServer {
  id: string;
  provider: StreamProvider;
  url: string;
  quality: StreamQuality;
  format: StreamFormat;
  is_primary: boolean;
}

export interface WatchLanguageGroup {
  language: StreamLanguage;
  servers: WatchServer[];
}

export interface WatchResponse {
  anime: AnimeCard;
  episode: EpisodeSummary;
  languages: WatchLanguageGroup[];
  episodes: EpisodeSummary[];
  related: RelatedAnime[];
}

// ==================== Catalog / Search ====================

export interface CatalogFilters {
  genre?: string;
  year?: number;
  season?: string;
  status?: string;
  format?: "tv" | "movie";
  sort?: "popularity" | "trending" | "latest" | "score" | "title";
  q?: string;
  page?: number;
  per_page?: number;
}

export interface CatalogResponse {
  items: AnimeCard[];
  pagination: Pagination;
}

export interface SearchResultItem {
  id: string;
  slug: string;
  title: string;
  english_title: string | null;
  romaji_title: string | null;
  poster_image: string | null;
}

export interface SearchResponse {
  results: SearchResultItem[];
  query: string;
}

// ==================== Menu / Static Pages ====================

export interface MenuItem {
  slug: string;
  title: string;
}

export interface MenuResponse {
  items: MenuItem[];
}

export interface StaticPageResponse {
  slug: string;
  title: string;
  content: string;
}

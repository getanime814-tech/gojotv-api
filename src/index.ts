// W6 — Frontend API Worker
// Main router: matches URL path to route handler

import { handleHome } from "./routes/home";
import { handleSection } from "./routes/section";
import { handleCatalog } from "./routes/catalog";
import { handleSearch } from "./routes/search";
import { handleMenu } from "./routes/menu";
import { handlePage } from "./routes/page";
import { handleAnimeDetails } from "./routes/anime";
import { handleWatch } from "./routes/watch";
import { handleOptions } from "./utils/cors";
import { notFound } from "./utils/response";
import type { SupabaseEnv } from "./services/supabase";

interface Env extends SupabaseEnv {}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === "OPTIONS") {
      return handleOptions(request);
    }

    // Only allow GET for public API
    if (request.method !== "GET") {
      return notFound("Route");
    }

    try {
      // GET /api/home
      if (path === "/api/home") {
        return handleHome(request, env);
      }

      // GET /api/section/:key
      const sectionMatch = path.match(/^\/api\/section\/([^/]+)$/);
      if (sectionMatch) {
        return handleSection(request, env, sectionMatch[1]);
      }

      // GET /api/catalog
      if (path === "/api/catalog") {
        return handleCatalog(request, env);
      }

      // GET /api/search
      if (path === "/api/search") {
        return handleSearch(request, env);
      }

      // GET /api/menu
      if (path === "/api/menu") {
        return handleMenu(request, env);
      }

      // GET /api/page/:slug
      const pageMatch = path.match(/^\/api\/page\/([^/]+)$/);
      if (pageMatch) {
        return handlePage(request, env, pageMatch[1]);
      }

      // GET /api/anime/:slug
      const animeMatch = path.match(/^\/api\/anime\/([^/]+)$/);
      if (animeMatch) {
        return handleAnimeDetails(request, env, animeMatch[1]);
      }

      // GET /api/watch/:slug
      const watchMatch = path.match(/^\/api\/watch\/([^/]+)$/);
      if (watchMatch) {
        return handleWatch(request, env, watchMatch[1]);
      }

      // Health check
      if (path === "/" || path === "/health") {
        return new Response(
          JSON.stringify({
            worker: "gojotv-api",
            status: "alive",
            version: "1.0.0",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      return notFound("Route");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return new Response(
        JSON.stringify({ success: false, error: message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
};

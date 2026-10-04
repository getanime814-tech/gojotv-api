// GET /api/menu
// Returns list of published static pages (for header menu)

import { createSupabaseClient, SupabaseEnv } from "../services/supabase";
import { jsonOk, serverError } from "../utils/response";
import { getCorsHeaders } from "../utils/cors";
import type { MenuResponse } from "../types/api";

interface Env extends SupabaseEnv {}

export async function handleMenu(
  request: Request,
  env: Env
): Promise<Response> {
  const corsHeaders = getCorsHeaders(request.headers.get("Origin"));

  try {
    const supabase = createSupabaseClient(env);
    const { data, error } = await supabase
      .from("static_pages")
      .select("slug, title")
      .eq("is_published", true)
      .order("title", { ascending: true });

    if (error) throw error;

    const response: MenuResponse = { items: data ?? [] };
    return jsonOk(response, { headers: corsHeaders });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return serverError(message);
  }
}

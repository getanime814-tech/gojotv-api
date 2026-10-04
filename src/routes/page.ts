// GET /api/page/:slug
// Returns static page content (DMCA, Privacy, etc.)

import { createSupabaseClient, SupabaseEnv } from "../services/supabase";
import { jsonOk, notFound, serverError } from "../utils/response";
import { getCorsHeaders } from "../utils/cors";
import { isValidSlug } from "../utils/validation";
import type { StaticPageResponse } from "../types/api";

interface Env extends SupabaseEnv {}

export async function handlePage(
  request: Request,
  env: Env,
  slug: string
): Promise<Response> {
  const corsHeaders = getCorsHeaders(request.headers.get("Origin"));

  if (!isValidSlug(slug)) {
    return notFound("Page");
  }

  try {
    const supabase = createSupabaseClient(env);
    const { data, error } = await supabase
      .from("static_pages")
      .select("slug, title, content")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    if (error) throw error;
    if (!data) return notFound("Page");

    const response: StaticPageResponse = {
      slug: data.slug,
      title: data.title,
      content: data.content,
    };
    return jsonOk(response, { headers: corsHeaders });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return serverError(message);
  }
}

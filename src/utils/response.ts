// JSON response helpers

import type { ApiResponse } from "../types/api";

export function jsonOk<T>(
  data: T,
  init?: ResponseInit & { headers?: Record<string, string> }
): Response {
  const body: ApiResponse<T> = { success: true, data };
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

export function jsonError(
  message: string,
  status = 500,
  code?: string,
  headers?: Record<string, string>
): Response {
  const body: ApiResponse<never> = {
    success: false,
    error: message,
    ...(code ? { code } : {}),
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...(headers ?? {}),
    },
  });
}

export function notFound(resource = "Resource"): Response {
  return jsonError(`${resource} not found`, 404, "NOT_FOUND");
}

export function badRequest(message: string): Response {
  return jsonError(message, 400, "BAD_REQUEST");
}

export function serverError(message = "Internal server error"): Response {
  return jsonError(message, 500, "INTERNAL_ERROR");
}

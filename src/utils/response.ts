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

// Extract message from any thrown value (Error, PostgrestError, plain object)
export function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (typeof err === "object" && err !== null) {
    const obj = err as Record<string, unknown>;
    const parts: string[] = [];
    if (typeof obj.message === "string" && obj.message.length > 0) {
      parts.push(obj.message);
    }
    if (typeof obj.code === "string" && obj.code.length > 0) {
      parts.push(`[${obj.code}]`);
    }
    if (typeof obj.details === "string" && obj.details.length > 0) {
      parts.push(`details: ${obj.details}`);
    }
    if (typeof obj.hint === "string" && obj.hint.length > 0) {
      parts.push(`hint: ${obj.hint}`);
    }
    if (parts.length > 0) return parts.join(" | ");
    try {
      return JSON.stringify(obj);
    } catch {
      return "Unknown error";
    }
  }
  return "Unknown error";
}

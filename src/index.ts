
---

## 📄 File 6: `src/index.ts`

```typescript
// W6 — Frontend API Worker
// This is a placeholder. Full router will be added in Phase 7.

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return new Response(
      JSON.stringify({
        worker: "gojotv-api",
        status: "alive",
        version: "1.0.0",
        phase: 1,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  },
};

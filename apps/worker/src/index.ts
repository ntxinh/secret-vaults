import { handleAction } from "./lib/dispatch";
import { makeKvStore } from "./lib/store";
import { err } from "./lib/types";
import type { ApiResponse } from "./lib/types";

export interface Env {
  SECRETS: KVNamespace;
  API_TOKEN?: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== "POST") {
      return jsonResponse(err("BAD_REQUEST", "only POST is allowed"), 405);
    }

    let response: ApiResponse;
    try {
      const body = JSON.parse(await request.text()) as {
        token?: unknown;
        action?: unknown;
        payload?: unknown;
      };

      if (!env.API_TOKEN || body.token !== env.API_TOKEN) {
        response = err("UNAUTHORIZED", "invalid token");
      } else {
        const store = makeKvStore(env.SECRETS);
        const deps = {
          store,
          uuid: () => crypto.randomUUID(),
          now: () => new Date().toISOString(),
        };
        response = await handleAction(body.action, body.payload, deps);
      }
    } catch (e) {
      response = err("INTERNAL", e instanceof Error ? e.message : String(e));
    }

    return jsonResponse(response, 200);
  },
};

function jsonResponse(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json;charset=utf-8",
      ...CORS_HEADERS,
    },
  });
}

/**
 * Netlify serverless proxy for Eulerpool market data API.
 *
 * Client calls:
 *   /api/market-data?action=quote&identifier=US9311421039
 *   /api/market-data?action=options&identifier=US9311421039&expiration=2026-04-17
 *   /api/market-data?action=search&query=WMT
 *
 * Eulerpool API:
 *   Base: https://api.eulerpool.com/api/1
 *   Auth: ?token=API_KEY
 *   Quotes: GET /api/1/equity/quotes/{identifier}
 *   Options: GET /api/1/market/options/{identifier}
 *   Search:  GET /api/1/equity/search?query={query}
 */

import type { Context, Config } from "@netlify/functions";

const API_BASE = "https://api.eulerpool.com/api/1";

export default async (req: Request, _context: Context) => {
  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const apiKey = Netlify.env.get("EULERPOOL_API_KEY");

  if (!apiKey) {
    return json(500, { error: "API key not configured" });
  }

  try {
    let apiUrl: string;
    let cacheSeconds = 0;

    switch (action) {
      case "quote": {
        const id = url.searchParams.get("identifier");
        if (!id) return json(400, { error: "Missing identifier param" });
        apiUrl = `${API_BASE}/equity/quotes/${encodeURIComponent(id)}?token=${apiKey}`;
        cacheSeconds = 300; // 5 min
        break;
      }

      case "options": {
        const id = url.searchParams.get("identifier");
        if (!id) return json(400, { error: "Missing identifier param" });
        const expiration = url.searchParams.get("expiration") || "";
        apiUrl = `${API_BASE}/market/options/${encodeURIComponent(id)}?token=${apiKey}`;
        if (expiration) apiUrl += `&expiration=${expiration}`;
        cacheSeconds = 900; // 15 min
        break;
      }

      case "search": {
        const query = url.searchParams.get("query");
        if (!query) return json(400, { error: "Missing query param" });
        apiUrl = `${API_BASE}/equity/search?q=${encodeURIComponent(query)}&token=${apiKey}`;
        cacheSeconds = 86400; // 24 hr — tickers don't change often
        break;
      }

      default:
        return json(400, { error: "Invalid action. Use quote, options, or search" });
    }

    const upstream = await fetch(apiUrl, {
      headers: { Accept: "application/json" },
    });

    const text = await upstream.text();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      body = { _raw: text.slice(0, 1000) };
    }

    const safeUrl = apiUrl.replace(apiKey, "***");

    return json(upstream.status, {
      _debug: { url: safeUrl, status: upstream.status, fn: "v3" },
      ...(typeof body === "object" && body !== null ? body as Record<string, unknown> : { data: body }),
    }, cacheSeconds);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("market-data proxy error:", msg);
    return json(502, { error: "Upstream request failed", detail: msg });
  }
};

function json(status: number, body: Record<string, unknown>, maxAge = 0): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...(maxAge > 0 ? { "Cache-Control": `public, max-age=${maxAge}` } : {}),
    },
  });
}

export const config: Config = {};

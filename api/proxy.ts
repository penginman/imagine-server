import webApp from "../src/index";

function isBodylessMethod(method: string): boolean {
  return method === "GET" || method === "HEAD";
}

async function handler(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);

    // Preferred path via vercel.json rewrites: /api/:path* -> /api/proxy?path=:path*
    let pathParam = url.searchParams.get("path") ?? undefined;

    // Fallback 1: if Vercel preserves the original URL (e.g. /api/v1/models) just pass through.
    if (!pathParam && url.pathname.startsWith("/api/") && !url.pathname.startsWith("/api/proxy")) {
      const env =
        typeof process !== "undefined" ? (process.env as unknown as never) : ({} as never);
      return webApp.fetch(request, env);
    }

    // Fallback 2: support /api/proxy/<rest>
    if (!pathParam && url.pathname.startsWith("/api/proxy/")) {
      pathParam = url.pathname.slice("/api/proxy/".length);
    }

    if (!pathParam || pathParam === "proxy") {
      return new Response("Not Found", { status: 404 });
    }

    url.searchParams.delete("path");

    const targetUrl = new URL(request.url);
    targetUrl.pathname = `/api/${pathParam.replace(/^\\/+/, "")}`;
    targetUrl.search = url.search;

    const method = request.method.toUpperCase();
    const body = isBodylessMethod(method) ? undefined : await request.arrayBuffer();

    const rewrittenRequest = new Request(targetUrl, {
      method,
      headers: request.headers,
      body,
      redirect: request.redirect,
    });

    const env =
      typeof process !== "undefined" ? (process.env as unknown as never) : ({} as never);
    return webApp.fetch(rewrittenRequest, env);
  } catch (error) {
    console.error("[Vercel proxy] handler error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const HEAD = handler;

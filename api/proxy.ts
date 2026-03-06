import webApp from "../src/index";

function isBodylessMethod(method: string): boolean {
  return method === "GET" || method === "HEAD";
}

async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);

  // From vercel.json rewrites: /api/:path* -> /api/proxy (path param becomes query ?path=...)
  const pathParam = url.searchParams.get("path");
  if (!pathParam || pathParam === "proxy") {
    return new Response("Not Found", { status: 404 });
  }

  url.searchParams.delete("path");

  const targetUrl = new URL(request.url);
  targetUrl.pathname = `/api/${pathParam.replace(/^\\/+/, "")}`;
  targetUrl.search = url.search;

  const method = request.method.toUpperCase();

  const init: RequestInit & { duplex?: "half" } = {
    method,
    headers: request.headers,
    body: isBodylessMethod(method) ? undefined : request.body,
    redirect: request.redirect,
    duplex: "half",
  };

  const rewrittenRequest = new Request(targetUrl, init);
  return webApp.fetch(rewrittenRequest, { ...process.env } as unknown as never);
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const HEAD = handler;


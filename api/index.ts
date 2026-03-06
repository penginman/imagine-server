import webApp, { app as apiApp } from "../dist/index.js";

async function handler(request: Request): Promise<Response> {
  const env = { ...process.env } as unknown as never;
  const path = new URL(request.url).pathname;
  // Some platforms may invoke the /api/* function but expose the URL without the "/api" prefix.
  // Handle both "/api/v1/..." and "/v1/..." forms.
  return (path === "/api" || path.startsWith("/api/"))
    ? webApp.fetch(request, env)
    : apiApp.fetch(request, env);
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const HEAD = handler;

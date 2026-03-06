import webApp from "../dist/index.js";

async function handler(request: Request): Promise<Response> {
  return webApp.fetch(request, { ...process.env } as unknown as never);
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const HEAD = handler;


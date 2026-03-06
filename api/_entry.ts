// Vercel Node.js Function entrypoint adapter for Hono (no framework preset).
// It converts Node.js req/res into Web Fetch API Request/Response so we can
// reuse the existing Hono app's `fetch()` handler.

// dist/index.js is generated during the build step; Vercel type-checks Functions
// without a .d.ts for this file, so we intentionally suppress TS7016 here.
// @ts-ignore
import webApp, { app as apiApp } from "../dist/index.js";

function getOrigin(req: any): string {
  const proto = (req?.headers?.["x-forwarded-proto"] ?? "https").toString();
  const host = (
    req?.headers?.["x-forwarded-host"] ??
    req?.headers?.host ??
    "localhost"
  ).toString();
  return `${proto}://${host}`;
}

async function readBody(req: any): Promise<Uint8Array | undefined> {
  const method = (req?.method ?? "GET").toString().toUpperCase();
  if (method === "GET" || method === "HEAD") return undefined;

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

async function toWebRequest(req: any): Promise<Request> {
  const origin = getOrigin(req);
  const url = new URL(req?.url ?? "/", origin);

  const headers = new Headers();
  const rawHeaders = req?.headers ?? {};
  for (const [key, value] of Object.entries(rawHeaders)) {
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else if (value !== undefined) {
      headers.set(key, value as any);
    }
  }

  const body = await readBody(req);
  return new Request(url, {
    method: (req?.method ?? "GET").toString(),
    headers,
    body,
  });
}

async function writeWebResponse(res: any, response: Response): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  const buf = Buffer.from(await response.arrayBuffer());
  res.end(buf);
}

export default async function handler(req: any, res: any) {
  const request = await toWebRequest(req);
  const env = { ...process.env } as unknown as never;

  const pathname = new URL(request.url).pathname;
  const response =
    pathname === "/api" || pathname.startsWith("/api/")
      ? await webApp.fetch(request, env)
      : await apiApp.fetch(request, env);

  await writeWebResponse(res, response);
}


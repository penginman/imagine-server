// Single Serverless Function entrypoint for Vercel Hobby plan.
// All /api/* traffic is rewritten to this handler by vercel.json.

// dist/index.js is generated during the build step; Vercel type-checks Functions
// without a .d.ts for this file, so we intentionally suppress TS7016 here.
// @ts-ignore
import webApp from "../dist/index.js";

function getOrigin(req: any): string {
  const proto = (req?.headers?.["x-forwarded-proto"] ?? "https").toString();
  const host = (
    req?.headers?.["x-forwarded-host"] ??
    req?.headers?.host ??
    "localhost"
  ).toString();
  return `${proto}://${host}`;
}

function stripLeadingSlashes(input: string): string {
  let i = 0;
  while (i < input.length) {
    const ch = input.charCodeAt(i);
    // '/' or '\\'
    if (ch !== 47 && ch !== 92) break;
    i++;
  }
  return input.slice(i);
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

async function toWebRequest(req: any, url: URL): Promise<Request> {
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
  const origin = getOrigin(req);
  const incomingUrl = new URL(req?.url ?? "/", origin);

  const pathParam = incomingUrl.searchParams.get("path") ?? "";
  if (!pathParam || pathParam === "proxy") {
    res.statusCode = 404;
    res.end("Not Found");
    return;
  }

  incomingUrl.searchParams.delete("path");

  const targetUrl = new URL(req?.url ?? "/", origin);
  targetUrl.pathname = `/api/${stripLeadingSlashes(pathParam)}`;
  targetUrl.search = incomingUrl.searchParams.toString()
    ? `?${incomingUrl.searchParams.toString()}`
    : "";

  if (process.env.DEBUG_REQUESTS === "1") {
    console.log("[Vercel proxy]", req?.method, targetUrl.pathname);
  }

  const request = await toWebRequest(req, targetUrl);
  const env = { ...process.env } as unknown as never;
  const response = await webApp.fetch(request, env);
  await writeWebResponse(res, response);
}


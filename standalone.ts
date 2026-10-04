// Standalone HTTP server for Tavoleero (party-hub) on Render.
//
// Serves the prebuilt client (./public) and exposes the Hatch action
// protocol at POST /actions: the client POSTs {action, args} and expects
// {data} on success or {error} on failure.
//
// The action bundle (./vendor/actions.js) was built from server/src/actions.ts
// and is fully self-contained; the only runtime it needs is a drizzle
// database, provided here via bun:sqlite. Privileged handlers (email via
// Resend) come from ./vendor/privileged.js, built from
// server/src/privileged.ts, and are reached through ctx.executePrivileged.
// Schema migrations in ./migrations are applied once, in filename order,
// tracked in _migrations.

import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { Actions } from "./vendor/actions.js";
import { privilegedHandlers } from "./vendor/privileged.js";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const PORT = Number(process.env.PORT || 3000);
const DB_PATH = process.env.DB_PATH || "./tavoleero.db";
const PUBLIC_DIR = "./public";
const MIGRATIONS_DIR = "./migrations";

const sqlite = new Database(DB_PATH);
sqlite.exec("CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY)");
const applied = new Set(
  (sqlite.query("SELECT name FROM _migrations").all() as { name: string }[]).map((r) => r.name),
);
for (const file of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort()) {
  if (applied.has(file)) continue;
  sqlite.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  sqlite.query("INSERT INTO _migrations (name) VALUES (?)").run(file);
  console.log(`applied migration ${file}`);
}

const db = drizzle(sqlite);
// Minimal Ctx: the game actions use ctx.db() and ctx.invalidateQueries().
// Email actions additionally call ctx.executePrivileged(contract, input):
// it is routed here to the bundled privileged handlers (built from
// server/src/privileged.ts), matched by contract name, with the contract's
// own timeout applied.
const privilegedByName = new Map<string, (input: unknown) => Promise<unknown>>(
  (
    privilegedHandlers as {
      entries: Array<{ contract: { name: string }; handler: (input: unknown) => Promise<unknown> }>;
    }
  ).entries.map((entry) => [entry.contract.name, entry.handler]),
);
const ctx = {
  db: () => db,
  invalidateQueries: () => {},
  executePrivileged: async (contract: { name?: string; timeoutMs?: number }, input: unknown) => {
    const handler = contract?.name ? privilegedByName.get(contract.name) : undefined;
    if (!handler) throw new Error(`Unknown privileged contract: ${contract?.name ?? "?"}`);
    const timeoutMs = contract?.timeoutMs ?? 30000;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        handler(input),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error("Privileged call timed out")), timeoutMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  },
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// SEO / public files: served with real content types, never the SPA fallback.
// Files live in ./seo (copied by the Dockerfile); the route table below is
// the only way to reach them, so there is no path-traversal risk.
const SEO_DIR = "./seo";
const GAME_PAGES: Record<string, string> = {
  "scribble-scratch": "giochi/scribble-scratch.html",
  "parole-in-fuga": "giochi/parole-in-fuga.html",
  "sintonia": "giochi/sintonia.html",
};
async function serveSeoFile(fileName: string, contentType: string): Promise<Response> {
  const file = Bun.file(join(resolve(SEO_DIR), fileName));
  if (!(await file.exists())) return new Response("Not found", { status: 404 });
  return new Response(file, { headers: { "content-type": contentType } });
}

const publicRoot = resolve(PUBLIC_DIR);

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/actions" && req.method === "POST") {
      let body: any;
      try {
        body = await req.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }
      const action = (Actions as Record<string, any>)[body?.action];
      if (!action || typeof action.handler !== "function") {
        return json({ error: `Unknown action: ${body?.action}` }, 404);
      }
      const parsed = action.request.safeParse(body.args ?? {});
      if (!parsed.success) return json({ error: "Invalid request" }, 422);
      try {
        const result = await action.handler(ctx, parsed.data);
        const out = action.response.safeParse(result);
        if (!out.success) {
          console.error(`action ${body.action}: invalid response`, out.error.issues);
          return json({ error: "Invalid response" }, 500);
        }
        return json({ data: out.data });
      } catch (e: any) {
        console.error(`action ${body.action} failed`, e);
        return json({ error: e?.message || "Action failed" }, 500);
      }
    }

    // SEO / public files with real content types (never the SPA fallback).
    if (req.method === "GET") {
      if (url.pathname === "/robots.txt")
        return serveSeoFile("robots.txt", "text/plain; charset=utf-8");
      if (url.pathname === "/sitemap.xml")
        return serveSeoFile("sitemap.xml", "application/xml; charset=utf-8");
      if (url.pathname === "/ads.txt")
        return serveSeoFile("ads.txt", "text/plain; charset=utf-8");
      if (url.pathname === "/privacy")
        return serveSeoFile("privacy.html", "text/html; charset=utf-8");
      const gameMatch = /^\/giochi\/([a-z-]+)\/?$/.exec(url.pathname);
      if (gameMatch) {
        const page = GAME_PAGES[gameMatch[1]];
        if (page) return serveSeoFile(page, "text/html; charset=utf-8");
      }
    }

    // Static client with SPA fallback.
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === "/") pathname = "/index.html";
    const resolved = resolve(join(PUBLIC_DIR, pathname));
    if (!resolved.startsWith(publicRoot)) return new Response("Forbidden", { status: 403 });
    const file = Bun.file(resolved);
    if (await file.exists()) return new Response(file);
    const index = Bun.file(join(PUBLIC_DIR, "index.html"));
    if (await index.exists()) return new Response(index);
    return new Response("Not found", { status: 404 });
  },
});

console.log(`Tavoleero standalone listening on :${PORT} (db=${DB_PATH})`);

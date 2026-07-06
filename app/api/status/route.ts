import { NextResponse } from "next/server";

// Runs server-side (no CORS issues) and aggregates the health of every part of
// Learnix into one payload for the dashboard to render. Configure the targets
// with env vars in Vercel; the defaults point at production.
export const dynamic = "force-dynamic";

// APP_URL is the public site, so a default is fine. SEARXNG_URL points at internal
// infrastructure — it must come from an env var and is never hardcoded here or in
// the repo. SEARXNG_AUTH, if set, is sent as a bearer token so the search instance
// can require a shared secret instead of being open to the world.
const APP_URL = (process.env.APP_URL || "https://www.learnixsai.tech").replace(/\/$/, "");
const SEARXNG_URL = (process.env.SEARXNG_URL || "").replace(/\/$/, "");
const SEARXNG_AUTH = process.env.SEARXNG_AUTH || "";

type Status = "operational" | "down" | "degraded";
interface Component {
  name: string;
  status: Status;
  detail: string;
  latencyMs: number | null;
}

async function timedFetch(url: string, ms = 7000, init?: RequestInit) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(ms), cache: "no-store" });
    return { ok: res.ok, status: res.status, ms: Date.now() - t0, res };
  } catch (e) {
    return { ok: false, status: 0, ms: Date.now() - t0, error: e instanceof Error ? e.message : "error" };
  }
}

export async function GET() {
  const components: Component[] = [];

  // Frontend + backend internals come from the app's /api/health.
  const searxInit = SEARXNG_AUTH ? { headers: { Authorization: `Bearer ${SEARXNG_AUTH}` } } : undefined;
  const [front, health, searx] = await Promise.all([
    timedFetch(APP_URL),
    timedFetch(`${APP_URL}/api/health`),
    SEARXNG_URL
      ? timedFetch(`${SEARXNG_URL}/search?q=ping&format=json`, 7000, searxInit)
      : Promise.resolve(null),
  ]);

  components.push({
    name: "Frontend",
    status: front.ok ? "operational" : "down",
    detail: front.ok ? "learnixsai.tech responding" : `unreachable (${front.status || "timeout"})`,
    latencyMs: front.ms,
  });

  // Parse the health payload for API / DB / worker.
  let checks: Record<string, string> = {};
  if (health.res) {
    try { checks = (await health.res.json())?.checks ?? {}; } catch {}
  }
  const sub = (key: string, name: string, okDetail: string) => {
    const up = health.res ? checks[key] === "ok" : false;
    components.push({
      name,
      status: up ? "operational" : "down",
      detail: health.res ? (up ? okDetail : `reporting "${checks[key] ?? "unknown"}"`) : "health check unreachable",
      latencyMs: key === "api" ? health.ms : null,
    });
  };
  sub("app", "API", "handling requests");
  sub("db", "Database", "Postgres reachable");
  sub("worker", "Background worker", "generation queue running");

  components.push({
    name: "Search (SearXNG)",
    status: !searx ? "degraded" : searx.ok ? "operational" : "down",
    detail: !searx
      ? "SEARXNG_URL not configured"
      : searx.ok
        ? "self-hosted instance responding"
        : `unreachable (${searx.status || "timeout"})`,
    latencyMs: searx ? searx.ms : null,
  });

  const anyDown = components.some((c) => c.status === "down");
  const overall: Status = anyDown ? "degraded" : "operational";

  return NextResponse.json(
    { overall, components, checkedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } }
  );
}

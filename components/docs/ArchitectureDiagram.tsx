"use client";

import { useState } from "react";

interface Node {
  id: string;
  x: number;
  y: number;
  label: string;
  tag: string;
  accent?: string;
  detail: string;
}

interface Edge {
  from: string;
  to: string;
  flow?: boolean;
}

const W = 176;
const H = 56;

const NODES: Node[] = [
  { id: "browser", x: 30, y: 24, label: "Browser", tag: "LEARNER", detail: "The learner's browser. Talks to the Next.js app over HTTPS, and (for this ops site) loads the status board straight from Vercel." },
  { id: "ops", x: 694, y: 24, label: "Status + Docs", tag: "VERCEL", accent: "#a78bfa", detail: "This site. Hosted on Vercel, deliberately off Heroku so a status page never shares fate with the system it monitors. Polls the app's /api/health plus direct frontend + SearXNG checks." },
  { id: "ci", x: 30, y: 168, label: "GitHub Actions", tag: "CI/CD", accent: "#a78bfa", detail: "On push to main: typecheck + lint → build the Docker image → prisma migrate deploy → release to Heroku. The app never deploys by hand." },
  { id: "worker", x: 30, y: 312, label: "Generation worker", tag: "pg-boss · in-process", detail: "A pg-boss worker started once by instrumentation.ts, running inside the web dyno (no second dyno). Pulls jobs from Postgres with SKIP LOCKED, capped by GENERATION_CONCURRENCY." },
  { id: "app", x: 362, y: 132, label: "Next.js App", tag: "HEROKU · DOCKER", accent: "#06b6d4", detail: "App Router app in a standalone Docker image. Serves UI + API routes and hosts the background worker in the same process. Chosen over serverless because a long-lived worker can't live on Vercel functions." },
  { id: "db", x: 362, y: 312, label: "PostgreSQL", tag: "HEROKU · app + pgboss", detail: "One database, two jobs: all application data, plus the pg-boss job queue in its own `pgboss` schema. Also backs the cross-dyno rate limiter." },
  { id: "openrouter", x: 694, y: 120, label: "OpenRouter", tag: "HYBRID LLMs", accent: "#06b6d4", detail: "Free models classify the topic and write summaries; a paid fast model (Gemini Flash) builds structure and reranks resources — killing both latency and free-tier 429 storms." },
  { id: "searxng", x: 694, y: 216, label: "SearXNG", tag: "ORACLE FREE VM", detail: "Self-hosted meta-search on an Oracle Cloud always-free VM, for general web articles. Docker with restart: unless-stopped. $0/mo." },
  { id: "sources", x: 694, y: 312, label: "Content APIs", tag: "YT · Wiki · SE · arXiv", detail: "Keyless structured sources: YouTube (via Invidious), Wikipedia, Stack Exchange, dev.to, GitHub, Hacker News, arXiv. Routed by the topic's class." },
];

const EDGES: Edge[] = [
  { from: "browser", to: "app", flow: true },
  { from: "browser", to: "ops" },
  { from: "ci", to: "app" },
  { from: "app", to: "worker" },
  { from: "app", to: "db" },
  { from: "worker", to: "db" },
  { from: "app", to: "openrouter", flow: true },
  { from: "app", to: "searxng", flow: true },
  { from: "app", to: "sources", flow: true },
  { from: "ops", to: "app" },
  { from: "ops", to: "searxng" },
];

const center = (n: Node) => ({ cx: n.x + W / 2, cy: n.y + H / 2 });

export default function ArchitectureDiagram() {
  const [sel, setSel] = useState<string | null>(null);
  const map = Object.fromEntries(NODES.map((n) => [n.id, n]));
  const connected = new Set<string>();
  if (sel) {
    connected.add(sel);
    EDGES.forEach((e) => {
      if (e.from === sel) connected.add(e.to);
      if (e.to === sel) connected.add(e.from);
    });
  }
  const selected = sel ? map[sel] : null;

  return (
    <div className="diagram-wrap">
      <svg viewBox="0 0 900 400" className="diagram-svg" role="img" aria-label="System architecture diagram">
        <g>
          {EDGES.map((e, i) => {
            const a = center(map[e.from]);
            const b = center(map[e.to]);
            const active = !!sel && (e.from === sel || e.to === sel);
            return (
              <line
                key={i}
                x1={a.cx}
                y1={a.cy}
                x2={b.cx}
                y2={b.cy}
                className={`edge ${active ? "active" : ""} ${e.flow && (active || !sel) ? "flow" : ""}`}
              />
            );
          })}
        </g>
        <g>
          {NODES.map((n) => {
            const dim = sel && !connected.has(n.id);
            const isSel = sel === n.id;
            const accent = n.accent ?? "#3f3f46";
            return (
              <g
                key={n.id}
                className={`node-box ${dim ? "dim" : ""}`}
                onClick={() => setSel(isSel ? null : n.id)}
              >
                <rect
                  x={n.x}
                  y={n.y}
                  width={W}
                  height={H}
                  rx={11}
                  fill={isSel ? "#1c1c22" : "#17171b"}
                  stroke={isSel ? n.accent ?? "#06b6d4" : "#2a2a31"}
                  strokeWidth={isSel ? 2 : 1}
                />
                <rect x={n.x} y={n.y} width={4} height={H} rx={2} fill={accent} />
                <text className="node-label" x={n.x + 18} y={n.y + 25}>{n.label}</text>
                <text className="node-tag" x={n.x + 18} y={n.y + 42}>{n.tag}</text>
              </g>
            );
          })}
        </g>
      </svg>

      <div className="node-detail">
        {selected ? (
          <div className="fade-key" key={selected.id}>
            <div className="nd-head">
              <span className="dot" style={{ width: 9, height: 9, borderRadius: "50%", background: selected.accent ?? "#71717a" }} />
              <h4>{selected.label}</h4>
              <span className="pill" style={{ marginLeft: "auto" }}>{selected.tag}</span>
            </div>
            <p>{selected.detail}</p>
          </div>
        ) : (
          <p className="nd-empty">Click any box to see what it is, where it runs, and why it&apos;s there. Animated lines show live request paths.</p>
        )}
      </div>
    </div>
  );
}

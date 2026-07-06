"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

type Status = "operational" | "down" | "degraded";
interface Component { name: string; status: Status; detail: string; latencyMs: number | null; }
interface StatusPayload { overall: Status; components: Component[]; checkedAt: string; }

const DOT: Record<Status, string> = { operational: "dot-ok", degraded: "dot-warn", down: "dot-down" };
const LABEL: Record<Status, string> = { operational: "label-ok", degraded: "label-warn", down: "label-down" };
const TEXT: Record<Status, string> = { operational: "Operational", degraded: "Down", down: "Down" };

export default function StatusPage() {
  const [data, setData] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      setData(await res.json());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, [load]);

  const overall: Status = data?.overall ?? "down";
  const allUp = data?.components.every((c) => c.status === "operational");

  return (
    <main>
      <div className="banner">
        <span className={`dot ${loading ? "dot-idle" : DOT[overall]}`} />
        <h1>
          {loading ? "Checking systems…" : allUp ? "All systems operational" : "Some systems are down"}
        </h1>
        {data && (
          <span className="sub">
            updated {new Date(data.checkedAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="list">
        {(data?.components ?? placeholders).map((c) => (
          <div className="row" key={c.name}>
            <span className={`dot ${loading ? "dot-idle" : DOT[c.status]}`} />
            <div>
              <div className="name">{c.name}</div>
              <div className="detail">{loading ? "checking…" : c.detail}</div>
            </div>
            <div className="right">
              {c.latencyMs != null && !loading && <span className="latency mono">{c.latencyMs} ms</span>}
              {!loading && <span className={`status-label ${LABEL[c.status]}`}>{TEXT[c.status]}</span>}
            </div>
          </div>
        ))}
      </div>

      <p className="foot">Auto-refreshes every 20s · Learnix is curation-first learning · <Link href="/docs">Architecture docs →</Link></p>
    </main>
  );
}

const placeholders: Component[] = [
  { name: "Frontend", status: "down", detail: "", latencyMs: null },
  { name: "API", status: "down", detail: "", latencyMs: null },
  { name: "Database", status: "down", detail: "", latencyMs: null },
  { name: "Background worker", status: "down", detail: "", latencyMs: null },
  { name: "Search (SearXNG)", status: "down", detail: "", latencyMs: null },
];

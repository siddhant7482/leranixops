"use client";

import { useState, type ReactNode } from "react";

/* ─────────────  TABS  ───────────── */
export interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

export function Tabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  return (
    <div>
      <div className="tabs-bar" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            className={`tab-btn ${active === t.id ? "active" : ""}`}
            onClick={() => setActive(t.id)}
          >
            <span className="tdot" />
            {t.label}
          </button>
        ))}
      </div>
      <div className="fade-key" key={current.id}>
        {current.content}
      </div>
    </div>
  );
}

/* ─────────────  STEPPER  ───────────── */
export interface Step {
  badge: string;
  title: string;
  sub: string;
  tags?: { label: string; kind?: string }[];
  content: ReactNode;
}

export function Stepper({ steps }: { steps: Step[] }) {
  const [active, setActive] = useState(0);
  const s = steps[active];
  return (
    <div className="stepper">
      <div className="step-rail">
        {steps.map((st, i) => (
          <button
            key={i}
            className={`step-item ${active === i ? "active" : ""}`}
            onClick={() => setActive(i)}
          >
            <span className="badge">{st.badge}</span>
            <span>
              <span className="st-title">{st.title}</span>
              <br />
              <span className="st-sub">{st.sub}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="step-panel fade-key" key={active}>
        <h4>{s.title}</h4>
        {s.tags && (
          <div className="st-meta">
            {s.tags.map((t, i) => (
              <span key={i} className={`pill ${t.kind ?? ""}`}>{t.label}</span>
            ))}
          </div>
        )}
        {s.content}
      </div>
    </div>
  );
}

/* ─────────────  API EXPLORER  ───────────── */
export interface Endpoint {
  method: "GET" | "POST";
  path: string;
  desc: string;
  auth: string;
  request?: ReactNode;
  response: ReactNode;
  notes?: ReactNode;
}

export function ApiExplorer({ endpoints }: { endpoints: Endpoint[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div>
      {endpoints.map((e, i) => (
        <div key={i} className={`api-row ${open === i ? "open" : ""}`}>
          <button className="api-head" onClick={() => setOpen(open === i ? null : i)}>
            <span className={`api-method ${e.method === "GET" ? "m-get" : "m-post"}`}>{e.method}</span>
            <span className="api-path">{e.path}</span>
            <span className="api-desc">{e.desc}</span>
            <span className="api-chev">›</span>
          </button>
          {open === i && (
            <div className="api-body fade-key">
              <div className="kv">
                <span className="k">Auth</span>
                <span>{e.auth}</span>
              </div>
              {e.request && (
                <div className="kv">
                  <span className="k">Request</span>
                  <span>{e.request}</span>
                </div>
              )}
              <div className="kv">
                <span className="k">Response</span>
                <span>{e.response}</span>
              </div>
              {e.notes && (
                <div className="kv">
                  <span className="k">Notes</span>
                  <span>{e.notes}</span>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─────────────  ENTITY EXPLORER (data model)  ───────────── */
export interface Entity {
  name: string;
  rel: string;
  desc: string;
  fields: { name: string; key?: boolean }[];
}

export function EntityExplorer({ entities }: { entities: Entity[] }) {
  const [sel, setSel] = useState(0);
  const e = entities[sel];
  return (
    <div>
      <div className="entity-grid">
        {entities.map((en, i) => (
          <div
            key={en.name}
            className={`entity ${sel === i ? "active" : ""}`}
            onClick={() => setSel(i)}
          >
            <div className="en-name">{en.name}</div>
            <div className="en-rel">{en.rel}</div>
          </div>
        ))}
      </div>
      <div className="entity-detail fade-key" key={e.name}>
        <h4>{e.name}</h4>
        <p className="en-desc">{e.desc}</p>
        <div className="field-list">
          {e.fields.map((f) => (
            <span key={f.name} className="field-tag">
              {f.key ? <b>{f.name}</b> : f.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

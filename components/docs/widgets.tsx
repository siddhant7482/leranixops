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
export interface EntityField {
  name: string;
  type: string;
  tag?: "pk" | "fk" | "uniq" | "rel";
}
export interface Entity {
  name: string;
  group: "Auth" | "Core" | "Learning" | "Gamification" | "Infra";
  desc: string;
  fields: EntityField[];
  relations?: string[];
}

const GROUPS = ["All", "Core", "Learning", "Gamification", "Auth", "Infra"] as const;
const TAG_LABEL: Record<string, string> = { pk: "PK", fk: "FK", uniq: "UNIQUE", rel: "REL" };

export function EntityExplorer({ entities }: { entities: Entity[] }) {
  const [group, setGroup] = useState<(typeof GROUPS)[number]>("All");
  const [selName, setSelName] = useState(entities[0]?.name);

  const shown = group === "All" ? entities : entities.filter((e) => e.group === group);
  const e = entities.find((x) => x.name === selName) ?? shown[0] ?? entities[0];

  return (
    <div>
      <div className="tabs-bar" style={{ marginBottom: 16 }}>
        {GROUPS.map((g) => (
          <button
            key={g}
            className={`tab-btn ${group === g ? "active" : ""}`}
            onClick={() => setGroup(g)}
          >
            <span className="tdot" />
            {g}
            <span className="grp-count">
              {g === "All" ? entities.length : entities.filter((x) => x.group === g).length}
            </span>
          </button>
        ))}
      </div>

      <div className="entity-grid">
        {shown.map((en) => (
          <div
            key={en.name}
            className={`entity ${e?.name === en.name ? "active" : ""}`}
            onClick={() => setSelName(en.name)}
          >
            <div className="en-name">{en.name}</div>
            <div className="en-rel">{en.fields.length} fields</div>
          </div>
        ))}
      </div>

      {e && (
        <div className="entity-detail fade-key" key={e.name}>
          <div className="ed-head">
            <h4>{e.name}</h4>
            <span className={`pill grp-${e.group.toLowerCase()}`}>{e.group}</span>
          </div>
          <p className="en-desc">{e.desc}</p>
          <table className="fieldtable">
            <tbody>
              {e.fields.map((f) => (
                <tr key={f.name}>
                  <td className="fn">{f.name}</td>
                  <td className="ft">{f.type}</td>
                  <td className="fb">
                    {f.tag && <span className={`ftag ftag-${f.tag}`}>{TAG_LABEL[f.tag]}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {e.relations && e.relations.length > 0 && (
            <div className="ed-rel">
              <span className="ed-rel-k">Relations</span>
              <div className="field-list">
                {e.relations.map((r) => (
                  <span key={r} className="field-tag">{r}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

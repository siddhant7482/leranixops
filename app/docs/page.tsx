"use client";

import Link from "next/link";
import DocsNav, { type NavItem } from "@/components/docs/DocsNav";
import ArchitectureDiagram from "@/components/docs/ArchitectureDiagram";
import { Tabs, Stepper, ApiExplorer, EntityExplorer } from "@/components/docs/widgets";

const NAV: NavItem[] = [
  { id: "overview", label: "System topology" },
  { id: "decisions", label: "Architecture & why" },
  { id: "pipeline", label: "Generation pipeline" },
  { id: "features", label: "Feature workflows" },
  { id: "algorithms", label: "Algorithms" },
  { id: "api", label: "API system" },
  { id: "ai", label: "AI integration" },
  { id: "data", label: "Data model" },
  { id: "cicd", label: "CI/CD" },
  { id: "infra", label: "Deployment & servers" },
];

export default function DocsPage() {
  return (
    <main className="wrap">
      {/* ── Header ── */}
      <div className="docs-hero">
        <span className="eyebrow">Engineering reference</span>
        <h1>
          How <span className="gradient-text">LearnixSai</span> is built.
        </h1>
        <p className="lede">
          LearnixSai is a <strong>curation-first</strong> learning platform: type a topic and it assembles a
          structured course out of <strong>real</strong> videos, articles, docs and Q&amp;A — not AI-generated
          lesson text. This is the full engineering reference: architecture, algorithms, the API, AI
          integration, and how it all deploys. Diagrams and flows are interactive — click around.
        </p>
      </div>

      <div className="docs-shell">
        <DocsNav items={NAV} />

        <div className="docs-content">
          {/* ══════════════ 1. TOPOLOGY ══════════════ */}
          <section id="overview" className="section">
            <h2>System topology</h2>
            <p className="section-sub">
              Four independently-hosted pieces, deliberately decoupled so no single failure takes everything
              down. Click a box to see what it is and why it&apos;s there.
            </p>
            <ArchitectureDiagram />

            <div className="grid grid-2" style={{ marginTop: 18 }}>
              <div className="card">
                <span className="pill brand">Design principle</span>
                <p className="prose" style={{ marginTop: 12 }}>
                  <strong>Decouple by failure domain.</strong> The app, the search engine, and the status page
                  each run on separate infrastructure. SearXNG going down degrades one source, not the app. The
                  status page lives on Vercel so it can report an outage even while Heroku is on fire.
                </p>
              </div>
              <div className="card">
                <span className="pill violet">Design principle</span>
                <p className="prose" style={{ marginTop: 12 }}>
                  <strong>One database, many roles.</strong> Postgres holds application data, the pg-boss job
                  queue (its own schema), and the rate-limit table. No Redis, no extra managed services — fewer
                  moving parts to pay for and monitor.
                </p>
              </div>
            </div>
          </section>

          {/* ══════════════ 2. DECISIONS ══════════════ */}
          <section id="decisions" className="section">
            <h2>Architecture decisions &amp; why</h2>
            <p className="section-sub">
              The choices that shaped the system — each with the context that forced it and the trade-off it
              carries. These are the load-bearing decisions.
            </p>

            {DECISIONS.map((d, i) => (
              <div className="decision" key={i} style={{ marginBottom: 14 }}>
                <div className="decision-head">
                  <span className="idx">{String(i + 1).padStart(2, "0")}</span>
                  <h3>{d.title}</h3>
                  <span className={`pill ${d.tone} verdict`}>{d.badge}</span>
                </div>
                <div className="decision-body">
                  <div className="decision-row">
                    <span className="k">Context</span>
                    <span className="v" dangerouslySetInnerHTML={{ __html: d.context }} />
                  </div>
                  <div className="decision-row">
                    <span className="k">Decision</span>
                    <span className="v" dangerouslySetInnerHTML={{ __html: d.decision }} />
                  </div>
                  <div className="decision-row">
                    <span className="k">Trade-off</span>
                    <span className="v" dangerouslySetInnerHTML={{ __html: d.tradeoff }} />
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* ══════════════ 3. PIPELINE ══════════════ */}
          <section id="pipeline" className="section">
            <h2>Course generation pipeline</h2>
            <p className="section-sub">
              Generation is a <strong>background job</strong>, not part of the HTTP request. The old design ran
              the whole multi-minute pipeline inside an SSE request — slow, and it broke under load. Step through
              the current flow:
            </p>

            <Stepper
              steps={[
                {
                  badge: "①",
                  title: "Enqueue & return",
                  sub: "POST /generate",
                  tags: [{ label: "~50 ms", kind: "ok" }, { label: "HTTP 202" }],
                  content: (
                    <>
                      <p>
                        The request does the bare minimum: auth, a Postgres rate-limit check, create a{" "}
                        <code>Course</code> (status <code>generating</code>) and a 1:1 <code>GenerationJob</code>,
                        enqueue to pg-boss, and return <code>{`{ courseId }`}</code>. No work happens in the
                        request — it returns in milliseconds.
                      </p>
                      <pre className="code scroll-x"><code>{`POST /api/courses/generate
  auth + DB rate-limit
  create Course(status:"generating") + GenerationJob
  boss.send("course-generation", { courseId, topic, level, userId })
  → 202 { courseId }`}</code></pre>
                    </>
                  ),
                },
                {
                  badge: "②",
                  title: "Classify topic",
                  sub: "free model",
                  tags: [{ label: "FREE model", kind: "ok" }, { label: "topicClass" }],
                  content: (
                    <>
                      <p>
                        The worker picks up the job and asks a <strong>free</strong> OpenRouter model to classify
                        the topic into a class — <code>developer_tech</code>, <code>academic_science</code>,{" "}
                        <code>business_founder</code>, <code>history_humanities</code>, <code>practical_skill</code>{" "}
                        — and estimate a module count. Classification is cheap and simple, so it doesn&apos;t
                        justify a paid model.
                      </p>
                      <p>
                        The class is the routing key for <em>everything</em> downstream: which content APIs get
                        queried, and how the curriculum is framed.
                      </p>
                    </>
                  ),
                },
                {
                  badge: "③",
                  title: "Build structure",
                  sub: "paid model",
                  tags: [{ label: "PAID model", kind: "brand" }, { label: "title + modules" }],
                  content: (
                    <>
                      <p>
                        A <strong>paid, fast</strong> model (Gemini Flash by default) writes the course title and
                        an ordered list of modules with short descriptions. Paid here buys speed and dodges the
                        free-tier 429 storms that used to stall generation.
                      </p>
                      <p>
                        Output is the skeleton the next stage fills with real resources — one search context per
                        module.
                      </p>
                    </>
                  ),
                },
                {
                  badge: "④",
                  title: "Curate modules — in parallel",
                  sub: "the 10× win",
                  tags: [{ label: "Promise.all", kind: "brand" }, { label: "concurrency-capped" }],
                  content: (
                    <>
                      <p>
                        Every module is processed <strong>concurrently</strong>, and within each module every
                        lookup runs concurrently too. This is where wall-clock dropped from ~9–18 min to ~1–2 min.
                      </p>
                      <pre className="code scroll-x"><code>{`Promise.all(modules.map(async (m) => {
  // gather a candidate POOL concurrently:
  const pool = await Promise.all([
    wikipedia(m),                 // per-module overview
    fetchClassSourced(topicClass, m),  // SO / dev.to / arXiv / HN / GitHub
    llmSearchQueries(m).then(findCandidates), // web via SearXNG
  ])
  filterHomepages(pool)           // drop bare-domain links
  const kept = await rerank(pool) // LLM "editor" keeps on-topic, best-first
  return rebalanceTowardText(kept) // ~60% text / 40% video
}))`}</code></pre>
                      <p>
                        A global <code>localConcurrency</code> cap on the pg-boss worker means N users can&apos;t
                        overwhelm the box — excess jobs queue and drain as slots free.
                      </p>
                    </>
                  ),
                },
                {
                  badge: "⑤",
                  title: "Dedup & persist",
                  sub: "createMany",
                  tags: [{ label: "1 write", kind: "ok" }, { label: "Course → active" }],
                  content: (
                    <>
                      <p>
                        Results are de-duplicated by URL across the whole course, written in a single{" "}
                        <code>createMany</code> (no N+1 inserts), and the course flips to <code>active</code>. If a
                        module came back thin, the job flags <code>canFillWithAI</code> so the UI can offer an
                        AI-generated supplement.
                      </p>
                      <p>
                        Throughout, the worker writes progress onto the <code>GenerationJob</code> row — step,
                        current/total, message — which the frontend polls.
                      </p>
                    </>
                  ),
                },
                {
                  badge: "⑥",
                  title: "Frontend polls",
                  sub: "GET /status",
                  tags: [{ label: "poll ~1.5s" }, { label: "no SSE" }],
                  content: (
                    <>
                      <p>
                        The create form polls <code>GET /api/courses/[courseId]/status</code> every ~1.5s and maps
                        the job row onto a live progress UI. On <code>done</code> it redirects (or shows the
                        thin-module dialog); on <code>failed</code> it shows an error. No long-lived connection to
                        drop.
                      </p>
                    </>
                  ),
                },
              ]}
            />

            <div className="callout" style={{ marginTop: 18 }}>
              <span className="ci">⚡</span>
              <p>
                <strong>Why it&apos;s durable:</strong> pg-boss coordinates through Postgres with{" "}
                <code>SKIP LOCKED</code>. If the dyno restarts mid-job (Heroku cycles daily), the job is retried
                on next boot — nothing is lost, and it&apos;s safe even if the app scales to multiple web dynos.
              </p>
            </div>
          </section>

          {/* ══════════════ 4. FEATURE WORKFLOWS ══════════════ */}
          <section id="features" className="section">
            <h2>Feature workflows</h2>
            <p className="section-sub">
              How each user-facing feature is actually built, end to end. Pick a feature:
            </p>

            <Tabs
              tabs={[
                {
                  id: "gen",
                  label: "Course generation",
                  content: (
                    <div className="prose">
                      <p>
                        The flagship loop. Covered in depth under{" "}
                        <a href="#pipeline">Generation pipeline</a> — in short: enqueue → classify → structure →
                        parallel curation → persist, with the frontend polling a job row. The important design
                        move is that <strong>nothing generative happens in the request</strong>; it&apos;s a
                        durable background job with a global concurrency cap.
                      </p>
                    </div>
                  ),
                },
                {
                  id: "summary",
                  label: "AI article summaries",
                  content: (
                    <div className="prose">
                      <p>
                        Opening an article lazily fetches and extracts its main text with{" "}
                        <code>@extractus/article-extractor</code> (browser user-agent, 12s timeout race),
                        summarizes it with a free model, and caches the result on{" "}
                        <code>Resource.aiSummary</code>. It&apos;s a faithful preview{" "}
                        <strong>with a prominent link to the original</strong> — never a replacement.
                      </p>
                      <pre className="code scroll-x"><code>{`GET /api/resources/[id]/summary   (owner-only)
  if resource.aiSummary → return cached
  if youtube → skip
  text = extract(url)               // article-extractor + browser UA
  if text.length < 200 → { status: "unavailable" }   // paywalled / JS-only
  summary = freeModel(buildSummaryPrompt(text))
  cache on Resource.aiSummary → return { summary, keyPoints }`}</code></pre>
                      <p>
                        Paywalled / bot-blocked sites (e.g. Britannica → 403) fall back gracefully to a snippet +
                        link, clearly labeled <strong>&ldquo;Preview&rdquo;</strong> rather than
                        &ldquo;AI Summary&rdquo; so we never misrepresent the source.
                      </p>
                    </div>
                  ),
                },
                {
                  id: "quiz",
                  label: "Quizzes",
                  content: (
                    <div className="prose">
                      <p>
                        Each module can generate a quiz from its resources. A <code>Quiz</code> is stored against
                        the module; a <code>QuizAttempt</code> records each try and the XP earned. Quizzes test
                        comprehension of what the module actually covered, and can be retaken — every pass awards
                        XP through the same transaction ledger as the rest of the app.
                      </p>
                    </div>
                  ),
                },
                {
                  id: "xp",
                  label: "XP & gamification",
                  content: (
                    <div className="prose">
                      <p>
                        <code>lib/xp.ts</code> is the single source of truth for progression. Completing a
                        resource, finishing a module, or passing a quiz awards XP through one service that also
                        updates level, streak, and completion counts — every award writes an{" "}
                        <code>XpTransaction</code> so the history is fully auditable.
                      </p>
                      <ul>
                        <li><strong>Levels</strong> — XP thresholds map to a level curve; crossing one unlocks characters.</li>
                        <li><strong>Streaks</strong> — a daily-activity counter that resets on a missed day.</li>
                        <li><strong>Achievements</strong> — 25 unlockables tied to milestones (first course, streak length, breadth).</li>
                        <li><strong>Skill trees / learning paths</strong> — <code>LearningPath</code> + <code>PathNode</code> map courses into an unlockable progression.</li>
                      </ul>
                    </div>
                  ),
                },
                {
                  id: "progress",
                  label: "Progress & notes",
                  content: (
                    <div className="prose">
                      <p>
                        Every resource has a per-user <code>ResourceProgress</code> row (status, XP earned,
                        notes). Marking a resource complete updates the course&apos;s{" "}
                        <code>completedResources</code> counter and fires the XP service; notes are auto-saved and
                        always attached to the right lesson. Progress is server-persisted, so learners resume
                        exactly where they left off on any device.
                      </p>
                    </div>
                  ),
                },
              ]}
            />
          </section>

          {/* ══════════════ 5. ALGORITHMS ══════════════ */}
          <section id="algorithms" className="section">
            <h2>Algorithms</h2>
            <p className="section-sub">
              The non-obvious logic that makes curation actually good — routing, filtering, reranking,
              balancing, and racing.
            </p>

            <Tabs
              tabs={[
                {
                  id: "routing",
                  label: "Source routing",
                  content: (
                    <div className="prose">
                      <p>
                        <code>lib/source-router.ts</code> maps the topic class to a set of keyless APIs, so a
                        cooking course doesn&apos;t get Stack Overflow and a Docker course doesn&apos;t get arXiv.
                      </p>
                      <pre className="code scroll-x"><code>{`switch (topicClass) {
  developer_tech:    dev.to(tag) + HackerNews + StackOverflow + GitHub
  business_founder:  HackerNews + dev.to
  academic_science:  arXiv + Stack Exchange (physics/stats/…)
  history_humanities: Stack Exchange (history/philosophy/…)
  practical_skill:   Stack Exchange topic site (guitar→music.se,
                     cooking→cooking.se … keyword map)
}
// Wikipedia + SearXNG web search run for every class`}</code></pre>
                      <p>
                        Removed after live testing: <strong>wikiHow</strong> (search API returns 500) and{" "}
                        <strong>Reddit</strong> (403 from datacenter IPs). Brave Search was rejected — it requires
                        a credit card even on the free tier.
                      </p>
                    </div>
                  ),
                },
                {
                  id: "rerank",
                  label: "LLM rerank (editor)",
                  content: (
                    <div className="prose">
                      <p>
                        Rather than trust the first search hit, each module gathers a <em>pool</em> of candidates,
                        drops bare-domain / homepage links, then a paid model acts as an <strong>editor</strong>:
                        given the module title + description and the candidate list, it returns the indices to
                        keep — genuinely on-topic, best-first. This is what stops a movie result landing in a
                        history course.
                      </p>
                      <pre className="code scroll-x"><code>{`buildRerankPrompt(topic, level, moduleTitle, moduleDesc, candidates, keep)
  → model returns { "keep": [3, 0, 7, …] }   // indices, ranked
// prompt rule: prefer WRITTEN content — keep MORE text than video`}</code></pre>
                    </div>
                  ),
                },
                {
                  id: "balance",
                  label: "Text / video balance",
                  content: (
                    <div className="prose">
                      <p>
                        YouTube used to dominate results. A deterministic pass caps video at ~40% and interleaves
                        the rest as written content, pulling from the leftover pool when the kept set is short.
                      </p>
                      <pre className="code scroll-x"><code>{`rebalanceTowardText(curated, pool, target):
  maxVideos = round(target * 0.4)
  wantText  = target - maxVideos
  texts  = dedup(curated.text  ++ pool.text)
  videos = dedup(curated.video ++ pool.video)
  interleave, preferring text until wantText is hit,
    then top up with videos up to maxVideos,
    then backfill whichever remains`}</code></pre>
                      <p>Net result across a course: roughly <strong>60% written / 40% video</strong>.</p>
                    </div>
                  ),
                },
                {
                  id: "race",
                  label: "YouTube instance racing",
                  content: (
                    <div className="prose">
                      <p>
                        YouTube data comes from public Invidious instances, which are individually flaky. Instead
                        of trying them serially (dead instances add full-timeout latency), they&apos;re{" "}
                        <strong>raced with <code>Promise.any</code></strong> — first healthy response wins — with
                        a <code>youtube-sr</code> scraper as the fallback when all instances fail.
                      </p>
                      <pre className="code scroll-x"><code>{`Promise.any(instances.map(i => fetchWithTimeout(i, 4000)))
  .catch(() => youtubeSrScrape(query))   // AggregateError → fallback`}</code></pre>
                    </div>
                  ),
                },
                {
                  id: "limit",
                  label: "Rate limiting",
                  content: (
                    <div className="prose">
                      <p>
                        The old limiter was an in-memory map — useless across multiple dynos. It&apos;s now a
                        Postgres-backed atomic upsert on a <code>RateLimit</code> table, so the limit is enforced
                        globally regardless of which dyno serves the request.
                      </p>
                      <pre className="code scroll-x"><code>{`INSERT INTO "RateLimit"(key, count, resetAt)
VALUES ($key, 1, now() + window)
ON CONFLICT (key) DO UPDATE SET
  count   = CASE WHEN RateLimit.resetAt < now() THEN 1
                 ELSE RateLimit.count + 1 END,
  resetAt = CASE WHEN RateLimit.resetAt < now() THEN now()+window
                 ELSE RateLimit.resetAt END
→ reject when count > limit`}</code></pre>
                    </div>
                  ),
                },
              ]}
            />
          </section>

          {/* ══════════════ 6. API ══════════════ */}
          <section id="api" className="section">
            <h2>API system</h2>
            <p className="section-sub">
              The routes that matter, from generation to health. Click to expand request/response shapes.
            </p>
            <ApiExplorer
              endpoints={[
                {
                  method: "POST",
                  path: "/api/courses/generate",
                  desc: "Kick off a course",
                  auth: "Authenticated · Postgres rate-limited",
                  request: <code>{`{ topic, level, mode?, pathNodeId? }`}</code>,
                  response: <><code>202 {`{ courseId }`}</code> — returned in ~50ms; work happens in the background worker.</>,
                  notes: "Creates Course(status:generating) + GenerationJob, enqueues to pg-boss. No SSE.",
                },
                {
                  method: "GET",
                  path: "/api/courses/[courseId]/status",
                  desc: "Poll generation progress",
                  auth: "Owner-only",
                  response: <code>{`{ status, step, current, total, message, resourcesFound, topicClass, canFillWithAI, error }`}</code>,
                  notes: "Polled ~every 1.5s by the create form. Mirrors the GenerationJob row.",
                },
                {
                  method: "GET",
                  path: "/api/resources/[resourceId]/summary",
                  desc: "AI summary of an article",
                  auth: "Owner-only",
                  response: <code>{`{ status: "ok"|"unavailable", summary, keyPoints[] }`}</code>,
                  notes: "Cache-or-generate on Resource.aiSummary. Skips YouTube. Falls back to a labeled preview when extraction fails.",
                },
                {
                  method: "GET",
                  path: "/api/health",
                  desc: "Public health check",
                  auth: "Public · CORS *",
                  response: <code>{`{ status, checks: { app, db, worker }, timestamp }`}</code>,
                  notes: "Returns 503 when degraded so uptime monitors flag it. This ops site and UptimeRobot both consume it.",
                },
                {
                  method: "GET",
                  path: "/api/status",
                  desc: "Aggregated status (this site)",
                  auth: "Public",
                  response: <code>{`{ overall, components[], checkedAt }`}</code>,
                  notes: "Runs on Vercel. Fans out to the app's /api/health, the frontend, and SearXNG, server-side (no CORS).",
                },
              ]}
            />
          </section>

          {/* ══════════════ 7. AI INTEGRATION ══════════════ */}
          <section id="ai" className="section">
            <h2>AI integration</h2>
            <p className="section-sub">
              Every model call, why it&apos;s on the tier it&apos;s on, and the prompts behind them.
            </p>

            <div className="grid grid-2">
              <div className="card">
                <span className="pill ok">FREE tier</span>
                <h3 className="prose" style={{ margin: "12px 0 8px" }}>Cheap, simple, tolerant of latency</h3>
                <ul className="prose">
                  <li><strong>Topic classification</strong> — one label + a module estimate.</li>
                  <li><strong>Article summaries</strong> — lazy, cached, off the critical path.</li>
                </ul>
              </div>
              <div className="card">
                <span className="pill brand">PAID tier</span>
                <h3 className="prose" style={{ margin: "12px 0 8px" }}>Fast, not globally rate-limited</h3>
                <ul className="prose">
                  <li><strong>Structure</strong> — course title + ordered modules.</li>
                  <li><strong>Rerank</strong> — the per-module editor pass.</li>
                </ul>
              </div>
            </div>

            <h3 className="prose">Why hybrid</h3>
            <p className="prose">
              Free OpenRouter models share a global account rate limit — running the whole pipeline on them meant
              429 storms the moment two users generated at once, and long queues. Moving the{" "}
              <strong>latency-critical, on-the-hot-path</strong> calls (structure + rerank) to a paid fast model
              (Gemini Flash, ~$0.001–0.01/course) killed both the latency <em>and</em> the 429s, while classify +
              summaries stay free. Models are env-overridable via <code>PIPELINE_PAID_MODELS</code>, and the
              client cycles through a fallback list on error.
            </p>

            <h3 className="prose">The prompts</h3>
            <div className="grid grid-3">
              {[
                ["classifier.ts", "Topic → class + module estimate"],
                ["curator.ts · structure", "Class + topic → title + modules"],
                ["curator.ts · buildRerankPrompt", "Candidates → { keep: [indices] }"],
                ["summary.ts", "Article text → { summary, keyPoints }"],
                ["quiz prompt", "Module resources → questions"],
              ].map(([f, d]) => (
                <div className="card" key={f}>
                  <code style={{ fontSize: 12 }}>{f}</code>
                  <p className="prose" style={{ fontSize: 13, marginTop: 8 }}>{d}</p>
                </div>
              ))}
            </div>
            <div className="callout" style={{ marginTop: 16 }}>
              <span className="ci">🔒</span>
              <p>
                <strong>Keys never touch the client.</strong> All model calls are server-side; the OpenRouter key
                lives only in Heroku config vars. No tokens in cookies or the frontend bundle.
              </p>
            </div>
          </section>

          {/* ══════════════ 8. DATA MODEL ══════════════ */}
          <section id="data" className="section">
            <h2>Data model</h2>
            <p className="section-sub">
              17 Prisma models on PostgreSQL, ID strategy <code>cuid()</code> throughout. Filter by domain and
              click any entity for its real fields, types and relations.
            </p>

            <h3 className="prose">Relationship map</h3>
            <p className="prose">
              Everything hangs off <code>User</code> and <code>Course</code>. A course owns its modules and
              resources; a module optionally owns a quiz; progress and XP are per-user.
            </p>
            <div className="er-map scroll-x">
{`User ─┬─< Course ─┬─< Module ─┬─< Resource ─< ResourceProgress >─ User
      │           │           └── Quiz ─< QuizAttempt >─ User
      │           ├─── GenerationJob        (1:1, poll target)
      │           └─< CourseRating >─ User
      ├─< XpTransaction        (append-only XP ledger)
      ├─< UserAchievement      (25 unlockables)
      ├─< LearningPath ─< PathNode ··> Course   (skill trees)
      └─< Account / Session    (NextAuth)

RateLimit                       (standalone · cross-dyno limiter)`}
            </div>

            <h3 className="prose">Entity explorer</h3>
            <EntityExplorer
              entities={[
                // ── Core ──
                {
                  name: "User", group: "Core",
                  desc: "The learner and their progression state. NextAuth credentials + gamification live on the same row.",
                  fields: [
                    { name: "id", type: "String", tag: "pk" },
                    { name: "email", type: "String?", tag: "uniq" },
                    { name: "username", type: "String?", tag: "uniq" },
                    { name: "password", type: "String?" },
                    { name: "xp", type: "Int @default(0)" },
                    { name: "level", type: "Int @default(1)" },
                    { name: "streakCount", type: "Int @default(0)" },
                    { name: "longestStreak", type: "Int @default(0)" },
                    { name: "lastActive", type: "DateTime?" },
                    { name: "avatar", type: "String @default('default')" },
                    { name: "avatarFrame", type: "String @default('none')" },
                    { name: "title", type: "String @default('Novice')" },
                    { name: "characterData", type: "Json?" },
                    { name: "createdAt", type: "DateTime" },
                  ],
                  relations: ["courses", "resourceProgress", "quizAttempts", "xpTransactions", "achievements", "courseRatings", "learningPaths", "accounts", "sessions"],
                },
                {
                  name: "Course", group: "Core",
                  desc: "A generated course. status gates listing visibility; the marketplace fields (enrollCount, avgRating) support publishing.",
                  fields: [
                    { name: "id", type: "String", tag: "pk" },
                    { name: "userId", type: "String", tag: "fk" },
                    { name: "title", type: "String" },
                    { name: "description", type: "String?" },
                    { name: "topic", type: "String" },
                    { name: "level", type: "String @default('beginner')" },
                    { name: "status", type: "String @default('generating')" },
                    { name: "totalResources", type: "Int @default(0)" },
                    { name: "completedResources", type: "Int @default(0)" },
                    { name: "isPublished", type: "Boolean @default(false)" },
                    { name: "enrollCount", type: "Int @default(0)" },
                    { name: "avgRating", type: "Float @default(0)" },
                    { name: "ratingCount", type: "Int @default(0)" },
                    { name: "originalCourseId", type: "String?" },
                    { name: "createdAt / updatedAt", type: "DateTime" },
                  ],
                  relations: ["user", "modules", "resources", "resourceProgress", "ratings", "generationJob (1:1)"],
                },
                {
                  name: "Module", group: "Core",
                  desc: "An ordered section of a course. Owns its resources and (optionally) one quiz.",
                  fields: [
                    { name: "id", type: "String", tag: "pk" },
                    { name: "courseId", type: "String", tag: "fk" },
                    { name: "title", type: "String" },
                    { name: "description", type: "String?" },
                    { name: "sortOrder", type: "Int" },
                    { name: "createdAt", type: "DateTime" },
                  ],
                  relations: ["course", "resources", "quiz (1:1?)"],
                },
                {
                  name: "Resource", group: "Core",
                  desc: "A single curated item — the real content. aiSummary caches the article summary payload.",
                  fields: [
                    { name: "id", type: "String", tag: "pk" },
                    { name: "moduleId", type: "String", tag: "fk" },
                    { name: "courseId", type: "String", tag: "fk" },
                    { name: "title", type: "String" },
                    { name: "description", type: "String?" },
                    { name: "type", type: "String" },
                    { name: "url", type: "String" },
                    { name: "youtubeVideoId", type: "String?" },
                    { name: "thumbnailUrl", type: "String?" },
                    { name: "duration", type: "String?" },
                    { name: "sortOrder", type: "Int" },
                    { name: "metadata", type: "Json?" },
                    { name: "aiSummary", type: "Json?" },
                    { name: "createdAt", type: "DateTime" },
                  ],
                  relations: ["module", "course", "progress[]"],
                },
                {
                  name: "GenerationJob", group: "Core",
                  desc: "1:1 with a Course — the progress row the frontend polls every ~1.5s during generation.",
                  fields: [
                    { name: "id", type: "String", tag: "pk" },
                    { name: "courseId", type: "String", tag: "uniq" },
                    { name: "userId", type: "String", tag: "fk" },
                    { name: "status", type: "String @default('queued')" },
                    { name: "step", type: "String?" },
                    { name: "current", type: "Int @default(0)" },
                    { name: "total", type: "Int @default(0)" },
                    { name: "message", type: "String?" },
                    { name: "resourcesFound", type: "Int @default(0)" },
                    { name: "topicClass", type: "String?" },
                    { name: "thinModules", type: "Json?" },
                    { name: "canFillWithAI", type: "Boolean @default(false)" },
                    { name: "error", type: "String?" },
                    { name: "createdAt / updatedAt", type: "DateTime" },
                  ],
                  relations: ["course"],
                },
                // ── Learning ──
                {
                  name: "ResourceProgress", group: "Learning",
                  desc: "Per-user completion + notes for one resource. Unique on (userId, resourceId).",
                  fields: [
                    { name: "id", type: "String", tag: "pk" },
                    { name: "userId", type: "String", tag: "fk" },
                    { name: "resourceId", type: "String", tag: "fk" },
                    { name: "courseId", type: "String", tag: "fk" },
                    { name: "status", type: "String @default('not_started')" },
                    { name: "completedAt", type: "DateTime?" },
                    { name: "xpEarned", type: "Int @default(0)" },
                    { name: "notes", type: "String?" },
                    { name: "@@unique", type: "[userId, resourceId]", tag: "uniq" },
                  ],
                  relations: ["user", "resource", "course"],
                },
                {
                  name: "Quiz", group: "Learning",
                  desc: "One AI-generated quiz per module. questions is a JSON array of question objects.",
                  fields: [
                    { name: "id", type: "String", tag: "pk" },
                    { name: "moduleId", type: "String", tag: "uniq" },
                    { name: "questions", type: "Json" },
                    { name: "createdAt", type: "DateTime" },
                  ],
                  relations: ["module", "attempts[]"],
                },
                {
                  name: "QuizAttempt", group: "Learning",
                  desc: "A single attempt at a quiz, with the answers, score and XP awarded.",
                  fields: [
                    { name: "id", type: "String", tag: "pk" },
                    { name: "userId", type: "String", tag: "fk" },
                    { name: "quizId", type: "String", tag: "fk" },
                    { name: "answers", type: "Json" },
                    { name: "score", type: "Int" },
                    { name: "totalQs", type: "Int" },
                    { name: "xpEarned", type: "Int @default(0)" },
                    { name: "createdAt", type: "DateTime" },
                  ],
                  relations: ["user", "quiz"],
                },
                {
                  name: "LearningPath", group: "Learning",
                  desc: "A goal-oriented skill tree grouping courses into a progression.",
                  fields: [
                    { name: "id", type: "String", tag: "pk" },
                    { name: "userId", type: "String", tag: "fk" },
                    { name: "title", type: "String" },
                    { name: "description", type: "String?" },
                    { name: "goal", type: "String" },
                    { name: "status", type: "String @default('active')" },
                    { name: "createdAt / updatedAt", type: "DateTime" },
                  ],
                  relations: ["user", "nodes[]"],
                },
                {
                  name: "PathNode", group: "Learning",
                  desc: "A node in a skill tree. parentIds (JSON string) encodes the DAG of prerequisites.",
                  fields: [
                    { name: "id", type: "String", tag: "pk" },
                    { name: "pathId", type: "String", tag: "fk" },
                    { name: "title", type: "String" },
                    { name: "description", type: "String?" },
                    { name: "level", type: "String @default('beginner')" },
                    { name: "sortOrder", type: "Int" },
                    { name: "courseId", type: "String?" },
                    { name: "status", type: "String @default('locked')" },
                    { name: "parentIds", type: "String @default('[]')" },
                  ],
                  relations: ["path"],
                },
                // ── Gamification ──
                {
                  name: "XpTransaction", group: "Gamification",
                  desc: "Append-only ledger — every XP award writes one row, so progression is fully auditable.",
                  fields: [
                    { name: "id", type: "String", tag: "pk" },
                    { name: "userId", type: "String", tag: "fk" },
                    { name: "amount", type: "Int" },
                    { name: "reason", type: "String" },
                    { name: "referenceId", type: "String?" },
                    { name: "createdAt", type: "DateTime" },
                  ],
                  relations: ["user"],
                },
                {
                  name: "UserAchievement", group: "Gamification",
                  desc: "Join row recording an unlocked achievement. Unique on (userId, achievementId).",
                  fields: [
                    { name: "id", type: "String", tag: "pk" },
                    { name: "userId", type: "String", tag: "fk" },
                    { name: "achievementId", type: "String" },
                    { name: "unlockedAt", type: "DateTime" },
                    { name: "@@unique", type: "[userId, achievementId]", tag: "uniq" },
                  ],
                  relations: ["user"],
                },
                {
                  name: "CourseRating", group: "Gamification",
                  desc: "Marketplace rating, one per user per course. Feeds Course.avgRating / ratingCount.",
                  fields: [
                    { name: "id", type: "String", tag: "pk" },
                    { name: "userId", type: "String", tag: "fk" },
                    { name: "courseId", type: "String", tag: "fk" },
                    { name: "rating", type: "Int" },
                    { name: "createdAt / updatedAt", type: "DateTime" },
                    { name: "@@unique", type: "[userId, courseId]", tag: "uniq" },
                  ],
                  relations: ["user", "course"],
                },
                // ── Auth ──
                {
                  name: "Account", group: "Auth",
                  desc: "NextAuth OAuth/credential account link. Unique on (provider, providerAccountId).",
                  fields: [
                    { name: "id", type: "String", tag: "pk" },
                    { name: "userId", type: "String", tag: "fk" },
                    { name: "provider", type: "String" },
                    { name: "providerAccountId", type: "String" },
                    { name: "access_token / refresh_token", type: "String?" },
                    { name: "expires_at", type: "Int?" },
                    { name: "@@unique", type: "[provider, providerAccountId]", tag: "uniq" },
                  ],
                  relations: ["user"],
                },
                {
                  name: "Session", group: "Auth",
                  desc: "NextAuth session row (the app uses JWT strategy, but the adapter model exists).",
                  fields: [
                    { name: "id", type: "String", tag: "pk" },
                    { name: "sessionToken", type: "String", tag: "uniq" },
                    { name: "userId", type: "String", tag: "fk" },
                    { name: "expires", type: "DateTime" },
                  ],
                  relations: ["user"],
                },
                {
                  name: "VerificationToken", group: "Auth",
                  desc: "NextAuth email-verification token. Unique on (identifier, token).",
                  fields: [
                    { name: "identifier", type: "String" },
                    { name: "token", type: "String", tag: "uniq" },
                    { name: "expires", type: "DateTime" },
                  ],
                },
                // ── Infra ──
                {
                  name: "RateLimit", group: "Infra",
                  desc: "Cross-dyno rate limiter. Standalone table, atomic upsert keyed by a string (e.g. user:action).",
                  fields: [
                    { name: "key", type: "String", tag: "pk" },
                    { name: "count", type: "Int @default(0)" },
                    { name: "resetAt", type: "DateTime" },
                  ],
                },
              ]}
            />

            <h3 className="prose">Status &amp; enum values</h3>
            <p className="prose">These are string columns (no DB enums), so the valid values live in code. The ones that matter:</p>
            <div className="legend">
              <div className="lg"><div className="lg-k">Course.status</div><div className="lg-v"><code>generating</code> · <code>active</code> · <code>completed</code> · <code>failed</code> — listings hide <code>generating</code> + <code>failed</code>.</div></div>
              <div className="lg"><div className="lg-k">GenerationJob.status</div><div className="lg-v"><code>queued</code> · <code>running</code> · <code>done</code> · <code>failed</code></div></div>
              <div className="lg"><div className="lg-k">GenerationJob.step</div><div className="lg-v"><code>classifying</code> · <code>structure</code> · <code>module</code> · <code>done</code></div></div>
              <div className="lg"><div className="lg-k">Resource.type</div><div className="lg-v"><code>youtube</code> · <code>article</code> · <code>wikipedia</code> · <code>paper</code> · <code>ai_generated</code></div></div>
              <div className="lg"><div className="lg-k">ResourceProgress.status</div><div className="lg-v"><code>not_started</code> · <code>in_progress</code> · <code>completed</code></div></div>
              <div className="lg"><div className="lg-k">topicClass</div><div className="lg-v"><code>developer_tech</code> · <code>academic_science</code> · <code>business_founder</code> · <code>history_humanities</code> · <code>practical_skill</code></div></div>
              <div className="lg"><div className="lg-k">PathNode.status</div><div className="lg-v"><code>locked</code> · <code>active</code> · <code>completed</code></div></div>
              <div className="lg"><div className="lg-k">Course.level</div><div className="lg-v"><code>beginner</code> · <code>intermediate</code> · <code>advanced</code></div></div>
            </div>

            <div className="callout">
              <span className="ci">🗄️</span>
              <p>
                <strong>One database, three roles.</strong> These models live alongside the pg-boss queue (its own{" "}
                <code>pgboss</code> schema) and the <code>RateLimit</code> table on a single Heroku Postgres.
                Prisma 7 with the <code>@prisma/adapter-pg</code> driver adapter; migrations applied via{" "}
                <code>prisma migrate deploy</code> on release.
              </p>
            </div>
          </section>

          {/* ══════════════ 9. CI/CD ══════════════ */}
          <section id="cicd" className="section">
            <h2>Deployment · CI/CD</h2>
            <p className="section-sub">
              The app ships through GitHub Actions on every push to <code>main</code> — no manual deploys. Step
              through the pipeline:
            </p>
            <Stepper
              steps={[
                { badge: "▸", title: "Push to main", sub: "trigger", tags: [{ label: "GitHub" }], content: (<p className="prose">A merge/push to <code>main</code> triggers the deploy workflow in <code>.github/workflows/deploy.yml</code>. Feature branches don&apos;t deploy.</p>) },
                { badge: "▸", title: "Typecheck + lint", sub: "gate", tags: [{ label: "tsc" }, { label: "eslint" }], content: (<p className="prose">The build fails fast if types or lint break — broken code never reaches the image.</p>) },
                { badge: "▸", title: "Docker build", sub: "standalone", tags: [{ label: "next standalone", kind: "brand" }], content: (<p className="prose">Next.js builds in <code>standalone</code> output mode and is packaged into a Docker image — the same artifact that runs in production.</p>) },
                { badge: "▸", title: "Migrate DB", sub: "prisma migrate deploy", tags: [{ label: "Prisma", kind: "brand" }], content: (<p className="prose"><code>prisma migrate deploy</code> applies any pending migrations against Heroku Postgres before the new release goes live — schema and code move together.</p>) },
                { badge: "▸", title: "Release", sub: "Heroku", tags: [{ label: "Heroku", kind: "violet" }, { label: "live", kind: "ok" }], content: (<p className="prose">The image is released to Heroku. On boot, <code>instrumentation.ts</code> starts the pg-boss worker in-process — no separate worker dyno to deploy.</p>) },
              ]}
            />
            <div className="callout" style={{ marginTop: 16 }}>
              <span className="ci">▲</span>
              <p>
                <strong>This ops site deploys separately.</strong> It&apos;s its own repo on Vercel — pushing
                auto-deploys it. It was split out of the main repo because the parent&apos;s Tailwind/PostCSS
                config leaked into the subfolder build.
              </p>
            </div>
          </section>

          {/* ══════════════ 10. INFRA ══════════════ */}
          <section id="infra" className="section">
            <h2>Deployment · servers</h2>
            <p className="section-sub">
              Where everything physically runs, and the constraints that shaped each host.
            </p>
            <div className="grid grid-2">
              <div className="infra">
                <div className="infra-head">
                  <span className="glyph">🟣</span>
                  <div>
                    <h3>Next.js App + Worker</h3>
                    <span className="host">Heroku · Docker</span>
                  </div>
                </div>
                <dl>
                  <dt>Runtime</dt><dd>Standalone Docker image, App Router</dd>
                  <dt>Worker</dt><dd>pg-boss, in-process (no 2nd dyno)</dd>
                  <dt>Why not Vercel</dt><dd>Serverless can&apos;t host a long-lived worker</dd>
                  <dt>Deploy</dt><dd>GitHub Actions → migrate → release</dd>
                </dl>
              </div>
              <div className="infra">
                <div className="infra-head">
                  <span className="glyph">🐘</span>
                  <div>
                    <h3>PostgreSQL</h3>
                    <span className="host">Heroku Postgres</span>
                  </div>
                </div>
                <dl>
                  <dt>App data</dt><dd>All core + gamification models</dd>
                  <dt>Queue</dt><dd>pg-boss <code>pgboss</code> schema</dd>
                  <dt>Limiter</dt><dd>RateLimit table (cross-dyno)</dd>
                  <dt>Migrations</dt><dd>prisma migrate deploy on release</dd>
                </dl>
              </div>
              <div className="infra">
                <div className="infra-head">
                  <span className="glyph">🔍</span>
                  <div>
                    <h3>SearXNG</h3>
                    <span className="host">Oracle Cloud · always-free VM</span>
                  </div>
                </div>
                <dl>
                  <dt>Shape</dt><dd>VM.Standard.E2.1.Micro, Ubuntu</dd>
                  <dt>Cost</dt><dd>$0 / month (always-free tier)</dd>
                  <dt>Run</dt><dd>Docker, restart: unless-stopped</dd>
                  <dt>Caveat</dt><dd>Ephemeral public IP — reserve or update env if it changes</dd>
                </dl>
              </div>
              <div className="infra">
                <div className="infra-head">
                  <span className="glyph">🟢</span>
                  <div>
                    <h3>Status + Docs</h3>
                    <span className="host">Vercel</span>
                  </div>
                </div>
                <dl>
                  <dt>Role</dt><dd>Live status board + these docs</dd>
                  <dt>Isolation</dt><dd>Separate repo, off Heroku on purpose</dd>
                  <dt>Checks</dt><dd>/api/health + frontend + SearXNG</dd>
                  <dt>Alerts</dt><dd>UptimeRobot can watch /api/health</dd>
                </dl>
              </div>
            </div>
          </section>

          <div className="foot-docs">
            <Link href="/">← Back to live status</Link>
            <span>LearnixSai · curation-first learning</span>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ── decision data (html allowed in strings) ── */
const DECISIONS: { title: string; badge: string; tone: string; context: string; decision: string; tradeoff: string }[] = [
  {
    title: "Curate real content, don't generate lesson text",
    badge: "USP",
    tone: "brand",
    context: "AI-generated course text is a commodity and often subtly wrong.",
    decision: "Assemble every course from <strong>real</strong> videos, articles, docs and Q&amp;A. AI only classifies, structures, reranks and summarizes — it never writes the lesson.",
    tradeoff: "Harder engineering (search, routing, reranking) in exchange for trustworthy, source-backed learning.",
  },
  {
    title: "Generation is a background job, not an HTTP request",
    badge: "pg-boss",
    tone: "brand",
    context: "The original pipeline ran for minutes inside an SSE request — slow, and it fell over under concurrent load.",
    decision: "<code>POST</code> enqueues a durable pg-boss job and returns in ~50ms; the worker runs the pipeline and the frontend polls a job row.",
    tradeoff: "A polling endpoint + job table to maintain, but the request path is now instant and load-safe.",
  },
  {
    title: "Run the worker in-process, not on a second dyno",
    badge: "cost",
    tone: "ok",
    context: "A dedicated worker dyno doubles the Heroku bill.",
    decision: "<code>instrumentation.ts</code> starts the pg-boss worker inside the web dyno at boot, capped by <code>GENERATION_CONCURRENCY</code>.",
    tradeoff: "Worker shares web-dyno resources — fine at this scale; the documented scale-up path is a dedicated dyno with the same code.",
  },
  {
    title: "Hybrid models — free to classify, paid to build",
    badge: "latency",
    tone: "brand",
    context: "Free OpenRouter models share a global rate limit → 429 storms and long latency under concurrency.",
    decision: "Latency-critical calls (structure, rerank) use a paid fast model; classify + summaries stay free.",
    tradeoff: "~$0.001–0.01 per course, in exchange for killing both the 429s and the wait.",
  },
  {
    title: "Self-host SearXNG on a free VM instead of a paid search API",
    badge: "$0",
    tone: "ok",
    context: "Brave Search needs a credit card; public SearXNG instances block datacenter IPs or disable JSON.",
    decision: "Run our own SearXNG on an Oracle Cloud always-free VM, referenced by <code>SEARXNG_URL</code>.",
    tradeoff: "We own the uptime (hence this status page), but general web search costs $0 and needs no keys.",
  },
  {
    title: "Keyless structured APIs over web scraping",
    badge: "reliability",
    tone: "violet",
    context: "Scraping is brittle and gets IP-blocked; some APIs (wikiHow, Reddit) failed outright from servers.",
    decision: "Route to stable keyless APIs by topic class — Stack Exchange, dev.to, GitHub, HN, arXiv, Wikipedia.",
    tradeoff: "Coverage is bounded by which APIs exist, but results are reliable and require no auth.",
  },
  {
    title: "Postgres-backed rate limiter, not in-memory",
    badge: "correctness",
    tone: "ok",
    context: "An in-memory map is per-dyno — useless the moment there's more than one process.",
    decision: "Atomic <code>INSERT … ON CONFLICT</code> upsert on a RateLimit table enforces limits globally.",
    tradeoff: "One extra tiny write per limited action, for a limit that's actually correct across dynos.",
  },
  {
    title: "Keep the status page on separate infrastructure",
    badge: "ops",
    tone: "violet",
    context: "A status page that shares fate with the app can't tell you the app is down.",
    decision: "Host status + docs as their own repo on Vercel; it checks the app from the outside.",
    tradeoff: "A second repo/deploy to maintain, but honest, independent monitoring.",
  },
];

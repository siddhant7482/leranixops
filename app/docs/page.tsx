import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Learnix — Architecture Docs",
  description: "How Learnix is built: pipeline, sources, queue, data model, and deploy.",
};

export default function DocsPage() {
  return (
    <main className="prose">
      <span className="tag">ARCHITECTURE</span>
      <h1>How Learnix works</h1>
      <p className="lede">
        Learnix is a <strong>curation-first</strong> learning platform: you type a topic, and it
        assembles a structured course out of <strong>real</strong> videos, articles, docs and Q&amp;A
        — not AI-generated lesson text. This is the engineering reference for how that happens.
      </p>

      <h2>System topology</h2>
      <p>Three independently-hosted pieces, deliberately decoupled:</p>
      <ul>
        <li><strong>App</strong> — Next.js (App Router) on <strong>Heroku</strong>, Docker deploy. Serves the UI, the API, and runs the background worker in-process.</li>
        <li><strong>Postgres</strong> — Heroku Postgres. Application data <em>and</em> the pg-boss job queue (its own <code>pgboss</code> schema).</li>
        <li><strong>Search</strong> — a self-hosted <strong>SearXNG</strong> meta-search instance on an Oracle Cloud always-free VM, for general web articles.</li>
        <li><strong>Status &amp; docs</strong> — this site, on <strong>Vercel</strong>. Kept off Heroku on purpose: a status page must not share fate with the system it monitors.</li>
      </ul>
      <p>
        The app stays on Heroku (not Vercel) specifically because generation runs in a
        long-lived in-process worker — a serverless platform can’t keep that alive.
      </p>

      <h2>Course generation pipeline</h2>
      <p>
        Generation is a <strong>background job</strong>, not part of the request. The old design ran
        the whole multi-minute pipeline inside the HTTP request over SSE — slow, and it broke under
        load. Now:
      </p>
      <pre><code>{`POST /api/courses/generate
  → create Course (status "generating") + GenerationJob
  → enqueue to pg-boss
  → return { courseId }              (~50ms)

instrumentation.ts register()  (once, at boot)
  → start pg-boss worker (in-process, GENERATION_CONCURRENCY cap)

worker(courseId)  [lib/generation/pipeline.ts]
  0. classify topic         (free model)   → topicClass, module estimate
  1. build structure        (paid model)   → title + modules
  2. Promise.all(modules):                 ← all modules in parallel
       gather candidate POOL:
         Wikipedia ‖ class-sourced APIs ‖ LLM search queries → search
       filter homepages / dedup
       rerank (LLM editor) → keep only on-topic, best-first
       rebalance → ~60% text / 40% video
  3. de-dup globally, createMany, Course → "active"

Frontend polls GET /api/courses/[courseId]/status`}</code></pre>
      <p>
        Everything inside a module runs concurrently, and modules run concurrently with each other,
        so wall-clock dropped from ~9–18 min to ~1–2 min. A global concurrency cap (pg-boss
        <code> localConcurrency</code>) means N users can’t overwhelm the box — excess jobs queue.
      </p>

      <h3>Models (hybrid)</h3>
      <p>
        Topic classification uses <strong>free</strong> OpenRouter models (cheap, simple). Structure
        and per-module curation use a <strong>paid, fast</strong> model (Gemini Flash by default) —
        which kills both latency and the free-tier 429 storms. Article summaries use free models.
      </p>

      <h2>Where content comes from</h2>
      <p>Sources are routed by the topic’s class, and all of them are real and keyless except SearXNG:</p>
      <ul>
        <li><strong>YouTube</strong> — via Invidious instances (raced), with a scraper fallback.</li>
        <li><strong>Wikipedia</strong> — per module.</li>
        <li><strong>Structured APIs</strong> — Stack Overflow &amp; topic-specific Stack Exchange sites (e.g. guitar→music.se, cooking→cooking.se), dev.to, GitHub, Hacker News, arXiv. No API keys.</li>
        <li><strong>SearXNG</strong> — general web articles for any topic (the self-hosted instance).</li>
      </ul>
      <p>
        Two sources were tried and removed after live testing: <strong>wikiHow</strong> (search API
        returns 500) and <strong>Reddit</strong> (403 from datacenter IPs). Brave Search was rejected
        because it requires a credit card even on the free tier.
      </p>

      <h3>Curation &amp; balance</h3>
      <p>
        Rather than trust the first search result, each module gathers a <em>pool</em> of candidates,
        drops bare-domain/homepage links, then an LLM “editor” pass keeps only genuinely on-topic
        resources (so a movie result can’t land in a history course). A final deterministic pass
        rebalances toward ~60% written content so videos don’t dominate.
      </p>

      <h2>AI article summaries</h2>
      <p>
        Opening an article lazily fetches and extracts its main text
        (<code>@extractus/article-extractor</code>), summarizes it with a free model, and caches the
        result on the resource. The summary is a faithful preview <em>with a prominent link to the
        original</em> — not a replacement. Paywalled / JS-only / bot-blocked sites (e.g. Britannica)
        gracefully fall back to a snippet + link, clearly labeled “Preview”.
      </p>

      <h2>Data model (essentials)</h2>
      <ul>
        <li><code>Course</code> → <code>Module</code> → <code>Resource</code> (type: youtube / article / wikipedia / paper / ai_generated).</li>
        <li><code>GenerationJob</code> — 1:1 with a course; the progress row the frontend polls.</li>
        <li><code>ResourceProgress</code>, <code>XpTransaction</code>, <code>Quiz</code> — learning &amp; gamification.</li>
        <li><code>RateLimit</code> — Postgres-backed limiter (cross-dyno, replaced an in-memory map).</li>
      </ul>

      <h2>Deploy &amp; ops</h2>
      <ul>
        <li><strong>App</strong> — push to <code>main</code> → GitHub Actions runs typecheck + lint, builds the Docker image, applies Prisma migrations (<code>migrate deploy</code>), and releases to Heroku.</li>
        <li><strong>SearXNG</strong> — Docker container on the Oracle VM with <code>restart: unless-stopped</code>; config in <code>deploy/searxng-oracle/</code>.</li>
        <li><strong>Status/docs</strong> — this Vercel site; <code>/api/status</code> aggregates the app’s <code>/api/health</code> plus direct checks of the frontend and SearXNG.</li>
      </ul>

      <p className="foot" style={{ textAlign: "left", marginTop: 40 }}>
        <Link href="/">← Back to status</Link>
      </p>
    </main>
  );
}

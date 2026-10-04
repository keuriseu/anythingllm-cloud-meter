// AnythingLLM adapter for the AI cost meter.
//
// STATUS: verified against AnythingLLM Desktop 1.17.0 with the GenieX provider
// on 2026-10-03 (see "Spike findings" in BRIEF.md). Read-only: it only calls GET
// endpoints of the developer API and never writes to AnythingLLM.
//
// What it does, every pollMs:
//   1. Lists workspaces, then reads each workspace (documents and threads).
//   2. Chats: reads the newest chats of each workspace and of each thread. Each
//      assistant reply carries metrics.prompt_tokens / metrics.completion_tokens,
//      reported by GenieX from the model's own tokenizer (estimated: false). If a
//      reply has no metrics, tokens are estimated from text length (estimated: true).
//   3. Embeds: every new row in a workspace's document list is one embed event,
//      using the document's token_count_estimate (estimated: true). This also
//      catches documents picked from the library, which create no new file.
//
// Model Router: each reply's metrics name the provider and model that answered.
// A reply is "cloud" only when that model or provider is on the cloud list in
// config.json (live.anythingllm.cloudProviders, a key of cloudModels, or a tier's "id"); anything else,
// including a reply with no model recorded, counts as "local". The page prices
// cloud replies as real spend at that model's own price.
//
// Chats sent through the API with a sessionId (rehearsal harness, pre-warm) are
// not returned by these endpoints, so they never reach the meter.
//
// Not covered: meeting assistant minutes and agent runs. Use the meter's hotkeys
// (or POST /api/events) for those.

"use strict";
const { execSync } = require("child_process");

const estTokens = (text) => Math.ceil(String(text || "").length / 4);
const oneLine = (s, n = 120) => String(s || "").replace(/\s+/g, " ").trim().slice(0, n);

// On Windows the saved user variable wins: terminals opened before it was last
// set still carry the old value in their own environment.
function readKey() {
  if (process.platform === "win32") {
    try {
      const k = execSync(`powershell -NoProfile -c "[Environment]::GetEnvironmentVariable('ANYTHINGLLM_API_KEY','User')"`,
        { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
      if (k) return k;
    } catch { /* fall through */ }
  }
  return process.env.ANYTHINGLLM_API_KEY || "";
}

// Converts one chat history (as returned by /chats) into meter events.
// Exported for tests.
// Decides where a reply ran from its metrics. Exported for tests.
function routeOf(met, { cloudProviders = [], cloudModels = [] } = {}) {
  const provider = String((met && met.provider) || "").toLowerCase();
  const model = String((met && met.model) || "");
  const cloud = cloudModels.includes(model) || cloudModels.includes(model + ":free") || (provider && cloudProviders.map((p) => p.toLowerCase()).includes(provider));
  return { route: cloud ? "cloud" : "local", model, provider };
}

function chatEvents(history, { sysTokens = 400, where = "", routing } = {}) {
  const out = [];
  const userByChat = new Map();
  for (const m of history || []) if (m.role === "user") userByChat.set(m.chatId, m);
  for (const m of history || []) {
    if (m.role !== "assistant" || m.chatId == null) continue;
    const user = userByChat.get(m.chatId);
    const met = m.metrics || {};
    let inputTokens = Number(met.prompt_tokens) || 0;
    let outputTokens = Number(met.completion_tokens) || 0;
    let estimated = false;
    if (!inputTokens && !outputTokens) {
      estimated = true;
      const sourcesText = (m.sources || []).map((s) => s.text || "").join(" ");
      inputTokens = sysTokens + estTokens(user && user.content) + estTokens(sourcesText);
      outputTokens = estTokens(m.content);
    }
    const { route, model, provider } = routeOf(met, routing);
    out.push({
      id: `allm-chat:${m.chatId}`,
      ts: m.sentAt ? m.sentAt * 1000 : Date.now(),
      kind: "chat",
      label: oneLine((user && user.content) || "Question") + (where ? ` (${where})` : ""),
      inputTokens, outputTokens, estimated, source: "anythingllm",
      route, model, provider
    });
  }
  return out;
}

// Converts a workspace's document rows into embed events. Exported for tests.
function embedEvents(ws) {
  return (ws.documents || []).map((d) => {
    let md = {};
    try { md = JSON.parse(d.metadata || "{}"); } catch { /* keep empty */ }
    const tokens = Number(md.token_count_estimate) || estTokens(md.pageContent);
    return {
      id: `allm-embed:${d.id}`,
      ts: Date.parse(d.createdAt) || Date.now(),
      kind: "embed",
      label: `Embedded ${oneLine(md.title || d.filename, 100)} (${ws.name})`,
      embedTokens: tokens, estimated: true, source: "anythingllm"
    };
  });
}

exports.routeOf = routeOf;
exports.chatEvents = chatEvents;
exports.embedEvents = embedEvents;

exports.start = function start({ config, addEvents, setStatus, log }) {
  const c = config.anythingllm || {};
  const base = String(process.env.METER_ANYTHINGLLM_URL || c.baseUrl || "http://127.0.0.1:3001").replace(/\/$/, "");
  const key = readKey();
  const pollMs = Number(c.pollMs || 2000);
  const sysTokens = Number(c.systemPromptTokens || 400);
  const chatLimit = Number(c.chatLimit || 50);
  const routing = {
    cloudProviders: c.cloudProviders || [],
    cloudModels: [...Object.keys(config.cloudModels || {}), ...Object.values(config.tiers || {}).map((t) => t.id)].filter(Boolean)
  };

  if (!key) {
    setStatus({ ok: false, msg: "set ANYTHINGLLM_API_KEY" });
    log.warn("AnythingLLM adapter: no API key. Generate one in AnythingLLM settings, then set ANYTHINGLLM_API_KEY.");
    return;
  }

  const seen = new Set();
  let primed = !!c.countExistingChats; // when false, the first pass only records what already exists
  let busy = false;
  let lastError = "";

  async function get(p) {
    const r = await fetch(base + p, { headers: { Authorization: `Bearer ${key}`, Accept: "application/json" }, signal: AbortSignal.timeout(5000) });
    if (r.status === 403) throw new Error("API key rejected");
    if (!r.ok) throw new Error(`${p} -> HTTP ${r.status}`);
    return r.json();
  }

  function take(events, out) {
    for (const e of events) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      // Stamp with detection time: AnythingLLM's sentAt has 1 s resolution, and the
      // meter's "This demo" view only counts events after the last reset (R).
      if (primed) out.push({ ...e, ts: Date.now() });
    }
  }

  async function pollWorkspace(w, out) {
    const slug = encodeURIComponent(w.slug);
    const j = await get(`/api/v1/workspace/${slug}`);
    const ws = Array.isArray(j.workspace) ? j.workspace[0] : j.workspace;
    if (!ws) return;
    take(embedEvents(ws), out);
    const h = await get(`/api/v1/workspace/${slug}/chats?limit=${chatLimit}&orderBy=desc`);
    take(chatEvents(h.history, { sysTokens, routing }), out);
    for (const t of ws.threads || []) {
      const th = await get(`/api/v1/workspace/${slug}/thread/${encodeURIComponent(t.slug)}/chats`);
      take(chatEvents(th.history, { sysTokens, where: t.name, routing }), out);
    }
  }

  async function tick() {
    if (busy) return;
    busy = true;
    const out = [];
    try {
      const ws = await get("/api/v1/workspaces");
      for (const w of ws.workspaces || []) await pollWorkspace(w, out);
      if (out.length) addEvents(out.sort((a, b) => a.ts - b.ts));
      primed = true;
      if (lastError) log.log("AnythingLLM adapter: connected");
      lastError = "";
      setStatus({ ok: true, msg: "connected" });
    } catch (e) {
      setStatus({ ok: false, msg: /key/.test(e.message) ? "API key rejected" : "AnythingLLM unreachable" });
      if (e.message !== lastError) log.warn("AnythingLLM adapter:", e.message); // log changes only, not every poll
      lastError = e.message;
    } finally {
      busy = false;
    }
  }

  tick();
  setInterval(tick, pollMs);
};

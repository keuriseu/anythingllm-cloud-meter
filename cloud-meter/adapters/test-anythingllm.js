// Checks the AnythingLLM adapter against real chats recorded by the rehearsal
// harness (demo-kit/scripts/results/*.jsonl, created by rehearse.mjs). Read-only.
//
//   node adapters/test-anythingllm.js
"use strict";
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { chatEvents, embedEvents } = require("./anythingllm.js");

const BASE = "http://127.0.0.1:3001/api/v1";
const RESULTS = path.resolve(__dirname, "..", "..", "demo-kit", "scripts", "results");
const key = (process.platform === "win32" && execSync(`powershell -NoProfile -c "[Environment]::GetEnvironmentVariable('ANYTHINGLLM_API_KEY','User')"`).toString().trim()) || process.env.ANYTHINGLLM_API_KEY;
const get = async (p) => (await fetch(BASE + p, { headers: { Authorization: `Bearer ${key}` } })).json();

(async () => {
  const rows = fs.readdirSync(RESULTS).filter((f) => f.endsWith(".jsonl"))
    .flatMap((f) => fs.readFileSync(path.join(RESULTS, f), "utf8").trim().split("\n").map((l) => JSON.parse(l)))
    .filter((r) => r.sessionId && r.output_tokens !== "");

  let ok = 0, bad = 0, est = 0;
  const ids = new Set();
  for (const r of rows) {
    const h = await get(`/workspace/${r.workspace}/chats?apiSessionId=${encodeURIComponent(r.sessionId)}`);
    const evs = chatEvents(h.history);
    const e = evs[0];
    const match = evs.length === 1 && e.inputTokens === r.prompt_tokens && e.outputTokens === r.output_tokens && e.kind === "chat";
    if (match) ok++; else { bad++; console.log("MISMATCH", r.sessionId, JSON.stringify(evs), r.prompt_tokens, r.output_tokens); }
    if (e && e.estimated) est++;
    if (e) ids.add(e.id);
  }
  console.log(`Chats: ${rows.length} rehearsal answers checked, ${ok} match the harness token counts, ${bad} mismatches, ${est} estimated, ${ids.size} unique event ids.`);

  const sample = (await get(`/workspace/quick-answers/chats?apiSessionId=${encodeURIComponent(rows.find((r) => r.workspace === "quick-answers").sessionId)}`)).history;
  console.log("Sample chat event:", JSON.stringify(chatEvents(sample)[0]));

  const ws = (await get("/workspace/deal-room")).workspace;
  const embeds = embedEvents(Array.isArray(ws) ? ws[0] : ws);
  console.log(`Embeds: ${embeds.length} events from Deal Room's document list, e.g.`, JSON.stringify(embeds[0]));

  const noMetrics = chatEvents([{ role: "user", content: "x".repeat(400), chatId: 1 }, { role: "assistant", content: "y".repeat(200), chatId: 1, sources: [{ text: "z".repeat(4000) }] }]);
  console.log("Fallback when no metrics:", JSON.stringify(noMetrics[0]));
  process.exitCode = bad ? 1 : 0;
})();

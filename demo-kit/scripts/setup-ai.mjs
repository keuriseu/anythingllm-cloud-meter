// Prepares AnythingLLM's AI settings for the demo. Safe to re-run.
//
//   node setup-ai.mjs           check, then fix what can be fixed safely
//   node setup-ai.mjs --check   report only, change nothing
//
// - Downloads the two GenieX models the demo uses, if missing (about 5.2 GB).
// - Sets the default LLM provider to GenieX if it is something else.
// - Checks the embedder is "native". It never changes the embedder: changing it
//   deletes every workspace's vectors.
import { api, internal, INTERNAL, MODELS } from "./lib.mjs";

const CHECK = process.argv.includes("--check");
let problems = 0;
const say = (ok, msg) => { console.log(`  ${ok ? "OK  " : "FIX "} ${msg}`); if (!ok) problems++; };

async function geniexModels() {
  const j = await internal("POST", "/system/custom-models", { provider: "qnnengine" });
  return j.models || [];
}

// Streams AnythingLLM's own model download and prints progress on one line.
async function download(modelId) {
  const r = await fetch(`${INTERNAL}/utils/qnn/download-model`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modelId })
  });
  if (!r.ok) throw new Error(`download ${modelId} -> HTTP ${r.status}`);
  const dec = new TextDecoder();
  let buf = "", last = -1, error = null;
  for await (const chunk of r.body) {
    buf += dec.decode(chunk, { stream: true });
    let i;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const line = buf.slice(0, i).replace(/^data: ?/, ""); buf = buf.slice(i + 2);
      let j; try { j = JSON.parse(line); } catch { continue; }
      if (j.type === "error" || j.error) error = j.message || j.error;
      const p = Math.floor(Number(j.percentage));
      if (Number.isFinite(p) && p !== last) { last = p; process.stdout.write(`\r     downloading ${modelId}: ${p}%   `); }
    }
  }
  process.stdout.write("\n");
  if (error) throw new Error(`download ${modelId} failed: ${error}`);
}

console.log("\nAnythingLLM AI settings");
const s = (await api("GET", "/system")).settings;
say(s.EmbeddingEngine === "native", `embedder is ${s.EmbeddingEngine}${s.EmbeddingEngine === "native" ? "" : " (should be native: Settings, AI Providers, Embedder. Changing it deletes all vectors.)"}`);

if (s.LLMProvider === "qnnengine") say(true, "default LLM provider is GenieX");
else if (CHECK) say(false, `default LLM provider is ${s.LLMProvider}, should be GenieX`);
else {
  await api("POST", "/system/update-env", { LLMProvider: "qnnengine", QnnEngineModelPref: MODELS.npu });
  say(true, `default LLM provider changed from ${s.LLMProvider} to GenieX`);
}

console.log("\nGenieX models");
let models = await geniexModels();
for (const id of [MODELS.npu, MODELS.gguf]) {
  const m = models.find((x) => x.id === id);
  if (!m) { say(false, `${id} is not offered by this AnythingLLM version`); continue; }
  if (m.downloaded) { say(true, `${id} downloaded`); continue; }
  if (CHECK) { say(false, `${id} not downloaded (${m.size})`); continue; }
  console.log(`  ...  ${id} not downloaded (${m.size}); downloading now`);
  await download(id);
  models = await geniexModels();
  say(!!models.find((x) => x.id === id)?.downloaded, `${id} ${models.find((x) => x.id === id)?.downloaded ? "downloaded" : "still not downloaded"}`);
}

console.log(problems ? `\n${problems} thing(s) to fix. See above.` : "\nAI settings are ready.");
process.exitCode = problems ? 1 : 0;

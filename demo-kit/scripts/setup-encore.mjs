// Sets up the optional Model Router encore. Safe to re-run.
//
//   node setup-encore.mjs
//
// Needs an OpenRouter API key saved in AnythingLLM first (Settings, AI
// Providers, LLM, OpenRouter). This script never reads or stores that key.
// Then it:
// - creates or repairs "Bid Desk Router" and its three rules,
// - creates or repairs the Bid Desk workspace (router, history 1, query mode,
//   only the RFP and ISP-07),
// - puts the default LLM provider back on GenieX and the OpenRouter timeout at
//   15000 ms (saving the OpenRouter settings page resets both).
// Check the result with: node check-encore.mjs
import { api, internal, getWorkspace, libraryDocs, MODELS, FILES } from "./lib.mjs";

export const ROUTER_NAME = "Bid Desk Router";
export const CLOUD_MODEL = "openai/gpt-6.1-sol";
const LOCAL = { provider: "qnnengine", model: MODELS.gguf }; // Deal Room leaves this model loaded

const RULES = [
  { title: "keep_it_on_the_device", conditions: [{ property: "promptContent", comparator: "contains", value: "confidential, internal, pricing, margin, discount, customer" }], route_provider: LOCAL.provider, route_model: LOCAL.model },
  { title: "polish_for_the_client", conditions: [{ property: "promptContent", comparator: "contains", value: "cover letter, polish, rewrite, executive summary" }], route_provider: "openrouter", route_model: CLOUD_MODEL },
  { title: "read_an_image", conditions: [{ property: "hasImageAttachment", comparator: "eq", value: "true" }], route_provider: "openrouter", route_model: CLOUD_MODEL }
];
const WORKSPACE = { slug: "bid-desk", name: "Bid Desk", docs: [FILES.rfp, FILES.policy] };

// 1. OpenRouter key and global settings
const s = (await api("GET", "/system")).settings;
if (s.OpenRouterApiKey !== true) {
  console.log(`No OpenRouter API key is saved in AnythingLLM yet.
  1. Create a key at https://openrouter.ai/keys (the account needs credit; GPT-6.1 Sol is a paid model).
  2. In AnythingLLM: Settings, AI Providers, LLM, choose OpenRouter, paste the key, pick ${CLOUD_MODEL}, Save.
  3. Run this script again. It puts the default provider back on GenieX for you.`);
  process.exit(2);
}
const env = {};
if (s.LLMProvider !== "qnnengine") env.LLMProvider = "qnnengine";
if (!(Number(s.OpenRouterTimeout) >= 15000)) env.OpenRouterTimeout = "15000";
if (Object.keys(env).length) {
  await api("POST", "/system/update-env", env);
  console.log(`Settings fixed: ${Object.entries(env).map(([k, v]) => `${k}=${v}`).join(", ")}`);
}

// 2. Router and rules
let router = (await internal("GET", "/model-routers")).routers.find((r) => r.name === ROUTER_NAME);
const routerFields = { name: ROUTER_NAME, description: "Model Router encore: private stays local, client writing goes to the cloud.", fallback_provider: LOCAL.provider, fallback_model: LOCAL.model, cooldown_seconds: 0 };
if (!router) {
  router = (await internal("POST", "/model-routers/new", routerFields)).router;
  console.log(`Created router "${ROUTER_NAME}" (id ${router.id})`);
} else {
  await internal("PUT", `/model-routers/${router.id}`, routerFields);
}
const existing = (await internal("GET", `/model-routers/${router.id}`)).router.rules || [];
for (const [i, rule] of RULES.entries()) {
  const body = { type: "calculated", condition_logic: "AND", enabled: true, priority: i + 1, ...rule };
  const have = existing.find((r) => r.title === rule.title);
  if (have) await internal("PUT", `/model-routers/${router.id}/rules/${have.id}`, body);
  else await internal("POST", `/model-routers/${router.id}/rules/new`, body);
}
for (const extra of existing.filter((r) => !RULES.some((x) => x.title === r.title))) {
  await internal("PUT", `/model-routers/${router.id}/rules/${extra.id}`, { ...extra, enabled: false });
  console.log(`Disabled extra rule "${extra.title}"`);
}
console.log(`Router "${ROUTER_NAME}": ${RULES.length} rules in order (${RULES.map((r) => r.title).join(", ")})`);

// 3. Workspace
let ws = await getWorkspace(WORKSPACE.slug);
if (!ws) {
  const j = await api("POST", "/workspace/new", { name: WORKSPACE.name });
  if (j.workspace?.slug !== WORKSPACE.slug) throw new Error(`created workspace got slug ${j.workspace?.slug}, expected ${WORKSPACE.slug}`);
  console.log(`Created workspace "${WORKSPACE.name}"`);
}
// History 1, not 0: in AnythingLLM 1.17.0, 0 behaves like the default of 20.
await api("POST", `/workspace/${WORKSPACE.slug}/update`, { chatProvider: "anythingllm-router", router_id: router.id, openAiTemp: 0.2, openAiHistory: 1, chatMode: "query", topN: 4 });
ws = await getWorkspace(WORKSPACE.slug);
const lib = await libraryDocs();
const want = lib.filter((d) => WORKSPACE.docs.includes(d.title)).map((d) => d.docpath);
if (want.length !== WORKSPACE.docs.length) throw new Error("the RFP or ISP-07 is missing from the document library (or listed twice). Run setup-workspaces.mjs first.");
const have = (ws.documents || []).map((d) => d.docpath);
const adds = want.filter((p) => !have.includes(p));
const deletes = have.filter((p) => !want.includes(p));
if (adds.length || deletes.length) await api("POST", `/workspace/${WORKSPACE.slug}/update-embeddings`, { adds, deletes });
console.log(`Workspace "${WORKSPACE.name}": router ${router.id}, history 1, query mode, documents: ${WORKSPACE.docs.join(", ")}`);
console.log("\nEncore set up. Check it with: node check-encore.mjs");

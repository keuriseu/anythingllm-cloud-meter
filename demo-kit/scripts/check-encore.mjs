// Checks that the Model Router encore (Bid Desk) is ready. Read-only.
//
//   node check-encore.mjs
//
// Saving the OpenRouter page in AnythingLLM resets the default provider and
// the OpenRouter timeout, and Bid Desk chats ride along with the next cloud
// request, so all three are checked here.
import { api, getWorkspace, FILES } from "./lib.mjs";

const problems = [];
const check = (ok, good, bad) => { console.log(`  ${ok ? "OK  " : "FIX "} ${ok ? good : bad}`); if (!ok) problems.push(bad); };

const s = (await api("GET", "/system")).settings;
console.log("\nAnythingLLM settings");
check(s.LLMProvider === "qnnengine", "default provider is GenieX", `default provider is ${s.LLMProvider}, should be GenieX (qnnengine)`);
check(Number(s.OpenRouterTimeout) >= 15000, `OpenRouter timeout ${s.OpenRouterTimeout} ms`, `OpenRouter timeout is ${s.OpenRouterTimeout} ms, should be 15000`);
check(s.OpenRouterApiKey === true, "OpenRouter key is saved", "no OpenRouter key saved");

console.log("\nBid Desk");
const ws = await getWorkspace("bid-desk");
if (!ws) {
  check(false, "", "workspace bid-desk not found");
} else {
  check(ws.chatProvider === "anythingllm-router" && ws.router_id, `uses router ${ws.router_id}`, "is not set to use the Model Router");
  check(ws.openAiHistory === 1, "chat history 1", `chat history is ${ws.openAiHistory}, should be 1 (0 means the default of 20)`);
  check(ws.chatMode === "query", "query mode", `chat mode is ${ws.chatMode}, should be query`);
  const titles = (ws.documents || []).map((d) => JSON.parse(d.metadata || "{}").title).sort();
  const want = [FILES.policy, FILES.rfp].sort();
  check(JSON.stringify(titles) === JSON.stringify(want), "documents: only the RFP and ISP-07", `documents are ${titles.join(", ") || "none"}; should be only the RFP and ISP-07`);
  const h = (await api("GET", "/workspace/bid-desk/chats?limit=200")).history || [];
  check(h.length === 0, "no chat history", `${h.length} chat messages left; run: node reset-chats.mjs --yes`);
}

console.log(problems.length ? `\n${problems.length} thing(s) to fix before the encore.` : "\nThe encore is ready.");
process.exitCode = problems.length ? 1 : 0;

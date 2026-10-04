# Meter notes: AnythingLLM live integration

## Context

This is a second-display "cloud meter" for a Snapdragon X AnythingLLM demo. The audience watches a running "cloud API equivalent" dollar figure climb while the device shows $0.00, to make the "no per-token fees" point visible. The UI, simulator, helper server, and pricing config are done. What's left is replacing simulated events with real usage from AnythingLLM running on this machine.

Demo flow it supports: unplug and airplane mode, embed a folder of documents, ask cross-document RAG questions, run the meeting assistant, run an agent task, show the PC stays responsive.

## Hard constraints

- Must work fully offline. Everything stays on localhost. No CDNs, no external fonts, no npm dependencies unless truly necessary.
- Read-only toward AnythingLLM. Never write to its database, storage folder, or settings.
- Do not ship numbers that can't be defended. Any token count that is estimated rather than reported must carry `estimated: true` (the UI labels it "est.").
- Keep all user-facing text free of em dashes.
- AnythingLLM on this device should use the GenieX provider with GGUF models (v1.16.1 or later). Pin the version for show day.

## Event contract (already implemented in server.js and index.html)

POST to `/api/events` as `{ "events": [ ... ] }`. Each event:

```json
{ "id": "unique-string", "ts": 1759500000000, "kind": "embed|chat|agent|transcribe",
  "label": "short text for the feed", "inputTokens": 0, "outputTokens": 0,
  "embedTokens": 0, "audioMinutes": 0, "pages": 0, "steps": 0,
  "estimated": false, "source": "anythingllm" }
```

Duplicate ids are ignored, so re-sending is safe.

## Spike (do this first, about an hour)

1. Confirm AnythingLLM version and that the provider is "AnythingLLM GenieX". Note the model.
2. Generate a developer API key in AnythingLLM settings. Find the local API base URL and port (draft assumes `http://localhost:3001`; the desktop app may differ). Check whether the API docs page is available locally.
3. Send 3 to 5 chats in a test workspace with documents attached. Then inspect, in this order:
   - The workspace chat history API response. Does each assistant message include `metrics` with `prompt_tokens` and `completion_tokens`? What are the exact paths and field names?
   - If the API doesn't expose metrics, the desktop app's SQLite database (look under the app's storage folder, likely in `%APPDATA%`). Open read-only. Look for a chats table whose response JSON holds metrics.
4. Decide whether counts are reported by GenieX or estimated by AnythingLLM. Compare a few against a tokenizer for the same model. Record findings at the bottom of this file.
5. Find where parsed documents are stored and whether each JSON has a token count field (the draft assumes `token_count_estimate`). Confirm that embedding a document in the UI produces a new file there.
6. Look for any record of meeting assistant sessions (duration, transcript length) and agent runs (step count, tokens). If none is accessible, keep hotkeys `3` and `4` as the source for those beats.

## Then

- Fix `adapters/anythingllm.js` to match what the spike found. Everything marked UNVERIFIED in that file is a guess.
- Set `"mode": "live"` and `"live.enabled": true` in `config.json`; set `documentsDir` if step 5 worked.
- Make sure the adapter's first pass doesn't flood the meter with old chats (`countExistingChats: false` already handles this; confirm it works).
- Add a tiny launcher (`start-meter.cmd`) that starts the helper and opens the page in full screen on the second display, if that's easy on this machine.

## Acceptance test

1. Airplane mode on, charger unplugged. Start the helper, open the meter, reset with `R`.
2. Embed one document in AnythingLLM: an embed event appears within 3 seconds with a plausible token count.
3. Ask a RAG question: a chat event appears with input tokens that clearly include retrieved context (thousands, not dozens).
4. Restart the helper: today's total is unchanged; `D` shows the full day.
5. Kill AnythingLLM: status pill turns amber, meter keeps its numbers, hotkeys still work.
6. Prices in `config.json` match OpenAI's official pricing page on the day of the show.

## Spike findings

Done on 2026-10-03 on the demo machine (Snapdragon X2 Elite, Windows 11).

1. **Version and provider.** AnythingLLM Desktop **1.17.0**. LLM provider "AnythingLLM GenieX" (internal name `qnnengine`), engine on `127.0.0.1:3800`. Models: `qualcomm/Qwen3-4B-Instruct-2507` (NPU only, 4K context) and `unsloth/Qwen3-4B-Instruct-2507-GGUF:Q4_0` (GGUF, 16K context). Embedder: `native` (CPU). The NPU embedder (`qnn-native`) crashed the backend on this X2 Elite; do not use it. Pin 1.17.0 for show day.
2. **API.** Base URL `http://127.0.0.1:3001` (developer API under `/api/v1`). Use `127.0.0.1`, not `localhost`: AnythingLLM listens on IPv4 only. API docs are served locally at `http://127.0.0.1:3001/api/docs/`. The key comes from the `ANYTHINGLLM_API_KEY` environment variable only (the adapter prefers the saved Windows user variable); there is no key in `config.json`.
3. **Chat history.** `GET /api/v1/workspace/{slug}/chats?limit=50&orderBy=desc` (the default order is oldest first, which would miss new chats once a workspace has more than 100). The user message and the assistant reply share a `chatId`. Each assistant message has `metrics: { prompt_tokens, completion_tokens, total_tokens, outputTps, duration, model, provider, timestamp }`. `sentAt` is in seconds. The endpoint returns only the workspace's main chat with no API session id: chats in app threads come from `GET /api/v1/workspace/{slug}/thread/{threadSlug}/chats` (thread slugs are in `GET /api/v1/workspace/{slug}`), and chats sent through the API with a `sessionId` (rehearsal harness, pre-warm) never appear, which keeps them off the meter. No database access was needed.
4. **Reported or estimated.** Reported. AnythingLLM copies `usage` from the GenieX stream (`stream_options.include_usage`), so the counts come from the model's own tokenizer. Compared with OpenAI tokenizers on 55 rehearsal answers, GenieX output counts are 1.5% to 3% higher on long answers and about 12% higher on short ones (o200k: -2.8% deep, -12.3% fast). The meter therefore slightly overstates, never understates, the cloud cost of the output. Chat events carry `estimated: false`. If a reply ever has no metrics, the adapter estimates from text length and sets `estimated: true`.
5. **Documents.** Parsed documents live in `%APPDATA%\anythingllm-desktop\storage\documents\custom-documents\` with a `token_count_estimate` field (spreadsheets become one document per sheet, in their own folder). Watching this folder does not work for the demo: picking an already uploaded file from the library in the UI creates no new file. Instead the adapter reads each workspace's document list (`GET /api/v1/workspace/{slug}`, which includes `documents[].metadata.token_count_estimate`) and emits one embed event per new row. These carry `estimated: true` because AnythingLLM itself calls the count an estimate. `documentsDir` was removed from `config.json`.
6. **Meeting assistant and agent runs.** Not part of this run of show, so not investigated further. Keep hotkeys `3` and `4` for those beats.

### Adapter test results
- `node adapters/test-anythingllm.js`: 92 of 92 rehearsal chats converted with exactly the token counts the rehearsal harness recorded, 0 estimated, all event ids unique.
- Acceptance run against a scratch copy of the helper (port 7778), live AnythingLLM:
  - Start: 0 events after priming (no flood of existing chats or documents).
  - Chat typed as in the app: event on the meter 1.4 s after the answer finished, 990 input and 57 output tokens, not estimated. Fast-lane questions use about 1,000 input tokens (4 snippets); the deep question uses about 4,800.
  - RFP picked from the library into Deal Room: embed event 1.8 s later, 1,861 tokens, marked "est.".
  - Helper restart: day total unchanged.
  - AnythingLLM unreachable: status "AnythingLLM unreachable" (amber), totals kept, hotkey events still accepted.
- Not tested here: price check against OpenAI's pricing page (needs the internet; do it before the show), and `start-meter.cmd` on a real second display (only one display was connected).

## Addendum: Model Router replies (2026-10-03)

Added for the optional encore in `Demo_Deal_Room\DEMO_PLAN.md` ("Encore: Model Router"). Details in README.md, section "Model Router".

- Events now carry `route` ("cloud" or absent for local), `model` and `provider`. `server.js` keeps these fields; old events without them count as local.
- A reply is cloud when its model is a key of `cloudModels` or a tier `id` in `config.json`, or its provider is in `live.anythingllm.cloudProviders`. The model id also matches without a `:free` suffix.
- Verified against live AnythingLLM 1.17.0: router replies record `provider` as `OpenRouterLLM` (cloud) or `QnnEngineLLM` (local), and `model` as `openai/gpt-6.1-sol` or "Qwen3 4B Instruct 2507". No field records which router rule matched.
- Cloud replies are priced at that model's own price and shown as real spend ("Actually paid, with the model router"). They count at the same price on every tier, and their tokens are left out of "Tokens processed on device". A `cloudModels` entry marked `"free": true` is shown at list price instead.
- OpenRouter sometimes returns no token counts. Those replies are estimated from text length and marked "est.".
- AnythingLLM API notes found on the way: the developer API cannot create Model Routers (the app does that); a router workspace has `chatProvider: "anythingllm-router"` and `router_id`; `POST /api/v1/system/update-env` can set single settings such as `OpenRouterTimeout` without touching others.

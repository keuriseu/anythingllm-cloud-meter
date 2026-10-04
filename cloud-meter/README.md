# AI Cost Meter

A full-screen second-display meter for the AnythingLLM demo. It shows what the same work would cost on a cloud AI API, next to $0.00 on the device.

## Run it

**Quickest (simulator, no install):** double-click `index.html`. Press `H` for controls.

**Show day:** double-click `start-meter.cmd`. It starts the helper (minimized) if it is not running and opens the meter full screen in Edge on the second display, or on the main display if only one is connected.

**By hand (needed for live data and for the meter to remember a full day across reloads):**

```
node server.js
```

Then open http://127.0.0.1:7777 in a browser on the second display and press `F` for full screen. Requires Node 18 or newer. The helper only listens on 127.0.0.1, so it keeps working in airplane mode.

Add `?mode=sim` or `?mode=live` to the URL to override the mode in `config.json`. Add `?auto=1` to start the simulator in auto-play.

## Modes

| Mode | What feeds the meter | When to use |
|---|---|---|
| `sim` | Events generated in the page with realistic token counts | Rehearsals, previews, and as a fallback |
| `live`, adapter off | Hotkeys post events to the helper, which logs them to `data/` | Show-day fallback with day totals that survive a reload |
| `live`, adapter on | Real AnythingLLM usage pulled by `adapters/anythingllm.js`, plus hotkeys | The real thing (current setting) |

`config.json` is set to live with the adapter on. The adapter reads the API key from the `ANYTHINGLLM_API_KEY` environment variable only (on Windows it prefers the saved user variable); never put the key in a file. It counts chats typed in AnythingLLM's workspaces and threads, and documents added to a workspace. Chats sent through the API with a session id (the rehearsal harness and the Deal Room pre-warm) are not counted. Check the adapter against real data with `node adapters/test-anythingllm.js`. Findings and test results are in `../docs/METER_NOTES.md`. `setup.cmd` in the repo root saves the key for you.

## Controls

| Key | Action |
|---|---|
| `1` | Embed a document |
| `2` | Ask a question (RAG) |
| `3` | Run an agent task |
| `4` | Transcribe and summarize a meeting |
| `5` | A reply routed to the cloud (Model Router, GPT-6.1 Sol via OpenRouter) |
| `A` | Auto-play on/off (simulator) |
| `T` | Cycle price tier: small, mid, both |
| `D` | Toggle "This demo" and "Today, all visitors" |
| `R` | Reset for the next visitor (today's total is kept) |
| `F` | Full screen |
| `H` | Show or hide controls |

The tier buttons in the top bar are also clickable.

## Model Router

When an AnythingLLM workspace uses a Model Router, the adapter reads each reply's `metrics.provider` and `metrics.model`. A reply counts as cloud only when its model is a key of `cloudModels` or a tier `id` in `config.json`, or its provider is in `live.anythingllm.cloudProviders`; anything else counts as local.

The Bid Desk router sends cloud replies to OpenAI GPT-6.1 Sol through OpenRouter (`openai/gpt-6.1-sol`, paid, $2.00 in / $10.00 out per 1M tokens). That is the same model and price as the meter's mid tier, so a routed reply is shown as real money paid. A model in `cloudModels` marked `"free": true` would instead be shown at its list price and labelled "list".

- The right card switches from "On this PC $0.00" to "Actually paid, with the model router" and says how many replies went to the cloud.
- The feed starts those rows with "Cloud · GPT-6.1 Sol via OpenRouter" and shows the amount paid.
- The cloud card counts routed replies at their real price on every tier, so the all-cloud figure is never below what was paid.
- Tokens from cloud replies are left out of "Tokens processed on device".
- Hotkey `5` adds a test routed reply on `routerDemoModel`.

Verified on 2026-10-03 against live AnythingLLM: AnythingLLM records `provider` as `OpenRouterLLM` and `model` as `openai/gpt-6.1-sol` for a routed reply (both on the cloud lists), and `QnnEngineLLM` for local replies. OpenRouter sometimes reports 0 tokens; the meter then estimates from text length and marks the row "est.".

## Pricing and honesty

All prices live in `config.json` with sources listed under `pricingSources`. All four values below were verified against OpenAI's official API pricing pages on 2026-10-03 (`developers.openai.com/api/docs/pricing`; `openai.com/api/pricing` now redirects to business plans). Check again if the show is on a later date.

- Small tier: GPT-6 Luna (`gpt-6-luna`), $0.10 in / $0.50 out per 1M tokens
- Mid tier: GPT-6.1 Sol (`gpt-6.1-sol`), $2.00 in / $10.00 out per 1M tokens

Both are OpenAI's current flagship models at standard, short-context prices. Long context costs double on input (Luna $0.20 / $0.75, Sol $4.00 / $15.00); the demo prompts stay well under the long-context range.
- Embeddings: text-embedding-3-small, $0.02 per 1M tokens
- Transcription: gpt-4o-transcribe, $0.006 per minute

The footer states that figures exclude caching and batch discounts, and that local cost excludes hardware and electricity. Keep that line; it is what makes the number defensible.

The "At team scale" panel uses the usage profile in `config.projection`. With the defaults (1,000 people, 250 workdays) it comes to roughly $101K a year on the small tier and $309K on the mid tier. On the small tier, $90K of that is meeting transcription (60 minutes per person per day). Adjust the profile to something your team is comfortable defending.

## Files

- `index.html` the meter (self-contained, no internet needed)
- `config.json` prices, labels, projection profile, live settings
- `server.js` zero-dependency local helper
- `adapters/anythingllm.js` AnythingLLM integration (verified on AnythingLLM 1.17.0)
- `adapters/test-anythingllm.js` checks the adapter against rehearsal chats
- `start-meter.cmd`, `start-meter.ps1` show-day launcher
- `../docs/METER_NOTES.md` build notes and AnythingLLM spike findings
- `data/` daily event logs written by the helper

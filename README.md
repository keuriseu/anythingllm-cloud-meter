# AnythingLLM Cloud Meter and Demo Kit

A second-screen **AI cost meter** and a ready-made **4-minute demo** for [AnythingLLM Desktop](https://anythingllm.com/desktop) on Snapdragon X PCs. The meter shows what the same work would cost on a cloud AI API, live, next to **$0.00** on the device. The demo kit sets up the workspaces, documents, models and questions so a presenter only has to walk on stage.

Everything runs on `127.0.0.1` and works in airplane mode. The meter needs no internet, no CDN and no npm packages.

## What you need

- A Snapdragon X2 Elite PC with Windows 11 (tested on X2 Elite only; first-generation X Elite is untested)
- [AnythingLLM Desktop](https://anythingllm.com/desktop) for Windows ARM64, version 1.17.0 or later, with **AnythingLLM GenieX** as the LLM provider
- About 6 GB of free disk space for the two models
- A second display for the meter (optional; it also runs on the main display)
- Node.js 18 or later (`setup.cmd` offers to install it)
- Optional encore only: a paid [OpenRouter](https://openrouter.ai) account

## Quick start

1. **Get the files.** Click **Code**, then **Download ZIP**, and extract it. Or run `git clone https://github.com/keuriseu/anythingllm-cloud-meter`.
2. **Install and open AnythingLLM Desktop.** In onboarding, pick **AnythingLLM GenieX** as the LLM provider and keep the default (native) embedder.
3. **Double-click `setup.cmd`.** It walks through everything below and is safe to run again.

| `setup.cmd` step | Automated | You do |
|---|---|---|
| 1. Node.js | Checks the version; installs Node.js LTS with winget if you say yes | Say yes |
| 2. AnythingLLM | Starts it if installed, waits until it answers | Install it if missing |
| 3. API key | Checks the key and saves it as the `ANYTHINGLLM_API_KEY` user environment variable (never in a file) | Generate a key in AnythingLLM (Settings, Tools, Developer API) and paste it |
| 4. Models | Downloads the NPU and GGUF Qwen3 4B models (about 5.2 GB), sets GenieX as the default provider, checks the embedder | Wait |
| 5. Workspaces | Uploads the six demo documents, creates **Quick Answers** and **Deal Room** with the tested settings and pinned files | Nothing |
| 6. Encore (optional) | Creates the Model Router, its rules and the **Bid Desk** workspace, and fixes the settings OpenRouter changes | Save an OpenRouter key in AnythingLLM |
| 7. Shortcuts | Desktop shortcuts: **AI Cost Meter**, **Demo Pre-show Reset**, **Pre-warm Deal Room** (Ctrl+Alt+W) | Nothing |

## Show day

1. Rehearse as much as you like. Rehearsals leave chats behind; that's fine.
2. Right before going on stage, double-click **Demo Pre-show Reset** (`preshow.cmd`). It:
    - restores the workspaces and clears all demo chats;
    - asks you to close heavy apps, unplug the charger and turn on airplane mode;
    - warms up both models, Quick Answers last, then clears the warm-up chats;
    - opens the cost meter full screen on the second display.
3. On the meter, press `R` to reset it for the audience. Follow [docs/STAGE_SCRIPT.md](docs/STAGE_SCRIPT.md).

## The cost meter

`cloud-meter/` is a self-contained page plus a small Node helper. It reads real token counts from AnythingLLM's API and prices them at published cloud API list prices. The right card stays at $0.00 for on-device work.

- **Open it:** the **AI Cost Meter** shortcut, `cloud-meter\start-meter.cmd`, or `node server.js` then http://127.0.0.1:7777.
- **Try it without AnythingLLM:** open `cloud-meter/index.html` directly for the simulator. Press `H` for controls.
- **Prices and assumptions:** `cloud-meter/config.json`, with sources. They were verified on 2026-10-03; check them again before your show.
- **Details:** [cloud-meter/README.md](cloud-meter/README.md) covers the modes, hotkeys, pricing honesty and Model Router replies.

## Repo layout

| Path | What it is |
|---|---|
| `setup.cmd`, `setup.ps1` | One-time setup wizard |
| `preshow.cmd`, `preshow.ps1` | Pre-show reset, right before going on stage |
| `cloud-meter/` | The meter: `index.html`, `server.js`, `config.json`, AnythingLLM adapter, launcher |
| `demo-kit/documents/` | The six fictional deal documents the demo uses |
| `demo-kit/scripts/` | Node scripts the wizards run (setup, checks, chat reset, pre-warm, timed rehearsal) |
| `demo-kit/ANSWER_KEY.md` | Expected answers. Never upload it to AnythingLLM. |
| `demo-kit/encore/` | Test image for the optional Model Router encore |
| `docs/STAGE_SCRIPT.md` | What to do and say on stage |
| `docs/DEMO_PLAN.md` | Settings, timing targets, test findings and why each choice was made |
| `docs/MODEL_ROUTER.md` | The optional cloud-routing encore |
| `docs/METER_NOTES.md` | How the meter's AnythingLLM integration was built and verified |

## Good to know

- **Never click Stop on a reply.** Aborting a stream makes AnythingLLM restart GenieX.
- **Don't change the embedder.** It deletes every workspace's vectors. The NPU embedder crashed the backend on an X2 Elite in testing; keep "native".
- **GenieX keeps one model loaded.** Switching between the NPU and GGUF workspaces takes about 16 s, which is why the stage script pre-warms Deal Room with Ctrl+Alt+W.
- **"Chat history 0" doesn't turn history off** in AnythingLLM 1.17.0. It behaves like the default of 20 earlier messages.
- **Rehearse timing:** `node rehearse.mjs` in `demo-kit\scripts` times every question (about 15 minutes; `--runs 1` for a quick check).

## Disclaimer

This is an independent demo kit. It is not an official Qualcomm, Snapdragon, AnythingLLM (Mintplex Labs), OpenAI or OpenRouter product. All company, deal and people names in `demo-kit/documents/` are fictional. Cloud prices are published list prices on the date shown in `cloud-meter/config.json` and exclude caching and batch discounts. The local $0.00 excludes hardware and electricity.

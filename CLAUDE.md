# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An **"AI for Attendance" POC** (考勤 AI) showing a closed loop between a **Dashboard** and an
**AI Chatbot**. Actions taken in the chat (approve OT, pin a generated dashboard) reflect on the
dashboard, and dashboard tiles deep-link into the chat with a pre-filled question. The chat can run
against a scripted mock or the real BIPO Agent platform (`bipo-ai-service`) without any UI changes.

## Two app entries

This repo ships the **same POC on two independent app entries**, each a self-contained build that
talks to the same backend contract:

```
TNA-POC/
├── src/  + index.html + vite.config.ts   ← ① Web app    (React + Vite + TypeScript)
├── miniprogram/                          ← ② Mini app   (WeChat 小程序, native WXML/WXSS/JS)
│   ├── app.json        (pages: dashboard, chat; tabBar: AI Board / AI Assistant)
│   └── utils/engine.js (mock | real over wx.request — mirrors the web AIEngine seam)
├── deploy-miniprogram.cjs                ← headless 小程序 upload via miniprogram-ci
└── package.json                          ← Vite scripts (web) + miniprogram-ci dep (mini app)
```

Both entries implement the **same two screens (Dashboard + Chat)** and the **same A2UI-driven
experience** against the **same `bipo-ai-service` agent contract** — they differ only in platform
and rendering tech (React components vs. WXML pages). The web app is the reference implementation;
the mini app is the WeChat-native port. When changing shared behavior (message protocol, A2UI card
types, mock scripts), keep the two in sync.

## Product vision

We are reimagining how **client HR** and **client EE** experience BIPO products. Instead of the
traditional UI (navigating menus, filling forms, reading tables), users interact with the system
through **AI — specifically A2UI**: the AI directly operates the system on their behalf and renders
generative, interactive UI cards (A2UI) inline in the conversation.

```
传统形态                              新形态（本 POC 探索的方向）
─────────                            ──────────────────────────
[用户] → [菜单] → [表单] → [表格]     [用户] → [对话/AI] → [A2UI 卡片]
        手动逐级操作 UI                     AI 直接操作系统并生成 UI
```

This applies to **both web and mini app (小程序)** form factors — the same AI-first, A2UI-driven
experience delivered across platforms. This POC is the first concrete exploration of that direction.

## Commands

**① Web app** (React + Vite):

```bash
npm run dev       # Vite dev server on :5180 (host exposed, all hosts allowed)
npm run build     # tsc -b (typecheck, noEmit) then vite build -> dist/
npm run preview   # serve the built dist/
```

**② Mini app** (WeChat 小程序): open the `miniprogram/` dir in WeChat DevTools, or upload headlessly:

```bash
node deploy-miniprogram.cjs [version] [desc]   # upload via miniprogram-ci (needs ./private.<appid>.key)
```

There is no test runner, linter, or CI configured. For the web app, `tsc -b` (via `npm run build`)
is the only correctness gate — TypeScript is `strict`. The mini app is plain JS with no build step.
Manual verification is done in-browser / in DevTools (see the `verify-*.png` screenshots in the repo
root).

## Architecture

The whole app hinges on ONE seam — the `AIEngine` interface — so the transport (scripted vs. real
agent) can be swapped while the rendering layer stays untouched.

```
┌──────────────────────────────────────────────────────────────┐
│  App.tsx  — switches view on store.view                       │
│  ┌──────────────┐                    ┌──────────────────────┐ │
│  │  Dashboard   │ ◀── shared store ──▶│      Chatbot        │ │
│  │  (KPIs,      │   (approvals,       │  streams AgentMessage│ │
│  │   trends,    │    pinned,          │  from engine.invoke()│ │
│  │   pinned)    │    navigation)      │                      │ │
│  └──────────────┘                    └──────────┬───────────┘ │
└─────────────────────────────────────────────────┼────────────┘
                                                   │ AIEngine.invoke()
                              ┌────────────────────┴───────────────────┐
                              ▼                                         ▼
                     MockEngine (default)                   BipoAgentEngine (real)
                     scripted SCRIPTS[]                      SSE → /api/agents/{id}/invoke
```

### The `AIEngine` seam (`src/ai/types.ts`)

`invoke(input, ctx) -> AsyncIterable<AgentMessage>`. Both engines yield the **same**
`AgentMessage` shape (`content` is a discriminated union: `text` / `tool_call` / `tool_result` /
`error` / `agent_output`). `Chatbot.tsx`'s `AgentRender` renders by `content.type` and never knows
which engine produced the message. This message protocol is mirrored from `bipo-ai-service`'s
`schemas.py` — keep it in sync if the backend contract changes.

Engine selection lives in `src/store.tsx::createEngine()`: `VITE_AGENT_MODE=real` → `BipoAgentEngine`,
otherwise `MockEngine`.

### A2UI — generative UI cards (`src/a2ui/components.tsx`)

`agent_output` messages carry an `output_type` + `data`. A `REGISTRY` maps `output_type` →
React component (`ot_breakdown`, `ot_approval`, `anomaly_alert`, `proactive`, `generated_dashboard`,
`analysis_progress`). Unregistered types fall back to a readable JSON dump. These cards are
**interactive** — they call back into the store (`resolveApproval`, `pinDashboard`, `batchApprove`)
and into the chat (`useChatActions().send` to fire a follow-up query). This registry mirrors
`bipo-ai-service`'s `AgentOutputRegistry`.

**Key trick:** the real platform's agents only emit markdown, with no attendance-specific
`agent_output` types. To get A2UI cards with **zero backend changes**, the `attendance-ai` agent is
prompted to embed ` ```a2ui {json}``` ` blocks in its reply text. `BipoAgentEngine` buffers the
assistant text and `parseA2ui()` splits those blocks out into `agent_output` messages at end-of-turn,
reusing the same `A2UIRenderer`.

### The closed loop (`src/store.tsx`)

A single React context (`AppStoreProvider` / `useStore`) is the glue: `view` navigation,
`pendingQuery` (dashboard → chat handoff, auto-sent via `consumePendingQuery`), `approvals`,
`pinned` dashboards, and `toasts`. This is what makes the two features feel like one product.

### Mock layer (`src/ai/scripts.ts`, `src/data/`)

`SCRIPTS[]` is an ordered list of `{ match(q), build() }` — **first regex match wins**. Each builder
returns the `AgentMessage[]` the `MockEngine` streams with per-kind delays. `src/data/mockData.ts`
holds fake-but-realistic attendance data; `src/data/types.ts` the domain types. In production these
are replaced by a real DataSource.

## Backend connection (real mode)

```
browser ──/api/agents/{id}/invoke (same-origin)──▶ Vite proxy (5180)
                                                      │ injects x-service-key OR Authorization: Bearer
                                                      ▼
                                            bipo-ai-service (BIPO_TARGET)
                                            POST /api/agents/{id}/invoke (JSON-RPC over SSE)
```

The Vite proxy (`vite.config.ts`) forwards `/api` and **injects auth server-side**, so (a) there's
no CORS issue and (b) the secret never reaches the browser bundle. Configure via `.env.local`
(gitignored; copy from `.env.local.example`):

- `BIPO_TARGET` — real service base URL (server-side only)
- `BIPO_SERVICE_KEY` — machine-to-machine key, injected as `x-service-key` (takes precedence)
- `BIPO_TOKEN` — IDP Bearer token, used only if no service key
- `VITE_AGENT_MODE` — `mock` | `real`
- `VITE_BIPO_AGENT_ID` — which agent to invoke (e.g. `attendance-ai`)

Session/multi-turn memory: do **not** send `session_id` on the first turn; the server creates one
and returns it in `result.session_id`, which `BipoAgentEngine` captures and reuses.

See `docs/INTEGRATION.md` for the full protocol and `docs/superpowers/specs/` for the design spec.

## Conventions

- UI copy and comments are in **Chinese**; keep that consistent.
- No CSS framework — all styles in `src/styles.css` with CSS variables (`--indigo`, `--red`, etc.).
- When adding a new agent card type: add the component + register it in `REGISTRY`
  (`a2ui/components.tsx`), and if it's for the demo, emit it from a `SCRIPTS` builder.

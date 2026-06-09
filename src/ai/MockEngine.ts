// Scripted engine for the demo. Matches the user's input to a script and
// streams its messages with small delays to mimic a live agent. Implements the
// same AIEngine interface a real BipoAgentEngine (SSE -> /agents/{id}/invoke)
// would, so the chat UI is transport-agnostic.

import type { AIEngine, AgentMessage, InvokeContext } from "./types";
import { SCRIPTS, FALLBACK } from "./scripts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Per-message-kind pacing so it feels like the agent is thinking/working.
function delayFor(m: AgentMessage): number {
  if (m.content.type === "tool_call") return 550;
  if (m.content.type === "agent_output" && m.content.output_type === "analysis_progress") return 800;
  if (m.content.type === "text") return 650;
  return 450;
}

export class MockEngine implements AIEngine {
  async *invoke(input: string, _ctx: InvokeContext): AsyncIterable<AgentMessage> {
    const q = input.trim();
    const script = SCRIPTS.find((s) => s.match(q));
    const messages = script ? script.build() : FALLBACK();

    for (const m of messages) {
      await sleep(delayFor(m));
      // restamp so timestamps reflect emission order
      yield { ...m, timestamp: new Date().toISOString() };
    }
  }
}

// Stub for the real platform engine. Not used in the demo (MockEngine is the
// default), but documents the seam: same AIEngine interface, transport swapped
// to SSE against bipo-ai-service. Enable by constructing this instead of
// MockEngine in store.tsx once the platform endpoint + auth are available.
//
// Contract (from bipo-ai-service src/api/routes.py:577 + schemas.py):
//   POST /agents/{agentId}/invoke
//   body: { jsonrpc:"2.0", id, method:"invoke",
//           params:{ input, session_id, stream:true } }
//   response: SSE, each `event: message` -> { jsonrpc, id, result: AgentMessage }

import type { AIEngine, AgentMessage, InvokeContext } from "./types";

export class BipoAgentEngine implements AIEngine {
  constructor(
    private baseUrl: string,
    private agentId: string,
    private serviceKey: string,
  ) {}

  async *invoke(input: string, ctx: InvokeContext): AsyncIterable<AgentMessage> {
    const res = await fetch(`${this.baseUrl}/agents/${this.agentId}/invoke`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-service-key": this.serviceKey,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: ctx.sessionId,
        method: "invoke",
        params: { input, session_id: ctx.sessionId, stream: true },
      }),
    });
    if (!res.body) throw new Error("no SSE body");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const frames = buf.split("\n\n");
      buf = frames.pop() ?? "";
      for (const frame of frames) {
        const line = frame.split("\n").find((l) => l.startsWith("data:"));
        if (!line) continue;
        const payload = JSON.parse(line.slice(5).trim());
        if (payload.result) yield payload.result as AgentMessage;
      }
    }
  }
}

// Real engine: connects the chat to bipo-ai-service. Same AIEngine interface as
// MockEngine, so swapping it in (VITE_AGENT_MODE=real) changes nothing in the UI.
//
// Contract (verified against bipo-ai-service src/api/routes.py:577 + schemas.py):
//   POST /api/agents/{agentId}/invoke
//   body: { jsonrpc:"2.0", id, method:"invoke", params:{ input, session_id } }
//   resp: SSE — each frame `data: {jsonrpc,id,result:AgentMessage}` (or {error})
//   auth: Authorization: Bearer <JWT>
//
// In the POC the call is same-origin (baseUrl="") and the Vite dev proxy adds
// the Authorization header, so `token` is normally left empty here.

import type { AIEngine, AgentMessage, InvokeContext } from "./types";

export class BipoAgentEngine implements AIEngine {
  constructor(
    private baseUrl: string,
    private agentId: string,
    private token = "",
  ) {}

  async *invoke(input: string, ctx: InvokeContext): AsyncIterable<AgentMessage> {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;

    const res = await fetch(`${this.baseUrl}/api/agents/${this.agentId}/invoke`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: ctx.sessionId,
        method: "invoke",
        params: { input, session_id: ctx.sessionId },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      yield errorMessage(`请求失败 ${res.status} ${res.statusText} ${body.slice(0, 200)}`);
      return;
    }
    if (!res.body) {
      yield errorMessage("响应没有 SSE 流");
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      // SSE frames are separated by a blank line.
      const frames = buf.split("\n\n");
      buf = frames.pop() ?? "";
      for (const frame of frames) {
        const dataLine = frame
          .split("\n")
          .find((l) => l.startsWith("data:"));
        if (!dataLine) continue;
        const raw = dataLine.slice(5).trim();
        if (!raw || raw === "[DONE]") continue;
        let payload: any;
        try {
          payload = JSON.parse(raw);
        } catch {
          continue; // skip non-JSON keep-alive lines
        }
        if (payload.result) {
          yield payload.result as AgentMessage;
        } else if (payload.error) {
          yield errorMessage(String(payload.error.message ?? "agent error"));
        }
      }
    }
  }
}

function errorMessage(message: string): AgentMessage {
  return {
    content: { type: "error", message },
    phase: { type: "error" },
    timestamp: new Date().toISOString(),
  };
}

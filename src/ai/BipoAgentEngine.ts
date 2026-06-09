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
//
// A2UI WITHOUT backend registration: the platform's agents render markdown and
// have no attendance-specific agent_output types. So instead of relying on the
// server, the agent is prompted to embed ```a2ui {json}``` blocks in its reply
// text; we parse those out client-side and turn them into agent_output messages
// that the existing A2UIRenderer draws as real cards. tool_call/tool_result
// stream live; text is buffered and parsed at the end of the turn.

import type { AIEngine, AgentMessage, InvokeContext, MessageContent } from "./types";

export class BipoAgentEngine implements AIEngine {
  // Server-issued session id. Null until the first turn — omit session_id to
  // start a new conversation, then reuse the id the server returns for memory.
  private sessionId: string | null = null;

  constructor(
    private baseUrl: string,
    private agentId: string,
    private token = "",
  ) {}

  async *invoke(input: string, ctx: InvokeContext): AsyncIterable<AgentMessage> {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;

    const params: Record<string, unknown> = { input };
    if (this.sessionId) params.session_id = this.sessionId;

    const res = await fetch(`${this.baseUrl}/api/agents/${this.agentId}/invoke`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: ctx.sessionId,
        method: "invoke",
        params,
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
    let textBuffer = ""; // accumulated assistant text for end-of-turn a2ui parsing

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      // SSE frames are separated by a blank line.
      const frames = buf.split("\n\n");
      buf = frames.pop() ?? "";
      for (const frame of frames) {
        const dataLine = frame.split("\n").find((l) => l.startsWith("data:"));
        if (!dataLine) continue;
        const raw = dataLine.slice(5).trim();
        if (!raw || raw === "[DONE]") continue;
        let payload: any;
        try {
          payload = JSON.parse(raw);
        } catch {
          continue; // skip non-JSON keep-alive lines
        }
        if (payload.error) {
          yield errorMessage(String(payload.error.message ?? "agent error"));
          continue;
        }
        const m = payload.result as (AgentMessage & { session_id?: string }) | undefined;
        if (!m) continue;
        // capture the server-issued session id for multi-turn memory
        if (m.session_id) this.sessionId = m.session_id;

        if (m.content.type === "text") {
          // buffer text; parse + emit (with a2ui cards) once the turn ends
          textBuffer += m.content.text;
        } else {
          // tool_call / tool_result / agent_output / error stream live
          yield m;
        }
      }
    }

    for (const msg of parseA2ui(textBuffer)) yield msg;
  }
}

// Split assistant text into ordered text segments and a2ui agent_output cards.
// Block form:  ```a2ui\n{"output_type":"ot_breakdown","data":{...}}\n```
function parseA2ui(text: string): AgentMessage[] {
  const out: AgentMessage[] = [];
  const re = /```a2ui\s*([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const before = text.slice(last, m.index).trim();
    if (before) out.push(textMessage(before));
    try {
      const spec = JSON.parse(m[1].trim());
      if (spec && spec.output_type) {
        out.push(outputMessage(String(spec.output_type), spec.data ?? {}));
      } else {
        out.push(textMessage(m[1].trim()));
      }
    } catch {
      out.push(textMessage(m[1].trim())); // malformed block -> show raw
    }
    last = re.lastIndex;
  }
  const tail = text.slice(last).trim();
  if (tail) out.push(textMessage(tail));
  return out;
}

function stamp(content: MessageContent, phase: string): AgentMessage {
  return { content, phase: { type: phase }, timestamp: new Date().toISOString() };
}
const textMessage = (text: string) => stamp({ type: "text", text }, "final_response");
const outputMessage = (output_type: string, data: Record<string, unknown>) =>
  stamp({ type: "agent_output", output_type, data }, "agent_output");
const errorMessage = (message: string) => stamp({ type: "error", message }, "error");

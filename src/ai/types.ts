// Message protocol mirrored from bipo-ai-service (src/api/schemas.py:278-304).
// MockEngine and a future BipoAgentEngine both yield this same shape, so the
// chat UI's rendering layer never changes when we swap the transport.

export type MessageContent =
  | { type: "text"; text: string }
  | { type: "tool_call"; tool: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool: string; result: unknown }
  | { type: "error"; message: string }
  | {
      type: "agent_output";
      output_type: string;            // e.g. "ot_breakdown", "ot_approval"
      data: Record<string, unknown>;  // component payload
      response_id?: string;
    };

export interface MessagePhase {
  type: string;   // "thinking" | "tool_call" | "tool_result" | "final_response" | ...
  id?: string;
}

export interface AgentMessage {
  content: MessageContent;
  phase: MessagePhase;
  timestamp: string;
}

export interface InvokeContext {
  sessionId: string;
}

// The single seam the chatbot depends on. Mirrors
// POST /agents/{agent_id}/invoke returning a stream of AgentMessage.
export interface AIEngine {
  invoke(input: string, ctx: InvokeContext): AsyncIterable<AgentMessage>;
}

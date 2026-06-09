import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { ChatActionsContext } from "./chatContext";
import { A2UIRenderer } from "../a2ui/components";
import { SCOPE } from "../data/mockData";
import type { AgentMessage } from "../ai/types";

type Entry =
  | { kind: "user"; id: number; text: string }
  | { kind: "agent"; id: number; m: AgentMessage };

const SUGGESTIONS = ["研发部谁 OT 最多?", "帮我审批待处理的 OT", "给我看异常打卡", "本月 OT 成本超预算了吗?", "做个研发部 OT 看板"];

function mdBold(s: string) {
  return s.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
}

export function Chatbot() {
  const { engine, pendingQuery, consumePendingQuery } = useStore();
  const [entries, setEntries] = useState<Entry[]>([
    {
      kind: "agent", id: 0,
      m: { content: { type: "text", text: "你好,我是 **Attendance AI**。问我考勤、加班、异常或合规的任何问题,我也能帮你生成看板。" }, phase: { type: "final_response" }, timestamp: "" },
    },
  ]);
  const [streaming, setStreaming] = useState(false);
  const [input, setInput] = useState("");
  const seq = useRef(1);
  const sessionId = useRef("sess-" + Date.now());
  const streamRef = useRef<HTMLDivElement>(null);

  const scrollDown = () => {
    requestAnimationFrame(() => {
      streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: "smooth" });
    });
  };

  const send = async (query: string) => {
    const q = query.trim();
    if (!q || streaming) return;
    setEntries((e) => [...e, { kind: "user", id: seq.current++, text: q }]);
    setStreaming(true);
    scrollDown();
    try {
      for await (const m of engine.invoke(q, { sessionId: sessionId.current })) {
        setEntries((e) => [...e, { kind: "agent", id: seq.current++, m }]);
        scrollDown();
      }
    } finally {
      setStreaming(false);
      scrollDown();
    }
  };

  // auto-send a query handed over from the dashboard
  useEffect(() => {
    if (pendingQuery) {
      const q = pendingQuery;
      consumePendingQuery();
      void send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingQuery]);

  const onSubmit = () => { void send(input); setInput(""); };

  return (
    <ChatActionsContext.Provider value={{ send: (q) => void send(q) }}>
      <div className="main">
        <div className="chat-head">
          <div className="ava">✨</div>
          <div>
            <b>Attendance AI</b>
            <div className="s">● 在线 · 由 Agent 驱动</div>
          </div>
          <div className="ctx">上下文:{SCOPE.month} · {SCOPE.org}</div>
        </div>

        <div className="stream" ref={streamRef}>
          <div className="wrap">
            {entries.map((e) =>
              e.kind === "user" ? (
                <div className="row me" key={e.id}>
                  <div className="av u">🙂</div>
                  <div className="bubble"><span dangerouslySetInnerHTML={{ __html: mdBold(e.text) }} /></div>
                </div>
              ) : (
                <div className="row ai" key={e.id}>
                  <div className="av ai">✨</div>
                  <div className="bubble full"><AgentRender m={e.m} /></div>
                </div>
              ),
            )}
            {streaming && (
              <div className="row ai">
                <div className="av ai">✨</div>
                <div className="typing"><i /><i /><i /></div>
              </div>
            )}
          </div>
        </div>

        <div className="composer">
          <div className="box">
            <span style={{ fontSize: 18, color: "var(--mute)" }}>＋</span>
            <input
              value={input}
              placeholder="问问考勤的任何问题,或让我帮你生成看板…"
              onChange={(ev) => setInput(ev.target.value)}
              onKeyDown={(ev) => { if (ev.key === "Enter") onSubmit(); }}
            />
            <button className="send" disabled={streaming || !input.trim()} onClick={onSubmit}>↑</button>
          </div>
          <div className="sug">
            {SUGGESTIONS.map((q) => (
              <span className="q" key={q} onClick={() => void send(q)}>{q}</span>
            ))}
          </div>
        </div>
      </div>
    </ChatActionsContext.Provider>
  );
}

function AgentRender({ m }: { m: AgentMessage }) {
  const c = m.content;
  if (c.type === "text") return <div className="txt" dangerouslySetInnerHTML={{ __html: mdBold(c.text) }} />;
  if (c.type === "tool_call") return <ToolCall tool={c.tool} input={c.input} />;
  if (c.type === "tool_result") return <div className="toolcall"><span className="sp" /> 工具结果 · {c.tool}</div>;
  if (c.type === "error") return <div className="txt" style={{ color: "var(--red)" }}>⚠️ {c.message}</div>;
  if (c.type === "agent_output") return <A2UIRenderer outputType={c.output_type} data={c.data} />;
  return null;
}

function ToolCall({ tool, input }: { tool: string; input: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  const args = Object.entries(input).map(([k, v]) => `${k}=${v}`).join(", ");
  return (
    <div className="toolcall" onClick={() => setOpen(!open)}>
      <span className="sp" /> 调用 {tool}({args}) {open ? "▴" : "▾"}
      {open && <pre>{JSON.stringify(input, null, 2)}</pre>}
    </div>
  );
}

// A2UI components: each renders one `agent_output` message. The registry maps
// output_type -> component, mirroring bipo-ai-service's AgentOutputRegistry.
// Components are interactive and talk back through the store / chat actions.

import { useEffect, useState } from "react";
import { useStore } from "../store";
import { useChatActions } from "../chatbot/chatContext";
import { pendingOt } from "../data/mockData";
import type { OtPerson, PendingOt } from "../data/types";

type Data = Record<string, unknown>;

/* ---------- analysis_progress ---------- */
function AnalysisProgress({ data }: { data: Data }) {
  const label = String(data.label ?? "正在分析");
  const scanned = Number(data.scanned ?? 0);
  const total = Number(data.total ?? 0);
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(100), 60);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="progress">
      🔎 {label}
      <div className="bar"><i style={{ width: `${w}%` }} /></div>
      <div className="step">已扫描 {scanned} 项 / 共 {total} · 完成</div>
    </div>
  );
}

/* ---------- ot_breakdown ---------- */
function OtBreakdown({ data }: { data: Data }) {
  const title = String(data.title ?? "OT 明细");
  const people = (data.people ?? []) as OtPerson[];
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="a2ui">
      <div className="h">📊 {title}<span className="badge">A2UI · ot_breakdown</span></div>
      <div className="bd">
        {people.map((p) => (
          <div key={p.name}>
            <div
              className={`hbar ${open === p.name ? "open" : ""}`}
              onClick={() => setOpen(open === p.name ? null : p.name)}
            >
              <span className="nm">{p.name}</span>
              <span className="tk"><i style={{ width: `${p.pctOfMax}%` }} /></span>
              <span className="vv">{p.hours}h</span>
            </div>
            {open === p.name && (
              <div className="drill-detail">
                <table>
                  <tbody>
                    {p.daily.map((d) => (
                      <tr key={d.date}><td>{d.date}</td><td>{d.hours}h</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
        <div className="drill-hint">↳ 点任意一行下钻到逐日打卡明细</div>
      </div>
    </div>
  );
}

/* ---------- ot_approval ---------- */
function OtApproval({ data }: { data: Data }) {
  const p = data.pending as PendingOt;
  const { approvals, resolveApproval } = useStore();
  const status = approvals[p.id];
  return (
    <div className="a2ui">
      <div className="h">📝 OT 审批 · {p.name}<span className="badge">A2UI · ot_approval</span></div>
      <div className="bd">
        <div className="appr">
          <div className="line"><span>部门</span><span>{p.dept}</span></div>
          <div className="line"><span>日期</span><span>{p.date}</span></div>
          <div className="line"><span>时长</span><span><b>{p.hours} 小时</b></span></div>
          <div className="line"><span>事由</span><span>{p.reason}</span></div>
          {p.complianceFlag && <div className="flag">⚠️ AI 提醒:{p.complianceFlag}</div>}
          {!status ? (
            <div className="btns">
              <button className="bb ok" onClick={() => resolveApproval(p.id, "approved")}>✓ 批准</button>
              <button className="bb no" onClick={() => resolveApproval(p.id, "rejected")}>驳回</button>
            </div>
          ) : (
            <div className={`appr-done ${status === "approved" ? "ok" : "no"}`}>
              {status === "approved" ? "✓ 已批准" : "已驳回"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- anomaly_alert ---------- */
function AnomalyAlert({ data }: { data: Data }) {
  const items = (data.items ?? []) as { id: string; title: string; why: string; severity: "high" | "mid" }[];
  const { send } = useChatActions();
  return (
    <div className="a2ui">
      <div className="h">⚠️ AI 异常检测<span className="badge">A2UI · anomaly_alert</span></div>
      <div className="bd">
        {items.map((a) => (
          <div
            key={a.id}
            className={`alert ${a.severity === "high" ? "red" : "amber"}`}
            onClick={() => send(`深入分析:${a.title}`)}
          >
            <div className="dot" />
            <div className="c">
              <b>{a.title}</b>
              <span className="why">{a.why}</span>
            </div>
            <span className={`sev ${a.severity}`}>{a.severity === "high" ? "高" : "中"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- proactive (suggestion + actions) ---------- */
function Proactive({ data }: { data: Data }) {
  const text = String(data.text ?? "");
  const chips = (data.chips ?? []) as { label: string; solid?: boolean; action: string }[];
  const { batchApprove } = useStore();
  const { send } = useChatActions();
  const [done, setDone] = useState(false);

  const handle = (action: string) => {
    if (action === "batch_approve") {
      batchApprove(pendingOt.filter((p) => p.id !== "ot-zs").map((p) => p.id));
      setDone(true);
    } else if (action.startsWith("ask:")) {
      send(action.slice(4));
      setDone(true);
    } else if (action === "dismiss") {
      setDone(true);
    }
  };

  return (
    <div className="proact">
      💡 <span dangerouslySetInnerHTML={{ __html: mdBold(text) }} />
      <div className="chips">
        {chips.map((c) => (
          <button
            key={c.label}
            className={`chip ${c.solid ? "solid" : ""}`}
            disabled={done}
            onClick={() => handle(c.action)}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- generated_dashboard ---------- */
function GeneratedDashboard({ data }: { data: Data }) {
  const title = String(data.title ?? "生成看板");
  const tiles = (data.tiles ?? []) as { label: string; value: string; danger?: boolean }[];
  const series = (data.series ?? []) as number[];
  const { pinDashboard } = useStore();
  const [pinned, setPinned] = useState(false);
  const max = Math.max(...series, 1);
  return (
    <div className="a2ui gend">
      <div className="h">🧩 {title}(AI 生成)<span className="badge">A2UI · generated_dashboard</span></div>
      <div className="bd">
        <div className="tiles">
          {tiles.map((t) => (
            <div className="gtile" key={t.label}>
              <div className="l">{t.label}</div>
              <div className="v" style={t.danger ? { color: "var(--red)" } : undefined}>{t.value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 70 }}>
          {series.map((v, i) => (
            <div key={i} style={{
              flex: 1, height: `${(v / max) * 100}%`,
              background: "linear-gradient(#a5b4fc, var(--indigo))", borderRadius: "4px 4px 0 0",
            }} />
          ))}
        </div>
        <button
          className="open"
          disabled={pinned}
          onClick={() => { pinDashboard({ title, tiles, series }); setPinned(true); }}
        >
          {pinned ? "✓ 已钉到首页" : "📌 钉到首页 Dashboard"}
        </button>
      </div>
    </div>
  );
}

// minimal **bold** -> <b> for proactive text
function mdBold(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
}

const REGISTRY: Record<string, (p: { data: Data }) => JSX.Element> = {
  analysis_progress: AnalysisProgress,
  ot_breakdown: OtBreakdown,
  ot_approval: OtApproval,
  anomaly_alert: AnomalyAlert,
  proactive: Proactive,
  generated_dashboard: GeneratedDashboard,
};

export function A2UIRenderer({ outputType, data }: { outputType: string; data: Data }) {
  const Comp = REGISTRY[outputType];
  if (!Comp) return <div className="a2ui"><div className="bd">未知组件:{outputType}</div></div>;
  return <Comp data={data} />;
}

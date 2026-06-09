import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useStore } from "../store";
import {
  SCOPE, aiSummary, kpis, trend, deptOt, anomalies, compliance,
} from "../data/mockData";

export function Dashboard() {
  const { openChat, pinned, unpin } = useStore();

  return (
    <div className="main">
      <div className="topbar">
        <span className="crumb">Attendance /</span>
        <h1>AI Dashboard</h1>
        <div className="spacer" />
        <div className="pill">📆 {SCOPE.month} {SCOPE.org} ⌄</div>
        <div className="pill">🔄 实时</div>
      </div>

      <div className="body">
        {/* ① AI 智能摘要 */}
        <div className="ai-summary">
          <div className="spark">✨</div>
          <div className="txt">
            <span className="tag">AI 智能摘要 · Opus 生成</span><br />
            本月出勤率 <b>{aiSummary.attendance}</b>(环比 <span className="up">↑{aiSummary.attendanceDelta}</span>),整体健康。
            {aiSummary.otDept} OT 工时 <b>同比 {aiSummary.otDelta}</b>,已逼近预算上限。检测到{" "}
            <span className="risk">{aiSummary.anomalies} 处异常</span> 与{" "}
            <span className="risk">{aiSummary.risks} 项合规风险</span>,建议优先处理代打卡疑点与王五的连续工时超限。
            <div className="actions">
              <button className="btn primary" onClick={() => openChat("汇总本月所有异常和合规风险,并给出处理建议")}>查看全部风险</button>
              <button className="btn ghost" onClick={() => openChat("分析研发部 OT 为什么飙升,谁加班最多?")}>让 AI 深入分析 →</button>
            </div>
          </div>
        </div>

        {/* pinned dashboards (generated in chat) */}
        {pinned.length > 0 && (
          <div className="pinned-wrap">
            <div className="pinned-head">📌 从 AI 助手钉来的看板</div>
            <div className="pinned-grid">
              {pinned.map((d, i) => (
                <div className="pinned-card" key={d.title + i}>
                  <button className="unpin" onClick={() => unpin(i)}>✕</button>
                  <h4>{d.title}</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 10 }}>
                    {d.tiles.map((t) => (
                      <div className="gtile" key={t.label}>
                        <div className="l">{t.label}</div>
                        <div className="v" style={t.danger ? { color: "var(--red)" } : undefined}>{t.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 54 }}>
                    {d.series.map((v, j) => (
                      <div key={j} style={{
                        flex: 1, height: `${(v / Math.max(...d.series, 1)) * 100}%`,
                        background: "linear-gradient(#a5b4fc, var(--indigo))", borderRadius: "3px 3px 0 0",
                      }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KPI */}
        <div className="kpis">
          {kpis.map((k) => (
            <div className="kpi" key={k.label}>
              <div className="l">{k.label}</div>
              <div className="v">{k.value}</div>
              <div className={`d ${k.dir}`}>{k.delta}</div>
            </div>
          ))}
        </div>

        {/* charts + AI panels */}
        <div className="grid">
          <div className="col">
            <div className="card">
              <h3><span className="ic chart">📈</span> 出勤 / 准时趋势</h3>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={trend} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis domain={[85, 100]} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="attendance" name="出勤率" stroke="#4f46e5" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="punctuality" name="准时率" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <h3><span className="ic chart">📊</span> OT 工时 · 部门对比</h3>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={deptOt} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="dept" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: "#f8fafc" }} />
                  <Bar dataKey="hours" name="OT 工时" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="col">
            {/* ② AI 异常检测 */}
            <div className="card">
              <h3><span className="ic warn">⚠️</span> AI 异常检测 <span className="count">{anomalies.length} 项</span></h3>
              {anomalies.map((a) => (
                <div key={a.id} className={`alert ${a.severity === "high" ? "red" : "amber"}`} onClick={() => openChat(`深入分析:${a.title}`)}>
                  <div className="dot" />
                  <div className="c">
                    <b>{a.title}</b>
                    <span className="why">{highlightAi(a.why)}</span>
                    <div className="ask">点击让 AI 深入分析 →</div>
                  </div>
                  <span className={`sev ${a.severity}`}>{a.severity === "high" ? "高" : "中"}</span>
                </div>
              ))}
            </div>

            {/* ③ 合规风控 */}
            <div className="card">
              <h3><span className="ic law">⚖️</span> 合规风控 <span className="count">{compliance.length} 项</span></h3>
              {compliance.map((c) => (
                <div key={c.id} className={`alert ${c.severity === "high" ? "red" : "amber"}`} onClick={() => openChat(`深入分析:${c.title}`)}>
                  <div className="dot" />
                  <div className="c">
                    <b>{c.title}</b>
                    <span className="why">{highlightAi(c.why)}</span>
                    <div className="ask">点击让 AI 深入分析 →</div>
                  </div>
                  <span className={`sev ${c.severity}`}>{c.severity === "high" ? "高" : "中"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// split "...。AI:..." so the AI attribution renders in violet
function highlightAi(why: string) {
  const idx = why.indexOf("AI:");
  if (idx === -1) return why;
  return (<>{why.slice(0, idx)}<em>{why.slice(idx)}</em></>);
}

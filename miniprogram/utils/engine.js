// Chat engine. CFG.useMock=true -> scripted demo; false -> real agent platform
// (bipo-ai-service) over wx.request. Both feed the same message stream, so the
// chat UI is identical either way.

const D = require("./mockData");
const CFG = require("./config");

/* ───────────────────────── Mock (scripted) ───────────────────────── */
function scriptFor(q) {
  if (/看板|生成|面板/.test(q)) {
    return [
      { ctype: "text", text: "已为你生成「研发部 OT 看板」,满意可一键钉到首页:" },
      Object.assign({ ctype: "generated_dashboard" }, D.generatedDashboard),
    ];
  }
  if (/审批|批准|处理.*OT|处理一下|待审批/i.test(q)) {
    return [
      { ctype: "text", text: "张三有 1 笔待审批 OT,已带出合规检查,可直接处理:" },
      { ctype: "ot_approval", pending: D.pendingOt[0] },
      { ctype: "proactive", text: "还检测到 3 笔待审批 OT(销售部 2、运营部 1),要一起处理吗?", chips: [
        { label: "批量处理 3 笔 →", solid: true, action: "batch_approve" },
        { label: "稍后", action: "dismiss" },
      ] },
    ];
  }
  if (/异常|代打卡|打卡/.test(q)) {
    return [
      { ctype: "toolcall", label: "attendance.detect_anomaly(month=2026-06)" },
      { ctype: "progress", label: "正在扫描打卡与位置数据", scanned: 312, total: 312 },
      { ctype: "text", text: "本月共检测到 3 项异常,其中 2 项高严重度,已按 AI 归因排序:" },
      { ctype: "anomaly_alert", items: D.anomalies },
    ];
  }
  if (/OT|加班|工时|谁.*多/i.test(q)) {
    return [
      { ctype: "toolcall", label: "attendance.query_ot(dept=研发, month=2026-05)" },
      { ctype: "progress", label: "正在分析 OT 明细", scanned: 142, total: 142 },
      { ctype: "text", text: "研发部上月 OT 共 486 小时,集中在少数人。张三(96h)远高于团队中位数:" },
      { ctype: "ot_breakdown", title: "研发部 OT Top 5", people: D.rdOtTop },
    ];
  }
  return [{ ctype: "text", text: "我可以帮你分析考勤数据。试试:「研发部谁 OT 最多」「给我看异常打卡」,或「做个研发部 OT 看板」。" }];
}

function invokeMock(query, handlers) {
  const msgs = scriptFor((query || "").trim());
  let i = 0;
  function step() {
    if (i >= msgs.length) return handlers.onDone && handlers.onDone();
    const m = msgs[i++];
    const d = m.ctype === "progress" ? 750 : m.ctype === "text" ? 600 : 450;
    setTimeout(() => { handlers.onMessage(Object.assign({ role: "ai" }, m)); step(); }, d);
  }
  step();
}

/* ───────────────────── Real agent (bipo-ai-service) ───────────────── */
let sessionId = null;

// Pull ```a2ui {json}``` blocks out of the agent's text -> card messages,
// keeping the surrounding prose as text messages (same protocol as the web app).
function parseA2ui(text) {
  const out = [];
  const re = /```a2ui([\s\S]*?)```/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    const before = text.slice(last, m.index).trim();
    if (before) out.push({ role: "ai", ctype: "text", text: before });
    try {
      const spec = JSON.parse(m[1].trim());
      if (spec && spec.output_type) {
        out.push(Object.assign({ role: "ai", ctype: spec.output_type }, spec.data || {}));
      } else {
        out.push({ role: "ai", ctype: "text", text: m[1].trim() });
      }
    } catch (e) {
      out.push({ role: "ai", ctype: "text", text: m[1].trim() });
    }
    last = re.lastIndex;
  }
  const tail = text.slice(last).trim();
  if (tail) out.push({ role: "ai", ctype: "text", text: tail });
  return out;
}

function invokeReal(query, handlers) {
  const params = { input: query };
  if (sessionId) params.session_id = sessionId;

  wx.request({
    url: CFG.baseUrl + "/api/agents/" + CFG.agentId + "/invoke",
    method: "POST",
    timeout: 60000,
    dataType: "text", // response is text/event-stream; keep raw string
    header: { "content-type": "application/json", "x-service-key": CFG.serviceKey },
    data: { jsonrpc: "2.0", id: "mp-" + Date.now(), method: "invoke", params },
    success(res) {
      const raw = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
      let text = "";
      raw.split("\n").forEach((line) => {
        line = line.trim();
        if (!line.indexOf || line.indexOf("data:") !== 0) return;
        let payload;
        try { payload = JSON.parse(line.slice(5).trim()); } catch (e) { return; }
        if (payload.error) {
          handlers.onMessage({ role: "ai", ctype: "text", text: "⚠️ " + (payload.error.message || "agent error") });
          return;
        }
        const r = payload.result;
        if (!r) return;
        if (r.session_id) sessionId = r.session_id;
        const c = r.content || {};
        if (c.type === "text") text += c.text;
        else if (c.type === "tool_call") handlers.onMessage({ role: "ai", ctype: "toolcall", label: c.tool });
        else if (c.type === "agent_output") handlers.onMessage(Object.assign({ role: "ai", ctype: c.output_type }, c.data || {}));
      });
      parseA2ui(text).forEach((msg) => handlers.onMessage(msg));
      handlers.onDone && handlers.onDone();
    },
    fail(err) {
      handlers.onMessage({ role: "ai", ctype: "text", text: "请求失败:" + (err.errMsg || "网络错误") });
      handlers.onDone && handlers.onDone();
    },
  });
}

function invoke(query, handlers) {
  const q = (query || "").trim();
  if (!q) return handlers.onDone && handlers.onDone();
  if (CFG.useMock) invokeMock(q, handlers);
  else invokeReal(q, handlers);
}

module.exports = { invoke };

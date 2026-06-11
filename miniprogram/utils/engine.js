// Chat engine. CFG.useMock=true -> scripted demo (bilingual); false -> real
// agent platform (bipo-ai-service) over wx.request. Both feed the same message
// stream, so the chat UI is identical either way.

const { getData } = require("./mockData");
const { getLocale } = require("./i18n");
const CFG = require("./config");
const hrms = require("./hrms");

const INTROS = {
  en: {
    gen: "Generated the “R&D OT Dashboard”. Pin it to home if it looks good:",
    approval: "Yes — Zhang San has 1 pending OT. I ran a compliance check, you can handle it here:",
    proactiveText: "Heads up: 3 more OT approvals pending (2 Sales, 1 Ops), 1 with a compliance risk. Handle them together?",
    chipBatch: "Batch-approve 3 →",
    chipLater: "Later",
    anomalyTool: "attendance.detect_anomaly(month=2026-06)",
    anomalyProg: "Scanning clock-in & location data",
    anomalyText: "Detected 3 anomalies this month, 2 high-severity, ranked by AI attribution:",
    otTool: "attendance.query_ot(dept=R&D, month=2026-05)",
    otProg: "Analyzing OT records",
    otText: "R&D logged 486 OT hours last month, concentrated in a few people. Zhang San (96h) is far above the team median:",
    reportTool: "generate_attendance_report(month=2026-06)",
    reportProg: "Aggregating attendance records",
    reportTextEE: "Here is your attendance for June — 2 late arrivals and 1 leave day so far:",
    reportTextMgr: "Team attendance report for June. Rate dipped on 06-04 and 06-09; Li Si leads late arrivals — details below:",
    punchIntro: "Sure — please confirm your punch details:",
    punchTool: "mcp__attendance_mcp__clock_punch",
    punchDone: "✅ Punch recorded. Let me know if anything needs correcting.",
    payslipTool: "mcp__hcm_mcp__get_payslip(month=2026-05)",
    payslipText: "Here is your May payslip — net pay ¥24,030 (+3.2% MoM). Composition and breakdown below; ask me anything about any line:",
    fallback: "I can analyze attendance data. Try: “Who worked the most OT in R&D?”, “Show me clock-in anomalies”, or “Build an R&D OT dashboard”.",
  },
  zh: {
    gen: "已为你生成「研发部 OT 看板」,满意可一键钉到首页:",
    approval: "张三有 1 笔待审批 OT,已带出合规检查,可直接处理:",
    proactiveText: "还检测到 3 笔待审批 OT(销售部 2、运营部 1),其中 1 笔有合规风险,要一起处理吗?",
    chipBatch: "批量处理 3 笔 →",
    chipLater: "稍后",
    anomalyTool: "attendance.detect_anomaly(month=2026-06)",
    anomalyProg: "正在扫描打卡与位置数据",
    anomalyText: "本月共检测到 3 项异常,其中 2 项高严重度,已按 AI 归因排序:",
    otTool: "attendance.query_ot(dept=研发, month=2026-05)",
    otProg: "正在分析 OT 明细",
    otText: "研发部上月 OT 共 486 小时,集中在少数人。张三(96h)远高于团队中位数:",
    reportTool: "generate_attendance_report(month=2026-06)",
    reportProg: "正在汇总考勤记录",
    reportTextEE: "这是你 6 月的考勤情况,目前 2 次迟到、1 天请假:",
    reportTextMgr: "团队 6 月考勤报表已生成。06-04 和 06-09 出勤率有下探,李四迟到最多,明细如下:",
    punchIntro: "好的,请确认你的打卡信息:",
    punchTool: "mcp__attendance_mcp__clock_punch",
    punchDone: "✅ 打卡成功,系统已记录。如需修正随时找我。",
    payslipTool: "mcp__hcm_mcp__get_payslip(month=2026-05)",
    payslipText: "已取到你 5 月的 Payslip:实发 ¥24,030,环比 +3.2%。构成与明细如下,任何一项想细看都可以问我:",
    fallback: "我可以帮你分析考勤数据。试试:「研发部谁 OT 最多」「给我看异常打卡」,或「做个研发部 OT 看板」。",
  },
};

function scriptFor(q, locale) {
  const D = getData(locale);
  const I = INTROS[locale] || INTROS.en;
  // clock_punch 第二步:用户点了「确认打卡」(可能带坐标)→ 这时才调工具
  if (/^(确认打卡|confirm punch)/i.test(q)) {
    return [
      { ctype: "toolcall", label: I.punchTool },
      { ctype: "text", text: I.punchDone },
    ];
  }
  // clock_punch 第一步:打卡意图 → 只出确认卡,不调工具(HITL)。
  // 排除"看异常打卡/打卡记录"等查询类话术,避免劫持其它剧本。
  if (/打.{0,4}卡|punch|clock\s?(in|out)/i.test(q) &&
      !/异常|代打|查|看|记录|明细|日报|报表|统计|anomal|buddy|report|history/i.test(q)) {
    const punchType = /下班|off|out/i.test(q) ? "out" : "in";
    return [
      { ctype: "text", text: I.punchIntro },
      // time/date/locText 由 chat.js 用设备事实覆盖;操作人即本人,不展示
      { ctype: "clock_punch", punchType, status: "pending" },
    ];
  }
  // payslip 分析(HCM 场景):复用 attendance_report 报表卡 + chart-view 注册表
  if (/payslip|薪资|工资|薪酬|salary/i.test(q)) {
    return [
      { ctype: "toolcall", label: I.payslipTool },
      { ctype: "text", text: I.payslipText },
      { ctype: "attendance_report", title: D.payslip.title, views: D.payslip.views },
    ];
  }
  // attendance_report:同一数据 API,按角色(业务上下文)出不同 views 组合
  if (/日报|考勤报表|考勤记录|我的考勤|daily list|attendance report|daily report|my attendance/i.test(q)) {
    const app = getApp();
    const role = (app && app.globalData && app.globalData.role) === "manager" ? "manager" : "ee";
    const R = D.report[role];
    return [
      { ctype: "toolcall", label: I.reportTool },
      { ctype: "progress", label: I.reportProg, scanned: role === "manager" ? 320 : 22, total: role === "manager" ? 320 : 22 },
      { ctype: "text", text: role === "manager" ? I.reportTextMgr : I.reportTextEE },
      { ctype: "attendance_report", title: R.title, views: R.views },
    ];
  }
  if (/看板|生成|面板|dashboard|board|generate/i.test(q)) {
    return [
      { ctype: "text", text: I.gen },
      Object.assign({ ctype: "generated_dashboard" }, D.generatedDashboard),
    ];
  }
  if (/审批|批准|待审批|处理.*ot|approve|approval|pending/i.test(q)) {
    return [
      { ctype: "text", text: I.approval },
      { ctype: "ot_approval", pending: D.pendingOt[0] },
      { ctype: "proactive", text: I.proactiveText, chips: [
        { label: I.chipBatch, solid: true, action: "batch_approve" },
        { label: I.chipLater, action: "dismiss" },
      ] },
    ];
  }
  if (/异常|代打卡|打卡|anomal|clock|buddy/i.test(q)) {
    return [
      { ctype: "toolcall", label: I.anomalyTool },
      { ctype: "progress", label: I.anomalyProg, scanned: 312, total: 312 },
      { ctype: "text", text: I.anomalyText },
      { ctype: "anomaly_alert", items: D.anomalies },
    ];
  }
  if (/ot|加班|工时|谁.*多|overtime|who.*most/i.test(q)) {
    return [
      { ctype: "toolcall", label: I.otTool },
      { ctype: "progress", label: I.otProg, scanned: 142, total: 142 },
      { ctype: "text", text: I.otText },
      { ctype: "ot_breakdown", title: D.title.otBreakdown, people: D.rdOtTop },
    ];
  }
  return [{ ctype: "text", text: I.fallback }];
}

function invokeMock(query, handlers) {
  const locale = getLocale();
  const msgs = scriptFor((query || "").trim(), locale);
  let i = 0;
  function step() {
    if (i >= msgs.length) return handlers.onDone && handlers.onDone();
    const m = msgs[i++];
    const d = m.ctype === "progress" ? 750 : m.ctype === "text" ? 600 : 450;
    setTimeout(() => { handlers.onMessage(Object.assign({ role: "ai" }, m)); step(); }, d);
  }
  step();
}

/* ---------------- Real agent (bipo-ai-service) ---------------- */
let sessionId = null;

function parseA2ui(text) {
  const out = [];
  const re = /```a2ui([\s\S]*?)```/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    const before = text.slice(last, m.index).trim();
    if (before) out.push({ role: "ai", ctype: "text", text: before });
    try {
      const spec = JSON.parse(m[1].trim());
      if (spec && spec.output_type) out.push(Object.assign({ role: "ai", ctype: spec.output_type }, spec.data || {}));
      else out.push({ role: "ai", ctype: "text", text: m[1].trim() });
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
  // x-service-key 认证到 agent 平台;X-HRMS-* 由平台透传给 HRMS MCP 工具。
  const header = { "content-type": "application/json", "x-service-key": CFG.serviceKey };
  const jwt = hrms.getToken();
  if (jwt) {
    header["X-HRMS-Authorization"] = "Bearer " + jwt;
    if (CFG.hrms && CFG.hrms.tenant) header["X-HRMS-Tenant"] = CFG.hrms.tenant;
    if (CFG.hrms && CFG.hrms.baseUrl) header["X-HRMS-Base-URL"] = CFG.hrms.baseUrl;
  }
  wx.request({
    url: CFG.baseUrl + "/api/agents/" + CFG.agentId + "/invoke",
    method: "POST",
    timeout: 60000,
    dataType: "text",
    header: header,
    data: { jsonrpc: "2.0", id: "mp-" + Date.now(), method: "invoke", params },
    success(res) {
      const raw = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
      let text = "";
      raw.split("\n").forEach((line) => {
        line = line.trim();
        if (line.indexOf("data:") !== 0) return;
        let payload;
        try { payload = JSON.parse(line.slice(5).trim()); } catch (e) { return; }
        if (payload.error) { handlers.onMessage({ role: "ai", ctype: "text", text: "⚠️ " + (payload.error.message || "agent error") }); return; }
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
    fail() {
      handlers.onMessage({ role: "ai", ctype: "text", text: "request failed" });
      handlers.onDone && handlers.onDone();
    },
  });
}

function invoke(query, handlers) {
  const q = (query || "").trim();
  if (!q) return handlers.onDone && handlers.onDone();
  if (CFG.useMock) return invokeMock(q, handlers);
  // 真实模式:先确保当前角色已登录 HRMS 拿到 token(有缓存秒回),再发起 invoke。
  hrms.ensureToken(function () { invokeReal(q, handlers); });
}

// 切换角色时清掉多轮会话记忆,避免沿用上一个身份的上下文。
function resetSession() { sessionId = null; }

module.exports = { invoke, resetSession };

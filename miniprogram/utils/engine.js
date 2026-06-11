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
    approval: "You have 3 pending OT requests. Compliance checks done — handle them right here:",
    proactiveText: "Zhang San's request carries a compliance risk — review it carefully. Batch-approve the rest?",
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
    punchOtText: "You clocked out 2+ hours after your shift ended — you can file an OT request for today.",
    punchOtChip: "Request OT →",
    punchOtAsk: "Request OT for today",
    otReqIntro: "Sure — I've pre-filled an OT request for you. Check the details and submit:",
    otReqTool: "mcp__attendance_mcp__submit_ot_request",
    otReqDone: "✅ OT request submitted and routed to your manager for approval. I'll let you know once it's processed.",
    otApproveTool: "mcp__attendance_mcp__approve_ot_request",
    otApproveDone: "✅ Approved — synced to HRMS, the employee has been notified.",
    otRejectDone: "Rejected — the employee will be notified.",
    otBatchDone: "✅ All selected OT requests approved and synced to HRMS.",
    otViewIntro: "Here are the details — you can act on it right here:",
    payslipTool: "mcp__hcm_mcp__get_payslip(month=2026-05)",
    payslipText: "Here is your May payslip — net pay ¥24,030 (+3.2% MoM). Composition and breakdown below; ask me anything about any line:",
    fallback: "I can analyze attendance data. Try: “Who worked the most OT in R&D?”, “Show me clock-in anomalies”, or “Build an R&D OT dashboard”.",
  },
  zh: {
    gen: "已为你生成「研发部 OT 看板」,满意可一键钉到首页:",
    approval: "当前有 3 笔待审批 OT,已完成合规检查,可在下表直接处理:",
    proactiveText: "其中张三一笔有合规风险,建议重点核对。其余要批量处理吗?",
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
    punchOtText: "你的下班时间超过班次结束 2 小时,可以申请今天的加班。",
    punchOtChip: "申请加班 →",
    punchOtAsk: "帮我申请今天的加班",
    otReqIntro: "好的,已为你预填一张加班申请单,确认信息后提交:",
    otReqTool: "mcp__attendance_mcp__submit_ot_request",
    otReqDone: "✅ 加班申请已提交,已流转给你的经理审批,有进展我会第一时间同步你。",
    otApproveTool: "mcp__attendance_mcp__approve_ot_request",
    otApproveDone: "✅ 已批准,结果已写回 HRMS 并通知员工。",
    otRejectDone: "已驳回,将通知员工。",
    otBatchDone: "✅ 已批量批准所选 OT,结果已写回 HRMS。",
    otViewIntro: "这笔申请的详情如下,可直接处理:",
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
      // 下班超班次结束 2h 可申请 OT(mock 演示恒触发;真实模式由 agent 按时间计算)
      { ctype: "proactive", text: I.punchOtText, chips: [
        { label: I.punchOtChip, solid: true, action: "ask:" + I.punchOtAsk },
        { label: I.chipLater, action: "dismiss" },
      ] },
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
  // ot_request 第二步:用户在表单卡点了「提交」(带齐全部字段)→ 这时才调工具
  if (/^(提交\s*OT\s*申请|提交加班申请|submit ot request)/i.test(q)) {
    const ec = (q.match(/employee_code[=::\s]+(\w+)/i) || [])[1];
    return [
      { ctype: "toolcall", label: I.otReqTool + (ec ? "(employee_code=" + ec + ")" : "") },
      { ctype: "text", text: I.otReqDone },
    ];
  }
  // OT 审批确认词(表格行/单卡/批量)→ 这时才调 approve 工具
  if (/^(批准OT申请|Approve OT request)/i.test(q)) {
    const id = (q.match(/id=([\w-]+)/) || [])[1] || "?";
    return [
      { ctype: "toolcall", label: I.otApproveTool + "(id=" + id + ", action=approve)" },
      { ctype: "text", text: I.otApproveDone },
    ];
  }
  if (/^(驳回OT申请|Reject OT request)/i.test(q)) {
    const id = (q.match(/id=([\w-]+)/) || [])[1] || "?";
    return [
      { ctype: "toolcall", label: I.otApproveTool + "(id=" + id + ", action=reject)" },
      { ctype: "text", text: I.otRejectDone },
    ];
  }
  if (/^(批量批准OT申请|Batch approve OT requests)/i.test(q)) {
    const ids = (q.match(/id=[\w-]+/g) || []).join(", ");
    return [
      { ctype: "toolcall", label: I.otApproveTool + "(" + ids + ", action=approve)" },
      { ctype: "text", text: I.otBatchDone },
    ];
  }
  // 单笔详情:点表格姓名 → 出单卡 ot_approval(须在通用审批分支之前)
  if (/^(看下.*的待审批 OT|Show .+'s pending OT request)/i.test(q)) {
    const mm = q.match(/^(?:看下\s*(.+?)\s*的待审批 OT|Show\s+(.+?)'s pending OT request)/i);
    const nm = ((mm && (mm[1] || mm[2])) || "").trim();
    const hit = D.pendingOt.filter((p) => p.name === nm)[0] || D.pendingOt[0];
    return [
      { ctype: "text", text: I.otViewIntro },
      { ctype: "ot_approval", pending: hit },
    ];
  }
  // ot_request 第一步:申请加班意图 → 出可编辑表单卡,不调工具(HITL)。
  // 排除审批类话术("帮我审批 OT"),那是经理侧 ot_approval 剧本。
  if (/(申请|提报).{0,6}(加班|OT)|(加班|OT).{0,6}申请|(想|要).{0,2}加班|request.{0,8}(ot|overtime)|apply.{0,12}(ot|overtime)|(ot|overtime).{0,8}request/i.test(q) &&
      !/审批|批准|驳回|approve|reject|pending/i.test(q)) {
    return [
      { ctype: "text", text: I.otReqIntro },
      // date/start/end/otType 由 chat.js 预填默认值(日期 = 本机今天)
      { ctype: "ot_request", status: "pending" },
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
      { ctype: "ot_pending_list", items: D.pendingOt },
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
// 多轮会话记忆按角色隔离:EE / Manager 各自一个 session_id,互不共享
const sessionIds = { ee: null, manager: null };

function currentRole() {
  const app = getApp();
  return (app && app.globalData && app.globalData.role) || CFG.role || "ee";
}

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
  // 每条消息尾注设备当前日期时间:LLM 不知道"今天"是几号,相对日期(今天/明天/
  // tonight)全靠这个 marker 解析(prompt 的 DEVICE CONTEXT 段)。气泡仍显示原文。
  const now = new Date();
  const p2 = (n) => (n < 10 ? "0" + n : "" + n);
  const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const deviceNow = now.getFullYear() + "-" + p2(now.getMonth() + 1) + "-" + p2(now.getDate()) +
    " " + p2(now.getHours()) + ":" + p2(now.getMinutes()) + " (" + WD[now.getDay()] + ")";
  const role = currentRole();
  const params = { input: query + "\n[device_now: " + deviceNow + "]" };
  if (sessionIds[role]) params.session_id = sessionIds[role];
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
        if (r.session_id) sessionIds[role] = r.session_id;
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

// 清掉指定角色(默认当前角色)的多轮会话记忆。角色切换不再需要调它 ——
// session 已按角色隔离;只有用户主动「清空对话」时才清。
function resetSession(role) { sessionIds[role || currentRole()] = null; }

module.exports = { invoke, resetSession };

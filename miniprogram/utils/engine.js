// Scripted "agent" for the mini-program demo. Emits a sequence of messages with
// delays to mimic a live agent. Same idea as the web MockEngine; swap this for a
// real wx.request -> bipo-ai-service call when a backend domain is whitelisted.

const D = require("./mockData");

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
  if (/迟到/.test(q)) {
    return [{ ctype: "text", text: "迟到最多的是运营部(38 人次)。AI 发现:李四周一迟到率 80%,显著高于其他工作日 —— 像周期性问题,建议单独沟通。" }];
  }
  if (/成本|预算|超支/.test(q)) {
    return [
      { ctype: "toolcall", label: "attendance.ot_cost(month=2026-06)" },
      { ctype: "text", text: "本月 OT 成本约 ¥18.6 万,已用预算的 104% —— 已超支。研发部占 62%,建议优先压缩研发周末 OT。" },
    ];
  }
  if (/OT|加班|工时|谁.*多/i.test(q)) {
    return [
      { ctype: "toolcall", label: "attendance.query_ot(dept=研发, month=2026-05)" },
      { ctype: "progress", label: "正在分析 OT 明细", scanned: 142, total: 142 },
      { ctype: "text", text: "研发部上月 OT 共 486 小时,集中在少数人。张三(96h)远高于团队中位数,且 70% 在周末,建议关注:" },
      { ctype: "ot_breakdown", title: "研发部 OT Top 5", people: D.rdOtTop },
    ];
  }
  return [{ ctype: "text", text: "我可以帮你分析考勤数据。试试:「研发部谁 OT 最多」「给我看异常打卡」「本月 OT 成本超预算了吗」,或「做个研发部 OT 看板」。" }];
}

function delayFor(m) {
  if (m.ctype === "toolcall") return 500;
  if (m.ctype === "progress") return 750;
  if (m.ctype === "text") return 600;
  return 450;
}

// invoke(query, { onMessage(msg), onDone() }) -> emits messages sequentially
function invoke(query, handlers) {
  const msgs = scriptFor((query || "").trim());
  let i = 0;
  function step() {
    if (i >= msgs.length) {
      handlers.onDone && handlers.onDone();
      return;
    }
    const m = msgs[i++];
    setTimeout(() => {
      handlers.onMessage(Object.assign({ role: "ai" }, m));
      step();
    }, delayFor(m));
  }
  step();
}

module.exports = { invoke };

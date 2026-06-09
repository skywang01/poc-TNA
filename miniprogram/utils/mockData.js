// Fake-but-realistic attendance data for the mini-program POC.

const scope = { month: "2026-06", org: "全公司" };

const aiSummary = {
  attendance: "96.2%", attendanceDelta: "+2.1%",
  otDept: "研发部", otDelta: "+38%", anomalies: 3, risks: 2,
};

const kpis = [
  { label: "出勤率", value: "96.2%", delta: "↑ 2.1%", up: true },
  { label: "准时率", value: "91.4%", delta: "↓ 1.3%", up: false },
  { label: "OT 总工时", value: "1,284h", delta: "↑ 38%", up: false },
  { label: "缺勤人次", value: "47", delta: "↓ 9", up: true },
];

// OT by dept (bar heights in %)
const deptOt = [
  { dept: "研发", hours: 486, pct: 100 },
  { dept: "销售", hours: 232, pct: 48 },
  { dept: "运营", hours: 171, pct: 35 },
  { dept: "客服", hours: 108, pct: 22 },
  { dept: "HR", hours: 74, pct: 15 },
];

// attendance trend sparkline (%)
const trend = [78, 84, 80, 90, 86, 96, 92];

const anomalies = [
  { id: "an-1", title: "疑似代打卡 · 张三(研发)", why: "连续 5 天 09:00:02 整点打卡,位置漂移 1.2km。", ai: "AI:行为高度规律,建议核查", severity: "high" },
  { id: "an-2", title: "OT 异常飙升 · 研发部", why: "本周 OT 环比 +38%,集中在 3 人。", ai: "AI:疑似排期挤压", severity: "high" },
  { id: "an-3", title: "迟到模式异常 · 李四", why: "周一迟到率 80%,显著高于其他工作日。", ai: "AI:周期性模式", severity: "mid" },
];

const compliance = [
  { id: "cp-1", title: "连续工时超限 · 王五", why: "近 7 天累计 62h,超劳工法上限。", ai: "AI:有用工合规风险,建议强制休息", severity: "high" },
  { id: "cp-2", title: "休息间隔不足 · 客服 3 人", why: "班次间隔 < 11h。", ai: "AI:建议调整排班", severity: "mid" },
];

const rdOtTop = [
  { name: "张三", hours: 96, pct: 100, daily: [{ date: "05-10 (六)", hours: 9.5 }, { date: "05-25 (六)", hours: 9.5 }] },
  { name: "陈六", hours: 61, pct: 64, daily: [{ date: "05-18 (日)", hours: 8 }] },
  { name: "王九", hours: 41, pct: 43, daily: [{ date: "05-19 (一)", hours: 4 }] },
  { name: "林七", hours: 29, pct: 30, daily: [{ date: "05-20 (二)", hours: 3 }] },
  { name: "赵八", hours: 20, pct: 21, daily: [{ date: "05-21 (三)", hours: 2.5 }] },
];

const pendingOt = [
  { id: "ot-zs", name: "张三", dept: "研发", date: "2026-05-25 (周六)", hours: 9.5, reason: "版本上线赶工", flag: "该员工近 7 天累计已 58h,批准后将逼近劳工法上限" },
  { id: "ot-sales-1", name: "周一", dept: "销售", date: "2026-05-28 (周三)", hours: 3.0, reason: "客户演示筹备" },
  { id: "ot-sales-2", name: "吴二", dept: "销售", date: "2026-05-29 (周四)", hours: 2.5, reason: "季度冲刺" },
];

const generatedDashboard = {
  title: "研发部 OT 看板",
  tiles: [
    { label: "本月 OT", value: "486h" },
    { label: "人均", value: "17.4h" },
    { label: "合规风险", value: "2", danger: true },
  ],
  series: [40, 55, 48, 80, 100, 72],
};

module.exports = {
  scope, aiSummary, kpis, deptOt, trend, anomalies, compliance,
  rdOtTop, pendingOt, generatedDashboard,
};

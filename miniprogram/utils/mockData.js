// Bilingual fake-but-realistic attendance data. getData(locale) -> localized set.

const DATA = {
  en: {
    scope: { month: "2026-06", org: "All Departments" },
    aiSummary: {
      summaryLine:
        "Attendance is 96.2% this month (▲2.1% MoM) — healthy overall. R&D overtime is up 38% YoY, nearing the budget cap. 3 anomalies and 2 compliance risks detected; prioritize the suspected buddy-punching and Wang Jiu's consecutive-hours breach.",
      anomalies: 3,
      risks: 2,
    },
    kpis: [
      { label: "Attendance", value: "96.2%", delta: "↑ 2.1% vs last mo", up: true },
      { label: "Punctuality", value: "91.4%", delta: "↓ 1.3%", up: false },
      { label: "Total OT", value: "1,284h", delta: "↑ 38% led by R&D", up: false },
      { label: "Absences", value: "47", delta: "↓ 9", up: true },
    ],
    deptOt: [
      { dept: "R&D", hours: 486, pct: 100 },
      { dept: "Sales", hours: 232, pct: 48 },
      { dept: "Ops", hours: 171, pct: 35 },
      { dept: "Support", hours: 108, pct: 22 },
      { dept: "HR", hours: 74, pct: 15 },
    ],
    trend: [78, 84, 80, 90, 86, 96, 92],
    anomalies: [
      { id: "an-1", title: "Suspected buddy-punch · Zhang San (R&D)", why: "Clocked in at 09:00:02 sharp for 5 days straight, location drifted 1.2km. ", ai: "AI: highly regular pattern, recommend review", severity: "high" },
      { id: "an-2", title: "OT spike · R&D", why: "OT up 38% WoW, concentrated in 3 people. ", ai: "AI: likely schedule crunch", severity: "high" },
      { id: "an-3", title: "Lateness pattern · Li Si", why: "80% late rate on Mondays, far above other weekdays. ", ai: "AI: cyclical pattern", severity: "mid" },
    ],
    compliance: [
      { id: "cp-1", title: "Consecutive-hours breach · Wang Jiu", why: "62h over the last 7 days, exceeds the labor-law cap. ", ai: "AI: labor-compliance risk, mandate rest", severity: "high" },
      { id: "cp-2", title: "Insufficient rest gap · 3 in Support", why: "Shift gap < 11h. ", ai: "AI: adjust rostering", severity: "mid" },
    ],
    rdOtTop: [
      { name: "Zhang San", hours: 96, pct: 100, daily: [{ date: "May 10 (Sat)", hours: 9.5 }, { date: "May 25 (Sat)", hours: 9.5 }] },
      { name: "Chen Liu", hours: 61, pct: 64, daily: [{ date: "May 18 (Sun)", hours: 8 }] },
      { name: "Wang Jiu", hours: 41, pct: 43, daily: [{ date: "May 19 (Mon)", hours: 4 }] },
      { name: "Lin Qi", hours: 29, pct: 30, daily: [{ date: "May 20 (Tue)", hours: 3 }] },
      { name: "Zhao Ba", hours: 20, pct: 21, daily: [{ date: "May 21 (Wed)", hours: 2.5 }] },
    ],
    pendingOt: [
      { id: "ot-zs", name: "Zhang San", dept: "R&D", date: "2026-05-25 (Sat)", hours: 9.5, reason: "Release crunch", flag: "This employee already logged 58h in the last 7 days; approving nears the labor-law cap" },
      { id: "ot-sales-1", name: "Zhou Yi", dept: "Sales", date: "2026-05-28 (Wed)", hours: 3.0, reason: "Client demo prep" },
      { id: "ot-sales-2", name: "Wu Er", dept: "Sales", date: "2026-05-29 (Thu)", hours: 2.5, reason: "Quarter-end sprint" },
    ],
    generatedDashboard: {
      title: "R&D OT Dashboard",
      tiles: [
        { label: "OT this mo", value: "486h" },
        { label: "Per capita", value: "17.4h" },
        { label: "Risks", value: "2", danger: true },
      ],
      series: [40, 55, 48, 80, 100, 72],
    },
    title: { otBreakdown: "R&D OT Top 5", otApproval: "OT Approval · " },
  },

  zh: {
    scope: { month: "2026-06", org: "全公司" },
    aiSummary: {
      summaryLine:
        "本月出勤率 96.2%(环比 ↑2.1%),整体健康。研发部 OT 同比 +38%,逼近预算上限。检测到 3 处异常与 2 项合规风险,建议优先处理代打卡疑点与王九连续工时超限。",
      anomalies: 3,
      risks: 2,
    },
    kpis: [
      { label: "出勤率", value: "96.2%", delta: "↑ 2.1% vs 上月", up: true },
      { label: "准时率", value: "91.4%", delta: "↓ 1.3%", up: false },
      { label: "OT 总工时", value: "1,284h", delta: "↑ 38% 研发部主导", up: false },
      { label: "缺勤人次", value: "47", delta: "↓ 9", up: true },
    ],
    deptOt: [
      { dept: "研发", hours: 486, pct: 100 },
      { dept: "销售", hours: 232, pct: 48 },
      { dept: "运营", hours: 171, pct: 35 },
      { dept: "客服", hours: 108, pct: 22 },
      { dept: "HR", hours: 74, pct: 15 },
    ],
    trend: [78, 84, 80, 90, 86, 96, 92],
    anomalies: [
      { id: "an-1", title: "疑似代打卡 · 张三(研发)", why: "连续 5 天 09:00:02 整点打卡,位置漂移 1.2km。", ai: "AI:行为高度规律,建议核查", severity: "high" },
      { id: "an-2", title: "OT 异常飙升 · 研发部", why: "本周 OT 环比 +38%,集中在 3 人。", ai: "AI:疑似排期挤压", severity: "high" },
      { id: "an-3", title: "迟到模式异常 · 李四", why: "周一迟到率 80%,显著高于其他工作日。", ai: "AI:周期性模式", severity: "mid" },
    ],
    compliance: [
      { id: "cp-1", title: "连续工时超限 · 王九", why: "近 7 天累计 62h,超劳工法上限。", ai: "AI:有用工合规风险,建议强制休息", severity: "high" },
      { id: "cp-2", title: "休息间隔不足 · 客服 3 人", why: "班次间隔 < 11h。", ai: "AI:建议调整排班", severity: "mid" },
    ],
    rdOtTop: [
      { name: "张三", hours: 96, pct: 100, daily: [{ date: "05-10 (六)", hours: 9.5 }, { date: "05-25 (六)", hours: 9.5 }] },
      { name: "陈六", hours: 61, pct: 64, daily: [{ date: "05-18 (日)", hours: 8 }] },
      { name: "王九", hours: 41, pct: 43, daily: [{ date: "05-19 (一)", hours: 4 }] },
      { name: "林七", hours: 29, pct: 30, daily: [{ date: "05-20 (二)", hours: 3 }] },
      { name: "赵八", hours: 20, pct: 21, daily: [{ date: "05-21 (三)", hours: 2.5 }] },
    ],
    pendingOt: [
      { id: "ot-zs", name: "张三", dept: "研发", date: "2026-05-25 (周六)", hours: 9.5, reason: "版本上线赶工", flag: "该员工近 7 天累计已 58h,批准后将逼近劳工法上限" },
      { id: "ot-sales-1", name: "周一", dept: "销售", date: "2026-05-28 (周三)", hours: 3.0, reason: "客户演示筹备" },
      { id: "ot-sales-2", name: "吴二", dept: "销售", date: "2026-05-29 (周四)", hours: 2.5, reason: "季度冲刺" },
    ],
    generatedDashboard: {
      title: "研发部 OT 看板",
      tiles: [
        { label: "本月 OT", value: "486h" },
        { label: "人均", value: "17.4h" },
        { label: "合规风险", value: "2", danger: true },
      ],
      series: [40, 55, 48, 80, 100, 72],
    },
    title: { otBreakdown: "研发部 OT Top 5", otApproval: "OT 审批 · " },
  },
};

function getData(locale) {
  return DATA[locale] || DATA.en;
}

module.exports = { getData };

// A self-contained set of fake-but-realistic attendance data for the POC.
// In production this is replaced by a real DataSource implementation.

import type {
  Kpi, TrendPoint, DeptOt, Anomaly, Compliance, OtPerson, PendingOt,
} from "./types";

export const SCOPE = { month: "2026-06", org: "全公司" };

export const aiSummary = {
  attendance: "96.2%",
  attendanceDelta: "+2.1%",
  otDept: "研发部",
  otDelta: "+38%",
  anomalies: 3,
  risks: 2,
};

export const kpis: Kpi[] = [
  { label: "出勤率", value: "96.2%", delta: "↑ 2.1% vs 上月", dir: "up" },
  { label: "准时率", value: "91.4%", delta: "↓ 1.3%", dir: "down" },
  { label: "OT 总工时", value: "1,284h", delta: "↑ 38% 研发部主导", dir: "down" },
  { label: "缺勤人次", value: "47", delta: "↓ 9", dir: "up" },
];

export const trend: TrendPoint[] = [
  { label: "W1", attendance: 94.0, punctuality: 89.5 },
  { label: "W2", attendance: 95.1, punctuality: 90.2 },
  { label: "W3", attendance: 94.6, punctuality: 88.9 },
  { label: "W4", attendance: 96.0, punctuality: 91.0 },
  { label: "W5", attendance: 95.4, punctuality: 90.4 },
  { label: "W6", attendance: 97.1, punctuality: 92.3 },
  { label: "W7", attendance: 96.2, punctuality: 91.4 },
];

export const deptOt: DeptOt[] = [
  { dept: "研发", hours: 486 },
  { dept: "销售", hours: 232 },
  { dept: "运营", hours: 171 },
  { dept: "客服", hours: 108 },
  { dept: "HR", hours: 74 },
];

export const anomalies: Anomaly[] = [
  {
    id: "an-1",
    title: "疑似代打卡 · 张三(研发)",
    why: "连续 5 天 09:00:02 整点打卡,位置漂移 1.2km。AI:行为高度规律,建议核查",
    severity: "high",
  },
  {
    id: "an-2",
    title: "OT 异常飙升 · 研发部",
    why: "本周 OT 环比 +38%,集中在 3 人。AI:疑似排期挤压",
    severity: "high",
  },
  {
    id: "an-3",
    title: "迟到模式异常 · 李四",
    why: "周一迟到率 80%,显著高于其他工作日。AI:周期性模式",
    severity: "mid",
  },
];

export const compliance: Compliance[] = [
  {
    id: "cp-1",
    title: "连续工时超限 · 王五",
    why: "近 7 天累计 62h,超劳工法上限。AI:有用工合规风险,建议强制休息",
    severity: "high",
  },
  {
    id: "cp-2",
    title: "休息间隔不足 · 客服 3 人",
    why: "班次间隔 < 11h。AI:建议调整排班",
    severity: "mid",
  },
];

// OT breakdown for the chatbot ot_breakdown component (研发部 Top 5).
export const rdOtTop: OtPerson[] = [
  {
    name: "张三", hours: 96, pctOfMax: 100,
    daily: [
      { date: "05-10 (六)", hours: 9.5 },
      { date: "05-11 (日)", hours: 8.0 },
      { date: "05-17 (六)", hours: 9.0 },
      { date: "05-24 (六)", hours: 7.5 },
      { date: "05-25 (六)", hours: 9.5 },
    ],
  },
  {
    name: "陈六", hours: 61, pctOfMax: 64,
    daily: [
      { date: "05-12 (一)", hours: 3.0 },
      { date: "05-18 (日)", hours: 8.0 },
      { date: "05-22 (四)", hours: 4.5 },
    ],
  },
  {
    name: "王九", hours: 41, pctOfMax: 43,
    daily: [
      { date: "05-15 (四)", hours: 3.5 },
      { date: "05-19 (一)", hours: 4.0 },
    ],
  },
  {
    name: "林七", hours: 29, pctOfMax: 30,
    daily: [{ date: "05-20 (二)", hours: 3.0 }],
  },
  {
    name: "赵八", hours: 20, pctOfMax: 21,
    daily: [{ date: "05-21 (三)", hours: 2.5 }],
  },
];

// Pending OT approvals (used by ot_approval + proactive batch).
export const pendingOt: PendingOt[] = [
  {
    id: "ot-zs", name: "张三", dept: "研发", date: "2026-05-25 (周六)",
    hours: 9.5, reason: "版本上线赶工",
    complianceFlag: "该员工近 7 天累计已 58h,批准后将逼近劳工法上限",
  },
  { id: "ot-sales-1", name: "周一", dept: "销售", date: "2026-05-28 (周三)", hours: 3.0, reason: "客户演示筹备" },
  { id: "ot-sales-2", name: "吴二", dept: "销售", date: "2026-05-29 (周四)", hours: 2.5, reason: "季度冲刺" },
  {
    id: "ot-ops-1", name: "郑三", dept: "运营", date: "2026-05-30 (周五)",
    hours: 5.0, reason: "大促复盘",
    complianceFlag: "当日工时已达 13h,存在合规风险",
  },
];

// Generated dashboard payload (研发部 OT 看板).
export const generatedDashboard = {
  title: "研发部 OT 看板",
  tiles: [
    { label: "本月 OT", value: "486h" },
    { label: "人均", value: "17.4h" },
    { label: "合规风险", value: "2", danger: true },
  ],
  series: [40, 55, 48, 80, 100, 72],
};

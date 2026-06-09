// Scripted agent responses for the demo. Each builder returns a list of
// AgentMessage (timestamps are stamped by the engine). These are the canned
// "agent" outputs the MockEngine streams; a real agent would emit the same shapes.

import type { AgentMessage, MessageContent } from "./types";
import {
  rdOtTop, pendingOt, generatedDashboard, anomalies,
} from "../data/mockData";

const now = () => new Date().toISOString();

function msg(content: MessageContent, phase: string, id?: string): AgentMessage {
  return { content, phase: { type: phase, id }, timestamp: now() };
}

const text = (t: string) => msg({ type: "text", text: t }, "final_response");
const toolCall = (tool: string, input: Record<string, unknown>) =>
  msg({ type: "tool_call", tool, input }, "tool_call");
const progress = (label: string, scanned: number, total: number) =>
  msg({ type: "agent_output", output_type: "analysis_progress", data: { label, scanned, total } }, "agent_output");
const output = (output_type: string, data: Record<string, unknown>, response_id?: string) =>
  msg({ type: "agent_output", output_type, data, response_id }, "agent_output");

export interface Script {
  match: (q: string) => boolean;
  build: () => AgentMessage[];
}

// Order matters — first match wins.
export const SCRIPTS: Script[] = [
  // ④ Generate a dashboard page
  {
    match: (q) => /看板|生成|dashboard|面板/i.test(q),
    build: () => [
      text("已为你生成 **研发部 OT 看板**,预览如下。满意可一键钉到首页 Dashboard:"),
      output("generated_dashboard", generatedDashboard),
    ],
  },
  // ② Approve OT  (+ ③ proactive follow-up)
  {
    match: (q) => /审批|批准|批一下|处理.*ot|处理一下/i.test(q),
    build: () => [
      text("是的,张三有 **1 笔待审批 OT**。我已带出合规检查,你可以直接在这里处理:"),
      output("ot_approval", { pending: pendingOt[0] }, "resp-zs"),
      output("proactive", {
        text: "顺手提醒:我还检测到全公司另有 **3 笔待审批 OT**(销售部 2、运营部 1),其中 1 笔有合规风险。要现在一起处理吗?",
        chips: [
          { label: "批量处理 3 笔 →", solid: true, action: "batch_approve" },
          { label: "只看有风险的", action: "ask:只看有合规风险的待审批 OT" },
          { label: "稍后", action: "dismiss" },
        ],
      }),
    ],
  },
  // Risky pending only (from proactive chip)
  {
    match: (q) => /只看.*风险|有合规风险/.test(q),
    build: () => [
      text("有合规风险的待审批 OT 只有 **1 笔**(郑三 · 运营部):"),
      output("ot_approval", { pending: pendingOt[3] }, "resp-zheng"),
    ],
  },
  // Anomaly / clocking
  {
    match: (q) => /异常|代打卡|打卡/.test(q),
    build: () => [
      toolCall("attendance.detect_anomaly", { month: "2026-06", scope: "全公司" }),
      progress("正在扫描打卡与位置数据", 312, 312),
      text("本月共检测到 **3 项异常**,其中 2 项为高严重度。已按 AI 归因排序:"),
      output("anomaly_alert", { items: anomalies }),
    ],
  },
  // Late pattern
  {
    match: (q) => /迟到/.test(q),
    build: () => [
      toolCall("attendance.query_late", { month: "2026-06" }),
      text("迟到最多的是 **运营部**(本月 38 人次),但 AI 发现一个更值得注意的模式:**李四周一迟到率 80%**,显著高于其他工作日 —— 像是周期性问题,建议单独沟通。"),
    ],
  },
  // Cost / budget
  {
    match: (q) => /成本|预算|超支|超预算/.test(q),
    build: () => [
      toolCall("attendance.ot_cost", { month: "2026-06" }),
      progress("正在核算 OT 成本与预算", 5, 5),
      text("本月 OT 成本约 **¥18.6 万**,已用预算的 **104%** —— **已超支**。主要由研发部贡献(占 62%)。建议优先压缩研发周末 OT。"),
    ],
  },
  // ① OT breakdown (most generic OT question — keep near the end)
  {
    match: (q) => /ot|加班|工时|谁.*多/i.test(q),
    build: () => [
      toolCall("attendance.query_ot", { dept: "研发", month: "2026-05" }),
      progress("正在分析 OT 明细", 142, 142),
      text("研发部上月 OT 共 **486 小时**,集中在少数人。**张三**(96h)远高于团队中位数(14h),且 70% 集中在周末,建议关注。明细如下:"),
      output("ot_breakdown", { title: "研发部 OT Top 5", people: rdOtTop }),
    ],
  },
];

export const FALLBACK = (): AgentMessage[] => [
  text("我可以帮你分析考勤数据。试试问我:**“研发部谁 OT 最多?”**、**“给我看异常打卡”**、**“本月 OT 成本超预算了吗?”**,或者让我**“做个研发部 OT 看板”**。"),
];

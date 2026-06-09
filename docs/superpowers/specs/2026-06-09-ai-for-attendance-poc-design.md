# AI for Attendance — POC 设计文档

**日期**: 2026-06-09
**状态**: 已定稿,待写实现计划
**项目**: TNA-POC(Time & Attendance AI Proof-of-Concept)

---

## 1. 目标与范围

在 BIPO Attendance 模块上,设计并实现一个面向**对外客户演示**的 AI 能力 POC,
包含两块:

```
┌──────────────────────────┬──────────────────────────────────┐
│  ① AI Dashboard          │  ② AI Chatbot (Agent 驱动)        │
│  ─────────────────       │  ─────────────────               │
│  • AI 智能摘要(顶部)    │  • OT 明细问答(NL 查询)        │
│  • AI 异常检测            │  • A2UI 对话内组件               │
│  • 合规风控              │  • A2UI 生成页面                  │
│                          │  • 主动建议 / 行动               │
└──────────────────────────┴──────────────────────────────────┘
```

**定位**:对外客户 Demo · 高保真可点击前端 · Mock 假数据 · 沿用 BIPO 视觉。

### In Scope
- 可点击的高保真前端原型(真能跑的网页)
- Mock 数据层(贴近真实的假考勤/OT 数据)
- Chatbot 走脚本化剧本演示,A2UI 组件全部真实渲染
- `AIEngine` 接口镜像 `bipo-ai-service` 的消息协议,预留真实接入

### Out of Scope(本 POC 不做)
- 真实后端 / 数据库
- 预测预警类 AI(离职风险/成本预测)—— 用户未选,留待后续
- 真实 LLM 在线调用(架构预留,演示默认走 Mock)
- 用户权限 / 多租户 / 登录

---

## 2. 关键决策(来自 brainstorming)

| 维度 | 决策 |
|------|------|
| 目标用户 | 对外 Demo(给客户看),以 HR/管理者视角最具说服力 |
| A2UI 含义 | 两者都要:对话内嵌组件 + 现场生成完整页面 |
| 数据 | Mock 假数据,但数据层抽象,预留真实接口 |
| 交付程度 | 可点击高保真前端原型 |
| Chatbot 后端 | 是一个 **Agent**,后续接入自有 Agent platform(`bipo-ai-service`) |
| Dashboard AI | 异常检测 + AI 智能摘要 + 合规风控 |
| Chatbot AI | OT 明细问答 + A2UI 对话内组件 + A2UI 生成页面 + 主动建议/行动 |

---

## 3. 架构

### 3.1 总体

```
┌─────────────────────────────────────────────────────────────┐
│  前端 SPA  (React + Vite + TS + Tailwind + Recharts)         │
│  ┌─────────────────┐        ┌──────────────────────────────┐ │
│  │ AI Dashboard     │        │ AI Chatbot                    │ │
│  │ (KPI/图表/AI卡)  │◀──────▶│ (消息流 + A2UI 组件渲染器)    │ │
│  └─────────────────┘  钉看板 └──────────────┬───────────────┘ │
│           ▲ 数据                            │ AIEngine.invoke  │
│           │                                 ▼                  │
│  ┌────────┴─────────────────────────────────────────────────┐ │
│  │  数据层 / 引擎层(可插拔接口)                            │ │
│  │   • DataSource  (Mock | 将来真实 API)                    │ │
│  │   • AIEngine    (MockEngine | BipoAgentEngine)           │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 AIEngine 接口(镜像 bipo-ai-service 协议)

Chatbot 不直接依赖任何具体实现,只依赖统一接口:

```ts
interface AIEngine {
  // 返回一个事件流,与 bipo-ai-service 的 MessageStructure 一致
  invoke(input: string, ctx: { sessionId: string }): AsyncIterable<AgentMessage>
}

// 镜像 src/api/schemas.py 的 content 判别联合
type AgentMessage = {
  content:
    | { type: "text"; text: string }
    | { type: "tool_call"; tool: string; input: unknown }
    | { type: "tool_result"; tool: string; result: unknown }
    | { type: "error"; message: string }
    | { type: "agent_output"; output_type: string; data: Record<string, unknown>; response_id?: string }
  phase: { type: string; id?: string }   // thinking | tool_call | final_response | ...
  timestamp: string
}
```

两个实现:

```
┌────────────────────────┐      ┌──────────────────────────────┐
│ MockEngine (演示默认)   │      │ BipoAgentEngine (后续接入)    │
│ 按 input 匹配预设剧本    │      │ SSE 连 POST /agents/{id}/invoke│
│ yield 预设事件序列       │      │ 解析 JSON-RPC over SSE        │
│ 含真实 agent_output 数据 │      │ 同样 yield AgentMessage       │
└────────────────────────┘      └──────────────────────────────┘
         切换只换 Engine 实现,UI 渲染层一行不改
```

> **对接依据**:`bipo-ai-service` 主接口 `POST /agents/{agent_id}/invoke`(JSON-RPC 2.0 over SSE),
> 响应 `result.content.type` 判别 `text/tool_call/tool_result/error/agent_output`,带 `session_id` 多轮。
> A2UI 即其 `agent_output` 机制(`output_type` + `data`)。

### 3.3 A2UI 组件协议

A2UI 组件 = 渲染一个 `agent_output` 消息。前端维护一个 **组件注册表**:
`output_type → React 组件`。Mock 与真实 Agent 吐相同 envelope,渲染层统一。

| output_type | 用途 | 来源 |
|-------------|------|------|
| `analysis_progress` | 分析进度卡 | 复用 bipo-ai-service builtin |
| `decision_options` | 决策选项 | 复用 builtin |
| `ot_breakdown` | OT 明细图表卡(条形+下钻) | POC 新增 |
| `ot_approval` | OT 审批卡(带合规检查+按钮) | POC 新增 |
| `anomaly_alert` | 异常告警卡 | POC 新增 |
| `generated_dashboard` | 现场生成的看板(KPI+图表+钉首页) | POC 新增 |

> 命名沿用 bipo-ai-service 风格(snake_case output_id),便于将来在平台侧注册同名 `agent_output`。

---

## 4. AI Dashboard 设计

布局(已 mockup 确认 `dashboard-v1.html`):

```
┌────────┬─────────────────────────────────────────────┐
│ BIPO   │  Attendance / AI Dashboard    [月份] [实时]  │
│ 侧边栏  ├─────────────────────────────────────────────┤
│ ·AI    │  ✨ AI 智能摘要(自然语言结论 + 行动按钮)     │
│  Dash  │  ┌KPI┐┌KPI┐┌KPI┐┌KPI┐ 出勤/准时/OT/缺勤    │
│  Clock ├──────────────────────┬──────────────────────┤
│  ...   │  📈 出勤/准时趋势线   │ ⚠️ AI 异常检测       │
│        │  📊 OT 部门对比柱状   │ ⚖️ 合规风控          │
└────────┴──────────────────────┴──────────────────────┘
                                    右下角 ◉ 悬浮"问 AI" → Chatbot
```

**组成**:
1. **AI 智能摘要带**(顶部):一段自然语言总结(出勤健康度、OT 趋势、风险数),
   含「查看全部风险」「让 AI 深入分析→」按钮(后者拉起 Chatbot)。
2. **KPI 行**:出勤率 / 准时率 / OT 总工时 / 缺勤人次,各带环比。
3. **左栏图表**:出勤·准时趋势(折线)、OT 部门对比(柱状)—— 客户熟悉的传统图表。
4. **右栏 AI 卡片**:
   - **AI 异常检测**:代打卡 / OT 飙升 / 迟到模式;每条带 `AI:归因解释`(紫色)+ 高/中严重度。
   - **合规风控**:连续工时超限 / 休息间隔不足;带劳工法风险提示。
5. **悬浮按钮**(右下):打开 Chatbot,串联两个功能。

**数据**:全部来自 Mock DataSource(部门、员工、逐日打卡、OT 记录、异常标记)。

---

## 5. AI Chatbot 设计

界面(已 mockup 确认 `chatbot-v1.html`):全屏对话视图 = 细侧边栏 + 消息流 + 输入区。

### 5.1 消息流渲染(对齐协议)

```
text          → 文字气泡
tool_call     → 折叠成一行紫色 chip(可展开看参数)
tool_result   → 折叠展示
analysis_progress → 进度卡(扫描 N 条记录…)
agent_output  → 查注册表渲染对应 A2UI 组件
```

### 5.2 演示剧本(4 个能力)

```
① "研发部谁 OT 最多?"  → tool_call + analysis_progress + 文字归因 + [ot_breakdown]
② "帮我审批张三的 OT"   → 文字 + [ot_approval](含合规提醒 + 批准/驳回按钮)
③ AI 主动提醒           → [proactive] "还有 3 笔待审批,要一起处理吗?" + 行动 chips
④ "做个研发部OT看板"    → 文字 + [generated_dashboard](迷你看板 + 钉到首页)
```

### 5.3 交互
- 输入框 + 预设追问引导(哪个部门迟到最多 / OT 成本超预算了吗 / 看异常打卡)。
- A2UI 组件可点:`ot_breakdown` 行可下钻、`ot_approval` 按钮可点(Mock 反馈)、
  `generated_dashboard` 可「钉到首页」(写入 Dashboard 的看板区)。
- 上下文条显示当前作用域(月份 / 全公司)。

---

## 6. 模块划分(供实现计划参考)

每个单元职责单一、接口清晰、可独立测试:

```
src/
├── data/
│   ├── DataSource.ts          # 接口:部门/员工/打卡/OT/异常 查询
│   ├── mockData.ts            # 一套贴近真实的假数据
│   └── MockDataSource.ts      # 接口的 Mock 实现
├── ai/
│   ├── AIEngine.ts            # 接口(镜像 bipo-ai-service)
│   ├── types.ts               # AgentMessage / content 判别联合
│   ├── MockEngine.ts          # 脚本剧本引擎(演示默认)
│   ├── scripts.ts             # 4 段演示剧本数据
│   └── BipoAgentEngine.ts     # 桩:SSE 连真实 Agent(后续启用)
├── a2ui/
│   ├── registry.ts            # output_type → 组件 映射
│   ├── OtBreakdown.tsx
│   ├── OtApproval.tsx
│   ├── AnomalyAlert.tsx
│   ├── GeneratedDashboard.tsx
│   ├── AnalysisProgress.tsx
│   └── DecisionOptions.tsx
├── dashboard/
│   ├── DashboardPage.tsx
│   ├── AiSummaryBand.tsx
│   ├── KpiRow.tsx
│   ├── TrendChart.tsx / OtByDeptChart.tsx
│   ├── AnomalyPanel.tsx
│   └── CompliancePanel.tsx
├── chatbot/
│   ├── ChatbotPage.tsx
│   ├── MessageStream.tsx      # 消费 AsyncIterable<AgentMessage>
│   ├── MessageBubble.tsx / ToolCallChip.tsx
│   └── Composer.tsx
├── shell/
│   ├── Sidebar.tsx (BIPO chrome) / TopBar.tsx
│   └── ChatFab.tsx            # 悬浮按钮
└── App.tsx                    # 路由:Dashboard ↔ Chatbot
```

**技术栈**:React + Vite + TypeScript + Tailwind CSS + Recharts。

---

## 7. 验收标准(Demo Checklist)

- [ ] Dashboard 三块 AI(摘要/异常/合规)均渲染,异常条带 AI 归因解释
- [ ] KPI 与图表用 Mock 数据正确显示
- [ ] 悬浮按钮可从 Dashboard 打开 Chatbot
- [ ] Chatbot 4 段剧本可完整走通,A2UI 组件真实渲染
- [ ] `ot_approval` 按钮、`generated_dashboard` 钉首页等交互有反馈
- [ ] 消息流正确按 `content.type` 判别渲染(text/tool_call/agent_output)
- [ ] `AIEngine` / `DataSource` 为接口,Mock 实现可一键替换为真实实现
- [ ] 视觉沿用 BIPO(琥珀金 + 靛蓝),整体高保真无明显占位感

---

## 8. 未决 / 后续

- A2UI 类型角标(组件右上紫标)是否在正式 demo 保留 —— 待定,默认保留(技术感)。
- 是否补充更多 A2UI 组件(可下钻表格 / 异常打卡地图 / 趋势对比)—— 按需。
- 接入真实 `bipo-ai-service`:启用 `BipoAgentEngine`,在平台侧注册同名 `agent_output`。
- 后续可纳入未选的预测预警类 AI。

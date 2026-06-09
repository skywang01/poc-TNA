# 接入 bipo-ai-service(Agent platform)

POC 的 Chatbot 通过统一接口 `AIEngine` 工作。演示默认走脚本化 `MockEngine`;
接真实 Agent 平台只需切到 `BipoAgentEngine`,**UI 渲染层一行不用改**。

## 架构

```
浏览器 ──/api/agents/{id}/invoke (同源)──▶ Vite proxy(5180)
                                              │ 注入 Authorization: Bearer
                                              ▼
                                    bipo-ai-service (BIPO_TARGET)
                                    POST /api/agents/{id}/invoke (JSON-RPC/SSE)
```

- **无 CORS 问题**:浏览器只访问同源 `/api`,由 Vite 服务端转发。
- **token 不进浏览器**:Bearer token 在 Vite proxy 层注入(`vite.config.ts`),
  不出现在前端 bundle 里。

## 协议(已对齐源码)

| 项 | 值 |
|----|----|
| 端点 | `POST /api/agents/{agentId}/invoke` |
| body | `{jsonrpc:"2.0", id, method:"invoke", params:{input, session_id}}` |
| 响应 | SSE,每帧 `data: {jsonrpc,id,result:AgentMessage}`(或 `{error}`) |
| 鉴权 | `Authorization: Bearer <JWT>` |
| 多轮 | 传同一个 `session_id` |

`AgentMessage.content.type` 判别:`text` / `tool_call` / `tool_result` / `error` /
`agent_output`(= A2UI,按 `output_type` 查 `src/a2ui/components.tsx` 的注册表渲染;
未注册的类型走可读 JSON 兜底)。

## 切到真实 Agent(Service Key 模式)

编辑 `.env.local`(已 gitignore):

```bash
BIPO_TARGET=https://bipo-ai-test.bipocloud.com   # 真实 service URL
BIPO_SERVICE_KEY=sk_xxx                           # Service Key(proxy 层注入 x-service-key)
VITE_AGENT_MODE=real                              # mock -> real
VITE_BIPO_AGENT_ID=attendance-ai                  # 已创建的 Attendance agent
```

Service Key 在 Admin UI > Management > Service Keys 创建,只显示一次。
然后重启 dev server:`npm run dev`。

### 会话(session)
首轮 **不传** `session_id`(服务端要求 UUID,且需服务端已存在),由服务端新建并在
响应 `result.session_id` 返回;`BipoAgentEngine` 自动捕获并在后续轮次复用,实现多轮记忆。

## A2UI 在真实 agent 上如何生效(零后端注册)

平台现役 agent 不用 `agent_output`(都渲染 markdown),也没注册考勤专用 output。
本 POC 用 **生成式 UI** 技巧避免改后端:`attendance-ai` 的 system prompt 指示它在回复里
内嵌 ` ```a2ui {json}``` ` 代码块;`BipoAgentEngine` 在客户端解析这些块 → 转成
`agent_output` 消息 → 复用 `src/a2ui/components.tsx` 的注册表渲染成真卡片。
支持的 `output_type`:`ot_breakdown` / `ot_approval` / `anomaly_alert` /
`generated_dashboard` / `proactive`。

> 已端到端验证:问「研发部谁 OT 最多」→ 真实 agent 返回文字 + a2ui 块 → 渲染 ot_breakdown 卡片。

## 验证

```bash
# 代理是否转发(不带真实 URL 时会 5xx,属正常)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5180/api/agents
```

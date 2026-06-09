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

## 三步切到真实 Agent

编辑 `.env.local`(已 gitignore):

```bash
BIPO_TARGET=https://你的服务地址        # 1. 真实 service URL(本地则 http://localhost:8000)
BIPO_TOKEN=你的JWT                      # 2. Bearer token(proxy 层注入)
VITE_AGENT_MODE=real                    # 3. mock -> real
VITE_BIPO_AGENT_ID=payroll-assistant    #    Attendance agent 建好后替换
```

然后重启 dev server:

```bash
npm run dev
```

## 让 A2UI 组件在真实 agent 上生效

真实 agent 默认只吐 `text` / `tool_call` / 平台内置 `agent_output`(如 `analysis_progress`、
`flow_plan_progress`)。要让 POC 里的考勤组件(`ot_breakdown` / `ot_approval` /
`generated_dashboard` 等)出现,需在 **平台侧给该 agent 注册同名 `agent_output`**
(`output_id` 与 `src/a2ui/components.tsx` 的注册表 key 一一对应)。前端已就绪,
平台注册后即可端到端联动。

## 验证

```bash
# 代理是否转发(不带真实 URL 时会 5xx,属正常)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5180/api/agents
```

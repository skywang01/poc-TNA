# BIPO AI for Attendance — 微信小程序版(POC)

Web POC 的小程序移植:**AI 看板** + **AI 助手(含 A2UI 卡片)**,原生小程序实现
(WXML/WXSS/JS,无构建步骤),内置 mock 数据,**开箱即用、可直接部署**。

## 直接部署 / 预览

```
1. 用「微信开发者工具」打开本目录(miniprogram/)
   工具 → 导入项目 → 目录选 miniprogram/
2. AppID:
   • 仅本地预览/演示 → 选「测试号」或游客模式即可直接跑
     (project.config.json 里预置 appid = "touristappid")
3. 上传发布:
   • 在 project.config.json 把 appid 换成你的小程序 AppID
   • 工具右上角「上传」→ 在 mp.weixin.qq.com 提交审核 → 发布
```

## 结构

```
miniprogram/
├── app.json            # 两个 tab:AI 看板 / AI 助手
├── app.wxss            # 全局样式(BIPO 琥珀金 + 靛蓝)
├── app.js              # globalData:approvals / pinned(跨页联动)
├── utils/
│   ├── mockData.js     # 假考勤/OT/异常数据
│   └── engine.js       # 脚本化"agent",流式吐消息(对应 web MockEngine)
└── pages/
    ├── dashboard/      # AI 看板:摘要/KPI/OT柱状/趋势/异常/合规 + 悬浮问AI
    └── chat/           # AI 助手:消息流 + A2UI 卡片
```

## A2UI 卡片(对话内,可交互)

| ctype | 卡片 | 交互 |
|-------|------|------|
| `ot_breakdown` | OT Top5 条形 | 点行下钻逐日明细 |
| `ot_approval` | OT 审批卡 | 批准/驳回(toast) |
| `anomaly_alert` | 异常告警 | 高/中严重度 |
| `proactive` | 主动建议 | 批量处理 chips |
| `generated_dashboard` | 生成看板 | 钉到首页 → 看板页显示 |

## 闭环

看板「问 AI / 异常卡点击」→ 切到 AI 助手并自动发问;助手里「钉到首页」→
看板页顶部出现该看板。两页通过 `app.globalData` 联动。

## 接真实 Agent(后续)

小程序里 `wx.request` 调 bipo-ai-service 需满足微信要求:
1. 服务必须 **HTTPS**;
2. 在小程序后台「开发管理 → 服务器域名 → request 合法域名」加入
   `https://bipo-ai-test.bipocloud.com`;
3. 把 `utils/engine.js` 的 `invoke` 换成 `wx.request`(或分包流式),
   带 `x-service-key` 头调 `/api/agents/attendance-ai/invoke`,
   解析 SSE 文本里的 ```a2ui``` 块(与 Web 版同协议)。

> 注意:Service Key 直接放进小程序前端会暴露;生产应经自有后端中转,
> 由后端注入 key(与 Web 版 Vite 代理同理)。

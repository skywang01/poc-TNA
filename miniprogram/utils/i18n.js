// i18n for the mini-program. Default locale: en. Persisted in storage.
// UI chrome strings live here; structured demo data lives in mockData.js
// (also bilingual) and scripted AI replies in engine.js.

const KEY = "lang";

function getLocale() {
  return wx.getStorageSync(KEY) || "en";
}
function setLocale(l) {
  wx.setStorageSync(KEY, l);
}

const STRINGS = {
  en: {
    tabDashboard: "AI Board",
    tabChat: "AI Assistant",
    navDashboard: "BIPO Attendance AI",
    navChat: "AI Assistant",

    // dashboard
    summaryTag: "AI SUMMARY · BY OPUS",
    viewRisks: "View risks",
    deepDive: "Analyze with AI →",
    pinnedHead: "Pinned from AI Assistant",
    otByDept: "OT Hours · by Department",
    trendTitle: "Attendance Trend (last 7 wks)",
    anomalyTitle: "AI Anomaly Detection",
    complianceTitle: "Compliance Risk",
    items: "items",
    high: "High",
    mid: "Med",
    fabLabel: "Ask AI",
    deepPrefix: "Deep-dive: ",
    qViewRisks: "Summarize this month's anomalies and compliance risks with recommendations",
    qDeepDive: "Why did R&D overtime spike, and who worked the most OT?",

    // chat
    chatTitle: "Attendance AI",
    chatSub: "● Online · Agent-powered",
    avaTip: "Use my WeChat avatar",
    greeting: "Hi, I'm Attendance AI. Ask me anything about attendance, overtime, anomalies or compliance — I can also generate dashboards for you.",
    inputPlaceholder: "Ask anything about attendance…",
    suggestions: [
      "Who worked the most OT in R&D?",
      "Help me approve pending OT",
      "Show me clock-in anomalies",
      "Build an R&D OT dashboard",
    ],
    talkIdle: "Hold to talk",
    talkSend: "Release to send",
    talkCancel: "Release to cancel",
    recTipUp: "Slide up to cancel",
    recTipCancel: "Release to cancel",
    calling: "calling ",
    scanned: "Scanned",
    done: "done",
    drillHint: "↳ Tap a row to drill into daily clock-ins",
    kDept: "Dept",
    kDate: "Date",
    kHours: "Hours",
    kReason: "Reason",
    hoursUnit: "h",
    aiNote: "AI note: ",
    approve: "Approve",
    reject: "Reject",
    approved: "Approved",
    rejected: "Rejected",
    aiGen: " (AI-generated)",
    pinHome: "Pin to home",
    pinned: "✓ Pinned",
    // toasts
    tApproved: "Approved ✓",
    tRejected: "Rejected",
    tBatch: "Batch-approved 3 ✓",
    tPinned: "Pinned to home 📌",
    tRecognizing: "Recognizing…",
    tTooShort: "Too short, try again",
    tMicFail: "Recording failed — check mic permission",
    tNoText: "Didn't catch that, try again",
    tSttFail: "Voice service unavailable",
    tReadFail: "Failed to read recording",
  },
  zh: {
    tabDashboard: "AI 看板",
    tabChat: "AI 助手",
    navDashboard: "BIPO 智能考勤",
    navChat: "AI 助手",

    summaryTag: "AI 智能摘要 · Opus 生成",
    viewRisks: "查看全部风险",
    deepDive: "让 AI 深入分析 →",
    pinnedHead: "从 AI 助手钉来的看板",
    otByDept: "OT 工时 · 部门对比",
    trendTitle: "出勤趋势(近 7 周)",
    anomalyTitle: "AI 异常检测",
    complianceTitle: "合规风控",
    items: "项",
    high: "高",
    mid: "中",
    fabLabel: "问 AI",
    deepPrefix: "深入分析:",
    qViewRisks: "汇总本月所有异常和合规风险,并给出处理建议",
    qDeepDive: "分析研发部 OT 为什么飙升,谁加班最多?",

    chatTitle: "Attendance AI",
    chatSub: "● 在线 · 由 Agent 驱动",
    avaTip: "用我的微信头像",
    greeting: "你好,我是 Attendance AI。问我考勤、加班、异常或合规的任何问题,我也能帮你生成看板。",
    inputPlaceholder: "问问考勤的任何问题…",
    suggestions: [
      "研发部谁 OT 最多?",
      "帮我审批待处理的 OT",
      "给我看异常打卡",
      "做个研发部 OT 看板",
    ],
    talkIdle: "按住 说话",
    talkSend: "松开 发送",
    talkCancel: "松开取消",
    recTipUp: "上滑取消",
    recTipCancel: "松开手指,取消",
    calling: "调用 ",
    scanned: "已扫描",
    done: "完成",
    drillHint: "↳ 点任意一行下钻到逐日打卡明细",
    kDept: "部门",
    kDate: "日期",
    kHours: "时长",
    kReason: "事由",
    hoursUnit: " 小时",
    aiNote: "AI 提醒:",
    approve: "批准",
    reject: "驳回",
    approved: "已批准",
    rejected: "已驳回",
    aiGen: "(AI 生成)",
    pinHome: "钉到首页看板",
    pinned: "✓ 已钉到首页",
    tApproved: "已批准 ✓",
    tRejected: "已驳回",
    tBatch: "已批量批准 3 笔 ✓",
    tPinned: "已钉到首页 📌",
    tRecognizing: "识别中…",
    tTooShort: "说话时间太短",
    tMicFail: "录音失败,请检查麦克风权限",
    tNoText: "没听清,再说一次",
    tSttFail: "语音服务未就绪",
    tReadFail: "读取录音失败",
  },
};

function t(locale) {
  return STRINGS[locale] || STRINGS.en;
}

module.exports = { getLocale, setLocale, t };

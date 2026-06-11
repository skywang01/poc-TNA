const CFG = require("./utils/config");

App({
  globalData: {
    // OT approvals resolved in chat -> reflected on dashboard FAB/badge
    approvals: {},       // { [id]: "approved" | "rejected" }
    pinned: [],          // dashboards generated in chat, pinned to home
    // 当前入口角色:"ee" | "manager"。启动即默认 EE 直进 AI Assistant
    // (HRMS token 由 engine.invoke -> hrms.ensureToken 懒加载),
    // 换身份去 AI Board 用顶部 chip 切。
    role: CFG.role || "ee",
  },
});

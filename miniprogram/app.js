App({
  globalData: {
    // OT approvals resolved in chat -> reflected on dashboard FAB/badge
    approvals: {},       // { [id]: "approved" | "rejected" }
    pinned: [],          // dashboards generated in chat, pinned to home
    role: null,          // 当前入口角色:"ee" | "manager";null = 未选,首屏引导选择
  },
});

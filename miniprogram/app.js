App({
  globalData: {
    // OT approvals resolved in chat -> reflected on dashboard FAB/badge
    approvals: {},       // { [id]: "approved" | "rejected" }
    pinned: [],          // dashboards generated in chat, pinned to home
  },
});

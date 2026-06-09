const D = require("../../utils/mockData");
const app = getApp();

Page({
  data: {
    scope: D.scope,
    aiSummary: D.aiSummary,
    kpis: D.kpis,
    deptOt: D.deptOt,
    trend: D.trend,
    trendMax: Math.max.apply(null, D.trend),
    anomalies: D.anomalies,
    compliance: D.compliance,
    pinned: [],
  },

  onShow() {
    // pinned dashboards generated in chat show up here
    this.setData({ pinned: app.globalData.pinned });
  },

  // jump to chat tab, optionally auto-sending a question
  askAI(e) {
    const q = (e.currentTarget.dataset.q) || "";
    if (q) app.globalData.pendingQuery = q;
    wx.switchTab({ url: "/pages/chat/chat" });
  },

  unpin(e) {
    const i = e.currentTarget.dataset.i;
    app.globalData.pinned.splice(i, 1);
    this.setData({ pinned: app.globalData.pinned.slice() });
  },
});

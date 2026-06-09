const engine = require("../../utils/engine");
const app = getApp();

const SUGGESTIONS = ["研发部谁 OT 最多?", "帮我审批待处理的 OT", "给我看异常打卡", "做个研发部 OT 看板"];

Page({
  data: {
    messages: [],
    input: "",
    streaming: false,
    suggestions: SUGGESTIONS,
    toView: "",
    seq: 0,
  },

  onLoad() {
    this.push({ role: "ai", ctype: "text", text: "你好,我是 Attendance AI。问我考勤、加班、异常或合规的任何问题,我也能帮你生成看板。" });
  },

  onShow() {
    const q = app.globalData.pendingQuery;
    if (q) {
      app.globalData.pendingQuery = "";
      this.send(q);
    }
  },

  push(msg) {
    const id = this.data.seq + 1;
    const messages = this.data.messages.concat(Object.assign({ id }, msg));
    this.setData({ messages, seq: id, toView: "m" + id });
  },

  onInput(e) { this.setData({ input: e.detail.value }); },

  onSendTap() {
    const q = this.data.input;
    this.setData({ input: "" });
    this.send(q);
  },

  onSuggest(e) { this.send(e.currentTarget.dataset.q); },

  send(query) {
    const q = (query || "").trim();
    if (!q || this.data.streaming) return;
    this.push({ role: "user", ctype: "text", text: q });
    this.setData({ streaming: true });
    engine.invoke(q, {
      onMessage: (m) => this.push(m),
      onDone: () => this.setData({ streaming: false }),
    });
  },

  // ---- A2UI interactions ----
  toggleDrill(e) {
    const { i, name } = e.currentTarget.dataset;
    const cur = this.data.messages[i].open;
    this.setData({ ["messages[" + i + "].open"]: cur === name ? "" : name });
  },

  approve(e) {
    const i = e.currentTarget.dataset.i;
    this.setData({ ["messages[" + i + "].pending.status"]: "approved" });
    wx.showToast({ title: "已批准 ✓", icon: "success" });
  },
  reject(e) {
    const i = e.currentTarget.dataset.i;
    this.setData({ ["messages[" + i + "].pending.status"]: "rejected" });
    wx.showToast({ title: "已驳回", icon: "none" });
  },

  chipTap(e) {
    const { i, action } = e.currentTarget.dataset;
    this.setData({ ["messages[" + i + "].done"]: true });
    if (action === "batch_approve") {
      wx.showToast({ title: "已批量批准 3 笔 ✓", icon: "success" });
    }
  },

  pin(e) {
    const i = e.currentTarget.dataset.i;
    const m = this.data.messages[i];
    const exists = app.globalData.pinned.some((d) => d.title === m.title);
    if (!exists) {
      app.globalData.pinned.push({ title: m.title, tiles: m.tiles, series: m.series });
    }
    this.setData({ ["messages[" + i + "].pinned"]: true });
    wx.showToast({ title: "已钉到首页 📌", icon: "success" });
  },
});

const { getData } = require("../../utils/mockData");
const i18n = require("../../utils/i18n");
const hrms = require("../../utils/hrms");
const CFG = require("../../utils/config");
const app = getApp();

function loadLocale(locale, role) {
  const D = getData(locale);
  return {
    locale,
    t: i18n.t(locale),
    scope: D.scope,
    board: D.board[role] || D.board.ee, // 角色化:brief + 待办 + EE 个人提醒
    kpis: D.kpis,
    deptOt: D.deptOt,
    trend: D.trend,
    trendMax: Math.max.apply(null, D.trend),
    anomalies: D.anomalies,
    compliance: D.compliance,
  };
}

Page({
  data: { pinned: [], locale: "en", role: null, roleChosen: false, roleLabel: "" },

  onLoad() { this.applyLocale(i18n.getLocale()); },

  onShow() {
    this.setData({ pinned: app.globalData.pinned });
    // re-sync if language was changed on the other tab
    if (this.data.locale !== i18n.getLocale()) this.applyLocale(i18n.getLocale());
    this.syncRole();
  },

  applyLocale(locale) {
    this.setData(loadLocale(locale, app.globalData.role || "ee"));
    const s = i18n.t(locale);
    wx.setNavigationBarTitle({ title: s.navDashboard });
    if (wx.setTabBarItem) {
      wx.setTabBarItem({ index: 0, text: s.tabChat });
      wx.setTabBarItem({ index: 1, text: s.tabDashboard });
    }
    this.syncRole();
  },

  switchLang(e) {
    const locale = e.currentTarget.dataset.l;
    if (locale === this.data.locale) return;
    i18n.setLocale(locale);
    this.applyLocale(locale);
  },

  // ---- 角色:首屏引导选择 + 顶部切换 ----
  syncRole() {
    const role = app.globalData.role;
    const s = i18n.t(this.data.locale);
    this.setData({
      role,
      roleChosen: !!role,
      roleLabel: role ? (role === "manager" ? s.roleMgr : s.roleEE) : "",
      // 角色变化 → Board 内容(brief/待办/提醒)跟着切
      board: getData(this.data.locale).board[role || "ee"] || {},
    });
  },

  // 引导页点击 EE / Manager
  pickRole(e) { this.loginAs(e.currentTarget.dataset.r, false); },

  // 顶部 chip:EE <-> Manager 互切并重新登录。
  // 会话(聊天记录 + session_id)已按角色隔离,切换时各自保留,无需清理。
  switchRole() {
    const next = app.globalData.role === "manager" ? "ee" : "manager";
    this.loginAs(next, true);
  },

  // 用写死账号登录 HRMS,拿 token 后进入/刷新场景
  loginAs(role, isSwitch) {
    const s = i18n.t(this.data.locale);
    app.globalData.role = role;
    // HRMS 登录接口暂不可用(CFG.hrms.enabled=false):跳过登录,选角色直接进入
    if (!CFG.hrms || !CFG.hrms.enabled) {
      this.syncRole();
      if (isSwitch) {
        wx.showToast({ title: s.roleSwitched + (role === "manager" ? s.roleMgr : s.roleEE), icon: "none" });
      }
      return;
    }
    wx.showLoading({ title: s.loggingIn, mask: true });
    hrms.authenticate(role, (token) => {
      wx.hideLoading();
      this.syncRole();
      if (!token) {
        app.globalData.role = isSwitch ? app.globalData.role : null; // 引导失败回到未选
        this.syncRole();
        wx.showToast({ title: s.loginFail, icon: "none" });
        return;
      }
      if (isSwitch) {
        wx.showToast({ title: s.roleSwitched + (role === "manager" ? s.roleMgr : s.roleEE), icon: "none" });
      }
    });
  },

  askAI(e) {
    const q = e.currentTarget.dataset.q || "";
    if (q) app.globalData.pendingQuery = q;
    wx.switchTab({ url: "/pages/chat/chat" });
  },

  unpin(e) {
    const i = e.currentTarget.dataset.i;
    app.globalData.pinned.splice(i, 1);
    this.setData({ pinned: app.globalData.pinned.slice() });
  },
});

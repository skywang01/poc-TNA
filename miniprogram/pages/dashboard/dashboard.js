const { getData } = require("../../utils/mockData");
const i18n = require("../../utils/i18n");
const app = getApp();

function loadLocale(locale) {
  const D = getData(locale);
  return {
    locale,
    t: i18n.t(locale),
    scope: D.scope,
    aiSummary: D.aiSummary,
    kpis: D.kpis,
    deptOt: D.deptOt,
    trend: D.trend,
    trendMax: Math.max.apply(null, D.trend),
    anomalies: D.anomalies,
    compliance: D.compliance,
  };
}

Page({
  data: { pinned: [], locale: "en" },

  onLoad() { this.applyLocale(i18n.getLocale()); },

  onShow() {
    this.setData({ pinned: app.globalData.pinned });
    // re-sync if language was changed on the other tab
    if (this.data.locale !== i18n.getLocale()) this.applyLocale(i18n.getLocale());
  },

  applyLocale(locale) {
    this.setData(loadLocale(locale));
    const s = i18n.t(locale);
    wx.setNavigationBarTitle({ title: s.navDashboard });
    if (wx.setTabBarItem) {
      wx.setTabBarItem({ index: 0, text: s.tabDashboard });
      wx.setTabBarItem({ index: 1, text: s.tabChat });
    }
  },

  switchLang(e) {
    const locale = e.currentTarget.dataset.l;
    if (locale === this.data.locale) return;
    i18n.setLocale(locale);
    this.applyLocale(locale);
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

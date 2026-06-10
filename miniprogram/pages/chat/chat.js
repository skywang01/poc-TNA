const engine = require("../../utils/engine");
const CFG = require("../../utils/config");
const i18n = require("../../utils/i18n");
const app = getApp();

Page({
  data: {
    locale: "en",
    t: {},
    messages: [],
    input: "",
    userAvatar: "",
    streaming: false,
    voiceMode: false,
    recording: false,
    cancelling: false,
    suggestions: [],
    toView: "",
    seq: 0,
  },

  onLoad() {
    const locale = i18n.getLocale();
    const s = i18n.t(locale);
    this.setData({ locale, t: s, suggestions: s.suggestions });
    wx.setNavigationBarTitle({ title: s.navChat });
    if (wx.setTabBarItem) {
      wx.setTabBarItem({ index: 0, text: s.tabDashboard });
      wx.setTabBarItem({ index: 1, text: s.tabChat });
    }
    const saved = wx.getStorageSync("userAvatar");
    if (saved) this.setData({ userAvatar: saved });
    this.push({ role: "ai", ctype: "text", text: s.greeting });

    const rec = wx.getRecorderManager();
    this._rec = rec;
    rec.onStop((res) => {
      this.setData({ recording: false, cancelling: false });
      if (this._cancelled) return;
      if (!res || res.duration < 800) { wx.showToast({ title: this.data.t.tTooShort, icon: "none" }); return; }
      this.doStt(res.tempFilePath);
    });
    rec.onError(() => {
      this.setData({ recording: false, cancelling: false });
      wx.showToast({ title: this.data.t.tMicFail, icon: "none" });
    });
  },

  onShow() {
    if (this.data.locale !== i18n.getLocale()) this.applyLocale(i18n.getLocale());
    const q = app.globalData.pendingQuery;
    if (q) { app.globalData.pendingQuery = ""; this.send(q); }
  },

  applyLocale(locale) {
    const s = i18n.t(locale);
    this.setData({ locale, t: s, suggestions: s.suggestions });
    wx.setNavigationBarTitle({ title: s.navChat });
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

  onChooseAvatar(e) {
    const tmp = e.detail && e.detail.avatarUrl;
    if (!tmp) return;
    const fs = wx.getFileSystemManager();
    const dest = `${wx.env.USER_DATA_PATH}/avatar_${Date.now()}.png`;
    fs.copyFile({
      srcPath: tmp, destPath: dest,
      success: () => { this.setData({ userAvatar: dest }); wx.setStorageSync("userAvatar", dest); },
      fail: () => { this.setData({ userAvatar: tmp }); wx.setStorageSync("userAvatar", tmp); },
    });
  },

  push(msg) {
    const id = this.data.seq + 1;
    const messages = this.data.messages.concat(Object.assign({ id }, msg));
    this.setData({ messages, seq: id, toView: "m" + id });
  },

  onInput(e) { this.setData({ input: e.detail.value }); },

  toggleVoiceMode() { this.setData({ voiceMode: !this.data.voiceMode }); },
  recStart(e) {
    if (this.data.streaming) return;
    this._cancelled = false;
    this._startY = (e.touches && e.touches[0] && e.touches[0].clientY) || 0;
    this.setData({ recording: true, cancelling: false });
    this._rec.start({ format: "mp3", sampleRate: 16000, numberOfChannels: 1, duration: 60000 });
  },
  recMove(e) {
    if (!this.data.recording) return;
    const y = (e.touches && e.touches[0] && e.touches[0].clientY) || 0;
    const cancelling = this._startY - y > 80;
    if (cancelling !== this.data.cancelling) this.setData({ cancelling });
  },
  recEnd() {
    if (!this.data.recording) return;
    this._cancelled = this.data.cancelling;
    this._rec.stop();
  },

  doStt(filePath) {
    wx.showLoading({ title: this.data.t.tRecognizing, mask: true });
    const fs = wx.getFileSystemManager();
    fs.readFile({
      filePath, encoding: "base64",
      success: (r) => {
        wx.request({
          url: CFG.baseUrl + "/api/stt",
          method: "POST", timeout: 30000,
          header: { "content-type": "application/json", "x-service-key": CFG.serviceKey },
          data: { audio: r.data, format: "mp3" },
          success: (res) => {
            wx.hideLoading();
            const text = res.data && (res.data.text || res.data.result);
            if (text) { this.setData({ voiceMode: false }); this.send(text); }
            else wx.showToast({ title: this.data.t.tNoText, icon: "none" });
          },
          fail: () => { wx.hideLoading(); wx.showToast({ title: this.data.t.tSttFail, icon: "none" }); },
        });
      },
      fail: () => { wx.hideLoading(); wx.showToast({ title: this.data.t.tReadFail, icon: "none" }); },
    });
  },

  onSendTap() { const q = this.data.input; this.setData({ input: "" }); this.send(q); },
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

  toggleDrill(e) {
    const { i, name } = e.currentTarget.dataset;
    const cur = this.data.messages[i].open;
    this.setData({ ["messages[" + i + "].open"]: cur === name ? "" : name });
  },
  approve(e) {
    const i = e.currentTarget.dataset.i;
    this.setData({ ["messages[" + i + "].pending.status"]: "approved" });
    wx.showToast({ title: this.data.t.tApproved, icon: "success" });
  },
  reject(e) {
    const i = e.currentTarget.dataset.i;
    this.setData({ ["messages[" + i + "].pending.status"]: "rejected" });
    wx.showToast({ title: this.data.t.tRejected, icon: "none" });
  },
  chipTap(e) {
    const { i, action } = e.currentTarget.dataset;
    this.setData({ ["messages[" + i + "].done"]: true });
    if (action === "batch_approve") wx.showToast({ title: this.data.t.tBatch, icon: "success" });
  },
  pin(e) {
    const i = e.currentTarget.dataset.i;
    const m = this.data.messages[i];
    const exists = app.globalData.pinned.some((d) => d.title === m.title);
    if (!exists) app.globalData.pinned.push({ title: m.title, tiles: m.tiles, series: m.series });
    this.setData({ ["messages[" + i + "].pinned"]: true });
    wx.showToast({ title: this.data.t.tPinned, icon: "success" });
  },
});

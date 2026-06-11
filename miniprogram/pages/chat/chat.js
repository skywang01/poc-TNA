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
    // 未选角色(未登录 HRMS)则跳回看板的首屏引导,避免无 token 调用
    if (!app.globalData.role) { wx.switchTab({ url: "/pages/dashboard/dashboard" }); return; }
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
      onMessage: (m) => {
        if (m.ctype === "toolcall") {
          // 工具调用是过程信息:人话化展示,原始工具名降级为小字
          m.raw = m.label;
          m.label = this.humanizeTool(m.raw);
          this.push(m);
        } else if (m.ctype === "clock_punch") {
          // 时间/地点是设备的事实,agent 不可靠:到端即用本机时间覆盖,并发起定位
          this.prepPunch(m);
          this.push(m);
          this.locate(this.data.messages.length - 1);
        } else {
          this.push(m);
        }
      },
      onDone: () => this.setData({ streaming: false }),
    });
  },

  // 清空对话:消息流 + agent 多轮会话记忆(session_id)一起重置
  clearSession() {
    if (this.data.streaming) return; // 回复中不允许清,避免消息错位
    const t = this.data.t;
    wx.showModal({
      title: t.clearTitle,
      content: t.clearBody,
      confirmText: t.clearChat,
      confirmColor: "#DC2626",
      success: (r) => {
        if (!r.confirm) return;
        engine.resetSession();
        this.setData({ messages: [], seq: 0, input: "" });
        this.push({ role: "ai", ctype: "text", text: t.greeting });
        wx.showToast({ title: t.tCleared, icon: "success" });
      },
    });
  },

  // 工具名 -> 用户可读的状态文案(按业务关键词匹配,新工具不认识就走兜底)
  humanizeTool(raw) {
    const t = this.data.t;
    const s = (raw || "").toLowerCase();
    if (/payslip|salary/.test(s)) return t.toolPayslip;
    if (/clock_punch|punch/.test(s)) return t.toolPunch;
    if (/report/.test(s)) return t.toolReport;
    if (/query_ot|overtime|\bot\b/.test(s)) return t.toolOt;
    if (/anomal|detect/.test(s)) return t.toolAnomaly;
    return t.toolGeneric;
  },

  /* ---- clock_punch:设备侧注入 + HITL 确认 ---- */
  prepPunch(m) {
    const t = this.data.t;
    const zh = this.data.locale === "zh";
    const now = new Date();
    const p2 = (n) => (n < 10 ? "0" + n : "" + n);
    m.time = p2(now.getHours()) + ":" + p2(now.getMinutes()); // 回执/确认消息用
    m.timeHM = m.time;
    m.timeSS = p2(now.getSeconds());
    // 长日期:zh "2026年6月10日 · 周三";en "Wednesday, 10 June 2026"
    const MON = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const WD = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    m.dateLong = zh
      ? now.getFullYear() + "年" + (now.getMonth() + 1) + "月" + now.getDate() + "日 · 周" + "日一二三四五六"[now.getDay()]
      : WD[now.getDay()] + ", " + now.getDate() + " " + MON[now.getMonth()] + " " + now.getFullYear();
    // 班次/准点徽章:只信上游真数据(agent 从 HRMS 取到才有),没有就不显示
    if (m.shift && m.shift.start && m.shift.end) {
      m.shiftLabel = (m.shift.label ? m.shift.label + " " : "") + m.shift.start + "–" + m.shift.end;
      const toMin = (hm) => { const a = hm.split(":"); return +a[0] * 60 + +a[1]; };
      const mins = now.getHours() * 60 + now.getMinutes();
      if (m.punchType === "out") { m.badgeOk = mins >= toMin(m.shift.end); m.badge = m.badgeOk ? t.punchOnTime : t.punchEarly; }
      else { m.badgeOk = mins <= toMin(m.shift.start); m.badge = m.badgeOk ? t.punchOnTime : t.punchLate; }
    } else {
      m.shiftLabel = "";
      m.badge = "";
    }
    if (!m.status) m.status = "pending";
    // 地点:只显示真值 —— 定位中 → 真实坐标+精度;地图选点后才有地名
    m.locText = t.punchLocating;
    m.locSub = "";
    m.locState = "pending";
  },
  locate(i) {
    const t = this.data.t;
    wx.getLocation({
      type: "gcj02", isHighAccuracy: true,
      success: (r) => {
        this.setData({
          ["messages[" + i + "].loc"]: { lat: r.latitude, lng: r.longitude },
          // 全部真值:坐标 + GPS 精度
          ["messages[" + i + "].locText"]: r.latitude.toFixed(4) + ", " + r.longitude.toFixed(4),
          ["messages[" + i + "].locSub"]: "GPS ±" + Math.round(r.accuracy || 0) + "m",
          ["messages[" + i + "].locState"]: "ok",
        });
      },
      fail: () => this.setData({
        ["messages[" + i + "].locText"]: t.punchLocFail,
        ["messages[" + i + "].locSub"]: "",
        ["messages[" + i + "].locState"]: "fail",
      }),
    });
  },
  // 点地点行:地图选点 → 显示用户确认过的真实地名;定位失败时重试
  punchLoc(e) {
    const i = e.currentTarget.dataset.i;
    const m = this.data.messages[i];
    if (m.status !== "pending") return;
    if (m.locState === "fail") return this.locate(i);
    wx.chooseLocation({
      success: (r) => this.setData({
        ["messages[" + i + "].loc"]: { lat: r.latitude, lng: r.longitude },
        ["messages[" + i + "].locText"]: r.name || r.address,
        ["messages[" + i + "].locSub"]: r.address || "",
        ["messages[" + i + "].locState"]: "ok",
      }),
      fail: () => { if (!m.loc) this.locate(i); },
    });
  },
  confirmPunch(e) {
    const i = e.currentTarget.dataset.i;
    const m = this.data.messages[i];
    if (m.status !== "pending" || this.data.streaming) return;
    this.setData({ ["messages[" + i + "].status"]: "done" });
    // 确认词带坐标回传,agent 据此 call clock_punch 工具
    const coord = m.loc ? " (" + m.loc.lat.toFixed(4) + "," + m.loc.lng.toFixed(4) + ")" : "";
    this.send(this.data.t.punchConfirmMsg + coord);
  },
  cancelPunch(e) {
    const i = e.currentTarget.dataset.i;
    if (this.data.messages[i].status !== "pending") return;
    this.setData({ ["messages[" + i + "].status"]: "cancelled" });
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

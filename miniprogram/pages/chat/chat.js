const engine = require("../../utils/engine");
const CFG = require("../../utils/config");
const app = getApp();

const SUGGESTIONS = ["研发部谁 OT 最多?", "帮我审批待处理的 OT", "给我看异常打卡", "做个研发部 OT 看板"];

Page({
  data: {
    messages: [],
    input: "",
    userAvatar: "",   // real WeChat avatar chosen via open-type="chooseAvatar"
    streaming: false,
    voiceMode: false,   // composer in "按住说话" mode
    recording: false,
    cancelling: false,  // finger slid up to cancel
    suggestions: SUGGESTIONS,
    toView: "",
    seq: 0,
  },

  onLoad() {
    const saved = wx.getStorageSync("userAvatar");
    if (saved) this.setData({ userAvatar: saved });
    this.push({ role: "ai", ctype: "text", text: "你好,我是 Attendance AI。问我考勤、加班、异常或合规的任何问题,我也能帮你生成看板。" });

    // press-to-talk recorder
    const rec = wx.getRecorderManager();
    this._rec = rec;
    rec.onStop((res) => {
      this.setData({ recording: false, cancelling: false });
      if (this._cancelled) return;
      if (!res || res.duration < 800) { wx.showToast({ title: "说话时间太短", icon: "none" }); return; }
      this.doStt(res.tempFilePath);
    });
    rec.onError(() => {
      this.setData({ recording: false, cancelling: false });
      wx.showToast({ title: "录音失败,请检查麦克风权限", icon: "none" });
    });
  },

  // Real WeChat avatar picker (open-type="chooseAvatar"). Persist a local copy
  // so it survives restarts; fall back to the temp path if copy fails.
  onChooseAvatar(e) {
    const tmp = e.detail && e.detail.avatarUrl;
    if (!tmp) return;
    const fs = wx.getFileSystemManager();
    const dest = `${wx.env.USER_DATA_PATH}/avatar_${Date.now()}.png`;
    fs.copyFile({
      srcPath: tmp,
      destPath: dest,
      success: () => { this.setData({ userAvatar: dest }); wx.setStorageSync("userAvatar", dest); },
      fail: () => { this.setData({ userAvatar: tmp }); wx.setStorageSync("userAvatar", tmp); },
    });
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

  // ---- 按住说话:录音 → 腾讯云 ASR(/api/stt)→ 文字 → 发送 ----
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
    const cancelling = this._startY - y > 80; // slid up > 80px
    if (cancelling !== this.data.cancelling) this.setData({ cancelling });
  },
  recEnd() {
    if (!this.data.recording) return;
    this._cancelled = this.data.cancelling;
    this._rec.stop(); // onStop handler does the rest
  },

  // upload recorded audio to backend STT (Tencent ASR), then send the text
  doStt(filePath) {
    wx.showLoading({ title: "识别中…", mask: true });
    const fs = wx.getFileSystemManager();
    fs.readFile({
      filePath,
      encoding: "base64",
      success: (r) => {
        wx.request({
          url: CFG.baseUrl + "/api/stt",
          method: "POST",
          timeout: 30000,
          header: { "content-type": "application/json", "x-service-key": CFG.serviceKey },
          data: { audio: r.data, format: "mp3" },
          success: (res) => {
            wx.hideLoading();
            const text = res.data && (res.data.text || res.data.result);
            if (text) { this.setData({ voiceMode: false }); this.send(text); }
            else { wx.showToast({ title: "没听清,再说一次", icon: "none" }); }
          },
          fail: () => { wx.hideLoading(); wx.showToast({ title: "语音服务未就绪", icon: "none" }); },
        });
      },
      fail: () => { wx.hideLoading(); wx.showToast({ title: "读取录音失败", icon: "none" }); },
    });
  },

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

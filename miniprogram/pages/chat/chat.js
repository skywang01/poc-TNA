const engine = require("../../utils/engine");
const CFG = require("../../utils/config");
const i18n = require("../../utils/i18n");
const hrms = require("../../utils/hrms");
const app = getApp();

Page({
  data: {
    locale: "en",
    t: {},
    messages: [],
    roleLabel: "",
    input: "",
    userAvatar: "",
    streaming: false,
    voiceMode: true, // 默认按住说话(Hold to Talk),点 ⌨️ 切回键盘
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
      wx.setTabBarItem({ index: 0, text: s.tabChat });
      wx.setTabBarItem({ index: 1, text: s.tabDashboard });
    }
    const saved = wx.getStorageSync("userAvatar");
    if (saved) this.setData({ userAvatar: saved });
    // 问候语不在这里发:onShow -> syncRoleConvo 按角色建会话时统一注入

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
    this.syncRoleLabel();
    this.syncRoleConvo(app.globalData.role);
    const q = app.globalData.pendingQuery;
    if (q) { app.globalData.pendingQuery = ""; this.send(q); }
  },

  // 右上角角色 chip:显示当前身份
  syncRoleLabel() {
    const t = this.data.t;
    const lbl = app.globalData.role === "manager" ? t.roleMgr : t.roleEE;
    if (this.data.roleLabel !== lbl) this.setData({ roleLabel: lbl });
  },

  // 点角色 chip:EE <-> Manager 互切(同看板顶部 chip)。
  // 会话按角色隔离,syncRoleConvo 负责暂存/恢复;新角色 token 后台预热。
  switchRole() {
    if (this.data.streaming) return; // 回复中不切,避免消息错位
    const t = this.data.t;
    const next = app.globalData.role === "manager" ? "ee" : "manager";
    app.globalData.role = next;
    this.syncRoleLabel();
    this.syncRoleConvo(next);
    wx.showToast({ title: t.roleSwitched + (next === "manager" ? t.roleMgr : t.roleEE), icon: "none" });
    hrms.ensureToken((token) => {
      if (!token && CFG.hrms && CFG.hrms.enabled) wx.showToast({ title: t.loginFail, icon: "none" });
    });
  },

  // 会话按角色隔离:切换角色时暂存当前对话,恢复(或新建)目标角色的对话。
  // agent 侧的 session_id 在 engine.js 里同样按角色隔离。
  syncRoleConvo(role) {
    if (!this._convos) this._convos = {};
    if (this._role === role) return;
    if (this._role) this._convos[this._role] = { messages: this.data.messages, seq: this.data.seq };
    this._role = role;
    const c = this._convos[role];
    if (c) {
      this.setData({ messages: c.messages, seq: c.seq, toView: "m" + c.seq });
    } else {
      this.setData({ messages: [], seq: 0 });
      this.push({ role: "ai", ctype: "text", text: this.data.t.greeting });
    }
  },

  applyLocale(locale) {
    const s = i18n.t(locale);
    this.setData({ locale, t: s, suggestions: s.suggestions });
    wx.setNavigationBarTitle({ title: s.navChat });
    if (wx.setTabBarItem) {
      wx.setTabBarItem({ index: 0, text: s.tabChat });
      wx.setTabBarItem({ index: 1, text: s.tabDashboard });
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
            // 识别成功直接发送,保持语音模式不退出(点 ⌨️ 才切键盘)
            if (text) { this.send(text); }
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
    // 发起时锁定角色:串流途中切了角色,旧角色的回复直接丢弃,不污染新会话
    const sendRole = app.globalData.role;
    engine.invoke(q, {
      onMessage: (m) => {
        if (app.globalData.role !== sendRole) return;
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
        } else if (m.ctype === "ot_request") {
          // 默认日期取本机今天;agent 给了预填值(date/start/end/otType)则尊重
          this.prepOtForm(m);
          this.push(m);
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
    if (/approve_ot|reject_ot/.test(s)) return t.toolOtApprove;
    if (/submit_ot|ot_request|apply_ot/.test(s)) return t.toolOtSubmit;
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
    // 确认词带坐标 + 设备时间回传:坐标给 clock_punch 工具,时间给 agent 算 OT 资格
    // (prompt 规定 agent 不许编造时间,所以打卡时刻必须由设备写进对话)
    const coord = m.loc ? " (" + m.loc.lat.toFixed(4) + "," + m.loc.lng.toFixed(4) + ")" : "";
    const now = new Date();
    const p2 = (n) => (n < 10 ? "0" + n : "" + n);
    this.send(this.data.t.punchConfirmMsg + coord + " @ " + p2(now.getHours()) + ":" + p2(now.getMinutes()));
  },
  cancelPunch(e) {
    const i = e.currentTarget.dataset.i;
    if (this.data.messages[i].status !== "pending") return;
    this.setData({ ["messages[" + i + "].status"]: "cancelled" });
  },

  /* ---- ot_request:OT 申请表单 + HITL 提交 ---- */
  prepOtForm(m) {
    const now = new Date();
    const p2 = (n) => (n < 10 ? "0" + n : "" + n);
    // agent 预填的日期可能是幻觉(LLM 不知道今天几号):超出 [今天-30d, 今天+60d]
    // 的视为无效,丢弃后回退设备今天
    if (m.date) {
      const diff = (new Date(String(m.date).replace(/-/g, "/")) - now) / 86400000;
      if (isNaN(diff) || diff < -30 || diff > 60) m.date = "";
    }
    if (!m.date) m.date = now.getFullYear() + "-" + p2(now.getMonth() + 1) + "-" + p2(now.getDate());
    if (!m.start) m.start = "19:00";
    if (!m.end) m.end = "21:00";
    if (!m.otType) m.otType = "pay"; // pay = OT Pay,leave = OT Leave
    if (m.reason == null) m.reason = ""; // 选填
    if (!m.status) m.status = "pending";
    this.calcOtDuration(m);
  },
  // 时长 = end - start;跨零点(end <= start)按次日算并标注
  calcOtDuration(m) {
    const toMin = (hm) => { const a = hm.split(":"); return +a[0] * 60 + +a[1]; };
    let diff = toMin(m.end) - toMin(m.start);
    m.overnight = diff <= 0;
    if (m.overnight) diff += 24 * 60;
    m.hours = Math.round((diff / 60) * 10) / 10;
    m.durationText = m.hours + this.data.t.hoursUnit + (m.overnight ? " " + this.data.t.otNextDay : "");
  },
  otFieldChange(e, key) {
    const i = e.currentTarget.dataset.i;
    const m = this.data.messages[i];
    if (m.status !== "pending") return;
    m[key] = e.detail.value;
    this.calcOtDuration(m);
    this.setData({
      ["messages[" + i + "]." + key]: m[key],
      ["messages[" + i + "].hours"]: m.hours,
      ["messages[" + i + "].overnight"]: m.overnight,
      ["messages[" + i + "].durationText"]: m.durationText,
    });
  },
  otDate(e) { this.otFieldChange(e, "date"); },
  otReason(e) {
    const i = e.currentTarget.dataset.i;
    if (this.data.messages[i].status !== "pending") return;
    this.setData({ ["messages[" + i + "].reason"]: e.detail.value });
  },
  otStart(e) { this.otFieldChange(e, "start"); },
  otEnd(e) { this.otFieldChange(e, "end"); },
  otTypeTap(e) {
    const { i, v } = e.currentTarget.dataset;
    if (this.data.messages[i].status !== "pending") return;
    this.setData({ ["messages[" + i + "].otType"]: v });
  },
  submitOtReq(e) {
    const i = e.currentTarget.dataset.i;
    const m = this.data.messages[i];
    if (m.status !== "pending" || this.data.streaming) return;
    this.setData({ ["messages[" + i + "].status"]: "done" });
    // 确认词带全部字段回传,agent 据此 call submit_ot_request 工具
    const t = this.data.t;
    const type = m.otType === "leave" ? t.otTypeLeave : t.otTypePay;
    // employee_code 取当前角色账号配置;EE 缺省 13000827(POC 写死的演示工号)
    const role = app.globalData.role || CFG.role || "ee";
    const acct = (CFG.hrms && CFG.hrms.accounts && CFG.hrms.accounts[role]) || {};
    const empCode = acct.employeeCode || (role === "ee" ? "13000827" : "");
    const reason = (m.reason || "").trim();
    this.send(t.otSubmitMsg + ": " + m.date + " " + m.start + "–" + m.end + ", " + m.hours + t.hoursUnit + ", " + type +
      (reason ? ", " + t.kReason + ": " + reason : "") +
      (empCode ? ", employee_code=" + empCode : ""));
  },
  cancelOtReq(e) {
    const i = e.currentTarget.dataset.i;
    if (this.data.messages[i].status !== "pending") return;
    this.setData({ ["messages[" + i + "].status"]: "cancelled" });
  },

  toggleDrill(e) {
    const { i, name } = e.currentTarget.dataset;
    const cur = this.data.messages[i].open;
    this.setData({ ["messages[" + i + "].open"]: cur === name ? "" : name });
  },
  // ot_approval 单卡:同样回发确认消息,agent 才调 approve_ot_request
  approve(e) {
    const i = e.currentTarget.dataset.i;
    const p = this.data.messages[i].pending;
    if (p.status || this.data.streaming) return;
    this.setData({ ["messages[" + i + "].pending.status"]: "approved" });
    this.send(this.otRowMsg(this.data.t, this.data.t.otApproveMsg, p));
  },
  reject(e) {
    const i = e.currentTarget.dataset.i;
    const p = this.data.messages[i].pending;
    if (p.status || this.data.streaming) return;
    this.setData({ ["messages[" + i + "].pending.status"]: "rejected" });
    this.send(this.otRowMsg(this.data.t, this.data.t.otRejectMsg, p));
  },
  // ot_pending_list:行内批准 / 驳回。HITL 同款:置状态后回发结构化确认消息,
  // agent 收到才 call approve_ot_request 工具(端上不直接调任何接口)。
  otRowMsg(t, prefix, r) {
    return prefix + ": id=" + r.id + ", " + r.name + ", " + r.date +
      (r.start ? " " + r.start + "–" + r.end : "") + ", " + r.hours + "h";
  },
  approveRow(e) {
    const { i, j } = e.currentTarget.dataset;
    const r = this.data.messages[i].items[j];
    if (r.status || this.data.streaming) return;
    this.setData({ ["messages[" + i + "].items[" + j + "].status"]: "approved" });
    this.send(this.otRowMsg(this.data.t, this.data.t.otApproveMsg, r));
  },
  rejectRow(e) {
    const { i, j } = e.currentTarget.dataset;
    const r = this.data.messages[i].items[j];
    if (r.status || this.data.streaming) return;
    this.setData({ ["messages[" + i + "].items[" + j + "].status"]: "rejected" });
    this.send(this.otRowMsg(this.data.t, this.data.t.otRejectMsg, r));
  },
  // ⚡ 一键批准:表格里所有未处理行 → 一条批量确认消息
  batchApproveTable(e) { this.doBatchApprove(e.currentTarget.dataset.i); },
  doBatchApprove(mi) {
    if (this.data.streaming) return;
    const m = this.data.messages[mi];
    if (!m || m.ctype !== "ot_pending_list" || !m.items) return;
    const pend = [];
    const patch = {};
    m.items.forEach((r, ri) => {
      if (!r.status) { pend.push(r); patch["messages[" + mi + "].items[" + ri + "].status"] = "approved"; }
    });
    if (!pend.length) return;
    this.setData(patch);
    this.send(this.data.t.otBatchMsg + ": " + pend.map((r) => "id=" + r.id + " (" + r.name + ")").join("; "));
  },
  // 点姓名:引导到单笔 ot_approval 审批卡
  viewOneOt(e) {
    if (this.data.streaming) return;
    const { i, j } = e.currentTarget.dataset;
    const r = this.data.messages[i].items[j];
    this.send(this.data.t.otViewQ.replace("{name}", r.name));
  },
  chipTap(e) {
    const { i, action } = e.currentTarget.dataset;
    this.setData({ ["messages[" + i + "].done"]: true });
    if (action === "batch_approve") {
      // 批量批准:走最近一张待审批表格的批量流程(回发确认消息 → agent 调工具)
      let li = -1;
      this.data.messages.forEach((m, mi) => { if (m.ctype === "ot_pending_list") li = mi; });
      if (li >= 0) this.doBatchApprove(li);
      else wx.showToast({ title: this.data.t.tBatch, icon: "success" });
    }
    // "ask:<追问>" 动作:点 chip 即代用户发出追问(如打卡后引导申请 OT)
    else if (action && action.indexOf("ask:") === 0) this.send(action.slice(4));
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

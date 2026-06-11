// HRMS 两步登录,按角色缓存最终 user token。
//   STEP1  POST /idtapi/System/Authenticate (系统账号)                   -> systemToken
//   STEP2  POST /idtapi/Mobile/Authenticate (Bearer systemToken
//          + 角色账号,EE/Manager 只换 loginID;账号配 api:"user" 则走
//          /User/Authenticate)                                           -> userToken
// userToken 在 engine.invokeReal 里作为 X-HRMS-Authorization 透传给 agent,
// 平台(bipo-ai-service)再经 forward_rules 透传给 HRMS MCP 工具 —— 后端零改动。
const CFG = require("./config");

const _tokens = {}; // { ee: "<userToken>", manager: "<userToken>" }

function currentRole() {
  const app = getApp();
  return (app && app.globalData && app.globalData.role) || CFG.role || "ee";
}

// ---- 请求拼装 ----
function hrmsUrl(path) {
  // 走网关(dev.bipocloud.com):/<tenant>/idtapi/...;ngrok 直连:/idtapi/...
  return CFG.hrms.gateway
    ? CFG.hrms.baseUrl + "/" + CFG.hrms.tenant + "/idtapi" + path
    : CFG.hrms.baseUrl + "/idtapi" + path;
}
function tenantHeader(extra) {
  return Object.assign(
    {
      "content-type": "application/json",
      "x-tenant-code": CFG.hrms.tenant,
      // ngrok free 域名对疑似浏览器的请求会插一页 HTML 警告,带此头跳过
      "ngrok-skip-browser-warning": "true",
    },
    extra || {}
  );
}
// 两步共享的连接 body;extra 覆盖 loginID/password 等
function connBody(extra) {
  const c = CFG.hrms.connection || {};
  return Object.assign(
    {
      tenant: CFG.hrms.tenant,
      client: c.client,
      clientConnection: c.clientConnection || "",
      server: c.server || "",
      database: c.database,
      langCultureCode: c.langCultureCode || "en-US",
      country: c.country,
    },
    extra
  );
}

// ⚠️ 若实际响应里 token 字段不是 AccessToken,改这里即可
function extractToken(data) {
  if (!data) return null;
  return (
    data.AccessToken ||
    data.accessToken ||
    data.token ||
    data.Token ||
    (data.data && (data.data.AccessToken || data.data.accessToken || data.data.token)) ||
    (data.result && (data.result.AccessToken || data.result.accessToken)) ||
    null
  );
}

// STEP1: 系统认证 -> systemToken
function systemAuthenticate(cb) {
  const sys = (CFG.hrms && CFG.hrms.systemAccount) || { loginID: "HRM", password: "" };
  wx.request({
    url: hrmsUrl("/System/Authenticate"),
    method: "POST",
    timeout: 15000,
    header: tenantHeader(),
    data: connBody({ loginID: sys.loginID, password: sys.password }),
    success(res) {
      const t = extractToken(res.data);
      if (!t) console.warn("[hrms] System/Authenticate: no token", res.data);
      cb(t);
    },
    fail(err) {
      console.error("[hrms] System/Authenticate failed", err);
      cb(null);
    },
  });
}

// STEP2: 用户认证(带系统 token)-> userToken
// 默认走员工端 /Mobile/Authenticate(loginType 2 + deviceID);
// 账号配 api:"user" 则走 /User/Authenticate(系统账号如 HRM 只能走这个)。
function userAuthenticate(systemToken, acct, cb) {
  const mobile = (acct.api || "mobile") === "mobile";
  wx.request({
    url: hrmsUrl(mobile ? "/Mobile/Authenticate" : "/User/Authenticate"),
    method: "POST",
    timeout: 15000,
    header: tenantHeader({ Authorization: "Bearer " + systemToken }),
    data: connBody(
      mobile
        ? {
            loginID: acct.loginID,
            password: acct.password || "",
            loginType: 2,
            deviceID: CFG.hrms.deviceID || "tna-poc-miniprogram",
          }
        : {
            loginID: acct.loginID,
            password: acct.password || "",
            dateFormat: "dd/MM/yyyy",
            timeFormat: "HH:mm",
            loginType: 0,
          }
    ),
    success(res) {
      const t = extractToken(res.data);
      if (!t) console.warn("[hrms] STEP2 Authenticate: no token", res.data);
      cb(t);
    },
    fail(err) {
      console.error("[hrms] STEP2 Authenticate failed", err);
      cb(null);
    },
  });
}

// 完整两步登录(每次都重新走,满足切换角色 = 重新登录)
function authenticate(role, cb) {
  if (!CFG.hrms || !CFG.hrms.enabled) return cb && cb(null); // 登录接口暂不可用,跳过
  role = role || currentRole();
  const acct = CFG.hrms && CFG.hrms.accounts && CFG.hrms.accounts[role];
  if (!acct) return cb && cb(null);
  systemAuthenticate(function (systemToken) {
    if (!systemToken) return cb && cb(null);
    userAuthenticate(systemToken, acct, function (userToken) {
      if (userToken) _tokens[role] = userToken;
      cb && cb(userToken);
    });
  });
}

function getToken(role) {
  return _tokens[role || currentRole()] || null;
}

// 确保当前角色有 token:有缓存直接用,否则走两步登录。
function ensureToken(cb) {
  if (!CFG.hrms || !CFG.hrms.enabled) return cb && cb(null); // 跳过登录,无 token 直接走
  const role = currentRole();
  if (_tokens[role]) return cb && cb(_tokens[role]);
  authenticate(role, cb);
}

module.exports = { authenticate, getToken, ensureToken, currentRole };

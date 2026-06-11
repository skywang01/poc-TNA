// Copy to config.js (gitignored) and fill serviceKey. config.js ships inside the
// mini-program package, so the key is visible to clients — acceptable for a
// workshop POC; in production route through your own backend instead.
module.exports = {
  useMock: false,                                  // false = call real agent platform
  baseUrl: "https://bipo-ai-test.bipocloud.com",
  agentId: "attendance-ai",
  serviceKey: "sk_xxx",                            // fill the real Service Key locally

  role: "ee",                                      // "ee" | "manager" 入口角色

  // HRMS 两步登录 + 透传(STEP1 System -> systemToken;STEP2 User(Bearer)-> userToken;
  // userToken 经 X-HRMS-Authorization 带给 agent,平台透传给 HRMS MCP)
  hrms: {
    enabled: false,                                // false = 跳过 HRMS login,invoke 不带 X-HRMS-* header
    baseUrl: "https://hrms-gateway.ap.ngrok.io",   // X-HRMS-Base-URL;host 须在服务端 HRMS_API_ALLOWED_HOSTS 白名单
    gateway: false,                                // true=网关(/<tenant>/idtapi/...);false=直连(/idtapi/...)
    tenant: "BPO",                                 // x-tenant-code、X-HRMS-Tenant、body.tenant
    connection: {                                  // 两步共享连接参数(连接串放 server,clientConnection 留空)
      client: "CCG",
      clientConnection: "",
      server: "host.docker.internal",
      database: "BPO",
      langCultureCode: "en-US",
      country: "HK",
    },
    systemAccount: { loginID: "HRM", password: "" }, // STEP1 系统账号
    accounts: {                                      // STEP2 写死的两个用户账号(只换 loginID)
      ee:      { loginID: "<EE_LOGIN>",  password: "" },
      manager: { loginID: "<MGR_LOGIN>", password: "" },
    },
  },
};

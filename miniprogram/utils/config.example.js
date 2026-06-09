// Copy to config.js (gitignored) and fill serviceKey. config.js ships inside the
// mini-program package, so the key is visible to clients — acceptable for a
// workshop POC; in production route through your own backend instead.
module.exports = {
  useMock: false,                                  // false = call real agent platform
  baseUrl: "https://bipo-ai-test.bipocloud.com",
  agentId: "attendance-ai",
  serviceKey: "sk_xxx",                            // fill the real Service Key locally
};

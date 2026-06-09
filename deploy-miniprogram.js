// Headless WeChat mini-program upload via miniprogram-ci (no DevTools GUI needed).
//
// Prereqs (one-time, from https://mp.weixin.qq.com):
//   开发管理 → 开发设置 → 小程序代码上传:
//     1) 生成并下载「上传密钥」-> save as ./private.wx3b230e6a8f7d7e10.key
//     2) 配置 IP 白名单 -> add this machine's public IP
//   (real-device requests also need 服务器域名 → request 合法域名:
//    https://bipo-ai-test.bipocloud.com)
//
// Usage:
//   node deploy-miniprogram.js [version] [desc]
//   MP_PRIVATE_KEY=/path/to/private.key node deploy-miniprogram.js 1.0.0 "first upload"

const path = require("path");
const fs = require("fs");
const ci = require("miniprogram-ci");

const APPID = "wx3b230e6a8f7d7e10";
const version = process.argv[2] || "1.0.0";
const desc = process.argv[3] || "AI for Attendance POC (agent platform)";
const keyPath = process.env.MP_PRIVATE_KEY || path.resolve(__dirname, `private.${APPID}.key`);
const projectPath = path.resolve(__dirname, "miniprogram");

(async () => {
  if (!fs.existsSync(keyPath)) {
    console.error(`✗ 上传密钥不存在: ${keyPath}\n  请从 mp.weixin.qq.com 下载后放到此路径,或用 MP_PRIVATE_KEY 指定。`);
    process.exit(1);
  }
  const project = new ci.Project({
    appid: APPID,
    type: "miniProgram",
    projectPath,
    privateKeyPath: keyPath,
    ignores: ["node_modules/**/*"],
  });

  console.log(`↑ uploading ${projectPath}  version=${version}`);
  const result = await ci.upload({
    project,
    version,
    desc,
    setting: { es6: true, minify: true },
    onProgressUpdate: (t) => process.stdout.write("."),
  });
  console.log("\n✓ upload done");
  console.log(JSON.stringify(result, null, 2));
})().catch((e) => {
  console.error("\n✗ upload failed:", e && e.message ? e.message : e);
  process.exit(1);
});

// Bilingual fake-but-realistic attendance data. getData(locale) -> localized set.

const DATA = {
  en: {
    scope: { month: "2026-06", org: "All Departments" },
    aiSummary: {
      summaryLine:
        "Attendance is 96.2% this month (▲2.1% MoM) — healthy overall. R&D overtime is up 38% YoY, nearing the budget cap. 3 anomalies and 2 compliance risks detected; prioritize the suspected buddy-punching and Wang Jiu's consecutive-hours breach.",
      anomalies: 3,
      risks: 2,
    },
    kpis: [
      { label: "Attendance", value: "96.2%", delta: "↑ 2.1% vs last mo", up: true },
      { label: "Punctuality", value: "91.4%", delta: "↓ 1.3%", up: false },
      { label: "Total OT", value: "1,284h", delta: "↑ 38% led by R&D", up: false },
      { label: "Absences", value: "47", delta: "↓ 9", up: true },
    ],
    deptOt: [
      { dept: "R&D", hours: 486, pct: 100 },
      { dept: "Sales", hours: 232, pct: 48 },
      { dept: "Ops", hours: 171, pct: 35 },
      { dept: "Support", hours: 108, pct: 22 },
      { dept: "HR", hours: 74, pct: 15 },
    ],
    trend: [78, 84, 80, 90, 86, 96, 92],
    anomalies: [
      { id: "an-1", title: "Suspected buddy-punch · Zhang San (R&D)", why: "Clocked in at 09:00:02 sharp for 5 days straight, location drifted 1.2km. ", ai: "AI: highly regular pattern, recommend review", severity: "high" },
      { id: "an-2", title: "OT spike · R&D", why: "OT up 38% WoW, concentrated in 3 people. ", ai: "AI: likely schedule crunch", severity: "high" },
      { id: "an-3", title: "Lateness pattern · Li Si", why: "80% late rate on Mondays, far above other weekdays. ", ai: "AI: cyclical pattern", severity: "mid" },
    ],
    compliance: [
      { id: "cp-1", title: "Consecutive-hours breach · Wang Jiu", why: "62h over the last 7 days, exceeds the labor-law cap. ", ai: "AI: labor-compliance risk, mandate rest", severity: "high" },
      { id: "cp-2", title: "Insufficient rest gap · 3 in Support", why: "Shift gap < 11h. ", ai: "AI: adjust rostering", severity: "mid" },
    ],
    rdOtTop: [
      { name: "Zhang San", hours: 96, pct: 100, daily: [{ date: "May 10 (Sat)", hours: 9.5 }, { date: "May 25 (Sat)", hours: 9.5 }] },
      { name: "Chen Liu", hours: 61, pct: 64, daily: [{ date: "May 18 (Sun)", hours: 8 }] },
      { name: "Wang Jiu", hours: 41, pct: 43, daily: [{ date: "May 19 (Mon)", hours: 4 }] },
      { name: "Lin Qi", hours: 29, pct: 30, daily: [{ date: "May 20 (Tue)", hours: 3 }] },
      { name: "Zhao Ba", hours: 20, pct: 21, daily: [{ date: "May 21 (Wed)", hours: 2.5 }] },
    ],
    pendingOt: [
      { id: "ot-zs", name: "Zhang San", dept: "R&D", date: "2026-05-25 (Sat)", start: "19:00", end: "04:30", hours: 9.5, otType: "pay", reason: "Release crunch", flag: "This employee already logged 58h in the last 7 days; approving nears the labor-law cap" },
      { id: "ot-sales-1", name: "Zhou Yi", dept: "Sales", date: "2026-05-28 (Wed)", start: "18:30", end: "21:30", hours: 3.0, otType: "pay", reason: "Client demo prep" },
      { id: "ot-sales-2", name: "Wu Er", dept: "Sales", date: "2026-05-29 (Thu)", start: "19:00", end: "21:30", hours: 2.5, otType: "leave", reason: "Quarter-end sprint" },
    ],
    generatedDashboard: {
      title: "R&D OT Dashboard",
      tiles: [
        { label: "OT this mo", value: "486h" },
        { label: "Per capita", value: "17.4h" },
        { label: "Risks", value: "2", danger: true },
      ],
      series: [40, 55, 48, 80, 100, 72],
    },
    title: { otBreakdown: "R&D OT Top 5", otApproval: "OT Approval · " },
    // AI Board:扁平结果流,按角色注入(brief + AI 生成的待办 + EE 个人提醒)
    board: {
      ee: {
        brief: "Clocked in at 08:55 today. 2 late arrivals this month; your OT request (06-05) is pending approval. Your May payslip just arrived — net pay credited.",
        briefBtns: [
          { label: "My attendance report", q: "Attendance daily report" },
        ],
        todos: [
          { id: "td-pay", title: "New payslip · May 2026", desc: "AI can break down the composition and changes for you.", action: "View", q: "I just received my May payslip — analyze my salary for me" },
          { id: "td-punch", title: "Not clocked out yet today", desc: "Your shift ends at 18:00.", action: "Punch", q: "Clock out for me" },
          { id: "td-leave", title: "3 annual-leave days expire 12-31", desc: "Plan ahead so they don't go to waste.", action: "Plan", q: "Check my annual leave balance and suggest how to use it" },
        ],
        alerts: [
          { id: "ea-1", title: "Overtime streak · this week 12h", why: "Approaching the weekly cap. ", ai: "AI: schedule rest", severity: "mid" },
        ],
      },
      manager: {
        brief: "Team attendance 39/40 today. 3 approvals waiting (OT ×2, leave ×1) — 1 carries a compliance flag. R&D overtime is still climbing.",
        briefBtns: [
          { label: "View risks", q: "Summarize this month's anomalies and compliance risks with recommendations" },
          { label: "Analyze with AI →", q: "Why did R&D overtime spike, and who worked the most OT?" },
        ],
        todos: [
          { id: "td-appr", title: "3 approvals pending", desc: "OT ×2 (Sales), leave ×1 (Ops) — 1 has a compliance flag.", action: "Process", q: "Help me approve pending OT" },
          { id: "td-risk", title: "Zhang San nearing hours cap", desc: "58h in the last 7 days.", action: "Review", q: "Deep-dive: Zhang San consecutive working-hours risk" },
        ],
      },
    },
    // Payslip 分析卡(EE 待办 deep-link 后,Assistant 渲染)
    payslip: {
      title: "Payslip · May 2026",
      views: [
        { chart: "pie", title: "Gross composition", data: {
          items: [
            { name: "Base", value: 24000 },
            { name: "Performance", value: 6000 },
            { name: "Allowance", value: 2000 },
          ],
        } },
        { chart: "table", title: "Breakdown", data: {
          columns: ["Item", "Amount"],
          rows: [
            ["Gross", "¥32,000"],
            ["Social insurance", "-¥2,240"],
            ["Housing fund", "-¥3,840"],
            ["Income tax", "-¥1,890"],
            ["Net pay", "¥24,030"],
          ],
        } },
      ],
    },
    // attendance_report:声明式 views,chart 类型对应 chart-view 注册表
    report: {
      ee: {
        title: "My Attendance · June 2026",
        views: [
          { chart: "table", title: "Daily clock-ins", data: {
            columns: ["Date", "In", "Out", "Status"],
            rows: [
              ["06-10 Wed", "08:55", "18:32", "Normal"],
              ["06-09 Tue", "09:12", "19:05", "Late"],
              ["06-08 Mon", "08:58", "18:20", "Normal"],
              ["06-05 Fri", "08:51", "21:40", "Normal"],
              ["06-04 Thu", "—", "—", "Leave"],
              ["06-03 Wed", "08:57", "18:15", "Normal"],
              ["06-02 Tue", "09:31", "18:44", "Late"],
              ["06-01 Mon", "08:49", "18:08", "Normal"],
            ],
          } },
        ],
      },
      manager: {
        title: "Team Attendance Report · June 2026",
        views: [
          { chart: "line", title: "Attendance rate trend (%)", data: {
            x: ["06-01", "06-02", "06-03", "06-04", "06-05", "06-08", "06-09", "06-10"],
            y: [97.5, 95.0, 96.3, 92.5, 96.3, 98.8, 93.8, 97.5],
          } },
          { chart: "pie", title: "Status distribution (person-days)", data: {
            items: [
              { name: "Normal", value: 86 },
              { name: "Late", value: 6 },
              { name: "Early leave", value: 3 },
              { name: "Absent", value: 2 },
              { name: "Leave", value: 3 },
            ],
          } },
          { chart: "bar", title: "Late count by member", data: {
            names: ["Li Si", "Zhang San", "Wu Er", "Lin Qi", "Zhao Ba"],
            values: [5, 3, 2, 1, 1],
          } },
          { chart: "table", title: "Daily summary", data: {
            columns: ["Date", "Present", "Late", "Absent"],
            rows: [
              ["06-10 Wed", "39/40", "1", "0"],
              ["06-09 Tue", "37/40", "3", "1"],
              ["06-08 Mon", "40/40", "0", "0"],
            ],
          } },
        ],
      },
    },
  },

  zh: {
    scope: { month: "2026-06", org: "全公司" },
    aiSummary: {
      summaryLine:
        "本月出勤率 96.2%(环比 ↑2.1%),整体健康。研发部 OT 同比 +38%,逼近预算上限。检测到 3 处异常与 2 项合规风险,建议优先处理代打卡疑点与王九连续工时超限。",
      anomalies: 3,
      risks: 2,
    },
    kpis: [
      { label: "出勤率", value: "96.2%", delta: "↑ 2.1% vs 上月", up: true },
      { label: "准时率", value: "91.4%", delta: "↓ 1.3%", up: false },
      { label: "OT 总工时", value: "1,284h", delta: "↑ 38% 研发部主导", up: false },
      { label: "缺勤人次", value: "47", delta: "↓ 9", up: true },
    ],
    deptOt: [
      { dept: "研发", hours: 486, pct: 100 },
      { dept: "销售", hours: 232, pct: 48 },
      { dept: "运营", hours: 171, pct: 35 },
      { dept: "客服", hours: 108, pct: 22 },
      { dept: "HR", hours: 74, pct: 15 },
    ],
    trend: [78, 84, 80, 90, 86, 96, 92],
    anomalies: [
      { id: "an-1", title: "疑似代打卡 · 张三(研发)", why: "连续 5 天 09:00:02 整点打卡,位置漂移 1.2km。", ai: "AI:行为高度规律,建议核查", severity: "high" },
      { id: "an-2", title: "OT 异常飙升 · 研发部", why: "本周 OT 环比 +38%,集中在 3 人。", ai: "AI:疑似排期挤压", severity: "high" },
      { id: "an-3", title: "迟到模式异常 · 李四", why: "周一迟到率 80%,显著高于其他工作日。", ai: "AI:周期性模式", severity: "mid" },
    ],
    compliance: [
      { id: "cp-1", title: "连续工时超限 · 王九", why: "近 7 天累计 62h,超劳工法上限。", ai: "AI:有用工合规风险,建议强制休息", severity: "high" },
      { id: "cp-2", title: "休息间隔不足 · 客服 3 人", why: "班次间隔 < 11h。", ai: "AI:建议调整排班", severity: "mid" },
    ],
    rdOtTop: [
      { name: "张三", hours: 96, pct: 100, daily: [{ date: "05-10 (六)", hours: 9.5 }, { date: "05-25 (六)", hours: 9.5 }] },
      { name: "陈六", hours: 61, pct: 64, daily: [{ date: "05-18 (日)", hours: 8 }] },
      { name: "王九", hours: 41, pct: 43, daily: [{ date: "05-19 (一)", hours: 4 }] },
      { name: "林七", hours: 29, pct: 30, daily: [{ date: "05-20 (二)", hours: 3 }] },
      { name: "赵八", hours: 20, pct: 21, daily: [{ date: "05-21 (三)", hours: 2.5 }] },
    ],
    pendingOt: [
      { id: "ot-zs", name: "张三", dept: "研发", date: "2026-05-25 (周六)", start: "19:00", end: "04:30", hours: 9.5, otType: "pay", reason: "版本上线赶工", flag: "该员工近 7 天累计已 58h,批准后将逼近劳工法上限" },
      { id: "ot-sales-1", name: "周一", dept: "销售", date: "2026-05-28 (周三)", start: "18:30", end: "21:30", hours: 3.0, otType: "pay", reason: "客户演示筹备" },
      { id: "ot-sales-2", name: "吴二", dept: "销售", date: "2026-05-29 (周四)", start: "19:00", end: "21:30", hours: 2.5, otType: "leave", reason: "季度冲刺" },
    ],
    generatedDashboard: {
      title: "研发部 OT 看板",
      tiles: [
        { label: "本月 OT", value: "486h" },
        { label: "人均", value: "17.4h" },
        { label: "合规风险", value: "2", danger: true },
      ],
      series: [40, 55, 48, 80, 100, 72],
    },
    title: { otBreakdown: "研发部 OT Top 5", otApproval: "OT 审批 · " },
    // AI Board:扁平结果流,按角色注入(brief + AI 生成的待办 + EE 个人提醒)
    board: {
      ee: {
        brief: "今天 08:55 已打上班卡。本月 2 次迟到;你 06-05 的加班单仍在审批中。5 月 Payslip 已到账。",
        briefBtns: [
          { label: "看我的考勤", q: "看考勤日报" },
        ],
        todos: [
          { id: "td-pay", title: "新的 Payslip · 2026年5月", desc: "AI 可以帮你拆解构成与环比变化。", action: "查看", q: "我收到一份新的 Payslip,帮我分析一下我的薪资情况" },
          { id: "td-punch", title: "今天还没打下班卡", desc: "你的班次 18:00 结束。", action: "去打卡", q: "帮我打个下班卡" },
          { id: "td-leave", title: "3 天年假 12-31 清零", desc: "提前规划,别浪费了。", action: "规划", q: "看下我的年假余额,给我请假建议" },
        ],
        alerts: [
          { id: "ea-1", title: "加班提醒 · 本周已 12h", why: "接近每周上限。", ai: "AI:建议安排休息", severity: "mid" },
        ],
      },
      manager: {
        brief: "团队今日出勤 39/40。3 笔审批待处理(OT×2、请假×1),其中 1 笔有合规标记。研发部 OT 仍在攀升。",
        briefBtns: [
          { label: "查看全部风险", q: "汇总本月所有异常和合规风险,并给出处理建议" },
          { label: "让 AI 深入分析 →", q: "分析研发部 OT 为什么飙升,谁加班最多?" },
        ],
        todos: [
          { id: "td-appr", title: "3 笔审批待处理", desc: "OT×2(销售)、请假×1(运营),1 笔有合规标记。", action: "批量处理", q: "帮我审批待处理的 OT" },
          { id: "td-risk", title: "张三连续工时逼近上限", desc: "近 7 天累计 58h。", action: "处理", q: "深入分析:张三连续工时超限风险" },
        ],
      },
    },
    // Payslip 分析卡(EE 待办 deep-link 后,Assistant 渲染)
    payslip: {
      title: "Payslip · 2026年5月",
      views: [
        { chart: "pie", title: "应发构成", data: {
          items: [
            { name: "基本工资", value: 24000 },
            { name: "绩效", value: 6000 },
            { name: "津贴", value: 2000 },
          ],
        } },
        { chart: "table", title: "明细", data: {
          columns: ["项目", "金额"],
          rows: [
            ["应发合计", "¥32,000"],
            ["社保", "-¥2,240"],
            ["公积金", "-¥3,840"],
            ["个税", "-¥1,890"],
            ["实发", "¥24,030"],
          ],
        } },
      ],
    },
    // attendance_report:声明式 views,chart 类型对应 chart-view 注册表
    report: {
      ee: {
        title: "我的考勤 · 2026年6月",
        views: [
          { chart: "table", title: "每日打卡明细", data: {
            columns: ["日期", "上班", "下班", "状态"],
            rows: [
              ["06-10 周三", "08:55", "18:32", "正常"],
              ["06-09 周二", "09:12", "19:05", "迟到"],
              ["06-08 周一", "08:58", "18:20", "正常"],
              ["06-05 周五", "08:51", "21:40", "正常"],
              ["06-04 周四", "—", "—", "请假"],
              ["06-03 周三", "08:57", "18:15", "正常"],
              ["06-02 周二", "09:31", "18:44", "迟到"],
              ["06-01 周一", "08:49", "18:08", "正常"],
            ],
          } },
        ],
      },
      manager: {
        title: "团队考勤报表 · 2026年6月",
        views: [
          { chart: "line", title: "出勤率趋势(%)", data: {
            x: ["06-01", "06-02", "06-03", "06-04", "06-05", "06-08", "06-09", "06-10"],
            y: [97.5, 95.0, 96.3, 92.5, 96.3, 98.8, 93.8, 97.5],
          } },
          { chart: "pie", title: "考勤状态分布(人·天)", data: {
            items: [
              { name: "正常", value: 86 },
              { name: "迟到", value: 6 },
              { name: "早退", value: 3 },
              { name: "缺勤", value: 2 },
              { name: "请假", value: 3 },
            ],
          } },
          { chart: "bar", title: "成员迟到次数对比", data: {
            names: ["李四", "张三", "吴二", "林七", "赵八"],
            values: [5, 3, 2, 1, 1],
          } },
          { chart: "table", title: "每日汇总", data: {
            columns: ["日期", "出勤", "迟到", "缺勤"],
            rows: [
              ["06-10 周三", "39/40", "1", "0"],
              ["06-09 周二", "37/40", "3", "1"],
              ["06-08 周一", "40/40", "0", "0"],
            ],
          } },
        ],
      },
    },
  },
};

function getData(locale) {
  return DATA[locale] || DATA.en;
}

module.exports = { getData };

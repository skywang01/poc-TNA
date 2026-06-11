---
name: ee-leave-status
description: Query the current employee's (EE) leave entitlement, balance and usage for 2026 — annual leave, sick leave, marriage leave, exam leave, birthday leave. Trigger on questions like "我还剩多少年假", "我的休假余额", "病假用了几天", "今年年假额度是多少", "结转了多少假", "how many annual leave days do I have left", "my leave balance", "sick leave taken", "carry-forward balance". Covers employee 13000827 only.
version: 1.0.0
author: sky.wang@biposervice.com
tags: [hr, attendance, leave, ee]
---

# EE Leave Status (员工休假信息查询)

本技能提供员工 **13000827** 在 **2026 考勤年度（2026-01-01 ~ 2026-12-31）** 的休假额度与余额数据。
当 EE（员工本人）询问任何与自己休假/请假/年假/病假相关的问题时，使用本技能中的数据回答。

## 适用范围与安全约束

- 仅适用于当前登录员工 **EmployeeCode = 13000827** 的自助查询（EE 场景）。
- 如果提问者不是该员工本人（或上下文中的员工编号不匹配），不要返回这些数据，提示其无权查看他人休假信息。
- 数据为年度快照，回答时可注明数据截至当前考勤年度。

## 字段说明

| 字段 | 含义 |
|------|------|
| Entitlement | 年度总额度（全年应得） |
| Earned | 截至目前已挣得额度（E 类按月递增 earn，尚未 earn 满全年额度） |
| Additional / Adjustment | 额外授予 / 人工调整 |
| CFBalance / CFTaken | 上年结转余额 / 已使用的结转额度 |
| Taken | 本年度已使用 |
| PendingApproval | 审批中（已申请未批） |
| Forfeited / Encashed | 已作废 / 已折现 |
| Balance | 当前余额 = Earned + Additional + Adjustment + CFBalance − Taken − Forfeited − Encashed |
| AvailableBalance | 可用余额 = Balance − PendingApproval |
| UnitType = D | 单位为「天」 |
| EntitlementType = E | Earned 类型：额度随服务时间逐月累计 |

## 休假数据（员工 13000827，2026 年度，单位：天）

| 假期类型 (LeaveCode) | 年度额度 | 已挣得 | 上年结转 | 已用 | 审批中 | 当前余额 | 可用余额 |
|----------------------|---------|--------|---------|------|--------|---------|---------|
| 年假 EARN CAL (CCG_AL_EARN_CAL) — Annual Leave EARN CAL | 13 | 1.75 | 5.18 | 0 | 0 | 6.93 | 6.93 |
| 年假 EARN SAL (CCG_AL_EARN_SAL) — Annual Leave EARN SAL | 9 | 3.95 | 8.01 | 0 | 0 | 11.96 | 11.96 |
| 全薪病假 (CCG_SL_FP) — Full Paid Sick Leave | 12 | 12 | 0 | 2 | 0 | 10 | 10 |
| 婚假 (CCG_MRL) — Marriage Leave | 3 | 3 | 0 | 0 | 0 | 3 | 3 |
| 婚假·子女 (CCG_MRL_D) — Marriage Leave (Child) | 1 | 1 | 0 | 0 | 0 | 1 | 1 |
| 考试假 (CCG_EL) — Exam Leave | 10 | 10 | 0 | 0 | 0 | 10 | 10 |
| 生日假 (CCG_BL) — Birthday Leave | 1 | 1 | 0 | 0 | 0 | 1 | 1 |

完整记录（逐字段明细，含公式说明）见 `references/leave-records-2026.md`，需要时通过 read_skill_reference 读取。

## 回答指引

1. **年假合计**：该员工有两个年假科目（EARN CAL + EARN SAL）。被问"还剩多少年假"时，给出合计可用 **18.89 天**（6.93 + 11.96），并可按科目拆分说明。
2. **区分"额度"与"可用"**：年假是 Earned 类型，年度额度（13 + 9 = 22 天）尚未全部 earn 到手；当前可用余额以 AvailableBalance 为准。被问"今年一共有多少年假"答年度额度，被问"现在能请多少"答可用余额。
3. **结转说明**：年假可用余额中包含上年结转（CAL 结转 5.18 天 + SAL 结转 8.01 天，共 13.19 天）。涉及"去年结转/carry forward"的问题用 CFBalance 回答。
4. **病假**：全薪病假年度 12 天，已用 2 天，剩余 10 天。
5. **语言**：跟随用户提问语言回答（中文/英文），假期名称可中英对照。
6. **数据缺失**：若被问到本表之外的假期类型（如产假、陪产假）或休假申请明细/具体日期，说明当前数据中没有该记录，建议走休假申请/HR 渠道查询，不要编造。
7. 数字保留两位小数，单位统一为「天」。

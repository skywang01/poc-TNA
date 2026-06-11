# Pay Records — Employee 13000827 (2026-01 ~ 2026-05)

完整薪资记录，源自 HRMS 导出（13000827_PaySummary.csv + 13000827_PayTransaction.csv，两表已对账：
每期 PayTransaction 明细金额之和 = PaySummary 的 AllowanceNMPF）。

通用口径（所有期次相同的字段，不再逐期重复）：
- OvertimeAmount（加班费）: 0 ｜ UnpaidAmount（无薪扣减）: 0
- AllowanceMPF / DeductionMPF / DeductionNMPF: 0
- MPFEmployee（雇员 MPF）: 0 ｜ MPFEmployer（雇主 MPF）: 0 ｜ MPF PaidOut: 0
- NetPay（实发）= BasicPay + AllowanceNMPF
- 津贴类型 AllowanceType = A（津贴）；Source: Daily = 按日历规则生成，Leave = 由休假单触发
- 币种未在数据中标注（HK 薪资组，按 HKD 表述）

津贴项代码对照：
- 2052 Rest Day Full Pay (CCA) — 休息日全薪
- 2054 PH Full Pay (CCA) — 公众假期全薪 (Public Holiday)
- 2057 SH Full Pay (CCA) — 法定假日全薪 (Statutory Holiday)
- 2105 Compensation Leave (CCA) — 补偿假
- 2113 Sick Leave Full Pay (CCA) — 全薪病假

---

## HK2026-01-22（2026 年 1 月）

- 基本工资 BasicPay: 5,000.00
- 津贴合计 AllowanceNMPF: 0.26
- **实发工资 NetPay: 5,000.26**

津贴明细：
- 2052 休息日全薪: 0.23（数量 7 天，Source: Daily）
- 2057 法定假日全薪: 0.03（数量 1 天，Source: Daily）

## HK2026-02-10（2026 年 2 月）

- 基本工资 BasicPay: 5,000.00
- 津贴合计 AllowanceNMPF: 0.36
- **实发工资 NetPay: 5,000.36**

津贴明细：
- 2052 休息日全薪: 0.21（数量 6 天，Source: Daily）
- 2057 法定假日全薪: 0.11（数量 3 天，Source: Daily）
- 2113 全薪病假: 0.04（数量 1 天，Source: Leave）

## HK2026-03-36（2026 年 3 月）

- 基本工资 BasicPay: 5,000.00
- 津贴合计 AllowanceNMPF: 0.67
- **实发工资 NetPay: 5,000.67**

津贴明细：
- 2052 休息日全薪: 0.23（数量 7 天，Source: Daily）
- 2057 法定假日全薪: 0（数量 0，Source: Daily）
- 2105 补偿假: 0.40（数量 3.5，Source: Leave）
- 2113 全薪病假: 0.04（数量 1 天，Source: Leave）

## HK2026-04-31（2026 年 4 月）

- 基本工资 BasicPay: 5,000.00
- 津贴合计 AllowanceNMPF: 2.37
- **实发工资 NetPay: 5,002.37**

津贴明细：
- 2052 休息日全薪: 0.20（数量 6 天，Source: Daily）
- 2105 补偿假: 2.17（数量 9，Source: Leave）

## HK2026-05-37（2026 年 5 月）

- 基本工资 BasicPay: 5,000.00
- 津贴合计 AllowanceNMPF: 0.27
- **实发工资 NetPay: 5,000.27**

津贴明细：
- 2052 休息日全薪: 0.18（数量 5.5 天，Source: Daily）
- 2054 公众假期全薪: 0.06（数量 2 天，Source: Daily）
- 2057 法定假日全薪: 0.03（数量 1 天，Source: Daily）

---

## 年初至今合计（YTD, 2026-01 ~ 2026-05）

- 基本工资合计: 25,000.00
- 津贴合计: 3.93
- **实发合计: 25,003.93**
- 加班费 / MPF（雇员、雇主）/ 各类扣减: 均为 0

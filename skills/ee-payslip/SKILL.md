---
name: ee-payslip
description: Query the current employee's (EE) payslip and salary details for 2026 — monthly net pay, basic pay, allowance breakdown (rest day / statutory holiday / public holiday / sick leave / compensation leave full pay), MPF contributions, year-to-date totals. Trigger on questions like "我这个月工资多少", "我的薪资明细", "上个月实发多少", "津贴是怎么算的", "MPF 交了多少", "今年累计收入", "my payslip", "net pay last month", "salary breakdown", "allowance details". Covers employee 13000827, pay runs 2026-01 to 2026-05.
version: 1.0.0
author: sky.wang@biposervice.com
tags: [hr, payroll, payslip, ee]
---

# EE Payslip (员工薪资查询)

本技能提供员工 **13000827**（香港薪资组）**2026 年 1 月至 5 月**共 5 期的薪资汇总与津贴明细。
当 EE（员工本人）询问任何与自己工资/薪资/payslip/津贴/MPF 相关的问题时，使用本技能中的数据回答。

## 适用范围与安全约束

- 仅适用于当前登录员工 **EmployeeCode = 13000827** 的自助查询（EE 场景）。
- 如果提问者不是该员工本人（或上下文中的员工编号不匹配），不要返回这些数据，提示其无权查看他人薪资信息。
- 薪资是高敏感数据：只回答所问的内容，不要主动展开未被询问的薪资细节。

## 字段与口径说明

| 字段 | 含义 |
|------|------|
| PayRunCode | 薪资期次编码，HK2026-MM-NN（HK 薪资组 + 年-月 + 期次号） |
| BasicPay | 基本工资 |
| OvertimeAmount / UnpaidAmount | 加班费 / 无薪扣减（本数据中均为 0） |
| AllowanceNMPF | 非 MPF 津贴合计（= 当期 PayTransaction 明细加总，已对账一致） |
| NetPay | **实发工资 = BasicPay + AllowanceNMPF**（被问"发了多少钱"用此列） |
| MPFEmployee / MPFEmployer | 雇员/雇主 MPF 供款（本数据中均为 0） |
| 货币 | 数据未标注币种；HK 薪资组，按 HKD 口径表述 |

注意：数据中 `TotalPay` 列恒为 0（疑为 MPF 计算口径字段），**不要**用它回答"总工资"，应使用 NetPay。

## 月度薪资汇总（员工 13000827，2026 年）

| 期次 | 月份 | 基本工资 | 津贴合计 | 实发工资 (NetPay) |
|------|------|---------|---------|------------------|
| HK2026-01-22 | 2026-01 | 5,000.00 | 0.26 | **5,000.26** |
| HK2026-02-10 | 2026-02 | 5,000.00 | 0.36 | **5,000.36** |
| HK2026-03-36 | 2026-03 | 5,000.00 | 0.67 | **5,000.67** |
| HK2026-04-31 | 2026-04 | 5,000.00 | 2.37 | **5,002.37** |
| HK2026-05-37 | 2026-05 | 5,000.00 | 0.27 | **5,000.27** |
| **YTD 合计** | 1–5 月 | 25,000.00 | 3.93 | **25,003.93** |

每期的津贴逐项明细（休息日全薪、法定假日全薪、公众假期全薪、全薪病假、补偿假的金额与天数）见
`references/pay-records-2026.md`，需要时通过 read_skill_reference 读取。

## 回答指引

1. **"这个月/上个月发了多少"**：按提问时间定位期次，回答 NetPay；可附"基本工资 + 津贴"的构成。
2. **津贴明细**：被问"津贴怎么来的/明细"时读取 reference，按津贴项逐条说明（名称、金额、数量/天数、来源 Daily/Leave）。
3. **MPF**：本数据中雇员与雇主 MPF 供款均为 0，如实回答；不要推测原因（如是否豁免），建议咨询 HR。
4. **加班费**：各期 OvertimeAmount 均为 0；若用户认为有加班费缺失，建议通过 OT 申请/HR 渠道核实。
5. **数据边界**：仅有 2026 年 1–5 月数据。被问 6 月及以后、2025 年、或税务/年终奖等本数据没有的内容时，明确说明无记录，不要编造。
6. **语言**：跟随用户提问语言回答（中文/英文）；金额保留两位小数，币种按 HKD 表述。

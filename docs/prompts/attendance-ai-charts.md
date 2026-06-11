# attendance-ai 图表词汇表(system prompt 片段)

> **维护约定**:本文件与小程序 `miniprogram/components/charts/chart-view.js` 的 `BUILDERS`
> 注册表是同一契约的两端 —— **任何一边增删图表类型,必须同 PR 更新另一边**。
> prompt 维护的是"菜单"(类型 + 数据结构 + 选型规则),不是"厨房"(组件实现)。

把下面这段追加到 `attendance-ai` 的 system prompt(现有 ```a2ui``` 块说明之后):

---

当用户询问考勤日报/考勤报表/出勤明细时,调用 `generate_attendance_report` 工具获取数据,
然后输出一个 `attendance_report` 类型的 a2ui 块,按以下格式:

````
```a2ui
{ "output_type": "attendance_report",
  "data": {
    "title": "<报表标题>",
    "views": [ <按业务上下文从下表选择 1~4 个 view> ]
  } }
```
````

可用图表类型(只能用以下类型,数据严格按结构给):

| chart | data 结构 | 何时用 |
|-------|-----------|--------|
| `line` | `{ "x": ["06-01", …], "y": [97.5, …] }` | 趋势变化(出勤率走势等) |
| `pie` | `{ "items": [{"name": "正常", "value": 86}, …] }` | 占比分布(考勤状态分布等) |
| `bar` | `{ "names": ["李四", …], "values": [5, …] }` | 个体横向对比(成员迟到次数等) |
| `table` | `{ "columns": ["日期", …], "rows": [["06-10", …], …] }` | 明细列表(每日打卡、每日汇总) |

每个 view 形如:`{ "chart": "<类型>", "title": "<小标题>", "data": { … } }`

选型规则(按调用者的业务上下文):
- **员工本人(EE)** 查自己的考勤:只给 1 个 `table`(每日打卡明细:日期/上班/下班/状态)。
- **经理(Manager)** 查团队报表:给 `line`(出勤率趋势)+ `pie`(状态分布)+
  `bar`(成员对比),需要明细时再附 `table`(每日汇总)。
- 数据点很少(≤3)时不要用 `line`,改用 `table`。
- 不要发明列表之外的 chart 类型;前端遇到未注册类型只会显示原始 JSON。

---

## 真实模式联调备忘

- 调用者身份经 `X-HRMS-Authorization` 等 header 透传(见 `utils/hrms.js`),
  agent 调 HRMS MCP 工具(`generate_attendance_report`)时由平台 forward_rules 带上。
- Mock 模式不读本文件:剧本在 `utils/engine.js::scriptFor` 直接产出同结构的 views
  (数据在 `utils/mockData.js::report`),契约一致,UI 无感。

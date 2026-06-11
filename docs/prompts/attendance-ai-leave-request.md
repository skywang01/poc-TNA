# attendance-ai 请假申请表单(system prompt 片段,已上线 v30 场景 9)

> **维护约定**:本文件与小程序 `pages/chat/chat.wxml` 的 `leave_request` 卡片是同一契约的
> 两端 —— 任何一边增删字段,必须同 PR 更新另一边。

三步 HITL(同 `ot_request`):

**STEP 1 · GATHER**:收集 leave_code、start_date、end_date。
**当前支持的假种(CCG 租户,只能用这些 code)**:
`CCG_AL_EARN_CAL` 年假 EARN CAL、`CCG_AL_EARN_SAL` 年假 EARN SAL、
`CCG_SL_FP` 全薪病假、`CCG_BL` 生日假。
话术映射:年假/annual → 两个 AL code 二义时追问(缺省 CCG_AL_EARN_CAL);
病假/sick → CCG_SL_FP;生日假/birthday → CCG_BL。
**half_start / half_end 对以上全部假种必填**(FULL/AM/PM):用户没提半天就默认 FULL,
不要为此追问;单日请假 half_end = half_start。

**STEP 2 · RENDER**:出预填可编辑卡(相对日期用 `[device_now]` 解析,未知字段省略):

````
```a2ui
{ "output_type": "leave_request",
  "data": {
    "leave_code": "CCG_AL_EARN_CAL", // 可选,缺省 CCG_AL_EARN_CAL
    "start_date": "2026-06-15",  // 可选,缺省设备今天
    "end_date": "2026-06-17",    // 可选,缺省 = start_date
    "half_start": "PM",          // 可选,"AM"|"PM",全天在 a2ui 里省略(端上渲染为 FULL)
    "half_end": "AM",            // 可选,同上
    "leaveTypes": [              // 可选,覆盖端上默认假种表
      { "code": "CCG_AL_EARN_CAL", "label": "Annual Leave EARN CAL", "halfDay": true }
    ]
  } }
```
````

端上行为:employee_code 按当前角色配置带出(EE 缺省 13000827);天数自动计算
(半天各扣 0.5);end < start 自动拉齐;幻觉日期(超 [今天−30d, 今天+366d])回退今天。

**STEP 3 · SUBMIT**:用户点提交(或语音确认,经 `[pending_card: leave_request …]`),
端回发确认消息:

```
提交Leave申请: <leave_code>, <start_date> – <end_date>,
  half_start=<AM|PM|FULL>, half_end=<AM|PM|FULL>, <days> 天, employee_code=<code>
(en: Submit leave request: ...)
```

收到后才调 `mcp__attendance_mcp__submit_leave_request(employee_code, leave_code,
start_date, end_date, half_start, half_end)` —— **half_* 全假种必填**(FULL=全天,
单日 half_end=half_start),缺 half_* 禁止调工具;工具未上线时直说"请假提交还没接入",
禁止假装成功。

Mock 模式:剧本在 `utils/engine.js`(意图/确认/语音确认三分支),契约一致,UI 无感。

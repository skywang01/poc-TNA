// chart-view —— A2UI 图表注册表组件(组件层)。
// 输入一个 view 描述 { chart, title, data },按 chart 类型查 BUILDERS 注册表,
// 加载对应 echarts 组件渲染;table 走 WXML 表格;未注册类型 JSON 兜底。
// 业务语义不进这里:agent/mock 决定"看什么",本组件只决定"长什么样"。
const echarts = require("./ec-canvas/echarts");

// 滚动错位的逃生开关:true = 渲染后截图冻结为 <image>(牺牲 tooltip,滚动绝对安全)。
// 真机同层渲染正常时保持 false,保留 echarts tooltip 交互;
// DevTools 模拟器同层渲染本就不可靠,以真机表现为准。
const FREEZE_TO_IMAGE = false;

// BIPO palette(与 app.wxss 变量一致)
const C = {
  blue: "#2A63E6",
  navy: "#20307D",
  red: "#DC2626",
  amber: "#F59E0B",
  green: "#10B981",
  slate: "#4E5A72",
  line: "#E0E4EC",
  split: "#EEF1F6",
};
const PALETTE = [C.blue, C.navy, C.amber, C.red, C.green, "#8C95A8"];

const AXIS = {
  label: { color: C.slate, fontSize: 10 },
  line: { lineStyle: { color: C.line } },
};

/* ---- 注册表:chart 类型 -> echarts option 构造器 ----
   新增图表类型 = 在这里加一个 builder + 同步 agent prompt 的词汇表
   (docs/prompts/attendance-ai-charts.md)。 */
const BUILDERS = {
  // data: { x: [...], y: [...], unit? }
  line(d) {
    return {
      color: [C.blue],
      grid: { left: 38, right: 18, top: 28, bottom: 26 },
      tooltip: { trigger: "axis", confine: true },
      xAxis: { type: "category", data: d.x || [], axisLine: AXIS.line, axisLabel: AXIS.label },
      yAxis: {
        type: "value",
        axisLabel: AXIS.label,
        splitLine: { lineStyle: { color: C.split } },
      },
      series: [{
        type: "line", data: d.y || [], smooth: true, symbolSize: 5,
        lineStyle: { width: 3 }, areaStyle: { opacity: 0.12 },
      }],
    };
  },
  // data: { names: [...], values: [...], unit? } —— 横向条形,适合成员对比
  bar(d) {
    return {
      color: [C.navy],
      grid: { left: 8, right: 40, top: 10, bottom: 10, containLabel: true },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, confine: true },
      xAxis: { type: "value", axisLabel: AXIS.label, splitLine: { lineStyle: { color: C.split } } },
      yAxis: { type: "category", data: d.names || [], inverse: true, axisLine: AXIS.line, axisLabel: AXIS.label },
      series: [{
        type: "bar", data: d.values || [], barWidth: 14,
        itemStyle: { borderRadius: [0, 7, 7, 0] },
        label: { show: true, position: "right", color: C.slate, fontSize: 10 },
      }],
    };
  },
  // data: { items: [{name, value}] } —— 环形占比
  // 图表会被冻结成图片(无 tooltip),百分比必须直接画在标签上
  pie(d) {
    return {
      color: PALETTE,
      tooltip: { trigger: "item", confine: true },
      series: [{
        type: "pie", radius: ["38%", "58%"], center: ["50%", "50%"],
        avoidLabelOverlap: true,
        label: {
          show: true,
          formatter: "{b} {d}%",
          color: C.slate,
          fontSize: 10,
          overflow: "break",
        },
        labelLine: { length: 8, length2: 6, lineStyle: { color: C.line } },
        data: d.items || [],
      }],
    };
  },
  // table 不走 echarts(WXML 渲染),但占住注册表位置,表示"已注册类型"
  table: null,
};

Component({
  properties: {
    view: { type: Object, value: {} },
  },
  data: {
    mode: "json",     // canvas | image | table | json
    ec: { lazyLoad: true },
    imgSrc: "",       // 渲染完成后 canvas 截图,替换 canvas 防滚动错位
    columns: [],
    rows: [],
    jsonText: "",
  },
  lifetimes: {
    ready() {
      const v = this.properties.view || {};
      const d = v.data || {};
      if (v.chart === "table") {
        this.setData({ mode: "table", columns: d.columns || [], rows: d.rows || [] });
        return;
      }
      const builder = BUILDERS[v.chart];
      if (!builder) {
        // 未注册类型 -> JSON 兜底(同 A2UI 现有约定)
        this.setData({ mode: "json", jsonText: JSON.stringify(v, null, 2) });
        return;
      }
      this.setData({ mode: "canvas" });
      // lazyLoad + selectComponent.init:回调直接走 JS 引用,绕开 setData 不能传函数的限制
      const ecc = this.selectComponent("#chart");
      if (!ecc) return this._fallback(v);
      try {
        const self = this;
        ecc.init((canvas, width, height, dpr) => {
          const opt = builder(d);
          opt.animation = false; // 聊天流里即时出图
          const chart = echarts.init(canvas, null, { width, height, devicePixelRatio: dpr });
          chart.setOption(opt);
          self._chart = chart;
          if (FREEZE_TO_IMAGE) {
            chart.on("finished", () => self._freeze(ecc));
            setTimeout(() => self._freeze(ecc), 600); // finished 不触发时的兜底
          }
          return chart;
        });
      } catch (e) {
        console.error("[chart-view] canvas init failed, fallback to JSON", e);
        this._fallback(v);
      }
    },
    detached() {
      if (this._chart) { this._chart.dispose(); this._chart = null; }
    },
  },
  methods: {
    _fallback(v) {
      this.setData({ mode: "json", jsonText: JSON.stringify(v, null, 2) });
    },
    // 截图替换 canvas:image 是普通节点,随消息流滚动不会错位
    _freeze(ecc) {
      if (this._frozen || !this._chart) return;
      this._frozen = true;
      const self = this;
      // 稍等一帧,确保最后一笔已落到 canvas
      setTimeout(() => {
        ecc.canvasToTempFilePath({
          success(res) {
            self.setData({ mode: "image", imgSrc: res.tempFilePath });
            if (self._chart) { self._chart.dispose(); self._chart = null; }
          },
          fail(err) {
            // 截图失败就保留 canvas(功能可用,只是滚动可能错位)
            console.warn("[chart-view] snapshot failed, keep canvas", err);
            self._frozen = false;
          },
        });
      }, 80);
    },
  },
});

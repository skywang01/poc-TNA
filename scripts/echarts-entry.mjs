// Slim echarts build for the mini-program (line/bar/pie). Rebuild with:
//   ./node_modules/.bin/esbuild scripts/echarts-entry.mjs --bundle --format=cjs --minify --target=es2017 --outfile=miniprogram/components/charts/ec-canvas/echarts.js
export * from 'echarts/core';
import * as core from 'echarts/core';
import { LineChart, BarChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
core.use([LineChart, BarChart, PieChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

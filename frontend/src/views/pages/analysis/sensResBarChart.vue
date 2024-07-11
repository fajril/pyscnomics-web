<script setup lang="ts">
import * as Pysc from "@/utils/pysc/pyscType";
import { hexToRgb } from '@layouts/utils';
import { BarChart, CustomChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from "echarts/components";
import { graphic, use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import VChart from "vue-echarts";
import type { ThemeInstance } from 'vuetify';
import { useTheme } from 'vuetify';

const numbro = Pysc.useNumbro()
use([
  CanvasRenderer,
  BarChart,
  TitleComponent,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  CustomChart
]);
const vuetifyTheme = useTheme()
const colorVariables = (themeColors: ThemeInstance['themes']['value']['colors'] = vuetifyTheme.current.value) => {
  const themeSecondaryTextColor = `rgba(${hexToRgb(themeColors.colors['on-surface'])},${themeColors.variables['medium-emphasis-opacity']})`
  const themeDisabledTextColor = `rgba(${hexToRgb(themeColors.colors['on-surface'])},${themeColors.variables['disabled-opacity']})`
  const themeBorderColor = `rgba(${hexToRgb(String(themeColors.variables['border-color']))},${themeColors.variables['border-opacity']})`
  const themePrimaryTextColor = `rgba(${hexToRgb(themeColors.colors['on-surface'])},${themeColors.variables['high-emphasis-opacity']})`

  return { themeSecondaryTextColor, themeDisabledTextColor, themeBorderColor, themePrimaryTextColor }
}

interface Props {
  dataChart: [],
  category: string[],
  title: string
}
const props = defineProps<Props>()

const doRenderItem = (params, api) => {
  var categoryIndex = api.value(0);
  var _startV = Math.min(...[api.value(1), api.value(2)])
  var _endV = Math.max(...[api.value(1), api.value(2)])
  var start = api.coord([_startV, categoryIndex]);
  var end = api.coord([_endV, categoryIndex]);
  var height = api.size([0, 1])[1] * 0.6;
  var rectShape = graphic.clipRectByRect(
    {
      x: start[0],
      y: start[1] - height / 2,
      width: end[0] - start[0],
      height: height
    },
    {
      x: params.coordSys.x,
      y: params.coordSys.y,
      width: params.coordSys.width,
      height: params.coordSys.height
    }
  );
  return (
    rectShape && {
      type: 'rect',
      transition: ['shape'],
      shape: rectShape,
      style: api.style()
    }
  );
}

const chtOption = computed(() => {
  const { themeBorderColor, themeDisabledTextColor, themePrimaryTextColor } = colorVariables(vuetifyTheme.current.value)
  const baseCht_ = props.dataChart.filter(r => r[0] === 1)[0][1]
  const dataCht = props.dataChart.length ? JSON.parse(JSON.stringify(props.dataChart[0].slice(1, props.dataChart[0].length).map((c, i) => props.dataChart.map(r => r[i + 1])).map((col, i) => {
    const cols = col.map((ci, ii) => ({ index: ii, value: ci })).sort((a, b) => a.value - b.value)
    return {
      id: i, base: baseCht_, value: [cols[0].index < cols[cols.length - 1].index ? cols[0].value : cols[cols.length - 1].value,
      cols[0].index > cols[cols.length - 1].index ? cols[0].value : cols[cols.length - 1].value]
    }
  }))) : []
  dataCht.sort((a, b) => (Math.abs(a.base - a.value[0]) + Math.abs(a.value[1] - a.base)) - (Math.abs(b.base - b.value[0]) + Math.abs(b.value[1] - b.base)))
  const opt_ = {
    grid: {
      show: true,
      borderColor: themeBorderColor,
      left: 60,
      bottom: 90,
      top: 10,
      right: 10,
    },
    legend: {
      left: "center", top: 'bottom',
      textStyle: { color: themePrimaryTextColor },
      tooltip: { show: true },

    },
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value) => typeof value === 'number' ? numbro(value).format({ optionalMantissa: true }) : value,

    },
    title: { show: false },
    xAxis: [
      {
        type: 'value',
        axisLabel: { color: themePrimaryTextColor, rotate: 50, },
        splitLine: { show: false },
        name: props.title,
        nameTextStyle: {
          color: themeDisabledTextColor,
          verticalAlign: "top",
          align: "center",
          padding: 40
        },
        nameLocation: "middle",
        scale: true,
        valueFormatter: (value) => typeof value === 'number' ? numbro(value).format({ optionalMantissa: true }) : value,

      }
    ],
    yAxis: [
      {
        type: 'category',
        axisTick: {
          show: false
        },
        axisLine: { show: true, onZero: false },
        axisLabel: {
          color: themePrimaryTextColor,
        },
        // data: dataCht.map((c, i) => props.category[c.id]),
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: 'Sens. Max',
        type: 'custom',
        color: 'rgba(80,80,250, 0.6)',
        // stack: 'value',
        renderItem: doRenderItem,
        label: {
          show: false,
          position: 'right',
          color: themePrimaryTextColor,
        },
        barCategoryGap: 15,
        emphasis: {
          focus: 'series'
        },
        encode: {
          x: [1, 2],
          y: 0
        },
        data: dataCht.map(c => ({ name: 'max', value: [props.category[c.id], c.base, c.value[1]] })),
      },
      {
        name: 'Sens. Min',
        type: 'custom',
        color: 'rgba(255,80,80, 0.6)',
        // stack: 'value',
        renderItem: doRenderItem,
        label: {
          show: false,
          position: 'right',
          color: themePrimaryTextColor,
        },
        barCategoryGap: 15,
        emphasis: {
          focus: 'series'
        },
        encode: {
          x: [1, 2],
          y: 0
        },
        data: dataCht.map(c => ({ name: 'max', value: [props.category[c.id], c.base, c.value[0]] })),
      },
    ]
  }
  return opt_
})
const refSensBarContainer = ref()
const refSensBarChart = ref()
useResizeObserver(refSensBarContainer, (entries) => {
  const entry = entries[0]
  const { width, height } = entry.contentRect
  if (refSensBarContainer.value) nextTick(() => refSensBarChart.value?.resize())
}, { box: 'device-pixel-content-box' })

</script>

<template>
  <div ref="refSensBarContainer">
    <v-chart ref="refSensBarChart" class="sens-bar-chart" :option="chtOption"
      :style="{ minBlockSize: ((props.category.length ?? 5) * 80) + 'px' }" />
  </div>

</template>

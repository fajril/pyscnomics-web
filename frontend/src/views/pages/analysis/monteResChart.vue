<script setup lang="ts">
import { BarChart, LineChart, ScatterChart } from "echarts/charts"
import { CanvasRenderer } from 'echarts/renderers'

import { useAppStore } from "@/stores/appStore"
import { hexToRgb } from '@layouts/utils'
import {
  AxisPointerComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkPointComponent,
  TitleComponent,
  TooltipComponent,
} from "echarts/components"
import { use } from "echarts/core"
import VChart from "vue-echarts"
import type { ThemeInstance } from 'vuetify'
import { useTheme } from 'vuetify'
import * as Pysc from "@/utils/pysc/pyscType"

interface Props {

  // dataTable: Pysc.TableCFOption
  hasGas?: boolean
  dataChart: Array<any>
  title?: string
  unit?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  unit: '',
})

const numbro = Pysc.useNumbro()

use([
  DataZoomComponent,
  CanvasRenderer,
  ScatterChart,
  LineChart,
  BarChart,
  TitleComponent,
  GridComponent,
  TooltipComponent,
  MarkPointComponent,
  LegendComponent,
  AxisPointerComponent,
])

// provide(THEME_KEY, "dark")
const appStore = useAppStore()

const vuetifyTheme = useTheme()

const colorVariables = (themeColors: ThemeInstance['themes']['value']['colors'] = vuetifyTheme.current.value) => {
  const themeSecondaryTextColor = `rgba(${hexToRgb(themeColors.colors['on-surface'])},${themeColors.variables['medium-emphasis-opacity']})`
  const themeDisabledTextColor = `rgba(${hexToRgb(themeColors.colors['on-surface'])},${themeColors.variables['disabled-opacity']})`
  const themeBorderColor = `rgba(${hexToRgb(String(themeColors.variables['border-color']))},${themeColors.variables['border-opacity']})`
  const themePrimaryTextColor = `rgba(${hexToRgb(themeColors.colors['on-surface'])},${themeColors.variables['high-emphasis-opacity']})`

  return { themeSecondaryTextColor, themeDisabledTextColor, themeBorderColor, themePrimaryTextColor }
}

const chartMonte = ref()

const chtOption = computed(() => {
  const { themeBorderColor, themeDisabledTextColor, themePrimaryTextColor } = colorVariables(vuetifyTheme.current.value)

  const Opt = {
    backgroundColor: vuetifyTheme.global.name.value === 'dark' ? '#2f3349' : '#ffffff',
    title: {
      text: props.title,
      left: "center",
      textStyle: { color: themePrimaryTextColor },
    },
    dataZoom: {
      type: 'inside',
    },

    tooltip: {
      trigger: 'item',

      axisPointer: {
        axis: 'x',
        snap: true,
      },
      valueFormatter: (value, dataIndex) => {
        return value !== undefined
          ? numbro(chtOption.value.series[0].data[dataIndex].value[0])
            .format({ output: props.unit === '%' ? 'percent' : 'number', mantissa: 2, optionalMantissa: true })
          : value
      },
    },
    legend: {
      left: "center",
      top: 'bottom',
      textStyle: { width: 80, color: themePrimaryTextColor, overflow: 'truncate' },
      tooltip: { show: true },
    },
    grid: {
      show: true,
      borderColor: themeBorderColor,
      left: 80,
      right: 2,
    },
    xAxis: {
      type: 'value',
      scale: true,
      name: `${props.title}, ${props.unit}`,

      // data: [],
      axisTick: {
        alignWithLabel: true,
      },
      axisLine: {
        onZero: false,
      },
      nameTextStyle: {
        color: themeDisabledTextColor,
        verticalAlign: "top",
        align: "center",
        padding: 10,
      },
      nameLocation: "middle",
      axisLabel: {
        color: themePrimaryTextColor,
        formatter: (value, index) => {
          return value !== undefined ? numbro(value).format({ output: props.unit === '%' ? 'percent' : 'number', mantissa: 2, optionalMantissa: true }) : value
        },
      },
      splitLine: { show: true, lineStyle: { color: themeBorderColor } },

    },
    yAxis: {
      type: 'value',
      name: '%Probability (greater than)', // 'Freq, %',
      scale: true,
      splitLine: { show: true, lineStyle: { color: themeBorderColor } },
      axisLabel: {
        color: themePrimaryTextColor,
        formatter: (value, index) => {
          return value !== undefined ? numbro(value).format({ mantissa: 0, optionalMantissa: true }) : value
        },
      },
      axisLine: {
        onZero: false,
      },
      nameTextStyle: {
        color: themeDisabledTextColor,
        verticalAlign: "bottom",
        align: "center",
      },
      nameLocation: "end",
    },
    series: [
      {
        name: props.title,
        type: "line",
        symbol: 'none',
        data: [],
        zlevel: 1,
        label: { show: false },
      },
      {
        type: 'scatter',
        symbol: 'pin',
        label: { show: true, color: themePrimaryTextColor },

        symbolSize: 44,
        data: [],
        tooltip: {
          valueFormatter: (value, dataIndex) => {
            const valdata = dataIndex < chtOption.value.series[1].data.length ? (chtOption.value.series[1].data[dataIndex].value?.[0]) : null

            return Pysc.is_number(valdata) ? numbro(valdata).format({ mantissa: 2 }) : '-'
          },
        },

      },
    ],
  }

  Opt.series[0].data.splice(0, Opt.series[0].data.length,
    ...props.dataChart.map((row, index) => {
      return {
        value: [row[1], ((1 - row[0]) * 100).toFixed(0)],
        symbol: [10, 50, 90].includes(index) ? 'circle' : 'none',
      }
    }))
  if (props.dataChart.length) {
    Opt.series[1].data.splice(0, Opt.series[1].data.length - 1, ...[
      {
        name: 'P90',
        value: [props.dataChart[10][1], +((1 - props.dataChart[10][0]) * 100).toFixed(0)],
        itemStyle: { color: "rgba(180,10,10,0.8)" },
      },
      {
        name: 'P50',
        value: [props.dataChart[50][1], +((1 - props.dataChart[50][0]) * 100).toFixed(0)],
        itemStyle: { color: "rgba(10,150,10,0.8)" },
      },
      {
        name: 'P10',
        value: [props.dataChart[90][1], +((1 - props.dataChart[90][0]) * 100).toFixed(0)],
        itemStyle: { color: "rgba(10,10,180,0.8)" },
      },
    ])
  }

  return Opt
})

const getDataSource = (value: string, sourceType: string) => {
  const rndid = Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)

  return {
    url: chartMonte.value?.getDataURL({
      type: 'png',
      excludeComponents: ['toolbox'],
    }),
    filename: `montecarlo_${props.title}_${appStore.selectedCase.name}_${rndid}`.replace(/[/\\ #$~&.]/g, ''),
  }
}

watch(() => props.dataChart, val => {
  nextTick(() => chartMonte.value?.resize())
}, { immediate: true, deep: true })

const resizeContainer = () => {
  nextTick(() => chartMonte.value?.resize())
}

defineExpose({
  getDataSource,
  resizeContainer,
})
</script>

<template>
  <VChart
    ref="chartMonte"
    class="monte-chart"
    :option="chtOption"
  />
</template>

<style scoped>
.monte-chart {
  min-block-size: 400px;
}
</style>

<script setup lang="ts">
import { BarChart, LineChart } from "echarts/charts"
import { CanvasRenderer } from 'echarts/renderers'

import {
  AxisPointerComponent,
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
import { hexToRgb } from '@layouts/utils'
import * as Pysc from "@/utils/pysc/pyscType"

const props = withDefaults(defineProps<Props>(), {
  title: '',
  unit: '',
})

const numbro = Pysc.useNumbro()

use([
  CanvasRenderer,
  LineChart,
  BarChart,
  TitleComponent,
  GridComponent,
  TooltipComponent,
  MarkPointComponent,
  LegendComponent,
  AxisPointerComponent,
])

interface Props {

  // dataTable: Pysc.TableCFOption
  hasGas?: boolean
  dataChart: Array<any>
  title?: string
  unit?: string
}

// provide(THEME_KEY, "dark")

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
    title: {
      text: props.title,
      left: "center",
      textStyle: { color: themePrimaryTextColor },
    },
    tooltip: {
      trigger: 'item',

      axisPointer: {
        axis: 'y',
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
      name: 'Freq, %', // '%Probability (greater than)',
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

        // triggerLineEvent: true,
        data: [],
        zlevel: 1,

        // symbol: 'none',
        markPoint: {
          symbol: 'pin',
          data: [
            {
              coord: [10, 0.1],

              // coord: 0.1,
              symbol: 'pin',
              valueIndex: 0,
              label: {
                show: true,
                color: themePrimaryTextColor,
                position: 'top',
                distance: 18,

                // formatter: params => params?.toFixed(0),

              },
              itemStyle: { color: "rgba(180,10,10,0.8)" },
            },
            {
              coord: [50, 0.2],

              // coord: 0.1,
              symbol: 'pin',
              valueIndex: 0,
              label: {
                show: true,
                color: themePrimaryTextColor,
                position: 'top',
                distance: 18,
              },
              itemStyle: { color: "rgba(10,150,10,0.8)" },
            },
            {
              coord: [90, 0.3],

              // coord: 0.1,
              symbol: 'pin',
              valueIndex: 0,
              label: {
                show: true,
                color: themePrimaryTextColor,
                position: 'top',
                distance: 18,
              },
              itemStyle: { color: "rgba(10,10,180,0.8)" },
            },
          ],
        },
      },
    ],
  }

  // Opt.xAxis.data.splice(0, Opt.xAxis.data.length, ...props.dataChart.map(row => row[1]))
  Opt.series[0].data.splice(0, Opt.series[0].data.length, ...props.dataChart.map((row, index) => ({ value: [row[1], (row[0] * 100).toFixed(0)], symbol: [10, 50, 90].includes(index) ? 'circle' : 'none', label: { show: [10, 50, 90].includes(index), position: 'top', color: themePrimaryTextColor, distance: 18 } })))
  if (props.dataChart.length) {
    Opt.series[0].markPoint.data[0].coord = [props.dataChart[10][1], (props.dataChart[10][0] * 100).toFixed(0)]
    Opt.series[0].markPoint.data[1].coord = [props.dataChart[50][1], (props.dataChart[50][0] * 100).toFixed(0)]
    Opt.series[0].markPoint.data[2].coord = [props.dataChart[90][1], (props.dataChart[90][0] * 100).toFixed(0)]
  }

  return Opt
})

const refContainer = ref()

useResizeObserver(refContainer, entries => {
  const entry = entries[0]
  const { width, height } = entry.contentRect
  if (refContainer.value)
    nextTick(() => chartMonte.value?.resize())
}, { box: 'device-pixel-content-box' })

const dataChart = computed(() => props.dataChart)

watch(dataChart, val => {
  nextTick(() => chartMonte.value?.resize())
}, { immediate: true, deep: true })
</script>

<template>
  <VRow>
    <VCol
      ref="refContainer"
      cols="12"
    >
      <VChart
        ref="chartMonte"
        class="monte-chart"
        :option="chtOption"
      />
    </VCol>
  </VRow>
</template>

<style scoped>
.monte-chart {
  min-block-size: 400px;
}
</style>

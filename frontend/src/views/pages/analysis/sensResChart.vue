<script setup lang="ts">
import { useAppStore } from '@/stores/appStore'
import { hexToRgb } from '@layouts/utils'
import { LineChart } from "echarts/charts"
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from "echarts/components"
import { use } from "echarts/core"
import { CanvasRenderer } from "echarts/renderers"
import VChart from "vue-echarts"
import type { ThemeInstance } from 'vuetify'
import { useTheme } from 'vuetify'
import { VCardText } from 'vuetify/lib/components/index.mjs'
import * as Pysc from "@/utils/pysc/pyscType"

const props = withDefaults(defineProps<Props>(), {
  title: '',
  unit: '',
})

const numbro = Pysc.useNumbro()

use([
  DataZoomComponent,
  CanvasRenderer,
  LineChart,
  TitleComponent,
  GridComponent,
  TooltipComponent,
  LegendComponent,
])

interface Props {

  // dataTable: Pysc.TableCFOption
  hasGas?: boolean
  dataChart: Array<any>
  title?: string
  unit?: string
}

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

const chartSensContainer = ref()
const chartSens = ref()

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
      trigger: 'axis',
      valueFormatter: value => value !== undefined ? numbro(value).format({ optionalMantissa: true }) : value,
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
      name: 'Sensitivity',

      // type: 'value',
      data: [],
      scale: true,
      axisTick: {
        alignWithLabel: true,
      },
      nameTextStyle: {
        color: themeDisabledTextColor,
        verticalAlign: "top",
        align: "center",
        padding: 10,
      },
      nameLocation: "middle",
      axisLine: {
        onZero: false,
      },
      axisLabel: {
        color: themePrimaryTextColor,
        formatter: (value, index) => {
          return value !== undefined ? numbro(value).format({ output: 'percent', optionalMantissa: true }) : value
        },
      },
      splitLine: { show: true, lineStyle: { color: themeBorderColor } },

    },
    yAxis: {
      type: 'value',
      name: `${props.unit}`,
      splitLine: { show: true, lineStyle: { color: themeBorderColor } },
      scale: true,
      axisLabel: {
        color: themePrimaryTextColor,
        formatter: (value, index) => {
          return value !== undefined ? numbro(value).format({ output: props.unit === '%' ? 'percent' : 'number', optionalMantissa: true }) : value
        },
      },
      axisLine: {
        onZero: false,
      },
      axisTick: {
        alignWithLabel: true,
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
        name: "Oil Price",
        type: "line",
        yAxisIndex: 0,
        data: [],
        symbol: 'none',
      },
      {
        name: 'Opex',
        type: "line",
        yAxisIndex: 0,
        data: [],
        symbol: 'none',
      },
      {
        name: 'Capex',
        type: "line",
        yAxisIndex: 0,
        data: [],
        symbol: 'none',
      },
      {
        name: 'Lifting',
        type: "line",
        yAxisIndex: 0,
        data: [],
        symbol: 'none',
      },
    ],
  }

  if (props.hasGas) {
    Opt.series.splice(1, 0, {
      name: 'Gas Price',
      type: "line",
      yAxisIndex: 0,
      data: [],
      symbol: 'none',
    })
  }
  Opt.xAxis.data.splice(0, Opt.xAxis.data.length, ...props.dataChart.map(row =>
    numbro(row[0] - 1).format({ output: 'percent', mantissa: 1, optionalMantissa: true }),
  ))

  Opt.series.forEach((v, index) => {
    v.data.splice(0, v.data.length, ...props.dataChart.map(row => row[index + 1]))

    // v.data.splice(0, v.data.length, ...props.dataChart.map(row => [
    //   -(1 - row[0]),
    //   row[index + 1]]))
  })

  return Opt
})

const dataChart = computed(() => props.dataChart)

watch(dataChart, val => {
  nextTick(() => chartSens.value?.resize())
}, { immediate: true, deep: true })

const getDataSource = (value: string, sourceType: string) => {
  const rndid = Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)

  return {
    url: chartSens.value?.getDataURL({
      type: 'png',
      excludeComponents: ['toolbox'],
    }),
    filename: `sens_${props.title}_${appStore.selectedCase.name}_${rndid}`.replace(/[/\\ #$~&.]/g, ''),
  }
}

useResizeObserver(chartSensContainer, entries => {
  const entry = entries[0]
  const { width, height } = entry.contentRect

  nextTick(() => {
    if (chartSens.value)
      chartSens.value?.resize()
  })
}, { box: 'device-pixel-content-box' })

defineExpose({
  getDataSource,
})
</script>

<template>
  <VCardText
    ref="chartSensContainer"
    class="p-0"
  >
    <VChart
      ref="chartSens"
      class="sens-chart"
      :option="chtOption"
    />
  </VCardText>
</template>

<style scoped>
.sens-chart {
  min-block-size: 400px;
}
</style>

<script setup lang="ts">
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
import * as Pysc from "@/utils/pysc/pyscType"

const props = defineProps<Props>()

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

const vuetifyTheme = useTheme()

const colorVariables = (themeColors: ThemeInstance['themes']['value']['colors'] = vuetifyTheme.current.value) => {
  const themeSecondaryTextColor = `rgba(${hexToRgb(themeColors.colors['on-surface'])},${themeColors.variables['medium-emphasis-opacity']})`
  const themeDisabledTextColor = `rgba(${hexToRgb(themeColors.colors['on-surface'])},${themeColors.variables['disabled-opacity']})`
  const themeBorderColor = `rgba(${hexToRgb(String(themeColors.variables['border-color']))},${themeColors.variables['border-opacity']})`
  const themePrimaryTextColor = `rgba(${hexToRgb(themeColors.colors['on-surface'])},${themeColors.variables['high-emphasis-opacity']})`

  return { themeSecondaryTextColor, themeDisabledTextColor, themeBorderColor, themePrimaryTextColor }
}

interface Props {
  series: { id: number; title: string; subtitle?: string }[]
  dataChart: []
}

const refCompCFContainer = ref()
const refCompCFChart = ref()

const chtOption = computed(() => {
  const { themeBorderColor, themeDisabledTextColor, themePrimaryTextColor } = colorVariables(vuetifyTheme.current.value)

  return {
    backgroundColor: vuetifyTheme.global.name.value === 'dark' ? '#2f3349' : '#ffffff',
    legend: {
      left: "center",
      top: 'bottom',
      textStyle: props.series.length > 1 ? { width: 80, color: themePrimaryTextColor, overflow: 'truncate' } : { color: themePrimaryTextColor },
      tooltip: { show: true },
    },
    dataZoom: {
      type: 'inside',
    },

    grid: {
      show: true,
      borderColor: themeBorderColor,
      left: 60,
      top: 20,
      right: 10,
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: Object | [], ticket: string) => {
        return `<b>${params.length ? params[0].axisValue : ''} :</b><table>${
          params.reduce((txspan, value, index) => {
            return `${txspan}<tr><td><div style="width:10px; height:10px; border-radius: 50%; background-color:${value.color};"/></td><td>${value.seriesName}</td><td><span  class="me-3 ms-1">:</span></td><td class="text-right">${Pysc.is_number(value.value[1]) ? Pysc.fmtNumber(value.value[1], true, { mantissa: 2 }) : '-'}</td></tr>`
          }, '')}</table>`
      },
      axisPointer: { type: 'line' },
    },
    yAxis: {
      type: 'value',
      name: 'M.USD',
      axisLabel: {
        color: themePrimaryTextColor,
      },
      nameTextStyle: {
        color: themeDisabledTextColor,
        verticalAlign: "top",
        align: "left",
      },
      nameLocation: "end",
      axisTick: { show: true },
      splitLine: { show: true, lineStyle: { color: themeBorderColor } },
    },
    title: { show: false },
    xAxis: {
      type: 'value',
      scale: true,
      name: 'Year',
      axisLabel: {
        color: themePrimaryTextColor,
        formatter: (value, dataIndex) => {
          return Pysc.is_number(value) ? numbro(value).format({ thousandSeparated: false, mantissa: 0, trimMantissa: true }) : value
        },
        rotate: 45,

      },
      splitLine: { show: false, lineStyle: { color: themeBorderColor } },
      nameTextStyle: {
        color: themeDisabledTextColor,
        verticalAlign: "top",
        align: "center",
        padding: 20,
      },
      nameLocation: "middle",

    },
    series: props.dataChart.map((serData, idx) => {
      return {
        type: "line",
        itemStyle: {
          color: `rgba(${hexToRgb(Pysc.bg_color_table[idx])}, 0.7)`,
        },
        name: idx < props.series.length ? props.series[idx].title : '',
        data: serData.y.map((y, i) => [y, serData.d[i]]),
        symbol: 'none',
      }
    }),
  }
})

// watch(() => [props.baseData, props.dataChart, props.series], (val) => refCompBarChart.value?.setOption(chtOption.value))

function updateCompareCFChart() {
  nextTick(() => {
    refCompCFChart.value?.setOption(chtOption.value)
    refCompCFChart.value?.resize()
  })
}

useResizeObserver(refCompCFContainer, entries => {
  const entry = entries[0]
  const { width, height } = entry.contentRect
  if (refCompCFContainer.value)
    nextTick(() => refCompCFChart.value?.resize())
}, { box: 'device-pixel-content-box' })

onMounted(() => updateCompareCFChart())

const getImageSourceUrl = () => {
  return refCompCFChart.value?.getDataURL({
    type: 'png',
    excludeComponents: ['toolbox'],
  })
}

defineExpose({
  updateCompareCFChart,
  getImageSourceUrl,
})
</script>

<template>
  <VCardText ref="refCompCFContainer">
    <VChart
      ref="refCompCFChart"
      class="compare-cf-chart"
      :option="chtOption"
      :style="{ minBlockSize: '425px' }"
    />
  </VCardText>
</template>

<script setup lang="ts">
import { useAppStore } from '@/stores/appStore'
import * as Pysc from "@/utils/pysc/pyscType"
import { hexToRgb } from '@layouts/utils'
import { BarChart, CustomChart } from "echarts/charts"
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from "echarts/components"
import { graphic, use } from "echarts/core"
import { CanvasRenderer } from "echarts/renderers"
import { abs, max, min } from "mathjs"
import VChart from "vue-echarts"
import type { ThemeInstance } from 'vuetify'
import { useTheme } from 'vuetify'

interface Props {
  dataChart: []
  category: string[]
  title: string
  mode?: 'Tornado' | 'Contrib'
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'Contrib',
})

const numbro = Pysc.useNumbro()

use([
  CanvasRenderer,
  BarChart,
  TitleComponent,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  CustomChart,
])

const vuetifyTheme = useTheme()

const appStore = useAppStore()

const colorVariables = (themeColors: ThemeInstance['themes']['value']['colors'] = vuetifyTheme.current.value) => {
  const themeSecondaryTextColor = `rgba(${hexToRgb(themeColors.colors['on-surface'])},${themeColors.variables['medium-emphasis-opacity']})`
  const themeDisabledTextColor = `rgba(${hexToRgb(themeColors.colors['on-surface'])},${themeColors.variables['disabled-opacity']})`
  const themeBorderColor = `rgba(${hexToRgb(String(themeColors.variables['border-color']))},${themeColors.variables['border-opacity']})`
  const themePrimaryTextColor = `rgba(${hexToRgb(themeColors.colors['on-surface'])},${themeColors.variables['high-emphasis-opacity']})`

  return { themeSecondaryTextColor, themeDisabledTextColor, themeBorderColor, themePrimaryTextColor }
}

const doRenderItem = (params, api) => {
  const categoryIndex = api.value(0)
  const _startV = Math.min(...[api.value(1), api.value(2)])
  const _endV = Math.max(...[api.value(1), api.value(2)])
  const start = api.coord([_startV, categoryIndex])
  const end = api.coord([_endV, categoryIndex])
  const height = api.size([0, 1])[1] * 0.6

  const rectShape = graphic.clipRectByRect(
    {
      x: start[0],
      y: start[1] - height / 2,
      width: end[0] - start[0],
      height,
    },
    {
      x: params.coordSys.x,
      y: params.coordSys.y,
      width: params.coordSys.width,
      height: params.coordSys.height,
    },
  )

  return (
    rectShape && {
      type: 'rect',
      transition: ['shape'],
      shape: rectShape,
      style: api.style(),
    }
  )
}

const chtOption = computed(() => {
  const { themeBorderColor, themeDisabledTextColor, themePrimaryTextColor } = colorVariables(vuetifyTheme.current.value)
  const baseCht_ = props.dataChart.filter(r => r[0] === 1)[0][1]

  let dataCht = []
  let totRange = 0

  if (props.mode === 'Tornado') {
    dataCht = props.dataChart.length
      ? JSON.parse(JSON.stringify(props.dataChart[0].slice(1, props.dataChart[0].length).map((c, i) => props.dataChart.map(r => r[i + 1])).map((col, i) => {
        const cols = col.map((ci, ii) => ({ index: ii, value: ci })).sort((a, b) => a.value - b.value)

        return {
          id: i,
          base: baseCht_,
          value: [cols[0].index < cols[cols.length - 1].index ? cols[0].value : cols[cols.length - 1].value,
            cols[0].index > cols[cols.length - 1].index ? cols[0].value : cols[cols.length - 1].value],
        }
      })))
      : []

    dataCht.sort((a, b) => (Math.abs(a.base - a.value[0]) + Math.abs(a.value[1] - a.base)) - (Math.abs(b.base - b.value[0]) + Math.abs(b.value[1] - b.base)))
  }
  else {
    dataCht = props.dataChart.length
      ? JSON.parse(JSON.stringify(props.dataChart[0].slice(1, props.dataChart[0].length).map((c, i) => props.dataChart.map(r => r[i + 1])).map((col, i) => {
        const cols = col.map(ci => ci).filter(v => Pysc.is_number(v))
        const maxV = cols.length ? max(cols) : 0
        const minV = cols.length ? min(cols) : 0

        return {
          id: i,
          value: maxV - minV,
        }
      })))
      : []

    totRange = dataCht.reduce((tot, val, i) => tot + abs(val.value), 0)
    if (totRange)
      dataCht.sort((a, b) => a.value / totRange - b.value / totRange)
  }

  return {
    backgroundColor: vuetifyTheme.global.name.value === 'dark' ? '#2f3349' : '#ffffff',
    grid: {
      show: true,
      borderColor: themeBorderColor,
      left: 60,
      bottom: 90,
      right: 10,
    },
    legend: {
      left: "center",
      top: 'bottom',
      textStyle: { color: themePrimaryTextColor },
      tooltip: { show: true },
      show: props.mode === 'Tornado',

    },
    tooltip: {
      trigger: 'axis',
      valueFormatter: value => typeof value === 'number' ? numbro(value).format({ optionalMantissa: true }) : value,

    },
    title: { show: true, left: "center", padding: 20, textStyle: { color: themePrimaryTextColor }, text: props.title },
    xAxis: [
      props.mode === 'Tornado'
        ? {
          type: 'value',
          axisLabel: { color: themePrimaryTextColor, rotate: 50 },
          splitLine: { show: false },
          name: props.title,
          nameTextStyle: {
            color: themeDisabledTextColor,
            verticalAlign: "top",
            align: "center",
            padding: 40,
          },
          nameLocation: "middle",

          scale: true,
          valueFormatter: value => typeof value === 'number' ? numbro(value).format({ optionalMantissa: true }) : value,

        }
        : {
            type: 'value',
            axisLabel: { color: themePrimaryTextColor },
            splitLine: { show: false },
            name: 'Contribution, %',
            nameTextStyle: {
              color: themeDisabledTextColor,
              verticalAlign: "top",
              align: "center",
              padding: 10,
            },
            nameLocation: "middle",

            scale: true,
            valueFormatter: value => typeof value === 'number' ? numbro(value).format({ optionalMantissa: true }) : value,

          },
    ],
    yAxis: [
      {
        type: 'category',
        axisTick: {
          show: false,
        },
        axisLine: { show: true, onZero: false },
        axisLabel: {
          color: themePrimaryTextColor,
        },

        // data: dataCht.map((c, i) => props.category[c.id]),
        splitLine: { show: false },
      },
    ],
    series: props.mode === 'Contrib' ? [
      {
        name: 'Contribution, %',
        type: 'bar',
        barCategoryGap: 10,
        data: dataCht.map(c => ({ name: 'max', value: [(totRange ? (c.value / totRange) : 0) * 100, props.category[c.id]] })),
      },
    ] : [
      {
        name: 'Sens. Max',
        type: 'custom',
        color: 'rgba(80,80,250, 0.6)',
        xAxisIndex: 0,

        // stack: 'value',
        renderItem: doRenderItem,
        label: {
          show: false,
          position: 'right',
          color: themePrimaryTextColor,
        },
        barCategoryGap: 15,
        emphasis: {
          focus: 'series',
        },
        encode: {
          x: [1, 2],
          y: 0,
        },
        data: dataCht.map(c => ({ name: 'max', value: [props.category[c.id], c.base, c.value[1]] })),
      },
      {
        name: 'Sens. Min',
        type: 'custom',
        color: 'rgba(255,80,80, 0.6)',
        xAxisIndex: 0,

        // stack: 'value',
        renderItem: doRenderItem,
        label: {
          show: false,
          position: 'right',
          color: themePrimaryTextColor,
        },
        barCategoryGap: 15,
        emphasis: {
          focus: 'series',
        },
        encode: {
          x: [1, 2],
          y: 0,
        },
        data: dataCht.map(c => ({ name: 'max', value: [props.category[c.id], c.base, c.value[0]] })),
      },
    ],
  }
})

const chartSensContainer = ref()
const refSensBarChart = ref()

const getDataSource = (value: string, sourceType: string) => {
  const rndid = Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)

  return {
    url: refSensBarChart.value?.getDataURL({
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
    if (refSensBarChart.value)
      refSensBarChart.value?.resize()
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
      ref="refSensBarChart"
      class="sens-bar-chart"
      :option="chtOption"
      :style="{ minBlockSize: `${(props.category.length ?? 5) * 80}px` }"
    />
  </VCardText>
</template>

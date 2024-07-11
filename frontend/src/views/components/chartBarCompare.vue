<script setup lang="ts">
import * as Pysc from "@/utils/pysc/pyscType";
import { hexToRgb } from '@layouts/utils';
import { BarChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from "echarts/components";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import * as math from 'mathjs';
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
  series: { id: number, title: string, subtitle?: string }[]
  dataChart: []
  baseData: { name: string, value: [] }
  mode?: number
}

const props = withDefaults(defineProps<Props>(), {
  mode: 0
})
const refCompBarContainer = ref()
const refCompBarChart = ref()

const yCatName = [
  { title: 'NCS', unit: 'MUSD' },
  { title: 'Ctr. NPV', unit: 'MUSD' },
  { title: 'Ctr. PI', unit: '' },
  { title: 'Ctr. IRR', unit: '%' },
  { title: 'Ctr. POT', unit: 'Year' },
  { title: 'CR/DC', unit: 'MUSD' },
  { title: 'GoS', unit: 'MUSD' },
  { title: 'GoI NPV', unit: 'MUSD' },
  { title: 'DMO', unit: 'MUSD' },
  { title: 'Tax', unit: 'MUSD' },
]

const chtOption = computed(() => {
  const { themeBorderColor, themeDisabledTextColor, themePrimaryTextColor } = colorVariables(vuetifyTheme.current.value)

  const chartOpt = {
    legend: {
      left: "center", top: 'bottom',
      textStyle: props.series.length > 1 ? { width: 80, color: themePrimaryTextColor, overflow: 'truncate' } : { color: themePrimaryTextColor },
      tooltip: { show: true },
    },
    grid: {
      show: true,
      borderColor: themeBorderColor,
      left: 60,
      top: 10,
      right: 10,
    },
    tooltip: {},
    yAxis: {
      type: 'category',
      data: yCatName.map(v => v.title),
      axisLabel: {
        color: themePrimaryTextColor,
      },
      axisTick: {

      },
      splitLine: { show: false, lineStyle: { color: themeBorderColor } },
    },
    title: { show: false },
    xAxis: {
      name: '%',
      type: 'value',
      scale: true,
      axisLabel: { color: themePrimaryTextColor },
      splitLine: { show: false, lineStyle: { color: themeBorderColor } },
      nameTextStyle: {
        color: themeDisabledTextColor,
        verticalAlign: "top",
        align: "center",
        padding: 10
      },
      nameLocation: "middle",
      valueFormatter: (value) => typeof value === 'number' ? numbro(value).format({ optionalMantissa: true }) : value,
    },
    series: props.dataChart.map((serData, idx) => {
      return {
        type: "bar",
        name: idx < props.series.length ? props.series[idx].title : '',

        barCategoryGap: 15,
        data: serData.map(v => {
          if (typeof v.percent === 'number')
            v.percent = numbro.unformat(numbro(v.percent).format({ mantissa: 5 }))
          return v.percent
        }),
        tooltip: {
          formatter: (params: Object | [], ticket: string) => {
            const idx_value = yCatName.findIndex(v => v.title == params.name)
            const val_vase = typeof props.baseData.value[idx_value] === 'number' ? numbro(props.baseData.value[idx_value]).format({ thousandSeparated: true, mantissa: 2 }) : ''
            const txt = `<b>${params.name + ', <span class="text-caption">' + yCatName[idx_value].unit}</span>:</b><table>` +
              (`<tr><td>${props.baseData.name}</td><td><span  class="me-3 ms-1">:</span></td><td class="text-right">${val_vase}</td><td></td></tr>`) +
              props.dataChart.reduce((txt, v, i) => {
                const name = i < props.series.length ? props.series[i].title : ''
                const val_percent = numbro((typeof v[idx_value].percent === 'number' ? v[idx_value].percent : 0) / 100).format({ output: 'percent', mantissa: 2 })
                const val = numbro(typeof v[idx_value].value === 'number' ? v[idx_value].value : 0).format({ thousandSeparated: true, mantissa: 2 })
                return txt + `<tr><td>${name}</td><td><span  class="me-3 ms-1">:</span></td><td class="text-right">${val}</td><td class="text-right"><span class="ml-2 text-caption ${v[idx_value].percent < 0 ? 'text-error' : ''}"><b>${val_percent}<b></span></td></tr>`
              }, '') + '</table>'
            return txt
          }
        }
        // data: idx < props.dataChart.length ? props.dataChart[idx] : []
      }
    }),
  }
  return chartOpt
})

// watch(() => [props.baseData, props.dataChart, props.series], (val) => refCompBarChart.value?.setOption(chtOption.value))

function updateCompareBarChart() {
  nextTick(() => {
    refCompBarChart.value?.setOption(chtOption.value)
    refCompBarChart.value?.resize()
  })
}

useResizeObserver(refCompBarContainer, (entries) => {
  const entry = entries[0]
  const { width, height } = entry.contentRect
  if (refCompBarContainer.value) nextTick(() => refCompBarChart.value?.resize())
}, { box: 'device-pixel-content-box' })

onMounted(() => updateCompareBarChart())

defineExpose({
  updateCompareBarChart
})
</script>

<template>
  <VCardText ref="refCompBarContainer">
    <v-chart ref="refCompBarChart" class="compare-bar-chart" :option="chtOption"
      :style="{ minBlockSize: (props.mode == 0 ? 425 : 390) + ((math.max($props.dataChart.length, 1) - 1) * yCatName.length * 10) + 'px' }" />
  </VCardText>
</template>

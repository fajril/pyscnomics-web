<script setup lang="ts">
import { useAppStore } from "@/stores/appStore";
import * as Pysc from "@/utils/pysc/pyscType";
import { hexToRgb } from '@layouts/utils';
import { RadarChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from "echarts/components";
import { graphic, use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import * as math from 'mathjs';
import VChart from "vue-echarts";
import type { ThemeInstance } from 'vuetify';
import { useTheme } from 'vuetify';

const numbro = Pysc.useNumbro()
use([
  CanvasRenderer,
  RadarChart,
  TitleComponent,
  GridComponent,
  TooltipComponent,
  LegendComponent
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
  selCase: number[]
  dataChart: []
}
const props = defineProps<Props>()
const appStore = useAppStore()
const refCompContainer = ref()
const refCompChart = ref()

const chtOption = computed(() => {
  const { themeBorderColor, themeDisabledTextColor, themePrimaryTextColor } = colorVariables(vuetifyTheme.current.value)
  const indicator = [
    { name: 'Revenue', long: 'Revenue' },
    { name: 'CR/DC', long: 'Cost Recovery/Deductible Cost' },
    { name: 'NCS', long: 'Net Contractor Share' },
    { name: 'Ctr. NPV', long: 'Contractor NPV' },
    { name: 'Ctr. IRR', long: 'Contractor IRR' },
    { name: 'Ctr. PI', long: 'Contractor PI' },
    { name: 'DMO', long: 'DMO' },
    { name: 'Tax', long: 'Tax' },
    { name: 'GoS', long: 'Government Share' },
    { name: 'GoI NPV', long: 'Government NPV' },
  ]
  const getDataIndicator = (index: number) => {
    if (props.dataChart.length)
      return props.dataChart.map(cs => {
        return index < cs.length ? cs[index] : 0
      })
    return []
  }
  const MaxDataIndicator = (index: nuber) => {
    const data = getDataIndicator(index)
    return data.length ? math.max(data) : 0
  }
  const MinDataIndicator = (index: nuber) => {
    const data = getDataIndicator(index)
    return data.length ? math.min(data) : 0
  }
  const caseName = props.selCase.map(_id => ({ id: _id, name: appStore.caseByID(_id)?.name }))
  const chartOpt = {
    legend: {
      textStyle: { color: themePrimaryTextColor }
    },
    radar: [
      {
        indicator: indicator.map((name, idx) => ({ text: name.name, max: MaxDataIndicator(idx) })),
        splitNumber: 4,
        splitArea: {
          areaStyle: {
            shadowColor: 'rgba(0, 0, 0, 0.2)',
            shadowBlur: 10,
            opacity: 0.25,
          },
        },
        axisTick: { show: false },
        axisLine: {
          lineStyle: {
            color: themeBorderColor,
            width: 1,
            opacity: 0.7,
          }
        },
        splitLine: {
          lineStyle: {
            color: themeBorderColor,
            width: 1,
            opacity: 0.7,
          }
        },
        axisName: {
          formatter: '{value}',
          color: '#428BD4'
        },
        triggerEvent: true,
        tooltip: {
          formatter: (params: Object | [], ticket: string) => {
            const idxI = indicator.findIndex(e => e.name === params.name)
            const data = getDataIndicator(idxI).map((v, i) => ({ idx: i, value: v })).sort((a, b) => b.value - a.value)
            const txt = `<b>${indicator[idxI].long} ${idxI === 4 ? '(%)' : (idxI !== 5 ? '(USD)' : '')}</b><table>` +
              data.reduce((txt, v, i) => {
                const name = caseName[v.idx].name
                const val = typeof v.value === 'number' ? numbro(v.value * (![4, 5].includes(idxI) ? 1e6 : 1)).format({ mantissa: 3, thousandSeparated: true, average: ![4, 5].includes(idxI) }).toUpperCase() : ''
                return txt + `<tr><td>${name}</td><td><span  class="me-3 ms-1">:</span></td><td class="text-right">${val}</td></tr>`
              }, '') + '</table>'
            return txt
          }
        },
      }
    ],
    tooltip: {},
    series: [
      {
        type: 'radar',
        tooltip: {
          valueFormatter: (value, dataIndex) => {
            return value !== undefined ? numbro(value).format({ optionalMantissa: true }) : value
          },
        },
        data: props.selCase.map((s, idx) => {
          return {
            value: props.dataChart.length ? props.dataChart[idx] : [],
            name: caseName[idx].name,
            lineStyle: {
              type: idx === 0 ? 'solid' : 'dashed',
            },
            areaStyle: idx === 0 ? {
              color: new graphic.RadialGradient(0.5, 0.5, 1, [
                {
                  color: 'rgba(255, 145, 124, 0.1)',
                  offset: 0
                },
                {
                  color: 'rgba(255, 145, 124, 0.7)',
                  offset: 1
                }
              ])
            } : undefined,

          }
        })
      }
    ]
  }
  return chartOpt
})

function updateCompareChart() {
  nextTick(() => {
    refCompChart.value?.setOption(chtOption.value)
    refCompChart.value?.resize()
  })
}

useResizeObserver(refCompContainer, (entries) => {
  const entry = entries[0]
  const { width, height } = entry.contentRect
  if (refCompContainer.value) nextTick(() => refCompChart.value?.resize())
}, { box: 'device-pixel-content-box' })

onMounted(() => updateCompareChart())

defineExpose({
  updateCompareChart
})
</script>

<template>
  <VCardText ref="refCompContainer">
    <v-chart ref="refCompChart" class="compare-chart" :option="chtOption" />
  </VCardText>
</template>

<style lang="scss" scoped>
.compare-chart {
  min-block-size: 400px;
}
</style>

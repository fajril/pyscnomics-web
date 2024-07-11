<script setup lang="ts">
import { RadarChart } from "echarts/charts"
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from "echarts/components"
import { graphic, use } from "echarts/core"
import { CanvasRenderer } from "echarts/renderers"
import * as math from 'mathjs'
import VChart from "vue-echarts"
import type { ThemeInstance } from 'vuetify'
import { useTheme } from 'vuetify'
import { hexToRgb } from '@layouts/utils'
import * as Pysc from "@/utils/pysc/pyscType"

const props = defineProps<Props>()
const numbro = Pysc.useNumbro()

use([
  CanvasRenderer,
  RadarChart,
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

const refCompContainer = ref()
const refCompChart = ref()

const chtOption = computed(() => {
  const { themeBorderColor, themeDisabledTextColor, themePrimaryTextColor } = colorVariables(vuetifyTheme.current.value)

  const indicator = [
    { name: 'Revenue', long: 'Revenue', min: undefined, max: undefined },
    { name: 'CR/DC', long: 'Cost Recovery/Deductible Cost', min: undefined, max: undefined },
    { name: 'NCS', long: 'Net Contractor Share', min: undefined, max: undefined },
    { name: 'Ctr. NPV', long: 'Contractor NPV', min: undefined, max: undefined },
    { name: 'Ctr. IRR', long: 'Contractor IRR', min: undefined, max: undefined },
    { name: 'Ctr. PI', long: 'Contractor PI', min: undefined, max: undefined },
    { name: 'DMO', long: 'DMO', min: undefined, max: undefined },
    { name: 'Tax', long: 'Tax', min: undefined, max: undefined },
    { name: 'GoS', long: 'Government Share', min: undefined, max: undefined },
    { name: 'GoI NPV', long: 'Government NPV', min: undefined, max: undefined },
  ]

  indicator.map((ind, idx) => {
    return props.dataChart.reduce((_prev, v, i) => {
      if (Array.isArray(v) && idx < v.length && typeof v[idx] === 'number') {
        if (_prev.max == undefined)
          _prev.max = v[idx]
        else
          _prev.max = math.max(_prev.max, v[idx])
      }

      return _prev
    }, ind)
  })

  const getDataIndicator = (index: number) => {
    if (props.dataChart.length) {
      return props.dataChart.map(cs => {
        return index < cs.length ? cs[index] : 0
      })
    }

    return []
  }

  const MaxDataIndicator = (index: nuber) => {
    const data = getDataIndicator(index).filter(v => Pysc.is_number(v))

    return data.length ? math.max(data) : 0
  }

  const MinDataIndicator = (index: nuber) => {
    const data = getDataIndicator(index).filter(v => Pysc.is_number(v))

    return data.length ? math.min(data) : 0
  }

  // const lenVData = props.dataChart.reduce((tot, s, i) => {
  //   return i === 0 ? s.map(v => Pysc.is_number(v) ? math.abs(v) : 0) : (s.length ? math.add(tot, s.map(v => Pysc.is_number(v) ? math.abs(v) : 0)) : tot)
  // }, Array(props.dataChart.length).fill(0))
  // const dataCase_ = props.dataChart.map(s => s.map((v, i) => {
  //   const ratio = lenVData[i] ? (v / lenVData[i]) : 0.0
  //   return (v < 0 && ratio ? (1 - ratio) : ratio) * 100
  // }))
  return {
    title: { show: false },
    legend: {
      show: true,
      textStyle: props.series.length > 1 ? { width: 80, color: themePrimaryTextColor, overflow: 'truncate' } : { color: themePrimaryTextColor },
      tooltip: { show: true },
    },
    radar: [
      {
        center: ['50%', '55%'],
        indicator: indicator.map((name, idx) => {
          const _min = MinDataIndicator(idx)

          return { name: name.name, min: _min < 0 && name.max >= 0 ? -(math.abs(_min) + math.abs(name.max)) : undefined, max: name.max }// { name: name.name, max: MaxDataIndicator(idx), min: _max > 0 && _min < 0 ? _min : undefined }
        }),
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
          },
        },
        splitLine: {
          lineStyle: {
            color: themeBorderColor,
            width: 1,
            opacity: 0.7,
          },
        },
        axisName: {
          formatter: '{value}',
          color: '#428BD4',
        },
        triggerEvent: true,
        tooltip: {
          formatter: (params: Object | [], ticket: string) => {
            const idxI = indicator.findIndex(e => e.name === params.name)
            const data = getDataIndicator(idxI).map((v, i) => ({ idx: i, value: v })).sort((a, b) => b.value - a.value)

            return `<b>${indicator[idxI].long} ${idxI === 4 ? '(%)' : (idxI !== 5 ? '(MUSD)' : '')}</b><table>${
              data.reduce((txt, v, i) => {
                const name = props.series[v.idx].title
                const val = Pysc.is_number(v.value) ? Pysc.fmtNumber(v.value, true, { mantissa: 2, thousandSeparated: true }) : ''

                return `${txt}<tr><td>${name}</td><td><span  class="me-3 ms-1">:</span></td><td class="text-right">${val}</td></tr>`
              }, '')}</table>`
          },
        },
      },
    ],
    tooltip: {},
    series: [
      {
        type: 'radar',
        tooltip: {
          formatter: (params: Object | Array, ticket: string) => {
            return `<b>${params.name} :</b><table>${
              params.value.reduce((html_, v, i) => {
                const name = indicator[i].name
                const val = Pysc.is_number(v) ? Pysc.fmtNumber(v, true, { mantissa: 2, thousandSeparated: true }) : ''

                return `${html_}<tr><td>${name}</td><td><span  class="me-3 ms-1">:</span></td><td class="text-right">${val}</td></tr>`
              }, '')}</table>`
          },

          // valueFormatter: (value) => {
          //   return Pysc.is_number(value) ? Pysc.fmtNumber(value, false, { optionalMantissa: true }) : ''
          // },
        },
        data: props.series.map((s, idx) => {
          return {
            value: idx < props.dataChart.length

              // dataCase_[idx] : [],
              ? props.dataChart[idx].map((v, i) => {
                return Pysc.is_number(v) ? v : 0
              }) : [],
            name: s.title,
            lineStyle: {
              type: idx === 0 ? 'solid' : 'dashed',
            },
            scale: true,
            areaStyle: idx === 0
              ? {
                  color: new graphic.RadialGradient(0.5, 0.5, 1, [
                    {
                      color: 'rgba(255, 145, 124, 0.1)',
                      offset: 0,
                    },
                    {
                      color: 'rgba(255, 145, 124, 0.7)',
                      offset: 1,
                    }
                  ]),
                }
              : undefined,

          }
        }),
      },
    ],
  }
})

function updateCompareChart() {
  nextTick(() => {
    refCompChart.value?.setOption(chtOption.value)
    refCompChart.value?.resize()
  })
}

useResizeObserver(refCompContainer, entries => {
  const entry = entries[0]
  const { width, height } = entry.contentRect
  if (refCompContainer.value)
    nextTick(() => refCompChart.value?.resize())
}, { box: 'device-pixel-content-box' })

onMounted(() => updateCompareChart())

defineExpose({
  updateCompareChart,
})
</script>

<template>
  <VCardText ref="refCompContainer">
    <VChart
      ref="refCompChart"
      class="compare-chart"
      :option="chtOption"
    />
  </VCardText>
</template>

<style lang="scss" scoped>
.compare-chart {
  min-block-size: 400px;
}
</style>

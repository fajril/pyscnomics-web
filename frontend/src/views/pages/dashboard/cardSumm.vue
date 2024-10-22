<script setup lang="ts">
import { hexToRgb } from '@layouts/utils'
import { BarChart, LineChart, PieChart } from "echarts/charts"
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from "echarts/components"
import { use } from "echarts/core"
import { CanvasRenderer } from "echarts/renderers"
import * as math from 'mathjs'
import { randomInt } from "mathjs"
import VChart from "vue-echarts"
import { useTheme } from 'vuetify'
import * as Pysc from "@/utils/pysc/pyscType"

interface Props {
  title: string
  subtitle?: string
  value: string
  chart?: number
  mode?: number
  table: object | null
  ctrType?: number
  colorCard?: string
  isLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  subtitle: undefined,
  ctrType: -1,
  isLoading: false,
})

const emit = defineEmits<Emit>()

use([
  CanvasRenderer,
  BarChart,
  LineChart,
  PieChart,
  TitleComponent,
  GridComponent,
  TooltipComponent,
  LegendComponent,
])

const cardColor = computed(() => {
  return props.colorCard === undefined ? ['info', 'primary', 'error', 'warning', 'success', 'secondary', 'muted'].at(randomInt(0, 6)) : props.colorCard
})

interface Emit {
  (e: 'show-detail', value: any): void
}
const datacht = computed(() => props.table)
const refChartContainer = ref()
const chartCard = ref()

onMounted(() => {
  useResizeObserver(refChartContainer, entries => {
    const entry = entries[0]
    const { width, height } = entry.contentRect

    nextTick(() => {
      chartCard.value?.resize()
    })
  })
  if (props.chart === 5)
    chartCard.value?.chart.on("click", params => emit('show-detail', params))
})

const vuetifyTheme = useTheme()

const colorVariables = (themeColors: ThemeInstance['themes']['value']['colors'] = vuetifyTheme.current.value) => {
  const themeSecondaryTextColor = `rgba(${hexToRgb(themeColors.colors['on-surface'])},${themeColors.variables['medium-emphasis-opacity']})`
  const themeDisabledTextColor = `rgba(${hexToRgb(themeColors.colors['on-surface'])},${themeColors.variables['disabled-opacity']})`
  const themeBorderColor = `rgba(${hexToRgb(String(themeColors.variables['border-color']))},${themeColors.variables['border-opacity']})`
  const themePrimaryTextColor = `rgba(${hexToRgb(themeColors.colors['on-surface'])},${themeColors.variables['high-emphasis-opacity']})`

  return { themeSecondaryTextColor, themeDisabledTextColor, themeBorderColor, themePrimaryTextColor }
}

const numbro = Pysc.useNumbro()

const cardChartOpt = computed(() => {
  const { themeBorderColor, themeDisabledTextColor, themePrimaryTextColor } = colorVariables(vuetifyTheme.current.value)

  // console.log(props.table)
  const Opt = {
    title: {
      show: false,
    },
    legend: { show: false },
    grid: { show: false, left: 0, right: 0, top: 0, bottom: 0 },
    xAxis: {
      show: false,
      name: 'Year',
      data: [],
    },
    yAxis: [{
      show: false,
      type: 'value',
    },
    {
      show: false,
      type: 'value',
      position: 'right',
    }],
    tooltip: {
      show: props.chart === 5,
      trigger: 'item',
      align: 'center',
      position: ['50%', '90%'],
      valueFormatter: value => {
        if (value !== undefined) {
          const val = value / (props.table.sum ?? 1)

          // return (`${numbro(value * 1e6).format({ average: true, mantissa: 2 }).toUpperCase()} (${numbro(val).format({ output: 'percent', mantissa: 2 })})`)
          return (`${numbro(value).format({ mantissa: 2 }).toUpperCase()} (${numbro(val).format({ output: 'percent', mantissa: 2 })})`)
        }
        else { return "" }
      },
    },
    series: props.chart === 5
      ? [{
        type: 'pie',
        data: [],
        label: {
          color: themePrimaryTextColor,
        },
        radius: [0, '60%'],
        labelLine: {
          show: true,
          length: 10,
          length2: 5,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          }
        },

      }]
      : props.chart === 8
        ? [
          {
            name: "Oil Price",
            type: "line",
            yAxisIndex: 0,
            data: [],
            symbol: 'none',
          },
          {
            name: 'OPEX',
            type: "line",
            yAxisIndex: 0,
            data: [],
            symbol: 'none',
          },
          {
            name: 'CAPEX',
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
        ]
        : [
          {
            type: "bar",
            yAxisIndex: 0,
            data: [],
            color: props.chart === 0 && props.mode === 0 ? 'rgba(0,180,0,0.5)' : (props.chart === 0 && props.mode === 1 ? 'rgba(180,0,0,0.5)' : undefined),
          },
          {
            type: "line",
            color: props.chart === 0 && props.mode === 0 ? 'rgba(0,230,0,0.8)' : (props.chart === 0 && props.mode === 1 ? 'rgba(230,0,0,0.8)' : undefined),
            yAxisIndex: 1,
            data: [],
            symbol: 'none',
          },
        ],
  }

  Opt.yAxis.splice(2, Opt.yAxis.length)
  if (props.chart != 8)
    Opt.series.splice(2, Opt.yAxis.length)
  try {
    if (props.chart === 0 && props.mode === 1) {
      Opt.xAxis.data.splice(0, Opt.xAxis.data.length, ...props.table.y)
      Opt.yAxis.push({
        show: false,
        type: 'value',
      },
      {
        show: false,
        type: 'value',
        position: 'right',
      })
      Opt.series[0].color = 'rgba(0,180,0,0.5)'
      Opt.series[1].color = 'rgba(0,230,0,0.8)'
      Opt.series.push({ type: "bar", yAxisIndex: 2, data: [], color: 'rgba(180, 0, 0, 0.5)' }, { type: "line", yAxisIndex: 3, data: [], color: 'rgba(230, 0, 0, 0.8)', symbol: 'none' })
      if (Array.isArray(props.table.d) && props.table.d.length === 2
        && Array.isArray(props.table.d[0]) && props.table.d[0].length === 2 && Array.isArray(props.table.d[1]) && props.table.d[1].length === 2) {
        Opt.series[0].data.splice(0, Opt.series[0].data.length, ...props.table.d[0][0])
        Opt.series[1].data.splice(0, Opt.series[1].data.length, ...props.table.d[0][1])
        Opt.series[2].data.splice(0, Opt.series[2].data.length, ...props.table.d[1][0])
        Opt.series[3].data.splice(0, Opt.series[3].data.length, ...props.table.d[1][1])
      }
      else { Opt.series[0].data.splice(0, Opt.series[0].data.length, ...[]) }
    }
    else if (props.chart === 8) {
      Opt.series.forEach(ser => {
        if (props.table && Array.isArray(props.table[ser.name]))
          ser.data.splice(0, ser.data.length, ...props.table[ser.name].map(v => v[1]))
      })
    }
    else if (props.chart === 5) {
      Opt.series[0].data.splice(0, Opt.series[0].data.length,
        ...Object.keys(props.table.d).map(key => ({
          name: key === "CR" ? ([1, 3].includes(props.ctrType) ? "CR" : "DC") : key,
          usd: props.table.d[key].value,
          value: props.table.d[key].value,
        })))
    }
    else if (props.chart === 3) {
      Opt.xAxis.data.splice(0, Opt.xAxis.data.length, ...props.table.y)
      Opt.series.push({ type: "bar", yAxisIndex: 0, data: [], color: undefined }, { type: "line", yAxisIndex: 1, data: [], color: undefined, symbol: 'none' })
      if (Array.isArray(props.table.d) && props.table.d.length === 2
        && Array.isArray(props.table.d[0]) && props.table.d[0].length === 2 && Array.isArray(props.table.d[1]) && props.table.d[1].length === 2) {
        Opt.series[0].data.splice(0, Opt.series[0].data.length, ...props.table.d[0][0])
        Opt.series[1].data.splice(0, Opt.series[1].data.length, ...props.table.d[0][1])
        Opt.series[2].data.splice(0, Opt.series[2].data.length, ...props.table.d[1][0])
        Opt.series[3].data.splice(0, Opt.series[3].data.length, ...props.table.d[1][1])
      }
      else { Opt.series[0].data.splice(0, Opt.series[0].data.length, ...[]) }
    }
    else {
      Opt.xAxis.data.splice(0, Opt.xAxis.data.length, ...props.table.y)
      if (Array.isArray(props.table.d) && props.table.d.length === 2) {
        Opt.series[0].data.splice(0, Opt.series[0].data.length, ...props.table.d[0])
        Opt.series[1].data.splice(0, Opt.series[1].data.length, ...props.table.d[1])
      }
      else { Opt.series[0].data.splice(0, Opt.series[0].data.length, ...[]) }
      if (props.chart === 6 && props.table.y.length) {
        // arrange scale y axis
        const lenData = props.table.y.length
        const contCF_col = props.table.d[1].map(v => Pysc.toNumnber(v))
        const contcumCF_col = props.table.d[0].map(v => Pysc.toNumnber(v))
        let minCFValue = +math.min(contCF_col)
        let maxCFValue = +math.max(contCF_col)
        const lenCFValue = math.abs(maxCFValue - minCFValue)
        const prcLowCFValue = math.abs(minCFValue) / lenCFValue
        const prcHiCFValue = math.abs(maxCFValue) / lenCFValue

        let minCCFValue = +math.min(contcumCF_col)
        let maxCCFValue = +math.max(contcumCF_col)
        const lenCCFValue = math.abs(maxCCFValue - minCCFValue)
        const prcLowCCFValue = math.abs(minCCFValue) / lenCCFValue
        const prcHiCCFValue = math.abs(maxCCFValue) / lenCCFValue

        if (prcLowCCFValue < prcLowCFValue)
          minCCFValue = prcLowCFValue * lenCCFValue * (minCCFValue < 0 ? -1 : 1)
        else if (prcLowCFValue < prcLowCCFValue)
          minCFValue = prcLowCCFValue * lenCFValue * (minCFValue < 0 ? -1 : 1)

        if (prcHiCCFValue < prcHiCFValue)
          maxCCFValue = prcHiCFValue * lenCCFValue * (maxCCFValue < 0 ? -1 : 1)
        else if (prcHiCFValue < prcHiCCFValue)
          maxCFValue = prcHiCCFValue * lenCFValue * (maxCFValue < 0 ? -1 : 1)

        Opt.yAxis[0].min = minCCFValue
        Opt.yAxis[0].max = maxCCFValue
        Opt.yAxis[1].min = minCFValue
        Opt.yAxis[1].max = maxCFValue
      }
    }
  }
  catch (error) {
    console.log(error)
  }

  return Opt
})

const isHover = ref(false)
</script>

<template>
  <VCard
    class="logistics-card-statistics cursor-pointer"
    :loading="props.isLoading ? 'primary' : false"
    :style="isHover ? `border-block-end-color: rgb(var(--v-theme-${cardColor}))` : `border-block-end-color: rgba(var(--v-theme-${cardColor}),0.23)`"
  >
    <VCardText class="px-3 py-2">
      <VRow no-gutters>
        <VCol cols="12">
          <h5
            class="text-h5"
            :class="{ 'mb-6': props.subtitle === undefined }"
          >
            {{ props.title }}
          </h5>
          <span
            v-if="props.subtitle"
            class="text-sm text-disabled"
          >{{ props.subtitle }}</span>
        </VCol>
        <VCol
          ref="refChartContainer"
          cols="12"
        >
          <VChart
            ref="chartCard"
            :class="props.chart === 5 ? 'card-pie' : 'card-chart'"
            :option="cardChartOpt"
          />
        </VCol>
        <VCol
          cols="12"
          class="d-flex align-center justify-space-between mt-1"
        >
          <h4
            class="text-center"
            :class="{ 'text-h4': props.chart != 8 && !(props.chart == 0 && props.mode == 1), 'text-h6 mt-3': props.chart == 8 || (props.chart == 0 && props.mode == 1) }"
            v-html="props.value"
          />
        </VCol>
      </VRow>
    </VCardText>
  </VCard>
</template>

<style lang="scss" scoped>
@use "@core/scss/base/mixins" as mixins;

.card-chart {
  min-block-size: 90px;
}

.card-pie {
  min-block-size: 306px;
}

.dialog-bottom-transition-enter-active,
.dialog-bottom-transition-leave-active {
  transition: transform 0.2s ease-in-out;
}

.logistics-card-statistics {
  border-block-end-style: solid;
  border-block-end-width: 2px;

  &:hover {
    border-block-end-width: 3px;
    margin-block-end: -1px;

    @include mixins.elevation(8);

    transition: all 0.1s ease-out;
  }
}

.skin--bordered {
  .logistics-card-statistics {
    border-block-end-width: 2px;

    &:hover {
      border-block-end-width: 3px;
      margin-block-end: -2px;
      transition: all 0.1s ease-out;
    }
  }
}
</style>

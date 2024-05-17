<script setup lang="ts">
import * as Pysc from "@/utils/pysc/pyscType";
import { hexToRgb } from '@layouts/utils';
import { BarChart, LineChart } from "echarts/charts";
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
  BarChart, LineChart,
  TitleComponent,
  GridComponent,
  TooltipComponent,
  LegendComponent
]);

// provide(THEME_KEY, "dark")

const vuetifyTheme = useTheme()
const colorVariables = (themeColors: ThemeInstance['themes']['value']['colors'] = vuetifyTheme.current.value) => {
  const themeSecondaryTextColor = `rgba(${hexToRgb(themeColors.colors['on-surface'])},${themeColors.variables['medium-emphasis-opacity']})`
  const themeDisabledTextColor = `rgba(${hexToRgb(themeColors.colors['on-surface'])},${themeColors.variables['disabled-opacity']})`
  const themeBorderColor = `rgba(${hexToRgb(String(themeColors.variables['border-color']))},${themeColors.variables['border-opacity']})`
  const themePrimaryTextColor = `rgba(${hexToRgb(themeColors.colors['on-surface'])},${themeColors.variables['high-emphasis-opacity']})`

  return { themeSecondaryTextColor, themeDisabledTextColor, themeBorderColor, themePrimaryTextColor }
}


interface Props {
  // dataTable: Pysc.TableCFOption
  dataChart: Pysc.TableCFOption
  type: 'Oil' | 'Gas' | 'Cons'
  contractType: 'CR' | 'GS'
  title: string
  multiContract?: boolean
  isContract2?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  multiContract: false,
  isContract2: false
})

const chartCF = ref()

const chtOption = computed(() => {
  const { themeBorderColor, themeDisabledTextColor, themePrimaryTextColor } = colorVariables(vuetifyTheme.current.value)

  const Opt = {
    title: {
      text: props.title,
      left: "center",
      textStyle: { color: themePrimaryTextColor }
    },
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value) => value !== undefined ? numbro(value).format({ optionalMantissa: true }) : value,
      axisPointer: { type: 'cross' }
    },
    legend: {
      left: "center", top: 'bottom',
      textStyle: { color: themePrimaryTextColor }
    },
    grid: {
      show: true,
      borderColor: themeBorderColor,
      left: 90, right: 90
    },
    xAxis: {
      name: 'Year',
      data: [],
      axisTick: {
        alignWithLabel: true
      },
      axisLine: {
        onZero: false,
      },
      nameTextStyle: {
        color: themeDisabledTextColor,
        verticalAlign: "top",
        align: "center",
        padding: 10
      },
      nameLocation: "middle",
      axisLabel: { color: themePrimaryTextColor },
      splitLine: { show: true, lineStyle: { color: themeBorderColor } },

    },
    yAxis: [{
      type: 'value',
      min: -10,
      max: 250,
      // minInterval: 200000,
      // maxInterval: 200000,
      // splitNumber: 5,
      axisLine: {
        onZero: false,
      },
      name: 'Cum. Cashflow, MUSD',
      splitLine: { show: true, lineStyle: { color: themeBorderColor } },
      axisLabel: {
        color: themePrimaryTextColor,
        formatter: (value, index) => {
          return value !== undefined ? numbro(value).format({ optionalMantissa: true }) : value
        }
      },
      nameTextStyle: {
        color: themeDisabledTextColor,
        verticalAlign: "bottom",
        align: "left",
      },
      nameLocation: "end",
    },
    {
      type: 'value',
      position: 'right',
      name: 'Cashflow, MUSD',
      min: -10,
      max: 250,
      // splitNumber: 5,
      // minInterval: 200000,
      // maxInterval: 200000,
      axisLine: {
        onZero: false,
      },
      splitLine: { show: false, lineStyle: { color: themeBorderColor } },
      axisLabel: {
        color: themePrimaryTextColor,
        formatter: (value, index) => {
          return value !== undefined ? numbro(value).format({ optionalMantissa: true }) : value
        }
      },
      nameTextStyle: {
        color: themeDisabledTextColor,
        verticalAlign: "bottom",
        align: "right",
      },
      nameLocation: "end",
    }],
    series: [
      {
        name: "Contr. Cumm. Cashflow",
        type: "line",
        yAxisIndex: 0,
        data: [],
        symbol: 'none',
      },
      {
        name: "Gov. Cumm. Cashflow",
        type: "line",
        yAxisIndex: 0,
        data: [],
        symbol: 'none',
      },
      {
        name: "Contr. Cashflow",
        type: "bar",
        yAxisIndex: 1,
        data: [],
      },
      {
        name: "Gov. Cashflow",
        type: "bar",
        yAxisIndex: 1,
        data: [],
      }
    ]
  }
  const lenData = props.dataChart.data.length
  const contCF_col = props.dataChart.data.map(v => v.slice(-3)[0]).slice(0, lenData - 1)
  const contcumCF_col = props.dataChart.data.map(v => v.slice(-2)[0]).slice(0, lenData - 1)

  const GovTake_col = props.dataChart.data.map(v => v.slice(-1)[0]).slice(0, lenData - 1)
  const Tangible_col = props.dataChart.data.map(v => v.slice(4)[0]).slice(0, lenData - 1)
  const NonCap_col = props.dataChart.data.map(v => v.slice(props.contractType === 'CR' || props.type === 'Cons' ? 9 : 15)[0]).slice(0, lenData - 1)

  const govCF_col = math.subtract(GovTake_col, math.add(Tangible_col, NonCap_col))
  const govcumCF_col = math.cumsum(govCF_col)

  //calc min/max
  const allcol = [...contCF_col, ...contcumCF_col, ...govCF_col, ...govcumCF_col]
  let vmin = allcol.length ? math.min([...contCF_col, ...contcumCF_col, ...govCF_col, ...govcumCF_col]) : 0
  let vmax = allcol.length ? math.max([...contCF_col, ...contcumCF_col, ...govCF_col, ...govcumCF_col]) : 0

  const txMin = numbro(math.abs(vmin)).format({ average: true, mantissa: 1 })
  const txMax = numbro(math.abs(vmax)).format({ average: true, mantissa: 1 })
  if (txMin.indexOf('k') !== -1)
    vmin = (+txMin.slice(0, txMin.indexOf(" k")) + 0.1) * 1000 * (vmin < 0 ? -1 : 1)
  else if (txMin.indexOf('m') !== -1)
    vmin = (+txMin.slice(0, txMin.indexOf(" m")) + 0.1) * 1e6 * (vmin < 0 ? -1 : 1)
  else if (txMin.indexOf('b') !== -1)
    vmin = (+txMin.slice(0, txMin.indexOf(" b")) + 0.1) * 1e9 * (vmin < 0 ? -1 : 1)
  else if (txMin.indexOf('t') !== -1)
    vmin = (+txMin.slice(0, txMin.indexOf(" t")) + 0.1) * 1e12 * (vmin < 0 ? -1 : 1)

  if (txMax.indexOf('k') !== -1)
    vmax = (+txMax.slice(0, txMax.indexOf(" k")) + 0.1) * 1000 * (vmax < 0 ? -1 : 1)
  else if (txMax.indexOf('m') !== -1)
    vmax = (+txMax.slice(0, txMax.indexOf(" m")) + 0.1) * 1e6 * (vmax < 0 ? -1 : 1)
  else if (txMax.indexOf('b') !== -1)
    vmax = (+txMax.slice(0, txMax.indexOf(" b")) + 0.1) * 1e9 * (vmax < 0 ? -1 : 1)
  else if (txMax.indexOf('t') !== -1)
    vmax = (+txMax.slice(0, txMax.indexOf(" t")) + 0.1) * 1e12 * (vmax < 0 ? -1 : 1)

  Opt.xAxis.data = props.dataChart.data.map(v => v[0]).slice(0, lenData - 1)

  Opt.yAxis.forEach(a => {
    a.min = vmin
    a.max = vmax
  })
  Opt.series[0].data = contcumCF_col
  Opt.series[1].data = govcumCF_col
  Opt.series[2].data = contCF_col
  Opt.series[3].data = govCF_col

  return Opt
})

function updateChart() {
  nextTick(() => {
    chartCF.value?.setOption(chtOption.value)
    chartCF.value?.resize()
  })
}

const refContainer = ref()
useResizeObserver(refContainer, (entries) => {
  const entry = entries[0]
  const { width, height } = entry.contentRect
  if (refContainer.value) nextTick(() => chartCF.value?.resize())
}, { box: 'device-pixel-content-box' })

onMounted(() => updateChart())

defineExpose({

  updateChart
})
</script>

<template>
  <AppCardActions
    :title="$props.title + ($props.multiContract ? ($props.isContract2 ? ' 2nd Contract' : ' 1st Contract') : '')"
    actionCollapsed compact-header>
    <VCardText ref="refContainer">
      <v-chart ref="chartCF" class="cf-chart" :option="chtOption" />
    </VCardText>
  </AppCardActions>
</template>

<style scoped>
.cf-chart {
  min-block-size: 400px;
}
</style>

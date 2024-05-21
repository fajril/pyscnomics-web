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
import { useTheme } from 'vuetify';

use([
  CanvasRenderer,
  BarChart, LineChart,
  TitleComponent,
  GridComponent,
  TooltipComponent,
  LegendComponent
]);

const refChartContainer = ref()
const chartCardFull = ref()
const chartCardTitle = ref("")

const isDialogShow = ref(false)
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

  const Opt = {
    title: {
      show: false,
    },
    legend: {
      left: "center", top: 'bottom',
      textStyle: { color: themePrimaryTextColor }
    },
    grid: {
      show: true,
      borderColor: themeBorderColor,
    },
    xAxis: {
      name: 'Year',
      data: [],
      scale: true,
      axisTick: {
        alignWithLabel: true,
      },
      nameTextStyle: {
        color: themeDisabledTextColor,
        verticalAlign: "top",
        align: "center",
        padding: 10
      },
      nameLocation: "middle",
      axisLabel: {
        color: themePrimaryTextColor,
        align: 'center',
      },
      splitLine: {
        show: false,
        lineStyle: { color: themeBorderColor }
      },
    },
    yAxis: [{
      type: 'value',
      name: '',
      interval: undefined,
      min: undefined,
      max: undefined,
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
      axisTick: { show: true, },
    },
    {
      type: 'value',
      name: '',
      position: 'right',
      interval: undefined,
      min: undefined,
      max: undefined,
      axisTick: { show: true, },
      splitLine: { show: false, lineStyle: { type: 'dotted', color: themeBorderColor } },
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
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
      },
      valueFormatter: (value) => {
        if (value !== undefined) {
          return numbro(value).format({ mantissa: 2, trimMantissa: true, optionalMantissa: true, thousandSeparated: false })
        } else
          return ""
      }
    },
    series: [
      {
        name: '',
        type: "bar",
        yAxisIndex: 0,
        data: [],
        color: 'rgba(180,0,0,0.5)',
      },
      {
        name: '',
        type: "line",
        color: 'rgba(230,0,0,0.8)',
        yAxisIndex: 1,
        data: [],
        symbol: 'none'
      },
    ]
  }
  return Opt
})
const showSummCardDialog = (chart: number, mode: number | undefined, data: object) => {
  //{x, d}
  if (chart === 0) {
    chartCardTitle.value = `${mode === 0 ? 'Oil' : 'Gas'}:  ${numbro(data.d.sum).format({ average: false, mantissa: 3 })} ${mode === 0 ? 'MMSTB' : 'TBTU'}`
    cardChartOpt.value.yAxis[0].name = mode === 0 ? 'Oil, MMSTB' : 'Gas, TBTU'
    cardChartOpt.value.yAxis[1].name = mode === 0 ? 'Cum. Oil, MMSTB' : 'Cum. Gas, TBTU'
    cardChartOpt.value.series[0].name = mode === 0 ? 'Oil, MMSTB' : 'Gas, TBTU'
    cardChartOpt.value.series[1].name = mode === 0 ? 'Cum. Oil, MMSTB' : 'Cum. Gas, TBTU'
    cardChartOpt.value.series[0].color = (mode === 0) ? "rgba(0, 180, 0, 0.7)" : "rgba(210, 0, 0, 0.7)"
    cardChartOpt.value.series[1].color = (mode === 0) ? "rgba(0, 210, 0, 0.7)" : "rgba(210, 0, 0, 0.7)"
  } else if (chart === 5) {
    const lbl = (mode === 0 ? "Government Share" : (mode === 1 ? "Net Contractor Share" : (mode === 2 ? ([1, 3].includes(data.ctrType) ? "Cost Recovery" : "Deductible Cost") : (mode === 3 ? "DMO" : "Tax"))))
    chartCardTitle.value = `${lbl}:  ${numbro(data.d.sum * 1e6).format({ average: true, mantissa: 3 }).toUpperCase()} USD`
    cardChartOpt.value.yAxis[0].name = `${lbl}, MUSD`
    cardChartOpt.value.yAxis[1].name = `Cum. ${lbl}, MUSD`
    cardChartOpt.value.series[0].name = `${lbl}, MUSD`
    cardChartOpt.value.series[1].name = `Cum. ${lbl}, MUSD`
    cardChartOpt.value.series[0].color = undefined
    cardChartOpt.value.series[1].color = undefined
  } else {
    const lbl = (chart === 1 ? 'Revenue' : (chart === 2 ? 'Capex' : (chart === 3 ? 'Expenditures' : (chart === 4 ? 'Tax' : "Contractor CashFlow"))))
    chartCardTitle.value = `${lbl}:  ${numbro(data.d.sum * 1e6).format({ average: true, mantissa: 3 }).toUpperCase()} USD`
    cardChartOpt.value.yAxis[0].name = `${lbl}, MUSD`
    cardChartOpt.value.yAxis[1].name = `Cum. ${lbl}, MUSD`
    cardChartOpt.value.series[0].name = `${lbl}, MUSD`
    cardChartOpt.value.series[1].name = `Cum. ${lbl}, MUSD`
    cardChartOpt.value.series[0].color = undefined
    cardChartOpt.value.series[1].color = undefined
  }
  let interV = [(math.max(data.d.table[0]) - math.min(data.d.table[0])) / 4, (math.max(data.d.table[1]) - math.min(data.d.table[1])) / 4]
  interV.forEach((el, index) => {
    const txInterV = numbro(math.abs(el)).format({ average: true, mantissa: 1 })
    if (txInterV.indexOf('k') !== -1)
      interV[index] = (+txInterV.slice(0, txInterV.indexOf(" k"))) * 1000 * (el < 0 ? -1 : 1)
    else if (txInterV.indexOf('m') !== -1)
      interV[index] = (+txInterV.slice(0, txInterV.indexOf(" m"))) * 1e6 * (el < 0 ? -1 : 1)
    else if (txInterV.indexOf('b') !== -1)
      interV[index] = (+txInterV.slice(0, txInterV.indexOf(" b"))) * 1e9 * (el < 0 ? -1 : 1)
    else if (txInterV.indexOf('t') !== -1)
      interV[index] = (+txInterV.slice(0, txInterV.indexOf(" t"))) * 1e12 * (el < 0 ? -1 : 1)
  })
  cardChartOpt.value.xAxis.data.splice(0, cardChartOpt.value.xAxis.data.length, ...data.x)
  cardChartOpt.value.yAxis[0].interval = interV[0]
  cardChartOpt.value.yAxis[0].max = interV[0] * 5
  cardChartOpt.value.yAxis[1].interval = interV[1]
  cardChartOpt.value.yAxis[1].max = interV[1] * 5
  cardChartOpt.value.series[0].data.splice(0, cardChartOpt.value.series[0].data.length,
    ...data.d.table[0])
  cardChartOpt.value.series[1].data.splice(0, cardChartOpt.value.series[1].data.length,
    ...data.d.table[1])
  isDialogShow.value = true
}

onMounted(() => {
  useResizeObserver(refChartContainer, (entries) => {
    const entry = entries[0]
    const { width, height } = entry.contentRect
    nextTick(() => chartCardFull.value?.resize())
  })
})

defineExpose({
  showSummCardDialog
})
</script>

<template>
  <VDialog v-model="isDialogShow">
    <DialogCloseBtn @click="() => isDialogShow = false" />
    <VCard :title="chartCardTitle">
      <VCardText ref="refChartContainer">
        <v-chart ref="chartCardFull" class="card-chart" :option="cardChartOpt" />
      </VCardText>
    </VCard>
  </VDialog>
</template>

<style scoped>
.card-chart {
  min-block-size: 60vh;
}
</style>

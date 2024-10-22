<script setup lang="ts">
import { hexToRgb } from '@layouts/utils'
import { BarChart, LineChart } from "echarts/charts"
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from "echarts/components"
import { use } from "echarts/core"
import { CanvasRenderer } from "echarts/renderers"
import * as math from 'mathjs'
import VChart from "vue-echarts"
import { useTheme } from 'vuetify'
import * as Pysc from "@/utils/pysc/pyscType"

use([
  DataZoomComponent,
  CanvasRenderer,
  BarChart,
  LineChart,
  TitleComponent,
  GridComponent,
  TooltipComponent,
  LegendComponent,
])

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

  return {
    title: {
      show: false,
    },
    legend: {
      left: "center",
      top: 'bottom',
      textStyle: { width: 80, color: themePrimaryTextColor, overflow: 'truncate' },
      tooltip: { show: true },
    },
    dataZoom: { type: 'inside' },
    grid: {
      show: true,
      borderColor: themeBorderColor,
    },
    xAxis: {
      name: 'Year',
      type: 'category',
      data: [],
      scale: true,
      axisTick: {
        alignWithLabel: true,
      },
      axisLine: {
        onZero: true,
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
        align: 'center',
      },
      splitLine: {
        show: false,
        lineStyle: { color: themeBorderColor },
      },
    },
    yAxis: [],
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
      },
      valueFormatter: value => {
        if (value !== undefined)
          return numbro(value).format({ mantissa: 2, trimMantissa: true, optionalMantissa: true, thousandSeparated: false })
        else
          return ""
      },
    },
    series: [
    ],
  }
})

const showSummCardDialog = (chart: number, mode: number | undefined, data: object) => {
  const { themeBorderColor, themeDisabledTextColor, themePrimaryTextColor } = colorVariables(vuetifyTheme.current.value)

  // {x, d}
  cardChartOpt.value.xAxis.type = 'category'
  cardChartOpt.value.xAxis.name = 'Year'
  cardChartOpt.value.series.splice(0, cardChartOpt.value.series.length, ...[{
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
    symbol: 'none',
  }])
  cardChartOpt.value.yAxis.splice(0, cardChartOpt.value.yAxis.length, ...[{
    type: 'value',
    name: '',
    interval: undefined,
    min: undefined,
    max: undefined,
    minInterval: undefined,

    // splitNumber: 4,
    splitLine: { show: false, lineStyle: { color: themeBorderColor } },
    axisLabel: {
      color: themePrimaryTextColor,
      formatter: (value, index) => {
        return value !== undefined ? numbro(value).format({ optionalMantissa: true }) : value
      },
    },
    nameTextStyle: {
      color: themeDisabledTextColor,
      verticalAlign: "bottom",
      align: "left",
    },
    nameLocation: "end",
    axisTick: { show: true },
    axisLine: {
      onZero: false,
    },
  },
  {
    type: 'value',
    name: '',
    position: 'right',
    interval: undefined,
    min: undefined,
    max: undefined,
    minInterval: undefined,
    axisTick: { show: true },
    splitLine: { show: false, lineStyle: { type: 'dotted', color: themeBorderColor } },
    axisLabel: {
      color: themePrimaryTextColor,
      formatter: (value, index) => {
        return value !== undefined ? numbro(value).format({ optionalMantissa: true }) : value
      },
    },
    axisLine: {
      onZero: false,
    },
    nameTextStyle: {
      color: themeDisabledTextColor,
      verticalAlign: "bottom",
      align: "right",
    },
    nameLocation: "end",
  }],
  )

  cardChartOpt.value.yAxis.forEach(el => {
    el.interval = undefined
    el.max = undefined
    el.min = undefined
    el.minInterval = undefined
  })
  cardChartOpt.value.yAxis[1].splitLine.show = false

  if (chart === 8) {
    chartCardTitle.value = 'Sensitivity - NPV'
    cardChartOpt.value.xAxis.type = 'value'
    cardChartOpt.value.xAxis.name = 'Sensitivity %'
    cardChartOpt.value.yAxis[0].name = 'NPV, MUSD'
    cardChartOpt.value.series.splice(0, cardChartOpt.value.series.length, ...[
      {
        name: "Oil Price",
        type: "line",
        yAxisIndex: 0,
        data: data.d && Array.isArray(data.d['Oil Price']) ? data.d['Oil Price'] : [],
        symbol: 'none',
      },
      {
        name: 'Opex',
        type: "line",
        yAxisIndex: 0,
        data: data.d && Array.isArray(data.d.OPEX) ? data.d.OPEX : [],
        symbol: 'none',
      },
      {
        name: 'Capex',
        type: "line",
        yAxisIndex: 0,
        data: data.d && Array.isArray(data.d.CAPEX) ? data.d.CAPEX : [],
        symbol: 'none',
      },
      {
        name: 'Lifting',
        type: "line",
        yAxisIndex: 0,
        data: data.d && Array.isArray(data.d.Lifting) ? data.d.Lifting : [],
        symbol: 'none',
      },
    ])
  }
  else if (chart === 0 && mode == 0) {
    chartCardTitle.value = `${mode === 0 ? 'Oil' : 'Gas'}:  ${numbro(data.d.sum).format({ average: false, mantissa: 2 })} ${mode === 0 ? 'MMSTB' : 'TBTU'}`
    cardChartOpt.value.yAxis[0].name = mode === 0 ? 'Oil, MMSTB' : 'Gas, TBTU'
    cardChartOpt.value.yAxis[1].name = mode === 0 ? 'Cum. Oil, MMSTB' : 'Cum. Gas, TBTU'
    cardChartOpt.value.series[0].name = mode === 0 ? 'Oil, MMSTB' : 'Gas, TBTU'
    cardChartOpt.value.series[1].name = mode === 0 ? 'Cum. Oil, MMSTB' : 'Cum. Gas, TBTU'
    cardChartOpt.value.series[0].color = (mode === 0) ? "rgba(0, 180, 0, 0.7)" : "rgba(210, 0, 0, 0.7)"
    cardChartOpt.value.series[1].color = (mode === 0) ? "rgba(0, 210, 0, 0.7)" : "rgba(210, 0, 0, 0.7)"
  }
  else if (chart === 0 && mode == 1) {
    chartCardTitle.value = `Oil: ${numbro(data.d[0].sum).format({ average: false, mantissa: 2 })} MMSTB and Gas: ${numbro(data.d[1].sum).format({ average: false, mantissa: 2 })} TBTU`
    cardChartOpt.value.yAxis.push({
      name: 'Gas, TBTU',
      type: 'value',
      position: 'left',
      offset: 60,
      axisLine: { show: true },
      axisTick: { show: true },
      splitLine: { show: false, lineStyle: { type: 'dotted', color: themeBorderColor } },
      nameTextStyle: {
        color: themeDisabledTextColor,
      },
      axisLabel: {
        color: themePrimaryTextColor,
        formatter: (value, index) => {
          return value !== undefined ? numbro(value).format({ optionalMantissa: true }) : value
        },
      },
    },
    {
      name: 'Cum. Gas, TBTU',
      type: 'value',
      position: 'right',
      offset: 60,
      axisTick: { show: true },
      splitLine: { show: false, lineStyle: { type: 'dotted', color: themeBorderColor } },
      nameTextStyle: {
        color: themeDisabledTextColor,
      },
      axisLabel: {
        color: themePrimaryTextColor,
        formatter: (value, index) => {
          return value !== undefined ? numbro(value).format({ optionalMantissa: true }) : value
        },
      },
      axisLine: {
        show: true,
        onZero: false,
      },
    })
    cardChartOpt.value.series.push(
      {
        name: 'Gas, TBTU',
        type: "bar",
        yAxisIndex: 2,
        data: [],
        color: 'rgba(210, 0, 0, 0.7)',
      },
      {
        name: 'Cum. Gas, TBTU',
        type: "line",
        color: 'rgba(210, 0, 0, 0.7)',
        yAxisIndex: 3,
        data: [],
        symbol: 'none',
      },
    )
    cardChartOpt.value.yAxis[0].name = 'Oil, MMSTB'
    cardChartOpt.value.yAxis[1].name = 'Cum. Oil, MMSTB'
    cardChartOpt.value.series[0].name = 'Oil, MMSTB'
    cardChartOpt.value.series[1].name = 'Cum. Oil, MMSTB'
    cardChartOpt.value.series[0].color = "rgba(0, 180, 0, 0.7)"
    cardChartOpt.value.series[1].color = "rgba(0, 210, 0, 0.7)"
  }
  else if (chart === 5) {
    const lbl = (mode === 0 ? "Government Share" : (mode === 1 ? "Net Contractor Share" : (mode === 2 ? ([1, 3].includes(data.ctrType) ? "Cost Recovery" : "Deductible Cost") : (mode === 3 ? "DMO" : "Tax"))))

    chartCardTitle.value = `${lbl}:  ${numbro(data.d.sum).format({ mantissa: 2 }).toUpperCase()} MUSD`
    cardChartOpt.value.yAxis[0].name = `${lbl}, MUSD`
    cardChartOpt.value.yAxis[1].name = `Cum. ${lbl}, MUSD`
    cardChartOpt.value.series[0].name = `${lbl}, MUSD`
    cardChartOpt.value.series[1].name = `Cum. ${lbl}, MUSD`
    cardChartOpt.value.series[0].color = undefined
    cardChartOpt.value.series[1].color = undefined
  }
  else if (chart === 3) {
    const lbl = 'Capex + Opex'

    chartCardTitle.value = `${lbl}:  ${numbro((data.d.sum[0] + data.d.sum[1])).format({ mantissa: 2 }).toUpperCase()} MUSD`
    cardChartOpt.value.series.push(
      {
        name: 'Opex, MUSD',
        type: "bar",
        yAxisIndex: 0,
        data: [],
        color: 'rgba(180,0,0,0.5)',
      },
      {
        name: 'Cum. Opex, MUSD',
        type: "line",
        color: 'rgba(230,0,0,0.8)',
        yAxisIndex: 1,
        data: [],
        symbol: 'none',
      },
    )
    cardChartOpt.value.yAxis[0].name = `${lbl}, MUSD`
    cardChartOpt.value.yAxis[1].name = `Cum. ${lbl}, MUSD`
    cardChartOpt.value.series[0].name = `Capex, MUSD`
    cardChartOpt.value.series[1].name = `Cum. Capex, MUSD`
    cardChartOpt.value.series[0].color = undefined
    cardChartOpt.value.series[1].color = undefined
    cardChartOpt.value.series[2].color = undefined
    cardChartOpt.value.series[3].color = undefined
  }
  else {
    const lbl = (chart === 1 ? 'Revenue' : (chart === 2 ? 'Capex' : (chart === 3 ? 'Expenditures' : (chart === 4 ? 'Tax' : chart === 6 ? "Contractor CashFlow" : "Government Income"))))

    chartCardTitle.value = `${lbl}:  ${numbro(data.d.sum).format({ mantissa: 2 }).toUpperCase()} MUSD`
    cardChartOpt.value.yAxis[0].name = `${lbl}, MUSD`
    cardChartOpt.value.yAxis[1].name = `Cum. ${lbl}, MUSD`
    cardChartOpt.value.series[0].name = `${lbl}, MUSD`
    cardChartOpt.value.series[1].name = `Cum. ${lbl}, MUSD`
    cardChartOpt.value.series[0].color = undefined
    cardChartOpt.value.series[1].color = undefined
  }
  if (chart != 0 && chart != 3 && chart != 8 && data.d.table.length === 2 && data.d.table[0].length && data.d.table[1].length) {
    try {
      let minD0Value = +math.min(data.d.table[0])
      let maxD0Value = +math.max(data.d.table[0])
      const lenD0Value = math.abs(maxD0Value - minD0Value)
      const prcLowD0Value = math.abs(minD0Value) / lenD0Value
      const prcHiD0Value = math.abs(maxD0Value) / lenD0Value

      let minD1Value = +math.min(data.d.table[1])
      let maxD1Value = +math.max(data.d.table[1])
      const lenD1Value = math.abs(maxD1Value - minD1Value)
      const prcLowD1Value = math.abs(minD1Value) / lenD1Value
      const prcHiD1Value = math.abs(maxD1Value) / lenD1Value

      if (prcLowD1Value < prcLowD0Value)
        minD1Value = prcLowD0Value * lenD1Value * (minD1Value < 0 ? -1 : 1)
      else if (prcLowD0Value < prcLowD1Value)
        minD0Value = prcLowD1Value * lenD0Value * (minD0Value < 0 ? -1 : 1)

      if (prcHiD1Value < prcHiD0Value)
        maxD1Value = prcHiD0Value * lenD1Value * (maxD1Value < 0 ? -1 : 1)
      else if (prcHiD0Value < prcHiD1Value)
        maxD0Value = prcHiD1Value * lenD0Value * (maxD0Value < 0 ? -1 : 1)

      cardChartOpt.value.yAxis[1].min = minD1Value
      cardChartOpt.value.yAxis[1].max = maxD1Value
      cardChartOpt.value.yAxis[0].min = minD0Value
      cardChartOpt.value.yAxis[0].max = maxD0Value
    }
    catch (error) {
      console.log(error)
    }

    /*
    if (math.min(data.d.table[0]) === 0) {
      const interV = [(math.max(data.d.table[0]) - math.min(data.d.table[0])) / 4, (math.max(data.d.table[1]) - math.min(data.d.table[1])) / 4]

      interV.forEach((el, index) => {
        const txInterV = numbro(math.abs(el)).format({ average: true, mantissa: 1 })
        if (txInterV.includes('k'))
          interV[index] = (+txInterV.slice(0, txInterV.indexOf(" k"))) * 1000
        else if (txInterV.includes('m'))
          interV[index] = (+txInterV.slice(0, txInterV.indexOf(" m"))) * 1e6
        else if (txInterV.includes('b'))
          interV[index] = (+txInterV.slice(0, txInterV.indexOf(" b"))) * 1e9
        else if (txInterV.includes('t'))
          interV[index] = (+txInterV.slice(0, txInterV.indexOf(" t"))) * 1e12
      })
      cardChartOpt.value.yAxis[0].max = interV[0] * 5
      cardChartOpt.value.yAxis[0].interval = interV[0]
      cardChartOpt.value.yAxis[1].max = interV[1] * 5
      cardChartOpt.value.yAxis[1].interval = interV[1]
    }
    else {
      const interV = [(math.max(data.d.table[0]) - math.min(data.d.table[0])) / 4, (math.max(data.d.table[1]) - math.min(data.d.table[1])) / 4]

      interV.forEach((el, index) => {
        const txInterV = numbro(math.abs(el)).format({ average: true, mantissa: 1 })
        if (txInterV.includes('k'))
          interV[index] = (+txInterV.slice(0, txInterV.indexOf(" k"))) * 1000
        else if (txInterV.includes('m'))
          interV[index] = (+txInterV.slice(0, txInterV.indexOf(" m"))) * 1e6
        else if (txInterV.includes('b'))
          interV[index] = (+txInterV.slice(0, txInterV.indexOf(" b"))) * 1e9
        else if (txInterV.includes('t'))
          interV[index] = (+txInterV.slice(0, txInterV.indexOf(" t"))) * 1e12
      })
      cardChartOpt.value.yAxis[0].minInterval = interV[0]
      cardChartOpt.value.yAxis[1].minInterval = interV[1]

      cardChartOpt.value.yAxis[1].splitLine.show = true
    } */
  }

  // fill data
  if (chart != 8)
    cardChartOpt.value.xAxis.data.splice(0, cardChartOpt.value.xAxis.data.length, ...data.x)
  if (chart === 0 && mode === 1) {
    cardChartOpt.value.series[0].data.splice(0, cardChartOpt.value.series[0].data.length,
      ...data.d[0].table[0])
    cardChartOpt.value.series[1].data.splice(0, cardChartOpt.value.series[1].data.length,
      ...data.d[0].table[1])
    cardChartOpt.value.series[2].data.splice(0, cardChartOpt.value.series[2].data.length,
      ...data.d[1].table[0])
    cardChartOpt.value.series[3].data.splice(0, cardChartOpt.value.series[3].data.length,
      ...data.d[1].table[1])
  }
  else if (chart === 8) {

  }
  else if (chart === 3) {
    cardChartOpt.value.series[0].data.splice(0, cardChartOpt.value.series[0].data.length,
      ...data.d.table[0][0])
    cardChartOpt.value.series[1].data.splice(0, cardChartOpt.value.series[1].data.length,
      ...data.d.table[0][1])
    cardChartOpt.value.series[2].data.splice(0, cardChartOpt.value.series[2].data.length,
      ...data.d.table[1][0])
    cardChartOpt.value.series[3].data.splice(0, cardChartOpt.value.series[3].data.length,
      ...data.d.table[1][1])
  }
  else {
    cardChartOpt.value.series[0].data.splice(0, cardChartOpt.value.series[0].data.length,
      ...data.d.table[0])
    cardChartOpt.value.series[1].data.splice(0, cardChartOpt.value.series[1].data.length,
      ...data.d.table[1])
  }
  isDialogShow.value = true
}

onMounted(() => {
  useResizeObserver(refChartContainer, entries => {
    const entry = entries[0]
    const { width, height } = entry.contentRect

    nextTick(() => chartCardFull.value?.resize())
  })
})

defineExpose({
  showSummCardDialog,
})
</script>

<template>
  <VDialog v-model="isDialogShow">
    <DialogCloseBtn @click="() => isDialogShow = false" />
    <VCard :title="chartCardTitle">
      <VCardText ref="refChartContainer">
        <VChart
          ref="chartCardFull"
          class="card-chart"
          :option="cardChartOpt"
        />
      </VCardText>
    </VCard>
  </VDialog>
</template>

<style scoped>
.card-chart {
  min-block-size: 60vh;
}
</style>

<script setup lang="ts">
import * as Pysc from "@/utils/pysc/pyscType";
import { hexToRgb } from '@layouts/utils';
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from "echarts/components";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import VChart from "vue-echarts";
import type { ThemeInstance } from 'vuetify';
import { useTheme } from 'vuetify';

const numbro = Pysc.useNumbro()

use([
  CanvasRenderer,
  LineChart,
  TitleComponent,
  GridComponent,
  TooltipComponent,
  LegendComponent
]);

interface Props {
  // dataTable: Pysc.TableCFOption
  hasGas?: boolean
  dataChart: Array<any>
  title?: string
  unit?: string
}
const props = withDefaults(defineProps<Props>(), {
  title: '',
  unit: ''
})

// provide(THEME_KEY, "dark")

const vuetifyTheme = useTheme()
const colorVariables = (themeColors: ThemeInstance['themes']['value']['colors'] = vuetifyTheme.current.value) => {
  const themeSecondaryTextColor = `rgba(${hexToRgb(themeColors.colors['on-surface'])},${themeColors.variables['medium-emphasis-opacity']})`
  const themeDisabledTextColor = `rgba(${hexToRgb(themeColors.colors['on-surface'])},${themeColors.variables['disabled-opacity']})`
  const themeBorderColor = `rgba(${hexToRgb(String(themeColors.variables['border-color']))},${themeColors.variables['border-opacity']})`
  const themePrimaryTextColor = `rgba(${hexToRgb(themeColors.colors['on-surface'])},${themeColors.variables['high-emphasis-opacity']})`

  return { themeSecondaryTextColor, themeDisabledTextColor, themeBorderColor, themePrimaryTextColor }
}

const chartSens = ref()
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
    },
    legend: {
      left: "center", top: 'bottom',
      textStyle: { color: themePrimaryTextColor }
    },
    grid: {
      show: true,
      borderColor: themeBorderColor,
      left: 80, right: 2
    },
    xAxis: {
      name: 'Sensitivity',
      data: [],
      axisTick: {
        alignWithLabel: true
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
        // formatter: (value, index) => {
        //   return value !== undefined ? numbro(value).format({ output: 'percent', optionalMantissa: true }) : value
        // }
      },
      splitLine: { show: true, lineStyle: { color: themeBorderColor } },

    },
    yAxis: {
      type: 'value',
      name: `${props.unit}`,
      splitLine: { show: true, lineStyle: { color: themeBorderColor } },
      axisLabel: {
        color: themePrimaryTextColor,
        formatter: (value, index) => {
          return value !== undefined ? numbro(value).format({ output: props.unit === '%' ? 'percent' : 'number', optionalMantissa: true }) : value
        }
      },
      nameTextStyle: {
        color: themeDisabledTextColor,
        verticalAlign: "center",
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
    ]
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
    numbro(-(1 - row[0])).format({ output: 'percent', mantissa: 1, optionalMantissa: true })
  ))
  Opt.series.forEach((v, index) => {
    v.data.splice(0, v.data.length, ...props.dataChart.map(row => row[index + 1]))
  })

  return Opt
})
const refContainer = ref()
useResizeObserver(refContainer, (entries) => {
  const entry = entries[0]
  const { width, height } = entry.contentRect
  if (refContainer.value) nextTick(() => chartSens.value?.resize())
}, { box: 'device-pixel-content-box' })

const dataChart = computed(() => props.dataChart)

watch(dataChart, val => {
  nextTick(() => chartSens.value?.resize())
}, { immediate: true, deep: true })

</script>


<template>
  <VRow>
    <VCol ref="refContainer" cols="12">
      <v-chart ref="chartSens" class="sens-chart" :option="chtOption" />
    </VCol>
  </VRow>
</template>

<style scoped>
.sens-chart {
  min-block-size: 400px;
}
</style>

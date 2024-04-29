<script setup lang="ts">
import { useAppStore } from '@/stores/appStore';
import * as Pysc from '@/utils/pysc/pyscType';
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


use([
  CanvasRenderer,
  BarChart, LineChart,
  TitleComponent,
  GridComponent,
  TooltipComponent,
  LegendComponent
]);

interface Props {
  dataChart: Array<any>[]
  title?: string
}
const props = withDefaults(defineProps<Props>(), {
  title: 'Tangible'
})

const appStore = useAppStore()
const numbro = Pysc.useNumbro()

const vuetifyTheme = useTheme()
// 👉 Colors variables
const colorVariables = (themeColors: ThemeInstance['themes']['value']['colors'] = vuetifyTheme.current.value) => {
  const themeSecondaryTextColor = `rgba(${hexToRgb(themeColors.colors['on-surface'])},${themeColors.variables['medium-emphasis-opacity']})`
  const themeDisabledTextColor = `rgba(${hexToRgb(themeColors.colors['on-surface'])},${themeColors.variables['disabled-opacity']})`
  const themeBorderColor = `rgba(${hexToRgb(String(themeColors.variables['border-color']))},${themeColors.variables['border-opacity']})`
  const themePrimaryTextColor = `rgba(${hexToRgb(themeColors.colors['on-surface'])},${themeColors.variables['high-emphasis-opacity']})`

  return { themeSecondaryTextColor, themeDisabledTextColor, themeBorderColor, themePrimaryTextColor }
}


const chartDataConfig = computed(() => {
  const { themeBorderColor, themeDisabledTextColor, themePrimaryTextColor } = colorVariables(vuetifyTheme.current.value)

  //grp Years
  const Years = props.dataChart.map(v => v[0]).sort((a, b) => a - b).filter((v, i, arr) => arr.indexOf(v) === i)


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
    },
    xAxis: {
      name: 'Year',
      data: Years,
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
      axisLabel: { color: themePrimaryTextColor },
      splitLine: { show: true, lineStyle: { color: themeBorderColor } },

    },
    yAxis:

      [{
        type: 'value',
        name: `${props.title}, MUSD`,
        splitLine: { show: true, lineStyle: { color: themeBorderColor } },
        axisLabel: {
          color: themePrimaryTextColor,
          formatter: (value, index) => {
            return value !== undefined ? numbro(value).format({ optionalMantissa: true }) : value
          }
        },
        nameTextStyle: {
          color: themeDisabledTextColor,
          align: "center",
        },
        nameLocation: "middle",
        offset: 0,
        nameGap: 60,
      },
      {
        type: 'value',
        position: 'right',
        name: `Cum. ${props.title}, MUSD`,
        splitLine: { show: false, lineStyle: { color: themeBorderColor } },
        axisLabel: {
          color: themePrimaryTextColor,
          formatter: (value, index) => {
            return value !== undefined ? numbro(value).format({ optionalMantissa: true }) : value
          }
        },
        nameTextStyle: {
          color: themeDisabledTextColor,
          align: "center",
        },
        offset: 0,
        nameGap: 70,
        nameLocation: "middle",
      }],
    series: props.dataChart.map(v => v[1]).filter((value, index, array) => array.indexOf(value) === index).map(v => {
      const grpD = props.dataChart.filter((row) => row[1] === v).sort((r1, r2) => r1[0] - r2[0])
        .reduce((year, row) => {
          year[row[0]] = year[row[0]] ?? 0
          year[row[0]] += row[2]
          return year
        }, {})
      return {
        name: `${props.title} (${v})`,
        type: "bar",
        yAxisIndex: 0,
        data: Years.map(y => grpD[y] ?? 0)
      }
    })
  }
  const cummSer = Opt.series.map(ser => {
    return {
      name: `Cum. ${ser.name}`,
      type: "line",
      yAxisIndex: 1,
      data: math.cumsum(ser.data)
    }
  })
  Opt.series.push(...cummSer)

  return Opt
})

const refContainer = ref()
const chartCost = ref()

function updateChart() {
  nextTick(() => {
    chartCost.value?.setOption(chartDataConfig.value)
    chartCost.value?.resize()
  })
}

useResizeObserver(refContainer, (entries) => {
  const entry = entries[0]
  const { width, height } = entry.contentRect
  updateChart()
})
</script>

<template>
  <AppCardActions action-collapsed title="Chart View" compact-header>
    <VRow no-gutter>
      <VCol ref="refContainer" cols="12">
        <v-chart ref="chartCost" class="cost-chart" :option="chartDataConfig" />
      </VCol>
    </VRow>
  </AppCardActions>
</template>

<style scoped>
.cost-chart {
  min-block-size: 400px;
}
</style>

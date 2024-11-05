<script setup lang="ts">
import { useAppStore } from '@/stores/appStore'
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
import type { ThemeInstance } from 'vuetify'
import { useTheme } from 'vuetify'
import * as Pysc from '@/utils/pysc/pyscType'
import DotdotOpt from '@/pages/components/dotdotOpt.vue'

const props = withDefaults(defineProps<Props>(), {
  title: 'Tangible',
})

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

interface Props {
  dataChart: Pysc.capitalCost_s[] | Pysc.intangCost_s[] | Pysc.opexCost_s[] | Pysc.asrCost_s[] | Pysc.cosCost_s[] | Pysc.lbtCost_s[]
  title?: string
}
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

  // grp Years
  const Years = props.dataChart.map(v => v.expense_year).sort((a, b) => a - b).filter((v, i, arr) => arr.indexOf(v) === i)

  const Opt = {
    backgroundColor: vuetifyTheme.global.name.value === 'dark' ? '#2f3349' : '#ffffff',
    title: {
      text: props.title,
      left: "center",
      textStyle: { color: themePrimaryTextColor },
    },
    dataZoom: { type: 'inside' },
    tooltip: {
      trigger: 'axis',
      valueFormatter: value => value !== undefined ? numbro(value).format({ optionalMantissa: true }) : value,
    },
    legend: {
      left: "center",
      top: 'bottom',
      textStyle: { width: 80, color: themePrimaryTextColor, overflow: 'truncate' },
      tooltip: { show: true },
    },
    grid: {
      show: true,
      borderColor: themeBorderColor,
    },
    xAxis: {
      name: 'Year',
      data: Years,
      axisTick: {
        alignWithLabel: true,
      },
      nameTextStyle: {
        color: themeDisabledTextColor,
        verticalAlign: "top",
        align: "center",
        padding: 10,
      },
      nameLocation: "middle",
      scale: true,
      axisLabel: { color: themePrimaryTextColor, align: 'center' },
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
          },
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
          },
        },
        nameTextStyle: {
          color: themeDisabledTextColor,
          align: "center",
        },
        offset: 0,
        nameGap: 70,
        nameLocation: "middle",
      }],
    series: props.dataChart.map(v => v.cost_allocation).filter((value, index, array) => array.indexOf(value) === index).map(v => {
      const grpD = props.dataChart.filter(row => row.cost_allocation === v).sort((r1, r2) => r1.expense_year - r2.expense_year)
        .reduce((year, row) => {
          year[row.expense_year] = year[row.expense_year] ?? 0
          year[row.expense_year] += (props.title === 'Opex' ? row.fixed_cost : row.cost)

          return year
        }, {})

      return {
        name: `${props.title} (${v})`,
        itemStyle: {
          color: v?.toLowerCase() === 'oil' ? 'rgba(100,220,100, 0.7)' : (v?.toLowerCase() === 'gas' ? 'rgba(220,50,50, 0.7)' : undefined),
        },
        type: "bar",
        yAxisIndex: 0,
        data: Years.map(y => grpD[y] ?? 0),
      }
    }),
  }

  const cummSer = Opt.series.map(ser => {
    return {
      name: `Cum. ${ser.name}`,
      type: "line",
      yAxisIndex: 1,
      data: math.cumsum(ser.data),
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

const optOption = [
  { title: 'Copy to clipboard', value: 'copy2clbrd', icon: 'tabler-clipboard', sourceType: 'image' },
  { title: `Save to file (*.png)`, value: 'save2File', icon: 'tabler-download', sourceType: 'image' },
  { type: 'divider' },
  { title: 'Reload', value: 'reload', icon: 'tabler-reload' },
]

const getDataSource = (value: string, sourceType: string) => {
  const rndid = Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)

  return {
    url: chartCost.value?.getDataURL({
      type: 'png',
      excludeComponents: ['toolbox'],
    }),
    filename: `cost_${props.title}_${appStore.selectedCase.name}_${rndid}`.replace(/[/\\ #$~&.]/g, ''),
  }
}

const actionOption = (type: string) => {
  if (type === 'reload')
    updateChart()
}

useResizeObserver(refContainer, entries => {
  const entry = entries[0]
  const { width, height } = entry.contentRect

  updateChart()
})
</script>

<template>
  <AppCardActions
    action-collapsed
    :title="$t('Chart View')"
    compact-header
  >
    <template #before-actions="{ isContentCollapsed }">
      <DotdotOpt
        v-if="!isContentCollapsed"
        :menu-list="optOption"
        title="Options"
        item-props
        dot-only
        :get-source="getDataSource"
        @click:item="actionOption"
      />
    </template>
    <VRow no-gutter>
      <VCol
        ref="refContainer"
        cols="12"
      >
        <VChart
          ref="chartCost"
          class="cost-chart"
          :option="chartDataConfig"
        />
      </VCol>
    </VRow>
  </AppCardActions>
</template>

<style scoped>
.cost-chart {
  min-block-size: 400px;
}
</style>

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
import { usePyscConfStore } from '@/stores/genfisStore'

interface Props {
  prodType: number
}
const props = defineProps<Props>()
const selProdIndex = defineModel('selProdIndex', { type: Number, default: 0 })
const dataProdChart = ref(null)

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

const appStore = useAppStore()
const PyscConf = usePyscConfStore()
const { dataProd } = storeToRefs(PyscConf)
const ProdIndex = computed(() => dataProd.value.findIndex(e => e.Tipe === props.prodType))

const chartProd = ref()

const chartDataConfig = computed(() => {
  const { themeBorderColor, themeDisabledTextColor, themePrimaryTextColor } = colorVariables(vuetifyTheme.current.value)

  // grp Years
  const Years = dataProd.value[ProdIndex.value].prod_price[selProdIndex.value].filter(e => e.year != null && e.year != undefined)
    .map(v => v.year).sort((a, b) => a - b).filter((v, i, arr) => arr.indexOf(v) === i)

  const Opt = {
    backgroundColor: vuetifyTheme.global.name.value === 'dark' ? '#2f3349' : '#ffffff',
    title: {
      text: Object.values(Pysc.ProducerType)[dataProd.value[ProdIndex.value].Tipe],
      left: "center",
      textStyle: { color: themePrimaryTextColor },
    },
    dataZoom: {
      type: 'inside',
    },

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
      right: '12%',
      left: '12%',
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
      axisLabel: { color: themePrimaryTextColor },
      splitLine: { show: true, lineStyle: { color: themeBorderColor } },

    },
    yAxis: [{
      type: 'value',
      name: `prod, ${Pysc.prodUnit(props.prodType)}`,
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
      nameGap: 45,
    },
    {
      type: 'value',
      position: 'right',
      name: `Cumm. prod, ${Pysc.prodUnit(props.prodType)}`,
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
      nameLocation: "middle",
      offset: 0,
      nameGap: 50.5,
    }],
    series: [
      {
        name: `${Object.values(Pysc.ProducerType)[dataProd.value[ProdIndex.value].Tipe]}`,
        type: "bar",
        color: (props.prodType === 0) ? "rgba(0, 180, 0, 0.7)" : "rgba(210, 0, 0, 0.7)",
        yAxisIndex: 0,
        data: [],
      },
      {
        name: `Cumm. ${Object.values(Pysc.ProducerType)[dataProd.value[ProdIndex.value].Tipe]}`,
        type: "line",
        color: (props.prodType === 0) ? "rgba(0, 210, 0, 0.7)" : "rgba(210, 0, 0, 0.7)",
        yAxisIndex: 1,
        data: [],
      },
    ],
  }

  const dProd = Years.map(y => {
    return math.sum(dataProd.value[ProdIndex.value].prod_price[selProdIndex.value].filter(r => r.year === y).map(v => {
      if (props.prodType === 1) {
        let production_ = +(v.production ?? 0)
        if (production_ === 0) {
          for (let ii = 0; ii < dataProd.value[ProdIndex.value].GSANumber; ii++) {
            if (v.gsa[`vol${ii + 1}`] && v.gsa[`ghv${ii + 1}`])
              production_ += +v.gsa[`vol${ii + 1}`]
          }
        }

        return production_
      }
      else { return v.sales ?? 0 }

      // return props.prodType === 1 ? (v.production ?? 0) : (v.sales ?? 0)
    }))
  })

  const dCummProd = math.cumsum(dProd)

  Opt.series[0].data = dProd
  Opt.series[1].data = dCummProd
  if (props.prodType === 0) {
    // condensate
    const dConds = Years.map(y => {
      return math.sum(dataProd.value[ProdIndex.value].prod_price[selProdIndex.value].filter(r => r.year === y).map(v => (v.condensate_sales ?? 0)))
    })

    const dCummConds = math.cumsum(dConds)
    if (math.sum(dConds) > 0) {
      Opt.title.text = `${Opt.title.text} and Condensate`
      Opt.series.push(
        {
          name: `Condensate`,
          type: "bar",
          color: "rgba(0, 0, 180, 0.7)",
          yAxisIndex: 0,
          data: dConds,
        },
        {
          name: `Cumm. Condensate`,
          type: "line",
          color: "rgba(0, 0, 240, 1.0)",
          yAxisIndex: 1,
          data: dCummConds,
        },
      )
    }
  }

  return Opt
})

function updateChart() {
  nextTick(() => {
    chartProd.value?.setOption(chartDataConfig.value)
    chartProd.value?.resize()
  })
}

const refContainer = ref()

useResizeObserver(refContainer, entries => {
  const entry = entries[0]
  const { width, height } = entry.contentRect

  updateChart()
})

defineExpose({
  chartProd,
})
</script>

<template>
  <VRow no-gutters>
    <VCol
      v-if="dataProd[ProdIndex].ProdNumber > 1"
      cols="12"
      class="mt-4 mb-2 d-flex justify-start gap-x-3"
    >
      <VSelect
        v-model="selProdIndex"
        :items="Array.from({ length: dataProd[ProdIndex].ProdNumber }, (_, i) => ({ title: `${Object.values(Pysc.ProducerType)[dataProd[ProdIndex].Tipe]} ${i + 1}`, value: i }))"
        item-props
        variant="outlined"
        label="for Production"
      />
    </VCol>
    <VCol
      ref="refContainer"
      cols="12"
    >
      <VChart
        ref="chartProd"
        class="prod-chart"
        :option="chartDataConfig"
      />
    </VCol>
  </VRow>
</template>

<style scoped>
.prod-chart {
  min-block-size: 400px;
}
</style>

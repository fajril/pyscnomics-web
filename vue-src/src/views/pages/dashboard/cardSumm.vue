<script setup lang="ts">
import * as Pysc from "@/utils/pysc/pyscType";
import { hexToRgb } from '@layouts/utils';
import { BarChart, LineChart, PieChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from "echarts/components";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import VChart from "vue-echarts";
import { useTheme } from 'vuetify';

interface Props {
  title: string
  subtitle?: string
  value: string
  chart?: number
  mode?: number
  table: object
  ctrType?: number
}

use([
  CanvasRenderer,
  BarChart, LineChart, PieChart,
  TitleComponent,
  GridComponent,
  TooltipComponent,
  LegendComponent
]);

const props = withDefaults(defineProps<Props>(), {
  subtitle: undefined,
  ctrType: -1
})

interface Emit {
  (e: 'show-detail', value: any): void
}
const emit = defineEmits<Emit>()

const datacht = computed(() => props.table)
const refChartContainer = ref()
const chartCard = ref()

onMounted(() => {
  useResizeObserver(refChartContainer, (entries) => {
    const entry = entries[0]
    const { width, height } = entry.contentRect
    nextTick(() => {
      chartCard.value?.resize()
    })
  })
  if (props.chart === 5)
    chartCard.value?.chart.on("click", (params) => emit('show-detail', params))
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
      valueFormatter: (value) => {
        if (value !== undefined) {
          const val = value / (props.table.sum ?? 1)
          return (numbro(value * 1e6).format({ average: true, mantissa: 2 }).toUpperCase() + ` (${numbro(val).format({ output: 'percent', mantissa: 2 })})`)
        } else
          return ""
      }
    },
    series: props.chart === 5 ? [{
      type: 'pie',
      data: [],
      label: {
        color: themePrimaryTextColor,
      },
      radius: [0, '60%'],
      labelLine: {
        show: true,
        length: 10,
        length2: 5
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }

    }] : [
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
        symbol: 'none'
      },
    ]
  }
  if (props.chart === 5) {

    Opt.series[0].data.splice(0, Opt.series[0].data.length,
      ...Object.keys(props.table.d).map(key => ({
        name: key === "CR" ? ([1, 3].includes(props.ctrType) ? "CR" : "DC") : key,
        usd: props.table.d[key].value, value: props.table.d[key].value
      })))

  } else {
    Opt.xAxis.data.splice(0, Opt.xAxis.data.length, ...props.table.y)
    if (Array.isArray(props.table.d) && props.table.d.length === 2) {
      Opt.series[0].data.splice(0, Opt.series[0].data.length, ...props.table.d[0])
      Opt.series[1].data.splice(0, Opt.series[1].data.length, ...props.table.d[1])
    } else Opt.series[0].data.splice(0, Opt.series[0].data.length, ...[])
  }

  return Opt
})

</script>

<template>
  <VCard>
    <VCardText class="px-3 py-2">
      <VRow no-gutters>
        <VCol cols="12">
          <h5 class="text-h5" :class="{ 'mb-6': $props.subtitle === undefined }">
            {{ $props.title }}
          </h5>
          <span v-if="$props.subtitle" class="text-sm text-disabled">{{ $props.subtitle }}</span>
        </VCol>
        <VCol ref="refChartContainer" cols="12">
          <v-chart ref="chartCard" :class="$props.chart === 5 ? 'card-pie' : 'card-chart'" :option="cardChartOpt" />
        </VCol>
        <VCol cols="12" class="d-flex align-center justify-space-between mt-1">
          <h4 class="text-h4 text-center" v-html="$props.value" />
        </VCol>
      </VRow>
    </VCardText>
  </VCard>
</template>

<style scoped>
.card-chart {
  min-block-size: 90px;
}

.card-pie {
  min-block-size: 313px;
}
</style>

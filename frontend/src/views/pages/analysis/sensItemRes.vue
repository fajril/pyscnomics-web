<script setup lang="ts">
import { VWindow } from 'vuetify/lib/components/index.mjs'
import SensResBarChart from './sensResBarChart.vue'
import SensResChart from './sensResChart.vue'
import SensResTable from './sensResTable.vue'
import ColapsibleCols from '@/views/components/colapsibleCols.vue'
import DotdotOpt from '@/pages/components/dotdotOpt.vue'

interface Props {
  dataTable: any
  hasGas: boolean
  tableTitle: string
  chartTitle: string
  itemValue: number
}

const props = defineProps<Props>()

const SensResTableRef = ref()
const SensResChart1Ref = ref()
const SensResChart2Ref = ref()
const SensResChart3Ref = ref()
const chartIndex = ref(0)

const getChartDataSource = (value: string, source: string) => {
  console.log(chartIndex.value)
  if (chartIndex.value === 0)
    return SensResChart1Ref.value?.getDataSource(value, source)
  else if (chartIndex.value === 1)
    return SensResChart2Ref.value?.getDataSource(value, source)
  else if (chartIndex.value === 2)
    return SensResChart3Ref.value?.getDataSource(value, source)

  return null
}

const resizedContainer = (col: number) => {
  nextTick(() => {
    if (col === 0)
      SensResTableRef.value?.resizeContainer()
  })
}
</script>

<template>
  <VExpansionPanelText>
    <ColapsibleCols
      left-header=""
      right-header=""
      :col-ratio="[50, 50]"
      @update:container="resizedContainer"
    >
      <template #left-header="{ isCollapsed }">
        <span v-if="isCollapsed">Table</span>
      </template>
      <template #after-left-header="{ isCollapsed }">
        <DotdotOpt
          v-if="!isCollapsed"
          :menu-list="[{ title: 'Copy to clipboard', value: 'copy2clbrd', icon: 'tabler-clipboard', sourceType: 'text' }, { title: `Save to file (*.xlsx)`, value: 'save2File', icon: 'tabler-download', sourceType: 'table' }]"
          title="Options"
          item-props
          size="x-small"
          dot-only
          :get-source="(value: string, source: string) => SensResTableRef?.getDataSource(value, source)"
        />
      </template>
      <template #left>
        <SensResTable
          ref="SensResTableRef"
          :has-gas="props.hasGas"
          :data-table="props.dataTable"
          :title="props.tableTitle"
        />
      </template>
      <template #right-header="{ isCollapsed }">
        <span v-if="isCollapsed">Chart</span>
        <VTabs
          v-else
          v-model="chartIndex"
        >
          <VTab :value="0">
            {{ $t('Spider') }}
          </VTab>
          <VTab :value="1">
            {{ $t('Tornado') }}
          </VTab>
          <VTab :value="2">
            {{ $t('Parameter Effect') }}
          </VTab>
        </VTabs>
      </template>
      <template #after-right-header="{ isCollapsed }">
        <DotdotOpt
          v-if="!isCollapsed"
          :menu-list="[{ title: 'Copy to clipboard', value: 'copy2clbrd', icon: 'tabler-clipboard', sourceType: 'image' }, { title: `Save to file (*.png)`, value: 'save2File', icon: 'tabler-download', sourceType: 'image' }]"
          title="Options"
          item-props
          size="x-small"
          dot-only
          :get-source="getChartDataSource"
        />
      </template>
      <template #right>
        <VWindow
          :model-value="chartIndex"
          @update:model-value="(val) => { chartIndex = val; resizedContainer(1); }"
        >
          <VWindowItem
            :value="0"
            style="overflow: visible !important;"
          >
            <SensResChart
              ref="SensResChart1Ref"
              class="mt-1"
              :has-gas="props.hasGas"
              :data-chart="props.dataTable"
              :title="props.chartTitle"
              :unit="props.itemValue === 1 ? '%' : (props.itemValue === 3 ? 'Year' : (props.itemValue !== 2 ? 'MUSD' : ''))"
            />
          </VWindowItem>
          <VWindowItem
            :value="1"
            style="overflow: visible !important;"
          >
            <SensResBarChart
              ref="SensResChart2Ref"
              :data-chart="props.dataTable"
              :title="props.chartTitle"
              :category="['Oil Price', ...(props.hasGas ? ['Gas Price'] : []), 'Opex', 'Capex', 'Lifting']"
              mode="Tornado"
            />
          </VWindowItem>
          <VWindowItem
            :value="2"
            style="overflow: visible !important;"
          >
            <SensResBarChart
              ref="SensResChart3Ref"
              :data-chart="props.dataTable"
              :title="props.chartTitle"
              :category="['Oil Price', ...(props.hasGas ? ['Gas Price'] : []), 'Opex', 'Capex', 'Lifting']"
              mode="Contrib"
            />
          </VWindowItem>
        </VWindow>
      </template>
    </ColapsibleCols>
  </VExpansionPanelText>
</template>

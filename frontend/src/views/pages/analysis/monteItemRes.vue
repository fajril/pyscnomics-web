<script setup lang="ts">
import MonteResChart from './monteResChart.vue'
import MonteResTable from './monteResTable.vue'
import DotdotOpt from '@/pages/components/dotdotOpt.vue'
import ColapsibleCols from '@/views/components/colapsibleCols.vue'

interface Props {
  dataTable: any
  hasGas: boolean
  title: string
  resultParam: any
  itemValue: number
}

const props = defineProps<Props>()

const monteResTableRef = ref()
const monteResChartRef = ref()

const resizedContainer = (col: number) => {
  if (col === 0)
    monteResTableRef.value?.resizeContainer()
  else if (col === 1)
    monteResChartRef.value?.resizeContainer()
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
          :get-source="monteResTableRef?.getDataSource"
        />
      </template>
      <template #left>
        <MonteResTable
          ref="monteResTableRef"
          :has-gas="props.hasGas"
          :data-table="props.dataTable"
          :header="props.title"
          :parameter="props.resultParam"
        />
      </template>
      <template #right-header="{ isCollapsed }">
        <span v-if="isCollapsed">Chart</span>
      </template>
      <template #after-right-header="{ isCollapsed }">
        <DotdotOpt
          v-if="!isCollapsed"
          :menu-list="[{ title: 'Copy to clipboard', value: 'copy2clbrd', icon: 'tabler-clipboard', sourceType: 'image' }, { title: `Save to file (*.png)`, value: 'save2File', icon: 'tabler-download', sourceType: 'image' }]"
          title="Options"
          item-props
          size="x-small"
          dot-only
          :get-source="monteResChartRef?.getDataSource"
        />
      </template>
      <template #right>
        <MonteResChart
          ref="monteResChartRef"
          :has-gas="props.hasGas"
          :data-chart="props.dataTable"
          :title="props.title"
          :unit="props.itemValue === 1 ? '%' : (props.itemValue === 3 ? 'Year' : (props.itemValue !== 2 ? 'MUSD' : ''))"
        />
      </template>
    </ColapsibleCols>
  </VExpansionPanelText>
</template>

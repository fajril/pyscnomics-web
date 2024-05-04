<script setup lang="ts">
import * as Pysc from "@/utils/pysc/pyscType";
import 'handsontable/dist/handsontable.full.min.css';

interface Props {
  dataTable: Pysc.TableCFOption
  title: string
  multiContract?: boolean
  isContract2?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  multiContract: false,
  isContract2: false
})
const refTableCF = ref()
const dataTable = computed(() => props.dataTable)

const tableCFConfig = computed(() => ({
  data: props.dataTable.data,
  colHeaders: props.dataTable.headers,
  columns: props.dataTable.columns,
  cell: props.dataTable.cells,
  readOnly: true,
  rowHeaders: true,
  height: 'auto',
  autoWrapRow: false,
  // stretchH: 'none',
  manualColumnResize: true,
  autoWrapCol: false,
  AutoRowSize: true,
  autoColumnSize: { allowSampleDuplicates: true, useHeaders: true, samplingRatio: 30 },
  fixedColumnsStart: 1,
  licenseKey: 'non-commercial-and-evaluation'
}))

function updateTable() {
  tableCFConfig.value.data.splice(0, tableCFConfig.value.data.length, ...props.dataTable.data)
  tableCFConfig.value.colHeaders.splice(0, tableCFConfig.value.colHeaders.length, ...props.dataTable.headers)
  tableCFConfig.value.columns.splice(0, tableCFConfig.value.columns.length, ...props.dataTable.columns)
  tableCFConfig.value.cell.splice(0, tableCFConfig.value.cell.length, ...props.dataTable.cells)
  nextTick(() => refTableCF.value?.hotInstance.updateSettings(tableCFConfig))
}
defineExpose({
  updateTable
})
</script>

<template>
  <AppCardActions
    :title="$props.title + ($props.multiContract ? ($props.isContract2 ? ' 2nd Contract' : ' 1st Contract') : '')"
    actionCollapsed compact-header>
    <VCardText>
      <hot-table ref="refTableCF" :settings="tableCFConfig" class="not_to_dimmed" />
    </VCardText>
  </AppCardActions>
</template>

<style lang="scss">
.not_to_dimmed {
  .handsontable .htDimmed {
    color: inherit !important
  }
}
</style>

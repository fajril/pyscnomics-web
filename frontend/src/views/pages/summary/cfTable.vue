<script setup lang="ts">
import * as Pysc from "@/utils/pysc/pyscType"
import 'handsontable/dist/handsontable.full.min.css'
import { isNull } from "mathjs"

interface Props {
  dataTable: Pysc.TableCFOption
  title: string
  multiContract?: boolean
  isContract2?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  multiContract: false,
  isContract2: false,
})

const collapsed = defineModel<boolean>({ required: false, default: false })

const refTableCF = ref()

const dataTable = computed(() => props.dataTable)

function renderedColumn(instance, td, row, col, prop, value, cellProperties) {
  if (row === dataTable.value?.data.length - 1) {
    td.classList.add("font-weight-bold")
    td.classList.add("bg-light-success")
  }

  if (col === 0) {
    const div = document.createElement('div')

    div.classList.add("d-flex")
    div.classList.add("justify-center")

    const span = document.createElement('span')

    span.innerHTML = `${value ?? ""}<small></small>`
    div.appendChild(span)
    td.innerText = ""
    td.appendChild(div)
  }
  else {
    if (row < dataTable.value?.data.length && col < dataTable.value?.data[row].length && !isNull(dataTable.value?.data[row][col])) {
      // const decDot = Intl.NumberFormat().formatToParts(1.1).find(e => e.type === 'decimal').value
      const div = document.createElement('div')

      div.classList.add("d-flex")
      div.classList.add("justify-end")

      const span = document.createElement('span')
      const valCell = dataTable.value?.data[row][col]
      const valTxt = Pysc.fmtNumber(typeof valCell === 'number' ? valCell : 0, true)

      span.innerHTML = valTxt
      div.appendChild(span)
      td.innerText = ""
      td.appendChild(div)
    }
    else { td.innerText = "" }
  }

  return td
}

const tableCFConfig = computed(() => ({
  data: dataTable.value.data,
  colHeaders: dataTable.value.headers,
  columns: dataTable.value.columns.map(col => ({ renderer: renderedColumn })),
  cell: dataTable.value.cells,
  readOnly: true,
  rowHeaders: true,
  height: 'auto',
  autoWrapRow: false,
  contextMenu: Pysc.TableContextMenus([{ name: 'copy' }, { name: 'copy_with_column_headers' }]),

  // stretchH: 'none',
  manualColumnResize: true,
  autoWrapCol: false,
  AutoRowSize: true,
  autoColumnSize: { allowSampleDuplicates: true, useHeaders: true, samplingRatio: 30 },
  fixedColumnsStart: 1,
  licenseKey: 'non-commercial-and-evaluation',
}))

function updateTable() {
  tableCFConfig.value.data.splice(0, tableCFConfig.value.data.length, ...dataTable.value.data)
  tableCFConfig.value.colHeaders.splice(0, tableCFConfig.value.colHeaders.length, ...dataTable.value.headers)
  tableCFConfig.value.columns.splice(0, tableCFConfig.value.columns.length, ...dataTable.value.columns.map(col => ({ renderer: renderedColumn })))
  tableCFConfig.value.cell.splice(0, tableCFConfig.value.cell.length, ...dataTable.value.cells)
  nextTick(() => nextTick(() => refTableCF.value?.hotInstance.updateSettings(tableCFConfig.value)))
}
defineExpose({
  updateTable,
})
</script>

<template>
  <AppCardActions
    :title="$props.title + ($props.multiContract ? ($props.isContract2 ? ' 2nd Contract' : ' 1st Contract') : '')"
    action-collapsed
    compact-header
    :collapsed="collapsed"
    @collapsed="val => collapsed = val"
  >
    <VCardText>
      <HotTable
        ref="refTableCF"
        :settings="tableCFConfig"
        class="not_to_dimmed"
        license-key="non-commercial-and-evaluation"
      />
    </VCardText>
  </AppCardActions>
</template>

<style lang="scss">
.not_to_dimmed {
  .handsontable .htDimmed {
    color: inherit !important;
  }
}
</style>

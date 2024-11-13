<script setup lang="ts">
import { useAppStore } from "@/stores/appStore"
import * as Pysc from "@/utils/pysc/pyscType"
import { useHTTP } from "@/utils/pysc/useHttp"
import 'handsontable/dist/handsontable.full.min.css'
import { isNull } from "mathjs"

interface Props {
  dataTable: Pysc.TableCFOption
  title: string
  multiContract?: boolean
  isContract2?: boolean
  ecoLimitMth?: string
}

const props = withDefaults(defineProps<Props>(), {
  multiContract: false,
  isContract2: false,
})

// const collapsed = defineModel<boolean>({ required: false, default: false })

const appStore = useAppStore()
const refTableCF = ref()
const yearofEcoLimit = ref<number | null>(null)

const dataTable = computed(() => props.dataTable)
const ecolimitMth = computed(() => props.ecoLimitMth)

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
  columns: dataTable.value.columns, // .map(col => ({ renderer: renderedColumn })),
  cell: dataTable.value.cells,
  readOnly: true,
  rowHeaders: true,
  height: 'auto',
  autoWrapRow: false,
  contextMenu: Pysc.TableContextMenus([{ name: 'copy' }, { name: 'copy_with_column_headers' }]),
  beforeGetCellMeta(row, col, cellProperties) {
    if (dataTable.value.data.length > 0 && yearofEcoLimit.value && row < dataTable.value.data.length - 1 && dataTable.value.data[row][0] === yearofEcoLimit.value)
      cellProperties.className = 'cf-make-yellow'
  },

  // stretchH: 'none',
  manualColumnResize: true,
  autoWrapCol: false,
  AutoRowSize: true,
  autoColumnSize: { allowSampleDuplicates: true, useHeaders: true, samplingRatio: 30 },
  fixedColumnsStart: 1,
  licenseKey: 'non-commercial-and-evaluation',
}))

const calcecoLimit = () => {
  try {
    yearofEcoLimit.value = null
    if (dataTable.value.data.length && ecolimitMth.value) {
      const dc = dataTable.value.data.slice(0, dataTable.value.data.length - 2).map(r => [r[0], r[dataTable.value.ctr_cash_flow]])

      useHTTP().put({
        path: 'calc_ecolimit',
        body: {
          json: btoa(JSON.stringify({
            'method': ecolimitMth.value,
            'years': dc.map(d => d[0]),
            'cash_flow': dc.map(d => d[1]),
          })),
        },
      }).then(resp => {
        if (resp.status === 200 && resp.result.ecoYear) {
          yearofEcoLimit.value = resp.result.ecoYear
          refTableCF.value?.hotInstance.updateSettings(tableCFConfig.value)
        }
      })
    }
  }
  catch (error) {
    console.log(error)
  }
}

const watchEcoLimit = watchPausable(ecolimitMth, () => calcecoLimit(), { immediate: false })

function updateTable() {
  yearofEcoLimit.value = null
  watchEcoLimit.pause()
  calcecoLimit()
  tableCFConfig.value.data.splice(0, tableCFConfig.value.data.length, ...dataTable.value.data)
  tableCFConfig.value.colHeaders.splice(0, tableCFConfig.value.colHeaders.length, ...dataTable.value.headers)
  tableCFConfig.value.columns.splice(0, tableCFConfig.value.columns.length, ...dataTable.value.columns) // .map(col => ({ renderer: renderedColumn })))
  tableCFConfig.value.cell.splice(0, tableCFConfig.value.cell.length, ...dataTable.value.cells)
  nextTick(() => {
    refTableCF.value?.hotInstance.updateSettings(tableCFConfig.value)
    watchEcoLimit.resume()
  })
}

const getDataSource = (value: string, sourceType: string) => {
  const tblDataScr = [tableCFConfig.value.colHeaders, ...refTableCF.value?.hotInstance.getData()]
  if (refTableCF) {
    if (sourceType === 'text') {
      return tblDataScr.reduce((rowTxt, rowVal) => {
        return `${rowTxt + rowVal.join('\t')}\n`
      }, '')
    }
    else if (sourceType === 'table') {
      const rndid = Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)

      return {
        data: [{
          name: 'cashflow',
          header: [],
          data: tblDataScr,
        }],
        filename: `${props.title + (props.multiContract ? (props.isContract2 ? ' 2nd Contract' : ' 1st Contract') : '')}_${appStore.selectedCase.name}_${rndid}`.replace(/[/\\ #$~&.]/g, ''),
      }
    }
  }

  return null
}

const actionOption = (type: string) => {
  if (type === 'reload')
    updateTable()
}

const resizeContainer = () => {
  nextTick(() => refTableCF.value?.hotInstance.updateSettings(tableCFConfig.value))
}

defineExpose({
  updateTable,
  getDataSource,
  actionOption,
  resizeContainer,
})
</script>

<template>
  <VCardText>
    <HotTable
      ref="refTableCF"
      :settings="tableCFConfig"
      class="not_to_dimmed"
      license-key="non-commercial-and-evaluation"
    />
  </VCardText>
</template>

<style lang="scss">
.not_to_dimmed {
  .handsontable .htDimmed {
    color: inherit !important;
  }
}
.cf-make-yellow {
  background-color: rgba(255,255, 0, 0.3) !important;
}
</style>

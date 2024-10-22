<script setup lang="ts">
import { useAppStore } from "@/stores/appStore"
import * as Pysc from "@/utils/pysc/pyscType"
import 'handsontable/dist/handsontable.full.min.css'

interface Props {
  header?: string
  hasGas?: boolean
  dataTable: Array<any>
  parameter?: Array<string>
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  header: 'value',
  hasGas: false,
  parameter: ['Oil Price', 'Opex', 'Capex', 'Cum. prod.'],
  title: '',
})

const appStore = useAppStore()
const numbro = Pysc.useNumbro()

const refTableMonte = ref()

const DataTable = computed(() => props.dataTable)

const tableMonteRes = computed(() => {
  return {
    data: [],

    // colHeaders: ['Freq.', props.header, ...props.parameter],
    colHeaders: index => {
      if (index === 0)
        return "Freq"
      else if (index === 1)
        return `<div class="text-wrap" style="max-inline-size:80px;">${props.header}</div>`
      else return props.parameter[index - 2]
    },
    columns: [
      { type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } },
      { type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } },
      ...props.parameter.map(v => ({ type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } })),
    ],
    contextMenu: Pysc.TableContextMenus([{ name: 'copy' }, { name: 'copy_with_column_headers' }]),
    readOnly: true,
    rowHeaders: false,
    height: '400px',
    stretchH: 'none',
    autoWrapRow: false,
    manualColumnResize: true,
    autoWrapCol: false,
    AutoRowSize: true,
    autoColumnSize: { allowSampleDuplicates: true, useHeaders: true, samplingRatio: 30 },
    fixedColumnsStart: 1,
    licenseKey: 'non-commercial-and-evaluation',
  }
})

const optOption = [
  { title: 'Copy to clipboard', value: 'copy2clbrd', icon: 'tabler-clipboard', sourceType: 'text' },
  { title: `Save to file (*.xlsx)`, value: 'save2File', icon: 'tabler-download', sourceType: 'table' },
]

const getDataSource = (value: string, sourceType: string) => {
  const tblDataScr = [['Freq', props.header, ...props.parameter], ...refTableMonte.value?.hotInstance.getData()]

  if (tblDataScr && tblDataScr.length) {
    if (sourceType === 'text') {
      return tblDataScr.reduce((rowTxt, rowVal) => {
        return `${rowTxt + rowVal.join('\t')}\n`
      }, '')
    }
    else if (sourceType === 'table') {
      const rndid = Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)

      return {
        data: [{
          name: `montecarlo ${props.header}`,
          header: [],
          data: tblDataScr,
        }],
        filename: `montecarlo_${props.header}_${appStore.selectedCase.name}_${rndid}`.replace(/[/\\ #$~&.]/g, ''),
      }
    }
  }

  return null
}

watch(DataTable, val => {
  tableMonteRes.value.data.splice(0, tableMonteRes.value.data.length, ...DataTable.value)
  refTableMonte.value?.hotInstance.updateSettings(tableMonteRes.value)
}, { immediate: true, deep: true })

const resizeContainer = () => {
  nextTick(() =>
    refTableMonte.value?.hotInstance.updateSettings(tableMonteRes.value),
  )
}

defineExpose({
  getDataSource,
  resizeContainer,
})
</script>

<template>
  <HotTable
    ref="refTableMonte"
    :settings="tableMonteRes"
    class="not_to_dimmed"
    license-key="non-commercial-and-evaluation"
  />
</template>

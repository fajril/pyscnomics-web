<script setup lang="ts">
import * as Pysc from "@/utils/pysc/pyscType";
import 'handsontable/dist/handsontable.full.min.css';
interface Props {
  header?: string
  hasGas?: boolean
  dataTable: Array<any>
  parameter?: Array<string>
}
const props = withDefaults(defineProps<Props>(), {
  header: 'value',
  hasGas: false,
  parameter: ['Oil Price', 'Opex', 'Capex', 'Cum. prod.']
})

const numbro = Pysc.useNumbro()

const refTableMonte = ref()

const DataTable = computed(() => props.dataTable)

const tableMonteRes = computed(() => {
  const Opt = {
    data: [],
    // colHeaders: ['Freq.', props.header, ...props.parameter],
    colHeaders: (index) => {
      if (index === 0) return "Freq"
      else if (index === 1) return `<div class="text-wrap" style="max-inline-size:80px;">${props.header}</div>`
      else return props.parameter[index - 2]
    },
    columns: [
      { type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } },
      { type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } },
      ...props.parameter.map(v => ({ type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } }))
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
    licenseKey: 'non-commercial-and-evaluation'
  }

  return Opt
})

watch(DataTable, val => {
  tableMonteRes.value.data.splice(0, tableMonteRes.value.data.length, ...DataTable.value)
  refTableMonte.value?.hotInstance.updateSettings(tableMonteRes.value)
}, { immediate: true, deep: true })
</script>

<template>
  <hot-table ref="refTableMonte" :settings="tableMonteRes" class="not_to_dimmed"
    licenseKey="non-commercial-and-evaluation" />
</template>

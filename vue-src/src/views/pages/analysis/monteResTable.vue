<script setup lang="ts">
import * as Pysc from "@/utils/pysc/pyscType";
import 'handsontable/dist/handsontable.full.min.css';
interface Props {
  hasGas?: boolean
  dataTable: Array<any>
  parameter?: Array<string>
}
const props = withDefaults(defineProps<Props>(), {
  hasGas: false,
  parameter: ['Oil Price', 'Opex', 'Capex', 'Cum. prod.']
})

const numbro = Pysc.useNumbro()

const refTableMonte = ref()

const DataTable = computed(() => props.dataTable)

const tableMonteRes = computed(() => {
  const Opt = {
    data: [],
    colHeaders: ['Freq.', 'Value', ...props.parameter],
    columns: [
      { type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } },
      { type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 3, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } },
      ...props.parameter.map(v => ({ type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 3, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } }))
    ],
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
  <hot-table ref="refTableMonte" :settings="tableMonteRes" class="not_to_dimmed" />
</template>

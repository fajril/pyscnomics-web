<script setup lang="ts">
import * as Pysc from "@/utils/pysc/pyscType";
import 'handsontable/dist/handsontable.full.min.css';
interface Props {
  hasGas?: boolean
  dataTable: Array<any>
}
const props = withDefaults(defineProps<Props>(), {
  hasGas: false
})

const numbro = Pysc.useNumbro()

const refTableSens = ref()

const DataTable = computed(() => props.dataTable)

const tableSensRes = computed(() => {
  const Opt = {
    data: [],
    colHeaders: ['Factor', 'Oil Price', 'Opex', 'Capex', 'Lifting'],
    columns: [
      { type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } },
      { type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 3, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } },
      { type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 3, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } },
      { type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 3, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } },
      { type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 3, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } },
    ],
    readOnly: true,
    rowHeaders: false,
    height: 'auto',
    stretchH: 'none',
    autoWrapRow: false,
    manualColumnResize: true,
    autoWrapCol: false,
    AutoRowSize: true,
    autoColumnSize: { allowSampleDuplicates: true, useHeaders: true, samplingRatio: 30 },
    fixedColumnsStart: 1,
    licenseKey: 'non-commercial-and-evaluation'
  }

  if (props.hasGas) {
    Opt.colHeaders.splice(2, 0, 'Gas Price')
    Opt.columns.splice(2, 0, { type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 3, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } })
  }
  return Opt
})

watch(DataTable, val => {
  tableSensRes.value.data.splice(0, tableSensRes.value.data.length, ...DataTable.value)
  refTableSens.value?.hotInstance.updateSettings(tableSensRes.value)
}, { immediate: true, deep: true })
</script>

<template>
  <hot-table ref="refTableSens" :settings="tableSensRes" class="not_to_dimmed" />
</template>

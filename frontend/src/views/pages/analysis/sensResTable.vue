<script setup lang="ts">
import { useAppStore } from "@/stores/appStore"
import * as Pysc from "@/utils/pysc/pyscType"
import 'handsontable/dist/handsontable.full.min.css'

interface Props {
  hasGas?: boolean
  dataTable: Array<any>
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  hasGas: false,
  title: '',
})

const appStore = useAppStore()
const numbro = Pysc.useNumbro()

const refTableSens = ref()

const DataTable = computed(() => props.dataTable)

const tableSensRes = computed(() => {
  const Opt = {
    data: [],
    colHeaders: ['Factor', 'Oil Price', 'Opex', 'Capex', 'Lifting'],
    columns: [
      { type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } },
      { type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } },
      { type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } },
      { type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } },
      { type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } },
    ],
    readOnly: true,
    contextMenu: Pysc.TableContextMenus([{ name: 'copy' }, { name: 'copy_with_column_headers' }]),
    rowHeaders: false,
    height: 'auto',
    stretchH: 'none',
    autoWrapRow: false,
    manualColumnResize: true,
    autoWrapCol: false,
    AutoRowSize: true,
    autoColumnSize: { allowSampleDuplicates: true, useHeaders: true, samplingRatio: 30 },
    fixedColumnsStart: 1,
    licenseKey: 'non-commercial-and-evaluation',
  }

  if (props.hasGas) {
    Opt.colHeaders.splice(2, 0, 'Gas Price')
    Opt.columns.splice(2, 0, { type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } })
  }

  return Opt
})

const getDataSource = (value: string, sourceType: string) => {
  const tblDataScr = [tableSensRes.value.colHeaders, ...refTableSens.value?.hotInstance.getData()]
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
          name: `sens ${props.title}`,
          header: [],
          data: tblDataScr,
        }],
        filename: `sens_${props.title}_${appStore.selectedCase.name}_${rndid}`.replace(/[/\\ #$~&.]/g, ''),
      }
    }
  }

  return null
}

watch(DataTable, val => {
  tableSensRes.value.data.splice(0, tableSensRes.value.data.length, ...DataTable.value)
  refTableSens.value?.hotInstance.updateSettings(tableSensRes.value)
}, { immediate: true, deep: true })

const resizeContainer = () => {
  refTableSens.value?.hotInstance.updateSettings(tableSensRes.value)
}

defineExpose({
  getDataSource,
  resizeContainer,
})
</script>

<template>
  <HotTable
    ref="refTableSens"
    :settings="tableSensRes"
    class="not_to_dimmed"
    license-key="non-commercial-and-evaluation"
  />
</template>

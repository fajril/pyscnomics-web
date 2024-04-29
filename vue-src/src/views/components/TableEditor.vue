<script setup lang="ts">
import { useAppStore } from "@/stores/appStore";
import {
  ExcelColumnType,
} from '@/utils/pysc/pyscType';
import 'handsontable/dist/handsontable.full.css';
import HyperFormula from 'hyperformula';

const appStore = useAppStore()

const modelValue = defineModel<Object[]>({ required: true })

interface Props {
  columns: ExcelColumnType
  colAutoWidth?: 'none' | 'last' | 'all'
}

const props = withDefaults(defineProps<Props>(), {
  colAutoWidth: 'last'
})

const tblhot = ref()

const columnnSett = toRef(props, 'columns')

const hotSettings = ref({
  data: modelValue,
  formulas: {
    engine: HyperFormula,
  },
  colHeaders: columnnSett.value.colHeaders,
  columns: columnnSett.value.columns,
  afterValidate(isValid, value, row, prop) {
    if (!isValid) {
      appStore.showAlert({
        text: `"${value}" Is invalid value`,
        isalert: true
      })
    }
    return isValid
  },
  beforeRemoveRow(index, amount, physicalRows) {
    return (modelValue.value.length - amount > 0)
  },
  fillHandle: {
    direction: 'vertical',
    autoInsertRow: true
  },
  rowHeaders: true,
  height: 'auto',
  contextMenu: ['row_above', 'row_below', 'remove_row', '---------', 'cut', 'copy', '---------', 'undo', 'redo',],
  autoWrapRow: false,
  stretchH: props.colAutoWidth,
  manualColumnResize: true,
  autoWrapCol: false,
  licenseKey: 'non-commercial-and-evaluation'
})

watch([modelValue, columnnSett], ([val1, val2]) => {
  hotSettings.value.colHeaders = columnnSett.value.colHeaders
  hotSettings.value.columns = columnnSett.value.columns
  hotSettings.value.data = modelValue
  tblhot.value?.hotInstance.updateSettings(hotSettings.value)
}, { deep: true })


</script>

<template>
  <hot-table ref="tblhot" :settings="hotSettings"></hot-table>
</template>

<style lang="scss">
.handsontable span.colHeader {
  white-space: pre-wrap !important
}
</style>

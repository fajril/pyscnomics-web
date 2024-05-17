<script setup lang="ts">
import { useAppStore } from "@/stores/appStore";
import { usePyscConfStore } from '@/stores/genfisStore';
import { useDataStore } from '@/utils/pysc/useDataStore';
import CostChart from '@/views/pages/config/costChart.vue';
import 'handsontable/dist/handsontable.full.min.css';
import HyperFormula from 'hyperformula';

definePage({
  name: 'pysc-tangi',
  path: '/pysc-tangi',
  meta: {
    title: "Cost - Tangible",
  },
})


const appStore = useAppStore()
const PyscConf = usePyscConfStore()
const { dataTan } = storeToRefs(PyscConf)
const refTableTangible = ref()

const mainSetting = ref({
  data: dataTan.value,
  colHeaders: ["Year", "Associated With", "Cost (MUSD)", "PIS Year", "Useful Life (Years)", "Depreciation Factor",
    "Applied By IC", "VAT Portion", "Description"],
  columns: [
    { type: 'numeric', validator: 'numeric', allowInvalid: false },
    { type: 'dropdown', source: ['Oil', 'Gas'], visibleRows: 15 },
    { type: 'numeric', validator: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, optionalMantissa: true, negative: "parenthesis" } }, allowInvalid: false },
    { type: 'numeric', validator: 'numeric', allowInvalid: false },
    { type: 'numeric', validator: 'numeric', allowInvalid: false },
    { type: 'numeric', validator: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, optionalMantissa: true, negative: "parenthesis" } }, allowInvalid: false },
    { type: 'dropdown', source: ['Yes', 'No'] },
    { type: 'numeric', validator: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, optionalMantissa: true, negative: "parenthesis" } }, allowInvalid: false },
    {}
  ],
  fillHandle: {
    direction: 'vertical',
    autoInsertRow: true
  },
  formulas: {
    engine: HyperFormula,
  },
  afterValidate(isValid, value, row, prop) {
    if (!isValid) {
      appStore.showAlert({
        text: `"${value}" Is invalid value`,
        isalert: true
      })
    }
    else {
      const ctype = refTableTangible.value.hotInstance.getDataType(row, +prop, row, +prop)
      nextTick(() => {
        if (ctype === 'numeric' && (typeof dataTan.value[row][+prop] === 'string') &&
          dataTan.value[row][+prop].indexOf('=') != -1) {
          dataTan.value[row][+prop] = value
          refTableTangible.value.hotInstance.updateData(dataTan.value)
        }
      })
    }
    return isValid
  },
  beforeRemoveRow(index, amount, physicalRows) {
    const countData = dataTan.value.length
    return (countData - amount > 0)
  },
  rowHeaders: true,
  height: 'auto',
  contextMenu: ['row_above', 'row_below', 'remove_row', '---------', 'cut', 'copy', '---------', 'undo', 'redo',],
  autoWrapRow: false,
  stretchH: 'none',
  manualColumnResize: true,
  autoWrapCol: false,
  licenseKey: 'non-commercial-and-evaluation'
})


const { stopCaseID, CallableFunc } = useDataStore().useWatchCaseID(() => {
  console.log("tangible trigger")
  mainSetting.value.data = dataTan.value
  refTableTangible.value?.hotInstance.updateSettings(mainSetting.value)
})
onMounted(() => CallableFunc())
onUnmounted(() => stopCaseID())
</script>

<template>
  <VCard title="Tangible" :subtitle="$t('Cost')">
    <VCardText>
      <AppCardActions action-collapsed :title="$t('Table Entry')" compact-header>
        <VCardText>
          <hot-table ref="refTableTangible" :settings="mainSetting" />
        </VCardText>
      </AppCardActions>
    </VCardText>
    <VCardText>
      <CostChart :data-chart="dataTan" title="Tangible" />
    </VCardText>
  </VCard>
</template>

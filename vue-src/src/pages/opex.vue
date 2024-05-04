<script setup lang="ts">
import { useAppStore } from "@/stores/appStore";
import { usePyscConfStore } from '@/stores/genfisStore';
import CostChart from '@/views/pages/config/costChart.vue';
import 'handsontable/dist/handsontable.full.min.css';
import HyperFormula from 'hyperformula';

definePage({
  name: 'pysc-opex',
  path: '/pysc-opex',
  meta: {
    title: "Cost - OPEX",
  },
})


const appStore = useAppStore()
const PyscConf = usePyscConfStore()
const { dataOpex } = storeToRefs(PyscConf)
const refTableOpex = ref()

const curSelCase = computed(() => appStore.curSelCase)

const mainSetting = ref({
  data: dataOpex.value,
  colHeaders: ["Year", "Assoc. With", "Fixed Cost (MUSD)", "Prod. Rate", "Cost Per Prod. Vol.",
    "VAT Portion", "LBT Portion", "Description"],
  columns: [
    { type: 'numeric', validator: 'numeric', allowInvalid: false },
    { type: 'dropdown', source: ['Oil', 'Gas'], visibleRows: 15 },
    { type: 'numeric', validator: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, optionalMantissa: true, negative: "parenthesis" } }, allowInvalid: false },
    { type: 'numeric', validator: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, optionalMantissa: true, negative: "parenthesis" } }, allowInvalid: false },
    { type: 'numeric', validator: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, optionalMantissa: true, negative: "parenthesis" } }, allowInvalid: false },
    { type: 'numeric', validator: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, optionalMantissa: true, negative: "parenthesis" } }, allowInvalid: false },
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
      const ctype = refTableOpex.value.hotInstance.getDataType(row, +prop, row, +prop)
      nextTick(() => {
        if (ctype === 'numeric' && (typeof dataOpex.value[row][+prop] === 'string') &&
          dataOpex.value[row][+prop].indexOf('=') != -1) {
          dataOpex.value[row][+prop] = value
          refTableOpex.value.hotInstance.updateData(dataOpex.value)
        }
      })
    }
    return isValid
  },
  beforeRemoveRow(index, amount, physicalRows) {
    const countData = dataOpex.value.length
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

watch(curSelCase, (val1) => {
  mainSetting.value.data = dataOpex.value
  refTableOpex.value?.hotInstance.updateSettings(mainSetting.value)
}, { deep: true })

const icurSelCase = ref(appStore.curSelCase)
watch(dataOpex, val => {
  if (icurSelCase.value !== appStore.curSelCase) {
    icurSelCase.value = appStore.curSelCase
    return
  }
  appStore.dataChanges()
}, { deep: true })
onMounted(() => {
  icurSelCase.value = appStore.curSelCase
})


</script>

<template>
  <VCard title="OPEX" subtitle="Cost">
    <VCardText>
      <AppCardActions action-collapsed title="Table Entry" compact-header>
        <VCardText>
          <hot-table ref="refTableOpex" :settings="mainSetting" />
        </VCardText>
      </AppCardActions>
    </VCardText>
    <VCardText>
      <CostChart :data-chart="dataOpex" title="Opex" />
    </VCardText>
  </VCard>
</template>

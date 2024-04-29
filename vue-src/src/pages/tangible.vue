<script setup lang="ts">
import { useAppStore } from "@/stores/appStore";
import { usePyscConfStore } from '@/stores/genfisStore';
import * as Pysc from '@/utils/pysc/pyscType';
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
const dayjs = Pysc.useDayJs()

const curSelCase = computed(() => appStore.curSelCase)

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

watch(curSelCase, (val1) => {
  mainSetting.value.data = dataTan.value
  refTableTangible.value?.hotInstance.updateSettings(mainSetting.value)
}, { deep: true })

const icurSelCase = ref(appStore.curSelCase)

watch(dataTan, val => {
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
  <VCard title="Tangible" subtitle="Cost">
    <VCardText>
      <AppCardActions action-collapsed title="Table Entry" compact-header>
        <VRow no-gutter>
          <VCol cols="12">
            <hot-table ref="refTableTangible" :settings="mainSetting" />
          </VCol>
        </VRow>
      </AppCardActions>
    </VCardText>
    <VCardText>
      <CostChart :data-chart="dataTan" title="Tangible" />
    </VCardText>
  </VCard>
</template>

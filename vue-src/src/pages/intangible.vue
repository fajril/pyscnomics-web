<script setup lang="ts">
import { useAppStore } from "@/stores/appStore";
import { usePyscConfStore } from '@/stores/genfisStore';
import { TableContextMenus } from '@/utils/pysc/pyscType';
import { useDataStore } from '@/utils/pysc/useDataStore';
import CostChart from '@/views/pages/config/costChart.vue';
import 'handsontable/dist/handsontable.full.min.css';
import HyperFormula from 'hyperformula';

definePage({
  name: 'pysc-intangi',
  path: '/pysc-intangi',
  meta: {
    title: "Cost - Intangible",
  },
})


const appStore = useAppStore()
const PyscConf = usePyscConfStore()
const { dataIntan } = storeToRefs(PyscConf)
const refTableIntangible = ref()

const mainSetting = ref({
  data: dataIntan.value,
  colHeaders: ["Year", "Associated With", "Cost (MUSD)", "VAT Portion", "Description"],
  columns: [
    { type: 'numeric', validator: 'numeric', allowInvalid: false },
    { type: 'dropdown', source: ['Oil', 'Gas'], visibleRows: 15 },
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
      const ctype = refTableIntangible.value.hotInstance.getDataType(row, +prop, row, +prop)
      nextTick(() => {
        if (ctype === 'numeric' && (typeof dataIntan.value[row][+prop] === 'string') &&
          dataIntan.value[row][+prop].indexOf('=') != -1) {
          dataIntan.value[row][+prop] = value
          refTableIntangible.value.hotInstance.updateData(dataIntan.value)
        }
      })
    }
    return isValid
  },
  beforeRemoveRow(index, amount, physicalRows) {
    const countData = dataIntan.value.length
    return (countData - amount > 0)
  },
  rowHeaders: true,
  height: 'auto',
  contextMenu: TableContextMenus(),
  autoWrapRow: false,
  stretchH: 'none',
  manualColumnResize: true,
  autoWrapCol: false,
  licenseKey: 'non-commercial-and-evaluation'
})

const { stopCaseID, CallableFunc } = useDataStore().useWatchCaseID(() => {
  console.log("intangible trigger")
  mainSetting.value.data = dataIntan.value
  refTableIntangible.value?.hotInstance.updateSettings(mainSetting.value)
})
onMounted(() => CallableFunc())
onUnmounted(() => stopCaseID())
</script>

<template>
  <VCard title="Intangible" subtitle="Cost">
    <VCardText>
      <AppCardActions action-collapsed title="Table Entry" compact-header>
        <VCardText>
          <hot-table ref="refTableIntangible" :settings="mainSetting" />
        </VCardText>
      </AppCardActions>
    </VCardText>
    <VCardText>
      <CostChart :data-chart="dataIntan" title="Intangible" />
    </VCardText>
  </VCard>
</template>

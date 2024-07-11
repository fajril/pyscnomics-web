<script setup lang="ts">
import { useAppStore } from "@/stores/appStore";
import { usePyscConfStore } from '@/stores/genfisStore';
import { defContextMenus, TableContextMenus } from '@/utils/pysc/pyscType';
import { useDataStore } from '@/utils/pysc/useDataStore';
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

const mainSetting = ref({
  data: dataOpex.value,
  colHeaders: ["Year", "Assoc. With", "Fixed Cost (MUSD)", "Prod. Rate", "Cost Per Prod. Vol.",
    "VAT Portion", "LBT Portion", "Description"],
  columns: [
    { type: 'numeric', validator: 'numeric', allowInvalid: false },
    { type: 'dropdown', source: ['Oil', 'Gas'], visibleRows: 15, strict: true },
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
  contextMenu: TableContextMenus([...defContextMenus, { name: 'separator' }, {
    name: 'import', label: 'Import from Excel-sheet',
    callback: (key, selection, clickEvent) => {
      const _fmt = ['i', ['Oil', 'Gas'], 'f', 'f', 'f', 'f', 'f', 's']
      appStore.showXlsxImport({
        SheetName: 'Cost OPEX',
        Format: _fmt,
        Callback: (data: any[]) => {
          if (data.length === 0)
            appStore.showAlert({ text: 'Data empty.', isalert: true })
          else {
            if (data[0].length < _fmt.length)
              data = data.map(row => [...row, ...Array<any>(_fmt.length - row.length).fill(null)])
            dataOpex.value.splice(0, dataOpex.value.length, ...JSON.parse(JSON.stringify(data)))
          }
        }
      })
    }
  }]),
  autoWrapRow: false,
  stretchH: 'none',
  manualColumnResize: true,
  autoWrapCol: false,
  licenseKey: 'non-commercial-and-evaluation'
})

const { stopCaseID, CallableFunc } = useDataStore().useWatchCaseID(() => {
  console.log("opex trigger")
  mainSetting.value.data = dataOpex.value
  refTableOpex.value?.hotInstance.updateSettings(mainSetting.value)
})
onMounted(() => CallableFunc())
onUnmounted(() => stopCaseID())
</script>

<template>
  <VCard title="OPEX" subtitle="Cost">
    <VCardText>
      <AppCardActions action-collapsed title="Table Entry" compact-header>
        <VCardText>
          <hot-table ref="refTableOpex" :settings="mainSetting" licenseKey="non-commercial-and-evaluation" />
        </VCardText>
      </AppCardActions>
    </VCardText>
    <VCardText>
      <CostChart :data-chart="dataOpex" title="Opex" />
    </VCardText>
  </VCard>
</template>

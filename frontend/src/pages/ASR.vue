<script setup lang="ts">
import { useAppStore } from "@/stores/appStore";
import { usePyscConfStore } from '@/stores/genfisStore';
import { TableContextMenus, defContextMenus } from '@/utils/pysc/pyscType';
import { useDataStore } from '@/utils/pysc/useDataStore';
import CostChart from '@/views/pages/config/costChart.vue';
import 'handsontable/dist/handsontable.full.min.css';
import HyperFormula from 'hyperformula';

definePage({
  name: 'pysc-asr',
  path: '/pysc-asr',
  meta: {
    title: "Cost - ASR",
  },
})


const appStore = useAppStore()
const PyscConf = usePyscConfStore()
const { dataASR } = storeToRefs(PyscConf)
const refTableASR = ref()

const mainSetting = ref({
  data: dataASR.value,
  colHeaders: ["Year", "Associated With", "Cost (MUSD)", "Description"],
  columns: [
    { type: 'numeric', validator: 'numeric', allowInvalid: false },
    { type: 'dropdown', source: ['Oil', 'Gas'], visibleRows: 15, strict: true },
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
      const ctype = refTableASR.value.hotInstance.getDataType(row, +prop, row, +prop)
      nextTick(() => {
        if (ctype === 'numeric' && (typeof dataASR.value[row][+prop] === 'string') &&
          dataASR.value[row][+prop].indexOf('=') != -1) {
          dataASR.value[row][+prop] = value
          refTableASR.value.hotInstance.updateData(dataASR.value)
        }
      })
    }
    return isValid
  },
  beforeRemoveRow(index, amount, physicalRows) {
    const countData = dataASR.value.length
    return (countData - amount > 0)
  },
  rowHeaders: true,
  height: 'auto',
  contextMenu: TableContextMenus([...defContextMenus, { name: 'separator' }, {
    name: 'import', label: 'Import from Excel-sheet',
    callback: (key, selection, clickEvent) => {
      const _fmt = ['i', ['Oil', 'Gas'], 'f', 's']
      appStore.showXlsxImport({
        SheetName: 'Cost ASR',
        Format: _fmt,
        Callback: (data: any[]) => {
          if (data.length === 0)
            appStore.showAlert({ text: 'Data empty.', isalert: true })
          else {
            if (data[0].length < _fmt.length)
              data = data.map(row => [...row, ...Array<any>(_fmt.length - row.length).fill(null)])
            dataASR.value.splice(0, dataASR.value.length, ...JSON.parse(JSON.stringify(data)))
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
  console.log("ASR trigger")
  mainSetting.value.data = dataASR.value
  refTableASR.value?.hotInstance.updateSettings(mainSetting.value)
})
onMounted(() => CallableFunc())
onUnmounted(() => stopCaseID())
</script>

<template>
  <VCard title="ASR" subtitle="Cost">
    <VCardText>
      <AppCardActions action-collapsed title="Table Entry" compact-header>
        <VCardText>
          <hot-table ref="refTableASR" :settings="mainSetting" licenseKey="non-commercial-and-evaluation" />
        </VCardText>
      </AppCardActions>
    </VCardText>
    <VCardText>
      <CostChart :data-chart="dataASR" title="ASR" />
    </VCardText>
  </VCard>
</template>

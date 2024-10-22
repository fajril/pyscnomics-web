<script setup lang="ts">
import { useAppStore } from "@/stores/appStore"
import { usePyscConfStore } from '@/stores/genfisStore'
import type { costRec } from '@/utils/pysc/pyscType'
import { TableContextMenus, defContextMenus } from '@/utils/pysc/pyscType'
import { useDataStore } from '@/utils/pysc/useDataStore'
import CostChart from '@/views/pages/config/costChart.vue'
import 'handsontable/dist/handsontable.full.min.css'
import HyperFormula from 'hyperformula'
import DotdotOpt from "./components/dotdotOpt.vue"

definePage({
  name: 'pysc-cos',
  path: '/pysc-cos',
  meta: {
    title: "Cost of Sales",
  },
})

const appStore = useAppStore()
const PyscConf = usePyscConfStore()
const { dataCOS } = storeToRefs(PyscConf)

const isCanAccess = computed(() => {
  return [1, 3, 4, 6].includes(PyscConf.dataGConf.type_of_contract) && (PyscConf.dataGConf.useCOS ?? false)
})

const { TabelContainer, hotTableRef: refTableCOS, hotInstance, htTblSett: mainSetting, updateData, onGetHintTooltip, onAfterValidate } = useHTtable({
  data: dataCOS.value,
  colHeaders: ["Year", "Associated With", "Cost (MUSD)"],
  columns: [
    { type: 'numeric', validator: 'numeric', allowInvalid: false },

    { type: 'select', selectOptions: ['Oil', 'Gas'], strict: true, useComboRender: true },
    { type: 'numeric', validator: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, optionalMantissa: true, negative: "parenthesis" } }, allowInvalid: false },
  ],
  fillHandle: {
    direction: 'vertical',
    autoInsertRow: true,
  },
  formulas: {
    engine: HyperFormula,
  },
  beforeRemoveRow(index, amount, physicalRows) {
    const countData = dataCOS.value.length

    return (countData - amount > 0)
  },
  rowHeaders: true,
  contextMenu: TableContextMenus([...defContextMenus, { name: 'separator' }, {
    name: 'import',
    label: 'Import from Excel-sheet',
    callback: (key, selection, clickEvent) => {
      const _fmt = ['i', ['Oil', 'Gas'], 'f']

      appStore.showXlsxImport({
        SheetName: 'Cost od Sales',
        Format: _fmt,
        Callback: (data: any[]) => {
          if (data.length === 0) {
            appStore.showAlert({ text: 'Data empty.', isalert: true })
          }
          else {
            if (data[0].length < _fmt.length)
              data = data.map(row => [...row, ...Array<any>(_fmt.length - row.length).fill(null)])
            dataCOS.value.splice(0, dataCOS.value.length, ...JSON.parse(JSON.stringify(data)))
          }
        },
      })
    },
  }]),
}, 'all')

onGetHintTooltip.value = (rowData, value, cellProperties, isHeader) => {
  if (isHeader)
    return mainSetting.value.colHeaders[cellProperties.col]
  else
    return !isNullOrUndefined(value) ? `${value}` : null
}
onAfterValidate.value = (isValid, value, row, prop) => {
  const ctype = hotInstance.value?.getDataType(row, +prop, row, +prop)

  nextTick(() => {
    try {
      if (ctype === 'numeric' && (typeof dataCOS.value[row][+prop] === 'string')
      && dataCOS.value[row][+prop].includes('=')) {
        dataCOS.value[row][+prop] = +(+value).toPrecision(15)
        updateData(dataCOS.value)
      }
    }
    catch (error) {

    }
  })
}

const { stopCaseID, CallableFunc } = useDataStore().useWatchCaseID(() => {
  console.log("COS trigger")

  // mainSetting.value.data = dataCOS.value
  updateData(dataCOS.value)

  // refTableCOS.value?.hotInstance.updateSettings(mainSetting.value)
})

const optOption = [
  { title: 'Copy to clipboard', value: 'copy2clbrd', icon: 'tabler-clipboard', sourceType: 'text' },
  { title: `Save to file (*.xlsx)`, value: 'save2File', icon: 'tabler-download', sourceType: 'table' },
  { type: 'divider' },
  { title: 'Reload', value: 'reload', icon: 'tabler-reload' },
]

const getDataSource = (value: string, sourceType: string) => {
  const tblDataScr = [mainSetting.value.colHeaders, ...hotInstance.value?.getData()]
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
          name: 'COS',
          header: [],
          data: tblDataScr,
        }],
        filename: `cost_COS_${appStore.selectedCase.name}_${rndid}`.replace(/[/\\ #$~&.]/g, ''),
      }
    }
  }

  return null
}

const actionOption = (type: string) => {
  if (type === 'reload')
    CallableFunc()
}

onMounted(() => CallableFunc())
onUnmounted(() => stopCaseID())
</script>

<template>
  <VCard
    title="Cost of Sales"
    subtitle="Cost"
  >
    <VCardText v-if="!isCanAccess">
      <VAlert
        density="comfortable"
        color="success"
        variant="tonal"
      >
        Only available for PSC contracts
        <span v-if="[1, 3, 4, 6].includes(PyscConf.dataGConf.type_of_contract)">
          and <VBtn
            :to="{ name: 'pysc-conf' }"
            class="text-primary"
            size="x-small"
            style="margin-top: -0.1875rem;"
          >
            enabled COS
          </VBtn>
        </span>
      </VAlert>
    </VCardText>
    <VCardText v-else>
      <AppCardActions
        action-collapsed
        title="Table Entry"
        compact-header
      >
        <template #before-actions="{ isContentCollapsed }">
          <DotdotOpt
            v-if="!isContentCollapsed"
            :menu-list="optOption"
            title="Options"
            item-props
            dot-only
            :get-source="getDataSource"
            @click:item="actionOption"
          />
        </template>

        <VCardText class="d-flex gap-10">
          <div>
            <VLabel class="text-primary">
              Contract - 1
            </VLabel>
            <AppCheckBox
              v-model="PyscConf.dataContr.cr.oil_cost_of_sales_applied"
              label="Oil cost of sales applied"
            />
            <AppCheckBox
              v-if="PyscConf.prodHasGas()"
              v-model="PyscConf.dataContr.cr.gas_cost_of_sales_applied"
              label="Gas cost of sales applied"
            />
          </div>
          <div v-if="[3, 6].includes(PyscConf.dataGConf.type_of_contract)">
            <VLabel class="text-primary">
              Contract - 2
            </VLabel>
            <AppCheckBox
              v-model="(PyscConf.dataContr.second as costRec).oil_cost_of_sales_applied"
              label="Oil cost of sales applied"
            />
            <AppCheckBox
              v-if="PyscConf.prodHasGas()"
              v-model="(PyscConf.dataContr.second as costRec).gas_cost_of_sales_applied"
              label="Gas cost of sales applied"
            />
          </div>
        </VCardText>
        <VCardText ref="TabelContainer">
          <HotTable
            ref="refTableCOS"
            :settings="mainSetting"
            license-key="non-commercial-and-evaluation"
          />
        </VCardText>
      </AppCardActions>
    </VCardText>
    <VCardText v-if="isCanAccess">
      <CostChart
        :data-chart="dataCOS"
        title="COS"
      />
    </VCardText>
  </VCard>
</template>

<script setup lang="ts">
import { useAppStore } from "@/stores/appStore"
import { useTooltip } from "@/utils/pysc/useTooltips"
import { usePyscConfStore } from '@/stores/genfisStore'
import { TableContextMenus, defContextMenus } from '@/utils/pysc/pyscType'
import { useDataStore } from '@/utils/pysc/useDataStore'
import CostChart from '@/views/pages/config/costChart.vue'
import 'handsontable/dist/handsontable.full.min.css'
import HyperFormula from 'hyperformula'
import DotdotOpt from "./components/dotdotOpt.vue"

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
const { getToolTip } = useTooltip()

const { TabelContainer, hotTableRef: refTableOpex, hotInstance, htTblSett: mainSetting, updateData, onGetHintTooltip, onAfterValidate } = useHTtable({
  data: dataOpex.value,
  colHeaders: ["Year",
    "Assoc. With",
    "Fixed Cost (MUSD)",
    "Prod. Rate",
    "Cost Per Barrel (USD/STB)", // MOM 08/21
    "VAT Portion",
    "LBT Portion",
    "Description"],
  columns: [
    { type: 'numeric', validator: 'numeric', allowInvalid: false },

    { type: 'select', selectOptions: ['Oil', 'Gas'], strict: true, useComboRender: true },
    { type: 'numeric', validator: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, optionalMantissa: true, negative: "parenthesis" } }, allowInvalid: false },
    { type: 'numeric', validator: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, optionalMantissa: true, negative: "parenthesis" } }, allowInvalid: false },
    { type: 'numeric', validator: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, optionalMantissa: true, negative: "parenthesis" } }, allowInvalid: false },
    { type: 'numeric', validator: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, optionalMantissa: true, negative: "parenthesis" } }, allowInvalid: false },
    { type: 'numeric', validator: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, optionalMantissa: true, negative: "parenthesis" } }, allowInvalid: false },
    {},
  ],
  fillHandle: {
    direction: 'vertical',
    autoInsertRow: true,
  },
  formulas: {
    engine: HyperFormula,
  },
  beforeRemoveRow(index, amount, physicalRows) {
    const countData = dataOpex.value.length

    return (countData - amount > 0)
  },
  rowHeaders: true,
  contextMenu: TableContextMenus([...defContextMenus, { name: 'separator' }, {
    name: 'import',
    label: 'Import from Excel-sheet',
    callback: (key, selection, clickEvent) => {
      const _fmt = ['i', ['Oil', 'Gas'], 'f', 'f', 'f', 'f', 'f', 's']

      appStore.showXlsxImport({
        SheetName: 'Cost OPEX',
        Format: _fmt,
        Callback: (data: any[]) => {
          if (data.length === 0) { appStore.showAlert({ text: 'Data empty.', isalert: true }) }
          else {
            if (data[0].length < _fmt.length)
              data = data.map(row => [...row, ...Array<any>(_fmt.length - row.length).fill(null)])
            dataOpex.value.splice(0, dataOpex.value.length, ...JSON.parse(JSON.stringify(data)))
          }
        },
      })
    },
  }]),
}, 'all')

onGetHintTooltip.value = (rowData, value, cellProperties, isHeader) => {
  if (isHeader) {
    const headerTxt_ = mainSetting.value.colHeaders[cellProperties.col]
    if ((headerTxt_).startsWith('Year'))
      return getToolTip('OPEX.year')
    else if ((headerTxt_).startsWith('Associated'))
      return getToolTip('OPEX.assoc')
    else if ((headerTxt_).startsWith('Fixed'))
      return getToolTip('OPEX.fixed')
    else if ((headerTxt_).startsWith('Prod.'))
      return getToolTip('OPEX.prod')
    else if ((headerTxt_).startsWith('Cost'))
      return getToolTip('OPEX.cost')
    else if ((headerTxt_).startsWith('VAT'))
      return getToolTip('OPEX.VAT')
    else if ((headerTxt_).startsWith('LBT'))
      return getToolTip('OPEX.LBT')
    else if ((headerTxt_).startsWith('Description'))
      return getToolTip('OPEX.desc')

    return headerTxt_
  }
  else {
    return !isNullOrUndefined(value) ? `${value}` : null
  }
}
onAfterValidate.value = (isValid, value, row, prop) => {
  const ctype = hotInstance.value?.getDataType(row, +prop, row, +prop)

  nextTick(() => {
    try {
      if (ctype === 'numeric' && (typeof dataOpex.value[row][+prop] === 'string')
      && dataOpex.value[row][+prop].includes('=')) {
        dataOpex.value[row][+prop] = +(+value).toPrecision(15)
        updateData(dataOpex.value)
      }
    }
    catch (error) {

    }
  })
}

const { stopCaseID, CallableFunc } = useDataStore().useWatchCaseID(() => {
  console.log("opex trigger")

  // mainSetting.value.data = dataOpex.value
  updateData(dataOpex.value)

  // refTableOpex.value?.hotInstance.updateSettings(mainSetting.value)
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
          name: 'opex',
          header: [],
          data: tblDataScr,
        }],
        filename: `cost_opex_${appStore.selectedCase.name}_${rndid}`.replace(/[/\\ #$~&.]/g, ''),
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
    title="OPEX"
    subtitle="Cost"
  >
    <VCardText>
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

        <VCardText ref="TabelContainer">
          <HotTable
            ref="refTableOpex"
            :settings="mainSetting"
            license-key="non-commercial-and-evaluation"
          />
        </VCardText>
      </AppCardActions>
    </VCardText>
    <VCardText>
      <CostChart
        :data-chart="dataOpex"
        title="Opex"
      />
    </VCardText>
  </VCard>
</template>

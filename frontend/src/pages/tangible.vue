<script setup lang="ts">
import { useAppStore } from "@/stores/appStore"
import { useTooltip } from "@/utils/pysc/useTooltips"
import { usePyscConfStore } from '@/stores/genfisStore'
import { TableContextMenus, defContextMenus } from '@/utils/pysc/pyscType'
import { useDataStore } from '@/utils/pysc/useDataStore'
import { useHTtable } from "@/utils/useHTtable"
import CostChart from '@/views/pages/config/costChart.vue'
import 'handsontable/dist/handsontable.full.min.css'
import HyperFormula from 'hyperformula'
import DotdotOpt from "./components/dotdotOpt.vue"

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
const { getToolTip } = useTooltip()

const { TabelContainer, hotTableRef: refTableTangible, hotInstance, htTblSett: mainSetting, updateData, onGetHintTooltip, onAfterValidate } = useHTtable({
  data: dataTan.value,
  colHeaders: ["Year",
    "Associated With",
    "Cost (MUSD)",
    "PIS Year",
    "Useful Life (Years)",
    "Depreciation Factor",
    "Applied By IC",
    "VAT Portion",
    "Description"],
  columns: [
    { type: 'numeric', validator: 'numeric', allowInvalid: false },
    { type: 'select', selectOptions: ['Oil', 'Gas'], strict: true, useComboRender: true },
    { type: 'numeric', validator: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, optionalMantissa: true, negative: "parenthesis" } }, allowInvalid: false },
    { type: 'numeric', validator: 'numeric', allowInvalid: false },
    { type: 'numeric', validator: 'numeric', allowInvalid: false },
    { type: 'numeric', validator: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, optionalMantissa: true, negative: "parenthesis" } }, allowInvalid: false },
    { type: 'select', selectOptions: ['Yes', 'No'], strict: true, useComboRender: true },
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
    const countData = dataTan.value.length

    return (countData - amount > 0)
  },
  rowHeaders: true,
  contextMenu: TableContextMenus([...defContextMenus, { name: 'separator' }, {
    name: 'import',
    label: 'Import from Excel-sheet',
    callback: (key, selection, clickEvent) => {
      const _fmt = ['i', ['Oil', 'Gas'], 'f', 'i', 'f', 'f', ['No', 'Yes'], 'f', 's']

      appStore.showXlsxImport({
        SheetName: 'Cost Tangible',
        Format: _fmt,
        Callback: (data: any[]) => {
          if (data.length === 0) {
            appStore.showAlert({
              text: 'Data empty.',
              isalert: true,
            })
          }
          else {
            if (data[0].length < _fmt.length)
              data = data.map(row => [...row, ...Array<any>(_fmt.length - row.length).fill(null)])
            dataTan.value.splice(0, dataTan.value.length, ...JSON.parse(JSON.stringify(data)))
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
      return getToolTip('capCost.year')
    else if ((headerTxt_).startsWith('Associated'))
      return getToolTip('capCost.assoc')
    else if ((headerTxt_).startsWith('Cost'))
      return getToolTip('capCost.cost')
    else if ((headerTxt_).startsWith('VAT'))
      return getToolTip('capCost.VAT')
    else if ((headerTxt_).startsWith('Description'))
      return getToolTip('capCost.desc')

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
      if (ctype === 'numeric' && (typeof dataTan.value[row][+prop] === 'string')
      && dataTan.value[row][+prop].includes('=')) {
        dataTan.value[row][+prop] = +(+value).toPrecision(15)
        updateData(dataTan.value)
      }
    }
    catch (error) {

    }
  })
}

const { stopCaseID, CallableFunc } = useDataStore().useWatchCaseID(() => {
  console.log("tangible trigger")

  // mainSetting.value.data = dataTan.value
  updateData(dataTan.value)

  // refTableTangible.value?.hotInstance.updateSettings(mainSetting.value)
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
          name: 'tangible',
          header: [],
          data: tblDataScr,
        }],
        filename: `cost_tangible_${appStore.selectedCase.name}_${rndid}`.replace(/[/\\ #$~&.]/g, ''),
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
    title="Tangible"
    :subtitle="$t('Cost')"
  >
    <VCardText>
      <AppCardActions
        action-collapsed
        :title="$t('Table Entry')"
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
            ref="refTableTangible"
            :settings="mainSetting"
            license-key="non-commercial-and-evaluation"
          />
        </VCardText>
      </AppCardActions>
    </VCardText>
    <VCardText>
      <CostChart
        :data-chart="dataTan"
        title="Tangible"
      />
    </VCardText>
  </VCard>
</template>

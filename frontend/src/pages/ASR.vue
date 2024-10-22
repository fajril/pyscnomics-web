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
  name: 'pysc-asr',
  path: '/pysc-asr',
  meta: {
    title: "Cost - ASR",
  },
})

const appStore = useAppStore()
const PyscConf = usePyscConfStore()
const { dataASR } = storeToRefs(PyscConf)
const { getToolTip } = useTooltip()

const { TabelContainer, hotTableRef: refTableASR, hotInstance, htTblSett: mainSetting, updateData, onGetHintTooltip, onAfterValidate } = useHTtable({
  data: dataASR.value,
  colHeaders: ["Year", "Associated With", "Cost (MUSD)", "Description"],
  columns: [
    { type: 'numeric', validator: 'numeric', allowInvalid: false },

    { type: 'select', selectOptions: ['Oil', 'Gas'], strict: true, useComboRender: true },
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
    const countData = dataASR.value.length

    return (countData - amount > 0)
  },
  rowHeaders: true,
  contextMenu: TableContextMenus([...defContextMenus, { name: 'separator' }, {
    name: 'import',
    label: 'Import from Excel-sheet',
    callback: (key, selection, clickEvent) => {
      const _fmt = ['i', ['Oil', 'Gas'], 'f', 's']

      appStore.showXlsxImport({
        SheetName: 'Cost ASR',
        Format: _fmt,
        Callback: (data: any[]) => {
          if (data.length === 0) { appStore.showAlert({ text: 'Data empty.', isalert: true }) }
          else {
            if (data[0].length < _fmt.length)
              data = data.map(row => [...row, ...Array<any>(_fmt.length - row.length).fill(null)])
            dataASR.value.splice(0, dataASR.value.length, ...JSON.parse(JSON.stringify(data)))
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
      return getToolTip('ASR.year')
    else if ((headerTxt_).startsWith('Associated'))
      return getToolTip('ASR.assoc')
    else if ((headerTxt_).startsWith('Cost'))
      return getToolTip('ASR.cost')
    else if ((headerTxt_).startsWith('Description'))
      return getToolTip('ASR.desc')

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
      if (ctype === 'numeric' && (typeof dataASR.value[row][+prop] === 'string')
      && dataASR.value[row][+prop].includes('=')) {
        dataASR.value[row][+prop] = +(+value).toPrecision(15)
        updateData(dataASR.value)
      }
    }
    catch (error) {

    }
  })
}

const { stopCaseID, CallableFunc } = useDataStore().useWatchCaseID(() => {
  console.log("ASR trigger")

  // mainSetting.value.data = dataASR.value
  updateData(dataASR.value)

  // refTableASR.value?.hotInstance.updateSettings(mainSetting.value)
})

const optOption = [
  { title: 'Copy to clipboard', value: 'copy2clbrd', icon: 'tabler-clipboard', sourceType: 'text' },
  { title: `Save to file (*.xlsx)`, value: 'save2File', icon: 'tabler-download', sourceType: 'table' },
  { type: 'divider' },
  { title: 'ASR Calculator', value: 'calc-asr', icon: 'tabler-calculator' },
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
          name: 'ASR',
          header: [],
          data: tblDataScr,
        }],
        filename: `cost_ASR_${appStore.selectedCase.name}_${rndid}`.replace(/[/\\ #$~&.]/g, ''),
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
    title="ASR"
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
            ref="refTableASR"
            :settings="mainSetting"
            license-key="non-commercial-and-evaluation"
          />
        </VCardText>
      </AppCardActions>
    </VCardText>
    <VCardText>
      <CostChart
        :data-chart="dataASR"
        title="ASR"
      />
    </VCardText>
  </VCard>
</template>

<script setup lang="ts">
import { useAppStore } from '@/stores/appStore'
import { useTooltip } from '@/utils/pysc/useTooltips'
import { VCheckbox } from 'vuetify/lib/components/index.mjs'
import DotdotOpt from './components/dotdotOpt.vue'
import { usePyscConfStore } from '@/stores/genfisStore'
import { TableContextMenus, defCapCost_s, defContextMenus, defasrCost_s, defcosCost_s, defintangCost_s, deflbtCost_s, defopexCost_s } from '@/utils/pysc/pyscType'
import { useDataStore } from '@/utils/pysc/useDataStore'
import CostChart from '@/views/pages/config/costChart.vue'

// definePage({
//   name: 'pysc-cost',
//   path: '/pysc-cost/:display',
//   meta: {
//     title: "Costs",
//   },
// })

const router = useRouter()
const route = useRoute()

const routeName = computed(() => router.currentRoute.value.name)

const appStore = useAppStore()
const PyscConf = usePyscConfStore()
const { dataGConf } = storeToRefs(PyscConf)
const { getToolTip } = useTooltip()

const costKeyName = {
  expense_year: 'Year',
  cost_allocation: 'Associated With',
  cost: 'Cost (MUSD)',
  pis_year: 'PIS Year',
  useful_life: 'Useful Life (Years)',
  depreciation_factor: 'Depreciation Factor',
  is_ic_applied: 'Applied By IC',
  tax_portion: 'Tax Portion',
  description: 'Description',
  fixed_cost: 'Fixed Cost (MUSD)',
  prod_rate: 'Prod. Rate',
  cost_per_volume: 'Cost Per Barrel (USD/STB)',
  final_year: 'Final Year',
  utilized_land_area: 'Utilized Land Area',
  utilized_building_area: 'Utilized Building Area',
  njop_land: 'NJOP Land',
  njop_building: 'NJOP Building',
  gross_revenue: 'Gross Revenue',
} as const

const data = computed(() => {
  if (routeName.value === 'pysc-cost-capital')
    return PyscConf.dataTan
  else if (routeName.value === 'pysc-cost-intang')
    return PyscConf.dataIntan
  else if (routeName.value === 'pysc-cost-opex')
    return PyscConf.dataOpex
  else if (routeName.value === 'pysc-cost-asr')
    return PyscConf.dataASR
  else if (routeName.value === 'pysc-cost-lbt')
    return PyscConf.dataLBT
  else if (routeName.value === 'pysc-cost-cos')
    return PyscConf.dataCOS

  return []
})

const defVal = computed(() => {
  if (routeName.value === 'pysc-cost-capital')
    return defCapCost_s()
  else if (routeName.value === 'pysc-cost-intang')
    return defintangCost_s()
  else if (routeName.value === 'pysc-cost-opex')
    return defopexCost_s()
  else if (routeName.value === 'pysc-cost-asr')
    return defasrCost_s()
  else if (routeName.value === 'pysc-cost-lbt')
    return deflbtCost_s()
  else if (routeName.value === 'pysc-cost-cos')
    return defcosCost_s()

  return {}
})

const { TabelContainer, hotTableRef, hotInstance, htTblSett, updateData, updateSetting, onGetHintTooltip, onAfterValidate } = useHTtable({
  data: data.value,
  colHeaders(index: number) {
    const keys: string[] = Object.keys(defVal.value)
    const name_ = costKeyName[keys[index]]
    if (keys[index] === 'tax_portion' && routeName.value === 'pysc-cost-lbt')
      return 'LBT Portion'

    return name_
  },
  columns(index: number) {
    const keys = Object.keys(defVal.value)
    if (keys[index] === 'cost_allocation')
      return { type: 'select', selectOptions: ['Oil', 'Gas'], strict: true, useComboRender: true, data: 'cost_allocation' }
    else if (keys[index] === 'is_ic_applied')
      return { type: 'select', selectOptions: ['Yes', 'No'], strict: true, useComboRender: true, data: 'is_ic_applied' }
    else if (['expense_year', 'pis_year', 'final_year'].includes(keys[index]))
      return { type: 'numeric', validator: 'numeric', data: keys[index], numericFormat: { pattern: '0' }, allowInvalid: false }
    else if (keys[index] !== 'description')
      return { type: 'numeric', validator: 'numeric', data: keys[index], numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, optionalMantissa: true, negative: "parenthesis" } }, allowInvalid: false }

    return { data: keys[index] }
  },
  beforeGetCellMeta(row, col, cellProperties) {
    if (routeName.value === 'pysc-cost-lbt') {
      if ((cellProperties.prop === 'cost' && dataGConf.value.lbtUseCalc)
      || (['final_year', 'utilized_land_area', 'utilized_building_area', 'njop_land', 'njop_building', 'gross_revenue'].includes(cellProperties.prop) && !dataGConf.value.lbtUseCalc)) {
        cellProperties.className = 'htRight lbt-make-gray'
        cellProperties.readOnly = true
      }
    }
  },
  fillHandle: {
    direction: 'vertical',
    autoInsertRow: true,
  },

  // formulas: {
  //   engine: HyperFormula,
  // },
  beforeRemoveRow(index, amount, physicalRows) {
    return (data.value.length - amount > 0)
  },
  rowHeaders: true,
  contextMenu: TableContextMenus(defContextMenus),

  // contextMenu: TableContextMenus([...defContextMenus, { name: 'separator' }, {
  //   name: 'import',
  //   label: 'Import from Excel-sheet',
  //   callback: (key, selection, clickEvent) => {
  //     // const _fmt = ['i', ['Oil', 'Gas'], 'f', 'i', 'f', 'f', ['No', 'Yes'], 'f', 's']

  //     // appStore.showXlsxImport({
  //     //   SheetName: 'Cost Tangible',
  //     //   Format: _fmt,
  //     //   Callback: (data: any[]) => {
  //     //     if (data.length === 0) {
  //     //       appStore.showAlert({
  //     //         text: 'Data empty.',
  //     //         isalert: true,
  //     //       })
  //     //     }
  //     //     else {
  //     //       if (data[0].length < _fmt.length)
  //     //         data = data.map(row => [...row, ...Array<any>(_fmt.length - row.length).fill(null)])
  //     //       dataTan.value.splice(0, dataTan.value.length, ...JSON.parse(JSON.stringify(data)))
  //     //     }
  //     //   },
  //     // })
  //   },
  // }]),
}, 'all')

onGetHintTooltip.value = (rowData, value, cellProperties, isHeader) => {
  if (isHeader) {
    const keyHint = (routeName.value === 'pysc-cost-capital' ? 'capCost' : (routeName.value === 'pysc-cost-intang' ? 'intang' : (routeName.value === 'pysc-cost-opex' ? 'OPEX' : (routeName.value === 'pysc-cost-asr' ? 'ASR' : (routeName.value === 'pysc-cost-cos' ? 'COS' : 'LBT')))))

    const headerTxt_ = hotInstance.value?.getColHeader(cellProperties.col)
    if ((headerTxt_).startsWith('Year'))
      return getToolTip(`${keyHint}.year`)
    else if ((headerTxt_).startsWith('Associated'))
      return getToolTip(`${keyHint}.assoc`)
    else if ((headerTxt_).startsWith('Cost'))
      return getToolTip(`${keyHint}.cost`)
    else if ((headerTxt_).startsWith('Fixed'))
      return getToolTip(`${keyHint}.fixed`)
    else if ((headerTxt_).startsWith('Tax'))
      return getToolTip(`${keyHint}.VAT`)
    else if ((headerTxt_).startsWith('Prod.'))
      return getToolTip(`${keyHint}.prod`)
    else if ((headerTxt_).startsWith('Description'))
      return getToolTip(`${keyHint}.desc`)

    return headerTxt_
  }
  else {
    return !isNullOrUndefined(value) ? `${value}` : null
  }
}

const { stopCaseID, CallableFunc } = useDataStore().useWatchCaseID(() => {
  console.log("trigger")

  updateSetting()
  updateData(data.value)
})

const optOption = [
  { title: 'Copy to clipboard', value: 'copy2clbrd', icon: 'tabler-clipboard', sourceType: 'text' },
  { title: `Save to file (*.xlsx)`, value: 'save2File', icon: 'tabler-download', sourceType: 'table' },
  { type: 'divider' },
  { title: 'Reload', value: 'reload', icon: 'tabler-reload' },
]

const getDataSource = (value: string, sourceType: string) => {
  const tblDataScr = [hotInstance.value?.getColHeader(), ...hotInstance.value?.getData()]
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
          name: routeName.value,
          header: [],
          data: tblDataScr,
        }],
        filename: `cost_${routeName.value}_${appStore.selectedCase.name}_${rndid}`.replace(/[/\\ #$~&.]/g, ''),
      }
    }
  }

  return null
}

const actionOption = (type: string) => {
  if (type === 'reload')
    CallableFunc()
}

watch(() => route.fullPath, () => {
  CallableFunc()
}, { immediate: false })

onMounted(() => CallableFunc())
onUnmounted(() => stopCaseID())
</script>

<template>
  <VCard
    :title="routeName === 'pysc-cost-capital' ? 'Capital' : (routeName === 'pysc-cost-intang' ? 'Intangible' : (routeName === 'pysc-cost-opex' ? 'Opex' : (routeName === 'pysc-cost-asr' ? 'ASR' : (routeName === 'pysc-cost-cos' ? 'COS' : 'LBT'))))"
    :subtitle="$t('Cost')"
  >
    <VCardText>
      <AppCardActions
        action-collapsed
        :title="$t('Table Entry')"
        compact-header
      >
        <template #title>
          <div style="display: flex; align-items: center; inline-size: 100%; justify-content: start;">
            {{ $t('Table Entry') }}
            <VCheckbox
              v-if="routeName === 'pysc-cost-lbt'"
              :model-value="!dataGConf.lbtUseCalc"
              label="Direct Cost"
              @click.stop.prevent="() => { dataGConf.lbtUseCalc = !dataGConf.lbtUseCalc; updateSetting(); }"
            />
          </div>
        </template>
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
            ref="hotTableRef"
            :settings="htTblSett"
            license-key="non-commercial-and-evaluation"
          />
        </VCardText>
      </AppCardActions>
    </VCardText>
    <VCardText>
      <CostChart
        :data-chart="data"
        :title="routeName === 'pysc-cost-capital' ? 'Capital' : (routeName === 'pysc-cost-intang' ? 'Intangible' : (routeName === 'pysc-cost-opex' ? 'Opex' : (routeName === 'pysc-cost-asr' ? 'ASR' : (routeName === 'pysc-cost-cos' ? 'COS' : 'LBT'))))"
      />
    </VCardText>
  </VCard>
</template>

<style lang="scss">
.lbt-make-gray {
  background-color: rgba(161, 161, 161, 0.4) !important;
}
</style>

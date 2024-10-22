<script setup lang="ts">
import { useAppStore } from '@/stores/appStore'
import { useHTTP } from '@/utils/pysc/useHttp'
import { useTooltip } from '@/utils/pysc/useTooltips'
import * as math from 'mathjs'
import DotdotOpt from '../components/dotdotOpt.vue'
import { usePyscConfStore } from '@/stores/genfisStore'
import { usePyscSensStore } from '@/stores/sensStore'
import * as Pysc from "@/utils/pysc/pyscType"
import { useDataStore } from '@/utils/pysc/useDataStore'
import SensItemRes from '@/views/pages/analysis/sensItemRes.vue'
import 'handsontable/dist/handsontable.full.min.css'

definePage({
  name: 'pysc-sens',
  path: '/pysc-sens',
  meta: {
    title: "Sensitivity",
  },
})

const appStore = useAppStore()
const PyscConf = usePyscConfStore()
const SensStore = usePyscSensStore()
const isLoading = ref(false)
const { getToolTip } = useTooltip()

const { sensConfig } = storeToRefs(SensStore)

const refTableSensCfg = ref()
const refTableSensSummary = ref()

const { t, locale } = useI18n({ useScope: 'global' })

const sensParamMenus = ref([
  {
    id: 1,
    name: "Prices",
    disabled: false,
    child: [
      { id: 101, name: 'Oil', unit: 'USD/BBL', checked: false, disabled: false },
      { id: 102, name: 'Gas', unit: 'USD/MMBTU', checked: false, disabled: false, divider: true },
      { id: 103, name: 'LPG Propane', unit: 'USD/T', checked: false, disabled: false },
      { id: 104, name: 'LPG Butane', unit: 'USD/T', checked: false, disabled: false },
      { id: 105, name: 'CO2', unit: 'MMUSD/Unit', checked: false, disabled: false },
      { id: 106, name: 'Sulfur', unit: 'MMUSD/Unit', checked: false, disabled: false },
      { id: 107, name: 'Electricity', unit: 'MMUSD/Unit', checked: false, disabled: false },
    ],
  },
  {
    id: 2,
    name: "Lifting",
    disabled: false,
    child: [
      { id: 201, name: 'Oil', unit: 'MBOPY', checked: false, disabled: false },
      { id: 202, name: 'Gas', unit: 'BSCF', checked: false, disabled: false, divider: true },
      { id: 203, name: 'LPG Propane', unit: 'MT', checked: false, disabled: false },
      { id: 204, name: 'LPG Butane', unit: 'MT', checked: false, disabled: false },
      { id: 205, name: 'CO2', unit: 'T', checked: false, disabled: false },
      { id: 206, name: 'Sulfur', unit: 'T', checked: false, disabled: false },
      { id: 207, name: 'Electricity', unit: 'Unit', checked: false, disabled: false },
    ],
  },
  {
    id: 3,
    name: "Cost",
    disabled: false,
    child: [
      { id: 301, name: 'OPEX', unit: 'MUSD', checked: false, disabled: false },
      { id: 302, name: 'CAPEX', unit: 'MUSD', checked: false, disabled: false },
    ],
  },
  {
    id: 4,
    name: "Fiscal",
    disabled: false,
    child: [
      { id: 401, name: 'Discount Rate', unit: '%', checked: false, disabled: false },
      { id: 402, name: 'Effective Tax Rate', unit: '%', checked: false, disabled: false },
      { id: 404, name: 'Future Rate', unit: '%', checked: false, disabled: false, divider: true },
      { id: 403, name: 'VAT Rate', unit: '%', checked: false, disabled: false },
      { id: 405, name: 'LBT Rate', unit: '%', checked: false, disabled: false, divider: true },
      { id: 406, name: 'VAT Discount Rate', unit: '%', checked: false, disabled: false },
      { id: 407, name: 'LBT Discount Rate', unit: '%', checked: false, disabled: false },
    ],
  },
  {
    id: 5,
    name: "PSC Cost Recovery",
    disabled: false,
    child: [
      { id: 501, name: 'Oil Ctr. Pre Tax', unit: '%', checked: false, disabled: false },
      { id: 502, name: 'Gas Ctr. Pre Tax', unit: '%', checked: false, disabled: false, divider: true },
      { id: 503, name: 'Oil IC Rate', unit: '%', checked: false, disabled: false },
      { id: 504, name: 'Gas IC Rate', unit: '%', checked: false, disabled: false },
    ],
  },
  {
    id: 6,
    name: "PSC Gross Split",
    disabled: true,
    child: [
      { id: 601, name: 'Ministerial Discretion', unit: '%', checked: false, disabled: false, divider: true },
      { id: 602, name: 'Base Oil Split', unit: '%', checked: false, disabled: false },
      { id: 603, name: 'Base Gas Split', unit: '%', checked: false, disabled: false },
    ],
  },
  {
    id: 7,
    name: "DMO",
    disabled: false,
    child: [
      { id: 701, name: 'DMO - Volume Rate', unit: '%', checked: false, disabled: false },
      { id: 702, name: 'DMO - Fee Rate', unit: '%', checked: false, disabled: false },
    ],
  },
])

const tableSensConfig = computed(() => {
  const Opt = {
    data: [['Oil Price, <small>USD/BBL</small>', null, null, null], ['Opex, <small>MUSD</small>', null, null, null], ['Capex, <small>MUSD</small>', null, null, null], ['Lifting, <small>MUSD</small>', null, null, null]],
    colHeaders: index => {
      if (index == 0)
        return t('Parameter')
      else if (index == 1)
        return t('Min')
      else if (index == 2)
        return t('Base')
      else return t('Max')
    },
    columns: [
      { renderer: 'html' },
      { type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } },
      { type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } },
      { type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } },
    ],
    readOnly: true,
    rowHeaders: false,
    height: 'auto',
    autoWrapRow: false,
    stretchH: 'all',
    manualColumnResize: true,
    autoWrapCol: false,
    AutoRowSize: true,
    autoColumnSize: { allowSampleDuplicates: true, useHeaders: true, samplingRatio: 30 },
    fixedColumnsStart: 1,
    licenseKey: 'non-commercial-and-evaluation',
  }

  const oilProd = PyscConf.getProducer(Pysc.ProducerType.Oil)

  try {
    const oprc = (oilProd ? oilProd.prod_price[0] : [0]).map(v => Pysc.is_number(v.price) ? v.price : 0).filter(v => v > 0)

    Opt.data[0][2] = oprc.length ? math.min(oprc) : 0
  }
  catch (error) {

  }
  try {
    Opt.data[1][2] = PyscConf.dataOpex.length ? math.sum(PyscConf.dataOpex.map(v => Pysc.is_number(v[2]) ? +v[2] : 0)) : 0
  }
  catch (error) {

  }
  try {
    Opt.data[2][2] = PyscConf.dataTan.length ? math.sum(PyscConf.dataTan.map(v => Pysc.is_number(v[2]) ? +v[2] : 0)) : 0
  }
  catch (error) {

  }
  try {
    Opt.data[3][2] = oilProd?.prod_price[0].length ? math.sum(oilProd?.prod_price[0].map(v => Pysc.is_number(v.sales) ? +v.sales : 0)) : 0
  }
  catch (error) {

  }
  if (PyscConf.prodHasGas()) {
    const gasProd = PyscConf.getProducer(Pysc.ProducerType.Gas)

    const arr = (gasProd ? gasProd.prod_price[0] : [0]).map(v => {
      let val = 0
      for (let i = 0; i < gasProd?.GSANumber; i++) {
        if (Pysc.is_number(v.gsa[`price${i + 1}`]) && v.gsa[`price${i + 1}`] > 0) {
          if (val === 0 || +v.gsa[`price${i + 1}`] < val)
            val = +v.gsa[`price${i + 1}`]
        }
      }

      return val
    }).filter(v => v > 0)

    Opt.data.splice(1, 0, ['Gas Price, <small>USD/MMBTU</small>', null, arr.length ? math.min(arr) : 0, null])
    Opt.data[4][2] += (gasProd?.prod_price[0].length ? math.sum(gasProd?.prod_price[0].map(v => Pysc.is_number(v.production) ? +v.production : 0)) : 0)
  }

  return Opt
})

const calcSensPar = () => {
  tableSensConfig.value?.data.forEach(row => {
    try {
      row[1] = (1 - sensConfig.value[0] / 100) * row[2]
      row[3] = (1 + sensConfig.value[1] / 100) * row[2]
    }
    catch (error) {
    }
  })

  // refTableSensCfg.value?.hotInstance.updateSettings(tableSensConfig.value)
}

const DataTable = ref({
  NPV: [],
  IRR: [],
  "P/I": [],
  POT: [],
  "Government Take": [],
  "Contractor Net Share": [],
})

const calcSens = async () => {
  if (isLoading.value)
    return
  isLoading.value = true
  try {
    const SensJson = {
      config: { min: sensConfig.value[0] / 100, max: sensConfig.value[1] / 100 },
      parameter: ["Oil Price", "OPEX", "CAPEX", "Lifting"],
      contract: useDataStore().curCase2Json(),
    }

    if (PyscConf.prodHasGas())
      SensJson.parameter.splice(1, 0, "Gas Price")

    const { status, result } = await useHTTP().put({
      path: 'calc_sens',
      body: {
        type: PyscConf.dataGConf.type_of_contract,
        json: btoa(JSON.stringify(SensJson)),
      },
      onError: (error: any) => { throw error },
    })

    if (status !== 200)
      throw { status, result }

    if (!(isObject(result) && !isEmpty(result)))
      throw "Error Calculation"

    // (NPV, IRR, PI, POT, GOV_TAKE, CTR_NET_SHARE)
    Object.keys(DataTable.value).map((sk, index) => {
      DataTable.value[sk].splice(0, DataTable.value[sk].length, ...result['Oil Price'].map((v, i) => {
        return [v[0], ...SensJson.parameter.map(k => result[k][i][index + 1])]
      }))
    })
  }
  catch (err) {
    appStore.showAlert({
      text: `Error ${(err?.status) ?? ''}: ${(err?.result) ?? 'unknown'}`,
      isalert: true,
    })
  }
  isLoading.value = false
  nextTick(() => {
    refTableSensSummary.value?.hotInstance.updateSettings(tableSensSummary.value)

    const columnSort = refTableSensSummary.value?.hotInstance.getPlugin('columnSorting')

    columnSort?.clearSort()
  })
}

const tableSensSummary = computed(() => {
  const Opt = {
    data: [],
    colHeaders: ['Parameter', 'NPV', 'IRR', 'PI', 'POT', 'Gov. Take', 'Contr. Net Share'],
    columnSorting: {
      headerAction: true,

    },
    columns: [
      { },
      { type: 'numeric', numericFormat: { pattern: { output: 'percent', thousandSeparated: true, mantissa: 2, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } },
      { type: 'numeric', numericFormat: { pattern: { output: 'percent', thousandSeparated: true, mantissa: 2, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } },
      { type: 'numeric', numericFormat: { pattern: { output: 'percent', thousandSeparated: true, mantissa: 2, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } },
      { type: 'numeric', numericFormat: { pattern: { output: 'percent', thousandSeparated: true, mantissa: 2, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } },
      { type: 'numeric', numericFormat: { pattern: { output: 'percent', thousandSeparated: true, mantissa: 2, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } },
      { type: 'numeric', numericFormat: { pattern: { output: 'percent', thousandSeparated: true, mantissa: 2, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } },
    ],
    contextMenu: Pysc.TableContextMenus([{ name: 'copy' }, { name: 'copy_with_column_headers' }]),
    readOnly: true,
    rowHeaders: false,
    height: 'auto',
    autoWrapRow: false,
    stretchH: 'all',
    manualColumnResize: true,
    autoWrapCol: false,
    AutoRowSize: true,
    autoColumnSize: { allowSampleDuplicates: true, useHeaders: true, samplingRatio: 30 },
    fixedColumnsStart: 1,
    licenseKey: 'non-commercial-and-evaluation',
  }

  const data_ = ['Oil Price', 'Opex', 'Capex', 'Lifting']
  if (PyscConf.prodHasGas())
    data_.splice(1, 0, 'Gas Price')

  const resSim = expanseData.value.map(r => {
    const resTbl = JSON.parse(JSON.stringify(DataTable.value[r.name]))

    const resPar = data_.map((p, i) => {
      const values = resTbl.map(r => r[i + 1]).filter(v => Pysc.is_number(v))

      // calc range
      return (values.length ? math.max(values) : 0) - (values.length ? math.min(values) : 0)
    })

    const totRange = resPar.reduce((tot, val, i) => tot + math.abs(val), 0)

    return resPar.map(v => {
      return totRange ? (v / totRange) : 0
    })
  })

  Opt.data.splice(0, Opt.data.length, ...data_.map((par, r) => {
    return [par, ...resSim.map(cat => cat[r])]
  }))

  return Opt
})

const expanseData = ref(Object.keys(DataTable.value).map((v, i) => ({ name: v, value: i, chartIndex: 0 })))

const selectItemParams = (parent, item) => {
  const index = parent.findIndex(v => v.id === item.id)

  parent[index].checked = !parent[index].checked

  // TODO: update selected
}

watchDebounced(sensConfig, () => {
  calcSensPar()
  refTableSensCfg.value?.hotInstance.updateSettings(tableSensConfig.value)
  nextTick(() => calcSens())
}, { deep: true, debounce: 1000, maxWait: 1000 })

const selPanel = ref([0])

const { stopCaseID, CallableFunc } = useDataStore().useWatchCaseID(() => {
  console.log("sens trigger")
  calcSensPar()
  refTableSensCfg.value?.hotInstance.updateSettings(tableSensConfig.value)
  nextTick(() => calcSens())
})

const optOption = [
  { title: 'Copy to clipboard', value: 'copy2clbrd', icon: 'tabler-clipboard', sourceType: 'text' },
  { title: `Save to file (*.xlsx)`, value: 'save2File', icon: 'tabler-download', sourceType: 'table' },
  { type: 'divider' },
  { title: 'Reload', value: 'reload', icon: 'tabler-reload' },
]

const getDataSource = (value: string, sourceType: string) => {
  const tblDataScr = [tableSensSummary.value.colHeaders.map(v => v.replace(/<\/?("[^"]*"|'[^']*'|[^>])*(>|$)/g, " ")), ...refTableSensSummary.value?.hotInstance.getData()]
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
          name: `sens summary`,
          header: [],
          data: tblDataScr,
        }],
        filename: `sens_summary_${appStore.selectedCase.name}_${rndid}`.replace(/[/\\ #$~&.]/g, ''),
      }
    }
  }

  return null
}

const actionOption = (type: string) => {
  if (type === 'reload')
    CallableFunc()
}

watch(locale, val => refTableSensCfg.value?.hotInstance.updateSettings(tableSensConfig.value))
onMounted(() => {
  CallableFunc()
})

onUnmounted(() => {
  stopCaseID()
})
</script>

<template>
  <VCard
    :loading="isLoading ? 'primary' : false"
    :title="$t('Sensitivity')"
    :subtitle="$t('Analysis')"
  >
    <VCardText>
      <AppCardActions
        action-collapsed
        title="Parameter"
        compact-header
      >
        <template #before-actions>
          <IconBtn :disabled="true">
            <VIcon
              icon="tabler-plus"
              color="warning"
            />
            <VMenu
              activator="parent"
              offset="2px"
            >
              <VList density="compact">
                <VListItem
                  v-for="(item, i) in sensParamMenus"
                  :key="`${item.name}_${item.id}`"
                  :value="item.id"
                  density="compact"
                >
                  <VListItemTitle :class="{ 'text-primary': item.child.filter(c => c.checked).length, 'font-weight-bold': item.child.filter(c => c.checked).length }">
                    {{
                      item.name }}
                  </VListItemTitle>
                  <template #append>
                    <VIcon
                      :icon="item.child ? 'tabler-caret-right-filled' : ''"
                      size="small"
                    />
                  </template>
                  <VMenu
                    v-if="item.child"
                    activator="parent"
                    location="start"
                    density="compact"
                    :close-on-content-click="false"
                  >
                    <VList
                      :items="item.child"
                      item-title="name"
                      item-value="id"
                      item-props
                      density="compact"
                    >
                      <template #item="{ props }">
                        <VListItem
                          density="compact"
                          :disabled="props.disabled"
                          @click.prevent="() => selectItemParams(item.child, props)"
                        >
                          <template #title>
                            {{ props.name }}
                          </template>
                          <template #prepend>
                            <VIcon :icon="props.checked ? 'tabler-checks' : ''" />
                          </template>
                        </VListItem>
                        <VDivider v-if="props.divider" />
                      </template>
                    </VList>
                  </VMenu>
                </VListItem>
                <VDivider />
                <VListItem
                  title="Reset Default"
                  @click="() => { }"
                />
              </VList>
            </VMenu>
          </IconBtn>
        </template>
        <VCardText>
          <VRow>
            <VCol
              cols="12"
              md="4"
            >
              <VRow>
                <VCol
                  cols="12"
                  class="ms-4 pe-8"
                >
                  <div class="ml-n4 font-weight-bold text-primary mb-4">
                    {{ $t('Sensitivity Configuration') }}
                  </div>
                  <AppTextField
                    v-model.number="sensConfig[0]"
                    :label-placeholder="$t('Min', ['%'])"
                    variant="outlined"
                    :rules="[requiredValidator, numberValidator, greatestValidator(sensConfig[0], 0, appStore.showAlert)]"
                  />
                </VCol>
                <VCol
                  cols="12"
                  class="ms-4 pe-8"
                >
                  <AppTextField
                    v-model.number="sensConfig[1]"
                    :label-placeholder="$t('Max', ['%'])"
                    variant="outlined"
                    :rules="[requiredValidator, numberValidator, greatestValidator(sensConfig[1], 0, appStore.showAlert)]"
                  />
                </VCol>
              </VRow>
            </VCol>
            <VCol
              cols="12"
              md="8"
            >
              <div class="ml-n4 font-weight-bold text-primary mb-2">
                {{ $t('Sensitivity Parameter') }}
              </div>
              <HotTable
                ref="refTableSensCfg"
                :settings="tableSensConfig"
                class="not_to_dimmed"
                license-key="non-commercial-and-evaluation"
              />
            </VCol>
          </VRow>
        </VCardText>
      </AppCardActions>
      <AppCardActions
        class="mt-4"
        action-collapsed
        :title="$t('Result')"
        compact-header
      >
        <VCardText class="px-2">
          <AppCardActions
            action-collapsed
            title="Summary"
            sub-title="Parameters effect to Economic Indicator"
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

            <VCardText>
              <HotTable
                ref="refTableSensSummary"
                :settings="tableSensSummary"
                class="not_to_dimmed"
                license-key="non-commercial-and-evaluation"
              />
            </VCardText>
          </AppCardActions>
        </VCardText>
        <VCardText class="px-2">
          <VExpansionPanels
            v-model="selPanel"
            multiple
          >
            <VExpansionPanel
              v-for="(item, index) in expanseData"
              :key="`sensres_${item.name}`"
              class="custom-expan-panel"
              item-props
              :value="item.value"
              selected-class="v-list-item--active"
            >
              <VExpansionPanelTitle
                collapse-icon="tabler-chevron-left"
                expand-icon="tabler-chevron-down"
              >
                <template #default="{ expanded }">
                  <span>{{ item.name === 'P/I' ? 'PI' : item.name }}</span>
                </template>
              </VExpansionPanelTitle>
              <SensItemRes
                :data-table="DataTable[item.name]"
                :has-gas="PyscConf.prodHasGas()"
                :item-value="item.value"
                :table-title="item.name === 'P/I' ? 'PI' : item.name"
                :chart-title="item.name === 'P/I' ? 'PI' : item.name"
              />
            </VExpansionPanel>
          </VExpansionPanels>
        </VCardText>
      </AppCardActions>
    </VCardText>
  </VCard>
</template>

<style lang="scss">
.custom-expan-panel > .v-expansion-panel-title--active > .v-expansion-panel-title__overlay,
.v-expansion-panel-title[aria-haspopup="menu"][aria-expanded="true"] > .v-expansion-panel-title__overlay {
  background-color: transparent !important;
}

.not_to_dimmed {
  .handsontable .htDimmed {
    color: inherit !important;
  }
}
</style>

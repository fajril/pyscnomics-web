<script setup lang="ts">
import { useAppStore } from '@/stores/appStore'
import { usePyscConfStore } from '@/stores/genfisStore'
import { usePyscSensStore } from '@/stores/sensStore'
import * as Pysc from "@/utils/pysc/pyscType"
import { useDataStore } from '@/utils/pysc/useDataStore'
import { useHTTP } from '@/utils/pysc/useHttp'
import SplitCollapsible from '@/views/components/splitCollapsible.vue'
import SensResBarChart from '@/views/pages/analysis/sensResBarChart.vue'
import SensResChart from '@/views/pages/analysis/sensResChart.vue'
import SensResTable from '@/views/pages/analysis/sensResTable.vue'
import 'handsontable/dist/handsontable.full.min.css'
import * as math from 'mathjs'

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

const { sensConfig } = storeToRefs(SensStore)

const refTableSensCfg = ref()

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

  Opt.data[0][2] = oilProd?.prod_price[0][oilProd?.prod_price[0].length - 1].price
  Opt.data[1][2] = math.sum(PyscConf.dataOpex.map(v => v[2]))
  Opt.data[2][2] = math.sum(PyscConf.dataTan.map(v => v[2]))
  Opt.data[3][2] = math.sum(oilProd?.prod_price[0].map(v => v.sales))
  if (PyscConf.prodHasGas()) {
    const gasProd = PyscConf.getProducer(Pysc.ProducerType.Gas)

    Opt.data.splice(1, 0, ['Gas Price, <small>USD/MMBTU</small>', null, gasProd.prod_price[0][gasProd?.prod_price[0].length - 1].price, null])
    Opt.data[4][2] += math.sum(gasProd?.prod_price[0].map(v => v.production))
  }

  return Opt
})

const calcSensPar = () => {
  tableSensConfig.value?.data.forEach(row => {
    row[1] = (1 - sensConfig.value[0] / 100) * row[2]
    row[3] = (1 + sensConfig.value[1] / 100) * row[2]
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
      throw [status, result]
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
}

const currentTab = ref(0)
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
              <VExpansionPanelText>
                <SplitCollapsible>
                  <template #left="{ collapsible }">
                    <SensResTable
                      :has-gas="PyscConf.prodHasGas()"
                      :data-table="DataTable[item.name]"
                    />
                  </template>
                  <template #right="{ collapsible }">
                    <VTabs v-model="item.chartIndex">
                      <VTab value="0">
                        {{ $t('Spider') }}
                      </VTab>
                      <VTab value="1">
                        {{ $t('Tornado') }}
                      </VTab>
                    </VTabs>
                    <VWindow v-model="item.chartIndex">
                      <VWindowItem value="0">
                        <SensResChart
                          class="mt-1"
                          :has-gas="PyscConf.prodHasGas()"
                          :data-chart="DataTable[item.name]"
                          :title="item.name"
                          :unit="item.value === 1 ? '%' : (item.value === 3 ? 'Year' : (item.value != 2 ? 'MUSD' : ''))"
                        />
                      </VWindowItem>
                      <VWindowItem
                        value="1"
                        style="overflow: visible !important;"
                      >
                        <SensResBarChart
                          :data-chart="DataTable[item.name]"
                          :title="item.name"
                          :category="['Oil Price', 'Opex', 'Capex', 'Lifting']"
                        />
                      </VWindowItem>
                    </VWindow>
                  </template>
                </SplitCollapsible>
              </VExpansionPanelText>
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

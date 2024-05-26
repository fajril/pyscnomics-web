<script setup lang="ts">
import { useAppStore } from '@/stores/appStore';
import { usePyscConfStore } from '@/stores/genfisStore';
import { usePyscSensStore } from '@/stores/sensStore';
import * as Pysc from "@/utils/pysc/pyscType";
import { useDataStore } from '@/utils/pysc/useDataStore';
import SensResChart from '@/views/pages/analysis/sensResChart.vue';
import SensResTable from '@/views/pages/analysis/sensResTable.vue';
import 'handsontable/dist/handsontable.full.min.css';
import * as math from 'mathjs';

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


const tableSensConfig = computed(() => {
  const Opt = {
    data: [['Oil Price, <small>USD/BBL</small>', null, null, null], ['Opex, <small>MUSD</small>', null, null, null], ['Capex, <small>MUSD</small>', null, null, null], ['Lifting, <small>MUSD</small>', null, null, null]],
    colHeaders: (index) => {
      if (index == 0) return t('Parameter')
      else if (index == 1) return t('Min')
      else if (index == 2) return t('Base')
      else return t('Max')
    },
    columns: [
      { renderer: 'html' },
      { type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 3, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } },
      { type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 3, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } },
      { type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 3, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } },
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
    licenseKey: 'non-commercial-and-evaluation'
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
  "Contractor Net Share": []
})

const calcSens = async () => {
  if (isLoading.value) return
  isLoading.value = true
  try {
    const SensJson = {
      config: { min: sensConfig.value[0] / 100, max: sensConfig.value[1] / 100 },
      parameter: ["Oil Price", "OPEX", "CAPEX", "Lifting"],
      contract: PyscConf.makeJSON(appStore.curSelCase)
    }
    if (PyscConf.prodHasGas())
      SensJson.parameter.splice(1, 0, "Gas Price")
    const result = await $api('auth/calc_sens', {
      params: {
        type: PyscConf.dataGConf.type_of_contract,
        data: btoa(JSON.stringify(SensJson))
      },
      method: 'GET',
      onResponseError({ response }) {
        throw [response.status, response._data.detail]
      },
    })
    if (!(isObject(result) && !isEmpty(result))) throw "Error Calculation"

    //(NPV, IRR, PI, POT, GOV_TAKE, CTR_NET_SHARE)
    Object.keys(DataTable.value).map((sk, index) => {
      DataTable.value[sk].splice(0, DataTable.value[sk].length, ...result['Oil Price'].map((v, i) => {
        return [v[0], ...SensJson.parameter.map(k => result[k][i][index + 1])]
      }))
    })
  }
  catch (error) {
    appStore.showAlert({
      text: `Error ${Array.isArray(error) ? error[0] : ''}: ${Array.isArray(error) ? error[1] : error}`,
      isalert: true
    })
  }
  isLoading.value = false

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
  <VCard :loading="isLoading" :title="$t('Sensitivity')" :subtitle="$t('Analysis')">
    <VCardText>
      <AppCardActions action-collapsed title="Parameter" compact-header>
        <VCardText>
          <VRow>
            <VCol cols="12" md="4">
              <VRow>
                <VCol cols="12" class="ms-4 pe-8">
                  <div class="ml-n4 font-weight-bold text-primary mb-4">{{ $t('Sensitivity Configuration') }}</div>
                  <AppTextField v-model.number="sensConfig[0]" :label-placeholder="$t('Min', ['%'])" variant="outlined"
                    :rules="[requiredValidator, numberValidator]" />
                </VCol>
                <VCol cols="12" class="ms-4 pe-8">
                  <AppTextField v-model.number="sensConfig[1]" :label-placeholder="$t('Max', ['%'])" variant="outlined"
                    :rules="[requiredValidator, numberValidator]" />
                </VCol>
              </VRow>
            </VCol>
            <VCol cols="12" md="8">
              <div class="ml-n4 font-weight-bold text-primary mb-2">{{ $t('Sensitivity Parameter') }}</div>
              <hot-table ref="refTableSensCfg" :settings="tableSensConfig" class="not_to_dimmed" />
            </VCol>
          </VRow>
        </VCardText>
      </AppCardActions>
      <AppCardActions class="mt-4" action-collapsed :title="$t('Result')" compact-header>
        <VCardText class="px-2">
          <VExpansionPanels multiple v-model="selPanel">
            <VExpansionPanel class="custom-expan-panel"
              v-for="(item, index) in Object.keys(DataTable).map((v, i) => ({ name: v, value: i }))"
              :key="`sensres_${item.name}`" :value="item.value" selected-class="v-list-item--active">
              <v-expansion-panel-title collapse-icon="tabler-chevron-left" expand-icon="tabler-chevron-down">
                <template v-slot:default="{ expanded }">
                  <span>{{ item.name }}</span>
                </template>
              </v-expansion-panel-title>
              <VExpansionPanelText>
                <VRow>
                  <VCol cols="12" md="6">
                    <SensResTable :has-gas="PyscConf.prodHasGas()" :data-table="DataTable[item.name]" />
                  </VCol>
                  <VCol cols="12" md="6">
                    <SensResChart :has-gas="PyscConf.prodHasGas()" :data-chart="DataTable[item.name]" :title="item.name"
                      :unit="item.value === 1 ? '%' : (item.value === 3 ? 'Year' : (item.value != 2 ? 'MUSD' : ''))" />
                  </VCol>
                </VRow>
              </VExpansionPanelText>
            </VExpansionPanel>
          </VExpansionPanels>
        </VCardText>
      </AppCardActions>
    </VCardText>
  </VCard>
</template>

<style lang="scss">
.custom-expan-panel>.v-expansion-panel-title--active>.v-expansion-panel-title__overlay,
.v-expansion-panel-title[aria-haspopup="menu"][aria-expanded="true"]>.v-expansion-panel-title__overlay {
  background-color: transparent !important;
}

.not_to_dimmed {
  .handsontable .htDimmed {
    color: inherit !important
  }
}
</style>

<script setup lang="ts">
import { useAppStore } from '@/stores/appStore'
import { usePyscConfStore } from '@/stores/genfisStore'
import { MonteDistType, usePyscMonteStore } from '@/stores/monteStore'
import { useWSStore } from '@/stores/wsStore'
import * as Pysc from "@/utils/pysc/pyscType"
import { useDataStore } from '@/utils/pysc/useDataStore'
import MonteResChart from '@/views/pages/analysis/monteResChart.vue'
import MonteResTable from '@/views/pages/analysis/monteResTable.vue'
import 'handsontable/dist/handsontable.full.min.css'
import HyperFormula from 'hyperformula'
import * as math from 'mathjs'

definePage({
  name: 'pysc-monte',
  path: '/pysc-monte',
  meta: {
    title: "Uncertainity",
  },
})

const appStore = useAppStore()
const PyscConf = usePyscConfStore()
const MonteStore = usePyscMonteStore()
const wsStore = useWSStore()
const isLoading = ref(false)
const isLoadingRes = ref(false)
const isValid = ref(false)
const cardParams = ref()
const cardResult = ref()
const { monteConfig: monteCfg } = storeToRefs(MonteStore)
const numbro = Pysc.useNumbro()

// const { top, left, width, height } = useElementBounding(cardParams)

const dataTable = ref(JSON.parse(JSON.stringify(monteCfg.value.params.map(v => {
  return {
    id: v.id,
    name: v.id === 0 ? 'Oil Price, <small>USD/BBL</small>' : (v.id === 1 ? 'Gas Price, <small>USD/MMBTU</small>' : (v.id === 2 ? 'Opex, <small>MUSD</small>' : (v.id === 3 ? 'Capex, <small>MUSD</small>' : 'Cum. Prod, <small>MBOPY</small>'))),
    dist: Object.values(MonteDistType)[v.dist],
    min: v.min,
    base: v.base,
    max: v.max,
    stddev: v.stddev,
  }
}))))

const watcherMonteCfg = pausableWatch(dataTable,
  (value, oldValue) => {
    isValid.value = ValidateData()
    if (appStore.watcherSelCase.isActive) {
      // save monte params
      const itsWatchActive = MonteStore.watcherMonteCfg.isActive
      if (itsWatchActive)
        MonteStore.watcherMonteCfg.pause()
      MonteStore.$patch(state => {
        state.monteConfig.params.splice(0, state.monteConfig.params.length, ...dataTable.value.map((v, index) => {
          const distIndex = Object.values(MonteDistType).indexOf(v.dist)

          return {
            id: v.id,
            dist: distIndex !== -1 ? distIndex : 2,
            min: v.min,
            max: v.max,
            base: null,
            stddev: v.stddev,
          }
        }))
      })
      if (itsWatchActive) {
        nextTick(() => MonteStore.watcherMonteCfg.resume())
        appStore.dataChanges()
      }
    }
  }, { deep: true })

const FillDataTable = () => {
  const oilProd = PyscConf.getProducer(Pysc.ProducerType.Oil)
  const idxGas = monteCfg.value.params.findIndex(v => v.id === 1)

  dataTable.value.splice(0, dataTable.value.length, ...monteCfg.value.params.map(v => {
    return {
      id: v.id,
      name: v.id === 0 ? 'Oil Price, <small>USD/BBL</small>' : (v.id === 1 ? 'Gas Price, <small>USD/MMBTU</small>' : (v.id === 2 ? 'Opex, <small>MUSD</small>' : (v.id === 3 ? 'Capex, <small>MUSD</small>' : 'Cum. Prod, <small>MBOPY</small>'))),
      dist: Object.values(MonteDistType)[v.dist],
      min: v.min,
      base: v.base,
      max: v.max,
      stddev: v.stddev,
    }
  }))
  if (PyscConf.prodHasGas() && idxGas === -1)
    dataTable.value.splice(1, 0, { id: 1, name: 'Gas Price, <small>USD/MMBTU</small>', dist: 'Normal', min: null, max: null, base: null, stddev: 1.25 })
  else if (!PyscConf.prodHasGas() && idxGas != -1)
    dataTable.value.splice(idxGas, idxGas)

  dataTable.value.forEach(el => {
    if (el.id === 0) { el.base = (oilProd?.prod_price[0][oilProd?.prod_price[0].length - 1].price) ?? 65 }
    else if (el.id === 1 && PyscConf.prodHasGas()) {
      const gasProd = PyscConf.getProducer(Pysc.ProducerType.Gas)

      el.base = (gasProd?.prod_price[0][gasProd?.prod_price[0].length - 1].price) ?? 4.5
    }
    else if (el.id === 2) { el.base = math.sum(PyscConf.dataOpex.map(v => v[2])) }
    else if (el.id === 3) { el.base = math.sum(PyscConf.dataTan.map(v => v[2])) }
    else if (el.id === 4) { el.base = math.sum(oilProd?.prod_price[0].map(v => v.sales)) ?? 0 }

    if (el.base) {
      if (el.min === null || el.min === undefined || el.min >= el.base)
        el.min = 0.7 * el.base
      if (el.max === null || el.max === undefined || el.max >= el.base)
        el.max = 1.3 * el.base
    }
  })
}

const refTableMonteCfg = ref()
const refTableMonteRes = ref()

const headerMonteRes = [
  { title: "Target", key: "target", align: 'start' },
  { title: 'P10', key: "p10", align: 'end', value: item => item.p10 ? (numbro(item.p10 * (item.key === 'IRR' ? 100 : 1)).format()) : item.p10 },
  { title: 'P50', key: "p50", align: 'end', value: item => item.p50 ? (numbro(item.p50 * (item.key === 'IRR' ? 100 : 1)).format()) : item.p50 },
  { title: 'P90', key: "p90", align: 'end', value: item => item.p90 ? (numbro(item.p90 * (item.key === 'IRR' ? 100 : 1)).format()) : item.p90 },
]

const { height } = useElementSize(refTableMonteCfg)

const lastHeight = ref(0)

const calcTableHeight = () => {
  const el = document.querySelector(".handsontable.htColumnHeaders")
  if (lastHeight.value === 0)
    lastHeight.value = el.clientHeight
  tableMonteConfig.value.height = `${lastHeight.value + 200}px`
  el.style.height = `${lastHeight.value + 200}px`
}

const stopHandle = watch(height, val => {
  stopHandle()
  calcTableHeight()
}, { once: true })

const tableMonteConfig = computed(() => {
  return {
    data: dataTable.value,
    colHeaders: ['Parameter', 'Distribution', 'Min', 'Base', 'Max', 'Std.Dev'],
    columns: [
      { data: 'name', renderer: 'html', readOnly: true },
      { data: 'dist', type: 'dropdown', source: Object.values(MonteDistType), visibleRows: 15, strict: true, trimDropdown: true },
      { data: 'min', type: 'numeric', validator: 'numeric', allowInvalid: false, numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } },
      { data: 'base', type: 'numeric', readOnly: true, numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } },
      { data: 'max', type: 'numeric', validator: 'numeric', allowInvalid: false, numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } },
      { data: 'stddev', type: 'numeric', validator: 'numeric', allowInvalid: false, numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } },
    ],
    cell: [
      { col: 0, row: 0, className: 'not_to_dimmed' },
      { col: 0, row: 1, className: 'not_to_dimmed' },
      { col: 0, row: 2, className: 'not_to_dimmed' },
      { col: 0, row: 3, className: 'not_to_dimmed' },
      { col: 0, row: 4, className: 'not_to_dimmed' },
    ],
    afterValidate(isValid, value, row, prop) {
      if (!isValid) {
        appStore.showAlert({
          text: `"${value}" Is invalid value`,
          isalert: true,
        })
      }
      else {
        const iCol = tableMonteConfig.value.columns.findIndex(c => c.data === prop)
        const ctype = refTableMonteCfg.value.hotInstance.getDataType(row, iCol, row, iCol)

        nextTick(() => {
          if (ctype === 'numeric' && (typeof dataTable.value[row][prop] === 'string')
            && dataTable.value[row][prop].includes('=')) {
            dataTable.value[row][prop] = value
            refTableMonteCfg.value.hotInstance.updateData(dataTable.value)
          }
        })
      }

      return isValid
    },
    formulas: {
      engine: HyperFormula,
    },
    rowHeaders: false,
    height: lastHeight.value ? `${lastHeight.value + 200}px` : 'auto',
    autoWrapRow: false,
    stretchH: 'all',
    manualColumnResize: true,
    autoWrapCol: false,
    AutoRowSize: true,
    autoColumnSize: { allowSampleDuplicates: true, useHeaders: true, samplingRatio: 30 },
    fixedColumnsStart: 1,
    licenseKey: 'non-commercial-and-evaluation',
  }
})

function ValidateData() {
  let valid = true
  dataTable.value.forEach(el => {
    if (math.isNaN(+el.min) || el.min === null || el.min >= el.base
      || math.isNaN(+el.max) || el.max === null || el.max <= el.base || math.isNaN(+el.stddev) || el.stddev === null
      || !(typeof el.dist === 'string' && Object.values(MonteDistType).map(e => e.toLowerCase()).includes(el.dist.toLowerCase())))
      valid = false
  })

  return valid
}

const selPanel = ref([0])

const ResultParams = ref(['Oil Price', 'Opex', 'Capex', 'Cum. prod.'])

const ResultTable = ref({
  NPV: [],
  IRR: [],
  "P/I": [],
  POT: [],
  "Government Take": [],
  "Contractor Net Share": [],
})

const MonteResSumm = ref([])

const curCaseID = ref()
const progress = ref(0)

// const fetchProgress = async () => {
//   const { status, result } = await useHTTP().get({
//     path: 'get_monte_state',
//     params: {
//       id: curCaseID.value,
//     },
//     onError: (error: any) => { throw error },
//   })

//   console.log(result)

//   if (status !== 200)
//     throw [status, result]

//   return result
// }

// const { pause: stopProgress, resume: startProgress, isActive: isOnProgress } = useIntervalFn(async () => {
//   try {
//     const result = await fetchProgress()
//     if (result.progress >= 0) {
//       progress.value = result.progress
//       if (!MonteStore.IsOnCalc)
//         MonteStore.$patch({ IsOnCalc: true })
//     }
//     else {
//       if (isOnProgress.value)
//         stopProgress()
//       MonteStore.$patch({ IsOnCalc: false })
//     }
//   }
//   catch (error) {
//     progress.value = 0
//     if (MonteStore.IsOnCalc)
//       MonteStore.$patch({ IsOnCalc: false })
//   }
// }, 1000, { immediate: false })

const addBroadCast = async () => {
  if (appStore.curSelCase) {
    wsStore.addBroadCast('monte', appStore.curSelCase, (msg: any) => {
      if (msg.id === curCaseID.value) {
        if (msg.data.progress === -1) {
          // done
          MonteStore.$patch({ IsOnCalc: false })
          nextTick(() => {
            appStore.$patch(state => state.projects[appStore.IndexCase].state = 1)
            LoadResult(msg.data.output, true)
          })
        }
        else {
          progress.value = msg.data.progress
          if (!MonteStore.IsOnCalc)
            MonteStore.$patch({ IsOnCalc: true })
        }
      }
    })
    curCaseID.value = appStore.curSelCase
  }
}

function Calc() {
  progress.value = 0
  if (ValidateData()) {
    MonteStore.MonteCalc(curCaseID.value, dataTable.value)
  }
  else {
    appStore.showAlert({
      text: "Invalid data entries",
      isalert: true,
    })
  }
}

const LoadResult = async (hashID: string | null = null, _showAlert: boolean = false) => {
  isLoadingRes.value = true

  const resMonte = await MonteStore.LoadResult(appStore.curSelCase, hashID, _showAlert)
  if (resMonte.res) {
    ResultParams.value.splice(0, ResultParams.value.length, ...resMonte.res.params)
    Object.keys(ResultTable.value).forEach((key, index) => {
      ResultTable.value[key].splice(0, ResultTable.value[key].length, ...resMonte.res.results.map(el => [el[0], el[index + 1], ...el.slice(-(el.length - 6 - 1))]))
    })
    MonteResSumm.value.splice(0, MonteResSumm.value.length, ...Object.keys(ResultTable.value).map((key, index) => {
      return {
        target: key + (key === 'IRR' ? ", %" : (key === 'P/I' ? "" : (key === "POT" ? ", Year" : ", MUSD"))),
        key,
        p10: resMonte.res.P10[index + 1],
        p50: resMonte.res.P50[index + 1],
        p90: resMonte.res.P90[index + 1],
      }
    }),
    )
  }
  else {
    if (PyscConf.prodHasGas())
      ResultParams.value.splice(0, ResultParams.value.length, ...['Oil Price', 'Gas Price', 'Opex', 'Capex', 'Cum. prod.'])
    else
      ResultParams.value.splice(0, ResultParams.value.length, ...['Oil Price', 'Opex', 'Capex', 'Cum. prod.'])
    MonteResSumm.value = []
    ResultTable.value = {
      NPV: [],
      IRR: [],
      "P/I": [],
      POT: [],
      "Government Take": [],
      "Contractor Net Share": [],
    }
  }
  isLoadingRes.value = false
}

const { stopCaseID, CallableFunc } = useDataStore().useWatchCaseID(() => {
  console.log("monte trigger")
  if (curCaseID.value) {
    wsStore.removeBroadCast('monte', curCaseID.value)
    MonteStore.$patch({
      IsOnCalc: false,
    })
  }

  watcherMonteCfg.pause()
  FillDataTable()
  nextTick(() => watcherMonteCfg.resume())

  refTableMonteCfg.value?.hotInstance.updateSettings(tableMonteConfig.value)
  nextTick(async () => {
    isValid.value = ValidateData()
    await addBroadCast()
    nextTick(() => LoadResult())
    calcTableHeight()
  })
})

onMounted(() => {
  watcherMonteCfg.pause()
  CallableFunc()
  watcherMonteCfg.resume()
})

onUnmounted(() => {
  watcherMonteCfg.stop()
  stopCaseID()
  if (curCaseID.value)
    wsStore.removeBroadCast('monte', curCaseID.value)
})
</script>

<template>
  <VCard
    :loading="isLoading ? 'primary' : false"
    :title="$t('Uncertainty')"
    :subtitle="$t('Analysis')"
  >
    <VCardText
      v-if="MonteStore.IsOnCalc"
      class="py-0"
    >
      <VProgressLinear
        indeterminate
        striped
        color="rgba(var(--v-theme-success), 0.6)"
        height="5"
        bg-color="background"
      />
    </VCardText>
    <VCardText>
      <AppCardActions
        ref="cardParams"
        action-collapsed
        :title="$t('Parameter')"
        compact-header
        :disabled="MonteStore.IsOnCalc"
        style="z-index: 100; overflow: visible !important;"
      >
        <VCardText>
          <VRow>
            <VCol
              cols="12"
              class="d-flex align-center justify-content-start"
            >
              <AppTextField
                v-model.number="monteCfg.numsim"
                :label-placeholder="$t('Number of simulation')"
                variant="outlined"
                style="max-inline-size: 200px;"
                :rules="[requiredValidator, numberValidator]"
              />
              <VBtn
                class="ms-4"
                :disabled="!isValid"
                @click.prevent="Calc"
              >
                {{ $t('Run') }}
              </VBtn>
            </VCol>
            <VCol cols="12">
              <HotTable
                ref="refTableMonteCfg"
                class="lockTableHeight"
                :settings="tableMonteConfig"
                license-key="non-commercial-and-evaluation"
              />
            </VCol>
          </VRow>
        </VCardText>
      </AppCardActions>
    </VCardText>
    <VCardText>
      <AppCardActions
        ref="cardResult"
        action-collapsed
        :title="$t('Result')"
        compact-header
        :loading="isLoadingRes"
      >
        <VCardText>
          <VDataTableVirtual
            ref="refTableMonteRes"
            :headers="headerMonteRes"
            :items="MonteResSumm"
            item-value="id"
            density="compact"
            class="mb-6"
            no-data-text="No result found"
          />
        </VCardText>
        <VCardText class="px-2">
          <VExpansionPanels
            v-model="selPanel"
            multiple
          >
            <VExpansionPanel
              v-for="(item, index) in Object.keys(ResultTable).map((v, i) => ({ name: v, value: i }))"
              :key="`monteres_${item.name}`"
              class="custom-expan-monte-panel"
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
                <VRow>
                  <VCol
                    cols="12"
                    md="5"
                  >
                    <MonteResTable
                      :has-gas="PyscConf.prodHasGas()"
                      :data-table="ResultTable[item.name]"
                      :header="item.name"
                      :parameter="ResultParams"
                    />
                  </VCol>
                  <VCol
                    cols="12"
                    md="7"
                  >
                    <MonteResChart
                      :has-gas="PyscConf.prodHasGas()"
                      :data-chart="ResultTable[item.name]"
                      :title="item.name"
                      :unit="item.value === 1 ? '%' : (item.value === 3 ? 'Year' : (item.value != 2 ? 'MUSD' : ''))"
                    />
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

<style lang="scss" scoped>
.lockTableHeight {
  margin-block-end: -198px;
}
</style>

<style lang="scss">
.custom-expan-monte-panel > .v-expansion-panel-title--active > .v-expansion-panel-title__overlay,
.v-expansion-panel-title[aria-haspopup="menu"][aria-expanded="true"] > .v-expansion-panel-title__overlay {
  background-color: transparent !important;
}

td.not_to_dimmed {
  color: inherit !important;
}

.not_to_dimmed {
  .handsontable .htDimmed {
    color: inherit !important;
  }
}
</style>

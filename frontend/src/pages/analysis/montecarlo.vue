<script setup lang="ts">
import { useAppStore } from '@/stores/appStore'
import { useWSStore } from '@/stores/wsStore'
import * as math from 'mathjs'
import HyperFormula from 'hyperformula'
import DotdotOpt from '../components/dotdotOpt.vue'
import { usePyscConfStore } from '@/stores/genfisStore'
import { MonteDistType, usePyscMonteStore } from '@/stores/monteStore'
import * as Pysc from "@/utils/pysc/pyscType"
import { useDataStore } from '@/utils/pysc/useDataStore'
import MonteItemRes from '@/views/pages/analysis/monteItemRes.vue'
import 'handsontable/dist/handsontable.full.min.css'

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
const isStartCalc = ref(false)
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
  else if (!PyscConf.prodHasGas() && idxGas !== -1)
    dataTable.value.splice(idxGas, idxGas)

  const dataOpex = PyscConf.dataOpex.filter(r => Pysc.is_number(r.fixed_cost)).map(v => v.fixed_cost)
  const dataTan = PyscConf.dataTan.filter(r => Pysc.is_number(r.cost)).map(v => v.cost)
  const dataOil = oilProd ? oilProd.prod_price[0].filter(r => Pysc.is_number(r.sales)).map(v => v.sales) : []

  // console.log(dataTan)
  // console.log(dataOpex)

  dataTable.value.forEach(el => {
    if (el.id === 0) {
      el.base = (oilProd?.prod_price[0][oilProd?.prod_price[0].length - 1].price) ?? 65
    }
    else if (el.id === 1 && PyscConf.prodHasGas()) {
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

      const basePrc = math.min(arr)

      el.base = basePrc > 0 ? basePrc : 4.5
    }
    else if (el.id === 2) {
      el.base = dataOpex.length ? math.sum(dataOpex) : 0
    }
    else if (el.id === 3) {
      el.base = dataTan.length ? math.sum(dataTan) : 0
    }
    else if (el.id === 4) {
      el.base = dataOil?.length ? math.sum(dataOil) : 0
    }

    if (el.base) {
      if (!Pysc.is_number(el.min) || +el.min >= el.base)
        el.min = 0.7 * el.base
      if (!Pysc.is_number(el.max === null) || el.max <= el.base)
        el.max = 1.3 * el.base
    }
  })

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
}

const refTableMonteCfg = ref()
const refTableMonteRes = ref()

const headerMonteRes = [
  { title: "Target", key: "target", align: 'start' },
  { title: 'P90', key: "p90", align: 'end', value: item => item.p90 ? (numbro(item.p90 * (item.key === 'IRR' ? 100 : 1)).format()) : item.p90 },
  { title: 'P50', key: "p50", align: 'end', value: item => item.p50 ? (numbro(item.p50 * (item.key === 'IRR' ? 100 : 1)).format()) : item.p50 },
  { title: 'P10', key: "p10", align: 'end', value: item => item.p10 ? (numbro(item.p10 * (item.key === 'IRR' ? 100 : 1)).format()) : item.p10 },
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

      { data: 'dist', type: 'select', selectOptions: Object.values(MonteDistType), strict: true },
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
          try {
            if (ctype === 'numeric' && (typeof dataTable.value[row][prop] === 'string')
              && dataTable.value[row][prop].includes('=')) {
              dataTable.value[row][prop] = +(+value).toPrecision(15)
              refTableMonteCfg.value.hotInstance.updateData(dataTable.value)
            }
          }
          catch (error) {

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
    if (math.isNaN(+el.min) || el.min === null || (el.min > el.base && el.base !== 0)
      || math.isNaN(+el.max) || el.max === null || (el.max < el.base && el.base !== 0)
      || (el.min > el.max) || math.isNaN(+el.stddev) || el.stddev === null
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

const addBroadCast = async () => {
  if (appStore.curSelCase) {
    wsStore.addBroadCast('module:monteCalc', appStore.curSelCase, msg => {
      const { type, caseID, data } = msg.data
      if (caseID === curCaseID.value) {
        const { progress: recvProgress, path, status } = data
        if (type === 'monteCalc:progress') {
          isStartCalc.value = false
          if (recvProgress === -1) {
            progress.value = 100
            nextTick(() => {
              MonteStore.$patch({ IsOnCalc: false })
              appStore.$patch(state => {
                state.projects[appStore.IndexCase].state = 1
              })
              LoadResult(path, true)
            })
          }
          else {
            MonteStore.$patch({ IsOnCalc: recvProgress !== -500 })
            if (recvProgress === -500)
              appStore.showAlert({ text: 'Error calc montecarlo', isalert: true })
            else progress.value = recvProgress
          }
        }
        else if (type === 'monteCalc:status' && !status) {
          isStartCalc.value = false
          MonteStore.$patch({ IsOnCalc: false })
        }
      }
    })

    curCaseID.value = appStore.curSelCase
  }
}

function Calc() {
  progress.value = 0
  if (ValidateData()) {
    const _numsim = monteCfg.value.numsim

    isStartCalc.value = true
    MonteStore.MonteCalc(curCaseID.value, dataTable.value).then(result => {
      if (result !== false) {
        wsStore.wseSend(btoa(JSON.stringify({
          module: 'module:monteCalc',
          id: wsStore.clientIDE,
          data: { path: result, caseID: curCaseID.value, numSim: _numsim },
        })), false)
      }
      else {
        isStartCalc.value = false
        MonteStore.$patch({ IsOnCalc: false })
      }
    })
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
        p90: resMonte.res.P10[index + 1],
        p50: resMonte.res.P50[index + 1],
        p10: resMonte.res.P90[index + 1],
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
    wsStore.removeBroadCast('module:monteCalc', curCaseID.value)
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

const optOption = [
  { title: 'Copy to clipboard', value: 'copy2clbrd', icon: 'tabler-clipboard', sourceType: 'text' },
  { title: `Save to file (*.xlsx)`, value: 'save2File', icon: 'tabler-download', sourceType: 'table' },
  { type: 'divider' },
  { title: 'Reload', value: 'reload', icon: 'tabler-reload' },
]

const getDataSource = (value: string, sourceType: string) => {
  const tblDataScr = [['Target', 'P90', 'P50', 'P10'], ...MonteResSumm.value.map(o => {
    return [o.target, o.p90, o.p50, o.p10]
  })]

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
          name: `montecarlo summary`,
          header: [],
          data: tblDataScr,
        }],
        filename: `monte_summary_${appStore.selectedCase.name}_${rndid}`.replace(/[/\\ #$~&.]/g, ''),
      }
    }
  }

  return null
}

const actionOption = (type: string) => {
  if (type === 'reload')
    CallableFunc()
}

onMounted(() => {
  watcherMonteCfg.pause()
  CallableFunc()
  watcherMonteCfg.resume()
})

onUnmounted(() => {
  watcherMonteCfg.stop()
  stopCaseID()
  if (curCaseID.value)
    wsStore.removeBroadCast('module:monteCalc', curCaseID.value)
})
</script>

<template>
  <VCard
    :loading="isLoading ? 'primary' : false"
    :title="$t('Uncertainty')"
    :subtitle="$t('Analysis')"
  >
    <VCardText
      v-if="MonteStore.IsOnCalc || isStartCalc"
      class="py-0"
    >
      <VProgressLinear
        v-model="progress"
        :indeterminate="isStartCalc"
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
        :disabled="MonteStore.IsOnCalc || isStartCalc"
        style="z-index: 100; overflow: visible !important;"
      >
        <VCardText class="mt-5">
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
        :title="$t('Result')"
        :loading="isLoadingRes"
        action-collapsed
        :style="{ zIndex: 100 }"
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
        <VCardText class="mt-5">
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
              <MonteItemRes
                :data-table="ResultTable[item.name]"
                :has-gas="PyscConf.prodHasGas()"
                :title="item.name"
                :result-param="ResultParams"
                :item-value="item.value"
              />
              <!--
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
              -->
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

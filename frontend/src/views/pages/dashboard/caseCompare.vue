<script setup lang="ts">
import { useAppStore } from "@/stores/appStore"
import { useHTTP } from "@/utils/pysc/useHttp"
import { breakpointsVuetifyV3 } from '@vueuse/core'
import * as math from 'mathjs'
import { usePyscConfStore } from '@/stores/genfisStore'
import { usePyscMonteStore } from '@/stores/monteStore'
import { usePyscOptimStore } from '@/stores/optimStore'
import { usePyscSensStore } from '@/stores/sensStore'
import * as Pysc from "@/utils/pysc/pyscType"
import { useDataStore } from '@/utils/pysc/useDataStore'
import BarChartCompare from '@/views/components/chartBarCompare.vue'
import ChartCompare from '@/views/components/chartCompare.vue'
import ColCollapsible from '@/views/components/colCollapsible.vue'
import TableCompare from '@/views/components/tableCompare.vue'
import 'handsontable/dist/handsontable.full.css'

interface Emit {
  (e: 'compareDlgDone'): void
}

const emit = defineEmits<Emit>()

const isLessThanCardBreaklg = computed(() => useMediaQuery(`(max-width: ${breakpointsVuetifyV3.lg}px)`).value)
const isLessThanCardBreakxl = computed(() => useMediaQuery(`(max-width: ${breakpointsVuetifyV3.xl}px)`).value)

const appStore = useAppStore()
const PyscConf = usePyscConfStore()
const PyscSens = usePyscSensStore()
const PyscMonte = usePyscMonteStore()
const PyscOptim = usePyscOptimStore()
const numbro = Pysc.useNumbro()
const tableCollapsed = ref(false)

const CompareConf = ref<Pysc.tCompareType>({ source: appStore.curSelCase, comp: [] })

// const selCase = toRef(CompareConf.value, 'comp')

const isCompareVisible = ref(false)

// const sourceCase = ref()
// const selCase = ref([])
const TableCompareRef = ref()
const dataTableCompare = ref([])
const dataChartCompare = ref([])
const dataBarChartBase = ref({ name: 'Base', value: [] })
const dataBarChartCompare = ref([])
const isCalcData = ref(false)

const targetCases = computed(() => {
  if (!isEmpty(CompareConf.value.source))
    return appStore.projects.filter(f => f.type > 0 && f.id !== CompareConf.value.source).map(v => ({ name: v.name, value: v.id, desc: v.description, tipe: v.type }))

  return []
})

const closeChips = (caseID: number) => {
  const index = CompareConf.value.comp.findIndex(e => e === caseID)

  CompareConf.value.comp.splice(index, 1)
}

// const loadData = async (urlpath: string, id: number, costmode: number | undefined = undefined) => {
//   let resInit = await execPartData(urlpath, 'GET', costmode != undefined ? { wspath: appStore.curWS, mode: costmode, caseid: id } : { wspath: appStore.curWS, caseid: id })
//   if (resInit.state !== true) throw `error ${urlpath}`
//   return JSON.parse(JSON.stringify(resInit.data))
// }

const calcData = async () => {
  const CompOut = []
  let dataLoaded = false
  dataBarChartCompare.value.splice(0, dataBarChartCompare.value.length, ...[])
  dataBarChartBase.value.value.splice(0, dataBarChartBase.value.value.length, ...[])
  try {
    if ((CompareConf.value.source === appStore.curSelCase || CompareConf.value.comp.includes(appStore.curSelCase))
      && appStore.selectedCase.state === 1) {
      await useDataStore().saveCaseData(appStore.curWS, appStore.curSelCase,
        PyscConf.generalConfig, PyscConf.producer, PyscConf.contracts, PyscConf.fiscal,
        PyscConf.tangible, PyscConf.intangible,
        PyscConf.opex, PyscConf.asr,
        PyscSens.sensConfig,
        PyscMonte.monteConfig,
        PyscOptim.optimConfig)
    }

    const listCaseID = [CompareConf.value.source, ...CompareConf.value.comp]
    for (let i = 0; i < listCaseID.length; i++) {
      const _caseid = listCaseID[i]
      const dGConf = _caseid === appStore.curSelCase ? PyscConf.generalConfig : (await useDataStore().loadDataModule('rdgenconf', appStore.curWS, _caseid))
      const dFisc = _caseid === appStore.curSelCase ? PyscConf.fiscal : (await useDataStore().loadDataModule('rdfiscalconf', appStore.curWS, _caseid))
      const dContr = _caseid === appStore.curSelCase ? PyscConf.contracts : (await useDataStore().loadDataModule('rdcontracts', appStore.curWS, _caseid))
      const dProd = _caseid === appStore.curSelCase ? PyscConf.producer : (await useDataStore().loadDataModule('rdproducer', appStore.curWS, _caseid))
      const dTan = _caseid === appStore.curSelCase ? PyscConf.tangible : (await useDataStore().loadDataModule('rdcosts', appStore.curWS, _caseid, 0))
      const dIntan = _caseid === appStore.curSelCase ? PyscConf.intangible : (await useDataStore().loadDataModule('rdcosts', appStore.curWS, _caseid, 1))
      const dOpex = _caseid === appStore.curSelCase ? PyscConf.opex : (await useDataStore().loadDataModule('rdcosts', appStore.curWS, _caseid, 2))
      const dASR = _caseid === appStore.curSelCase ? PyscConf.asr : (await useDataStore().loadDataModule('rdcosts', appStore.curWS, _caseid, 3))

      const dataJson = useDataStore().makeJSONofCase(_caseid,
        dGConf, dProd, dContr, dFisc, dTan, dIntan, dOpex, dASR, true)

      const { status, result } = await useHTTP().put({
        path: 'get_case_summaries',
        body: {
          type: dGConf.type_of_contract,
          caseid: _caseid,
          json: btoa(JSON.stringify(dataJson)),
        },
        onError: (error: any) => { throw error },
      })

      if (status !== 200)
        throw { status, result }
      if (CompOut.length === 0)
        CompOut.splice(0, CompOut.length, ...result.summary.map((v, index) => [typeof v === "number" ? (v * (Pysc.templateSummary[index].unit === '%' ? 100 : 1)) : v]))
      else
        CompOut.forEach((row, index) => row.push(typeof result.summary[index] === "number" ? (result.summary[index] * (Pysc.templateSummary[index].unit === '%' ? 100 : 1)) : result.summary[index]))
    }
    dataLoaded = true
  }
  catch (err) {
    appStore.showAlert({
      text: `Error ${(err?.status) ?? ''}: ${(err?.result) ?? 'unknown'}`,
      isalert: true,
    })
    dataTableCompare.value.splice(0, dataTableCompare.value.length, ...[])
    dataChartCompare.value.splice(0, dataChartCompare.value.length, ...[])
  }
  if (dataLoaded) {
    // CompSetting.value.data.splice(0, CompSetting.value.data.length, ...CompOut)
    dataTableCompare.value.splice(0, dataTableCompare.value.length, ...CompOut)
    dataChartCompare.value.splice(0, dataChartCompare.value.length, ...[CompareConf.value.source, ...CompareConf.value.comp].map((cs, idx) => {
      return [
        CompOut[4][idx], // 'Revenue'
        CompOut[15][idx], // 'CR/DC'
        CompOut[20][idx], // 'NCS'
        CompOut[24][idx], // 'Ctr. NPV'
        CompOut[25][idx], // 'Ctr. IRR'
        CompOut[28][idx], // 'Ctr. PI'
        CompOut[32][idx], // 'DMO'
        CompOut[33][idx], // 'Tax'
        CompOut[34][idx], // 'GoS'
        CompOut[36][idx], // 'GoI NPV'
      ]
    }))
    dataBarChartBase.value.value.splice(0, dataBarChartBase.value.value.length, ...[
      CompOut[20][0],
      CompOut[24][0],
      CompOut[28][0],
      CompOut[25][0],
      CompOut[26][0],
      CompOut[15][0],
      CompOut[34][0],
      CompOut[36][0],
      CompOut[32][0],
      CompOut[33][0],
    ])
    dataBarChartCompare.value.splice(0, dataBarChartCompare.value.length, ...CompareConf.value.comp.map((row, idx) => {
      return [{ value: CompOut[20][idx + 1], percent: ((CompOut[20][idx + 1] - CompOut[20][0]) !== 0.0 ? (math.abs((CompOut[20][idx + 1] - CompOut[20][0]) / CompOut[20][0])) : 0.0) * (CompOut[20][idx + 1] < CompOut[20][0] ? -1 : 1) * 100.0 }, // 'NCS'
        { value: CompOut[24][idx + 1], percent: ((CompOut[24][idx + 1] - CompOut[24][0]) !== 0.0 ? (math.abs((CompOut[24][idx + 1] - CompOut[24][0]) / CompOut[24][0])) : 0.0) * (CompOut[24][idx + 1] < CompOut[24][0] ? -1 : 1) * 100.0 }, // 'Ctr. NPV'
        { value: CompOut[28][idx + 1], percent: ((CompOut[28][idx + 1] - CompOut[28][0]) !== 0.0 ? (math.abs((CompOut[28][idx + 1] - CompOut[28][0]) / CompOut[28][0])) : 0.0) * (CompOut[28][idx + 1] < CompOut[28][0] ? -1 : 1) * 100.0 }, // 'Ctr. PI'
        { value: CompOut[25][idx + 1], percent: ((CompOut[25][idx + 1] - CompOut[25][0]) !== 0.0 ? (math.abs((CompOut[25][idx + 1] - CompOut[25][0]) / CompOut[25][0])) : 0.0) * (CompOut[25][idx + 1] < CompOut[25][0] ? -1 : 1) * 100.0 }, // 'Ctr. IRR'
        { value: CompOut[26][idx + 1], percent: ((CompOut[26][idx + 1] - CompOut[26][0]) !== 0.0 ? (math.abs((CompOut[26][idx + 1] - CompOut[26][0]) / CompOut[26][0])) : 0.0) * (CompOut[26][idx + 1] < CompOut[26][0] ? -1 : 1) * 100.0 }, // 'Ctr. POT'
        { value: CompOut[15][idx + 1], percent: ((CompOut[15][idx + 1] - CompOut[15][0]) !== 0.0 ? (math.abs((CompOut[15][idx + 1] - CompOut[15][0]) / CompOut[15][0])) : 0.0) * (CompOut[15][idx + 1] < CompOut[15][0] ? -1 : 1) * 100.0 }, // 'CR/DC'
        { value: CompOut[34][idx + 1], percent: ((CompOut[34][idx + 1] - CompOut[34][0]) !== 0.0 ? (math.abs((CompOut[34][idx + 1] - CompOut[34][0]) / CompOut[34][0])) : 0.0) * (CompOut[34][idx + 1] < CompOut[34][0] ? -1 : 1) * 100.0 }, // 'GoS'
        { value: CompOut[36][idx + 1], percent: ((CompOut[36][idx + 1] - CompOut[36][0]) !== 0.0 ? (math.abs((CompOut[36][idx + 1] - CompOut[36][0]) / CompOut[36][0])) : 0.0) * (CompOut[36][idx + 1] < CompOut[36][0] ? -1 : 1) * 100.0 }, // 'GoI NPV'
        { value: CompOut[32][idx + 1], percent: ((CompOut[32][idx + 1] - CompOut[32][0]) !== 0.0 ? (math.abs((CompOut[32][idx + 1] - CompOut[32][0]) / CompOut[32][0])) : 0.0) * (CompOut[32][idx + 1] < CompOut[32][0] ? -1 : 1) * 100.0 }, // 'DMO'
        { value: CompOut[33][idx + 1], percent: ((CompOut[33][idx + 1] - CompOut[33][0]) !== 0.0 ? (math.abs((CompOut[33][idx + 1] - CompOut[33][0]) / CompOut[33][0])) : 0.0) * (CompOut[33][idx + 1] < CompOut[33][0] ? -1 : 1) * 100.0 }, // 'Tax'
      ]
    }))
  }
  isCalcData.value = false
}

const dataChartSeries = computed(() => {
  return [CompareConf.value.source, ...CompareConf.value.comp].map((_id => {
    return { id: +_id, title: appStore.caseByID(_id)?.name }
  }))
})

const getSeriesBarChart = computed(() => {
  return dataChartSeries.value.length > 1 ? dataChartSeries.value.slice(1, dataChartSeries.length) : []
})

const getResultBarChart = computed(() => {
  return dataBarChartCompare.value
})

const tableColumnHeader = computed(() => {
  return [CompareConf.value.source, ...CompareConf.value.comp].map(_id => {
    const source = appStore.caseByID(_id)
    const _ctrType = ['', 'CR', 'GS', 'CR-CR', 'CR-GS', 'GS-GS', 'GS-CR']

    return { id: _id, title: source?.name, subtitle: _ctrType[source?.type] }
  })
})

watchDebounced(() => CompareConf.value.comp, val => {
  if (CompareConf.value.source) {
    isCalcData.value = true
    nextTick(() => calcData())
  }
}, { deep: true, debounce: 500, maxWait: 1000 })

const showCaseCompare = (caseID: number) => {
  if (!(appStore.caseByID(caseID)?.type > 0))
    return appStore.showAlert({ text: "Only PSC Cost Recovery (CR), PSC Gross Split (GS), and Transition can be compared", isalert: false })
  CompareConf.value = appStore.getCompare(caseID)

  // sourceCase.value = caseID
  // CompSetting.value.data = templatedata.map(v => [v.param])
  // selCase.value = []
  isCompareVisible.value = true
  nextTick(() => {
    calcData()
  })
}

defineExpose({
  showCaseCompare,
})
</script>

<template>
  <VDialog
    v-model="isCompareVisible"
    fullscreen
    :scrim="false"
    scrollable
    content-class="scrollable-dialog"
    transition="dialog-bottom-transition"
    @after-leave="() => $emit('compareDlgDone')"
  >
    <VCard>
      <div>
        <VToolbar color="primary">
          <VBtn
            icon
            variant="plain"
            @click="isCompareVisible = false"
          >
            <VIcon
              color="white"
              icon="tabler-x"
            />
          </VBtn>

          <VToolbarTitle>
            <div class="d-flex h-100 align-center">
              <div>Case comparison</div>
              <div
                class="mx-4 my-2"
                :style="{ maxInlineSize: '170px' }"
              >
                <p class="my-0 text-truncate">
                  {{ appStore.caseByID(CompareConf.source)?.name }}
                </p>
                <h5 class="my-0 text-xs text-truncate">
                  {{ appStore.caseByID(CompareConf.source)?.description }}
                </h5>
                <VTooltip
                  activator="parent"
                  open-delay="200"
                  scroll-strategy="close"
                >
                  <span>{{ appStore.caseByID(CompareConf.source)?.name }}</span>
                </VTooltip>
              </div>
              <VIcon
                size="26"
                icon="tabler-switch-horizontal"
              />
              <AppSelect
                v-model="CompareConf.comp"
                class="mx-2"
                item-value="value"
                item-title="name"
                item-sub-title="desc"
                :items="targetCases"
                multiple
                clearable
                clear-icon="tabler-x"
                placeholder="Select case"
              >
                <template #selection="{ item }">
                  <VChip
                    closable
                    variant="elevated"
                    color="default"
                    @click:close="() => closeChips(item.value)"
                  >
                    <template #prepend>
                      <VAvatar
                        start
                        color="primary"
                      >
                        <h6>
                          {{ item.raw.tipe === 1 ? "CR" : (item.raw.tipe === 2 ? "GS" : "T") }}
                        </h6>
                      </VAvatar>
                    </template>
                    <span
                      class="text-truncate"
                      :style="{ maxInlineSize: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }"
                    >{{
                      item.raw.name
                    }}</span>
                    <VTooltip
                      activator="parent"
                      open-delay="200"
                      scroll-strategy="close"
                    >
                      <span>{{ item.raw.name }}</span>
                    </VTooltip>
                  </VChip>
                </template>
              </AppSelect>
            </div>
          </VToolbarTitle>
        </VToolbar>
      </div>
      <VCardText>
        <VRow>
          <VCol cols="12">
            <ColCollapsible :col-ratio="[isLessThanCardBreaklg ? 70 : 60, isLessThanCardBreaklg ? 30 : 40]">
              <template #left="{ collapsible, collapsed }">
                <AppCardActions
                  action-collapsed
                  title="Summary"
                  compact-header
                  :collapsed="collapsible"
                  @collapsed="val => collapsed(val)"
                >
                  <VCardText>
                    <TableCompare
                      ref="TableCompareRef"
                      :columns="tableColumnHeader"
                      :data="dataTableCompare"
                    />
                  </VCardText>
                </AppCardActions>
              </template>
              <template #right="{ collapsible, collapsed }">
                <AppCardActions
                  action-collapsed
                  title="Chart"
                  :collapsed="collapsible"
                  compact-header
                  style="overflow:visible !important"
                  @collapsed="val => collapsed(val)"
                >
                  <VCardText class="px-0 py-0">
                    <AppCardActions
                      title="Radar Chart"
                      action-collapsed
                      compact-header
                      style="overflow:visible !important"
                    >
                      <ChartCompare
                        :series="dataChartSeries"
                        :data-chart="dataChartCompare"
                      />
                    </AppCardActions>
                    <AppCardActions
                      title="Bar Chart"
                      action-collapsed
                      compact-header
                      class="mt-2"
                      style="overflow:visible !important"
                    >
                      <BarChartCompare
                        :base-data="dataBarChartBase"
                        :series="getSeriesBarChart"
                        :data-chart="getResultBarChart"
                      />
                    </AppCardActions>
                  </VCardText>
                </AppCardActions>
              </template>
            </ColCollapsible>
          </VCol>
        </VRow>
      </VCardText>
    </VCard>
  </VDialog>
</template>

<style lang="scss" scoped>
.dialog-bottom-transition-enter-active,
.dialog-bottom-transition-leave-active {
  transition: transform 0.2s ease-in-out;
}

.scrollable-dialog {
  overflow: visible !important;
}
</style>

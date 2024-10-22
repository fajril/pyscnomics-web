<script setup lang="ts">
import { useAppStore } from "@/stores/appStore"
import { useHTTP } from "@/utils/pysc/useHttp"
import { breakpointsVuetifyV3 } from '@vueuse/core'
import * as math from 'mathjs'
import { PerfectScrollbar } from "vue3-perfect-scrollbar"
import { VAvatar, VChip, VListItem, VMenu, VTooltip } from "vuetify/lib/components/index.mjs"
import { useTheme } from "vuetify/lib/framework.mjs"
import DotdotOpt from "@/pages/components/dotdotOpt.vue"
import { usePyscConfStore } from '@/stores/genfisStore'
import { usePyscMonteStore } from '@/stores/monteStore'
import { usePyscOptimStore } from '@/stores/optimStore'
import { usePyscSensStore } from '@/stores/sensStore'
import * as Pysc from "@/utils/pysc/pyscType"
import { useDataStore } from '@/utils/pysc/useDataStore'
import BarChartCompare from '@/views/components/chartBarCompare.vue'
import CFChartCompare from '@/views/components/chartCFCompare.vue'
import ChartCompare from '@/views/components/chartCompare.vue'
import ColapsibleCols from "@/views/components/colapsibleCols.vue"
import TableCompare from '@/views/components/tableCompare.vue'
import 'handsontable/dist/handsontable.full.css'

interface Emit {
  (e: 'compareDlgDone'): void
}

const emit = defineEmits<Emit>()

const vuetifyTheme = useTheme()

const isLessThanCardBreaklg = computed(() => useMediaQuery(`(max-width: ${breakpointsVuetifyV3.lg}px)`).value)
const isLessThanCardBreakxl = computed(() => useMediaQuery(`(max-width: ${breakpointsVuetifyV3.xl}px)`).value)

const appStore = useAppStore()
const PyscConf = usePyscConfStore()
const PyscSens = usePyscSensStore()
const PyscMonte = usePyscMonteStore()
const PyscOptim = usePyscOptimStore()
const numbro = Pysc.useNumbro()
const tableCollapsed = ref(false)

const ChartCompareRef = ref()
const BarChartCompareRef = ref()
const CFChartCompareRef = ref()

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
const dataCFChartCompare = ref<{ y: number[]; d: number[] }[]>([])
const isCalcData = ref(false)

const targetCases = computed(() => {
  if (!isEmpty(CompareConf.value.source))
    return appStore.projects.filter(f => f.type > 0 && f.id !== CompareConf.value.source).map(v => ({ name: v.name, value: v.id, desc: v.description, tipe: v.type, subtitle: Pysc.is_number(v.type) ? Object.values(Pysc.ContractType)[+v.type] : '' }))

  return []
})

const closeChips = (caseID: number) => {
  const index = CompareConf.value.comp.findIndex(e => e === caseID)

  CompareConf.value.comp.splice(index, 1)
}

const calcData = async () => {
  const CompCF: { y: number[]; d: number[] }[] = []
  const CompOut = []

  const calcDiff = (base: number, value: number) => {
    // ((CompOut[20][idx + 1] - CompOut[20][0]) !== 0.0 ? (math.abs((CompOut[20][idx + 1] - CompOut[20][0]) / CompOut[20][0])) : 0.0) * (CompOut[20][idx + 1] < CompOut[20][0] ? -1 : 1) * 100.0
    if (base !== 0)
      return math.abs(value - base) / math.abs(base) * 100 * (value < base ? -1 : 1)

    return null
  }

  let dataLoaded = false
  dataBarChartCompare.value.splice(0, dataBarChartCompare.value.length, ...[])
  dataBarChartBase.value.value.splice(0, dataBarChartBase.value.value.length, ...[])
  dataCFChartCompare.value.splice(0, dataCFChartCompare.value.length, ...[])
  try {
    if ((CompareConf.value.source === appStore.curSelCase || CompareConf.value.comp.includes(appStore.curSelCase))
    /* && appStore.selectedCase.state === 1 */) {
      await useDataStore().saveCaseData(appStore.curWS, appStore.curSelCase,
        PyscConf.generalConfig, PyscConf.producer, PyscConf.contracts, PyscConf.fiscal,
        PyscConf.tangible, PyscConf.intangible,
        PyscConf.opex, PyscConf.asr, PyscConf.cos, PyscConf.lbt,
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
      const dCOS = _caseid === appStore.curSelCase ? PyscConf.cos : (await useDataStore().loadDataModule('rdcosts', appStore.curWS, _caseid, 4))
      const dLBT = _caseid === appStore.curSelCase ? PyscConf.lbt : (await useDataStore().loadDataModule('rdcosts', appStore.curWS, _caseid, 5))

      const dataJson = useDataStore().makeJSONofCase(_caseid,
        dGConf, dProd, dContr, dFisc, dTan, dIntan, dOpex, dASR, dCOS, dLBT, true)

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

      CompCF.push({ y: result.cf.y, d: result.cf.d })
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
    dataCFChartCompare.value.splice(0, dataCFChartCompare.value.length, ...[])
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
      return [
        { value: CompOut[20][idx + 1], percent: calcDiff(CompOut[20][0], CompOut[20][idx + 1]) }, // 'NCS'
        { value: CompOut[24][idx + 1], percent: calcDiff(CompOut[24][0], CompOut[24][idx + 1]) }, // 'Ctr. NPV'
        { value: CompOut[28][idx + 1], percent: calcDiff(CompOut[28][0], CompOut[28][idx + 1]) }, // 'Ctr. PI'
        { value: CompOut[25][idx + 1], percent: calcDiff(CompOut[25][0], CompOut[25][idx + 1]) }, // 'Ctr. IRR'
        { value: CompOut[26][idx + 1], percent: calcDiff(CompOut[26][0], CompOut[26][idx + 1]) }, // 'Ctr. POT'
        { value: CompOut[15][idx + 1], percent: calcDiff(CompOut[15][0], CompOut[15][idx + 1]) }, // 'CR/DC'
        { value: CompOut[34][idx + 1], percent: calcDiff(CompOut[34][0], CompOut[34][idx + 1]) }, // 'GoS'
        { value: CompOut[36][idx + 1], percent: calcDiff(CompOut[36][0], CompOut[36][idx + 1]) }, // 'GoI NPV'
        { value: CompOut[32][idx + 1], percent: calcDiff(CompOut[32][0], CompOut[32][idx + 1]) }, // 'DMO'
        { value: CompOut[33][idx + 1], percent: calcDiff(CompOut[33][0], CompOut[33][idx + 1]) }, // 'Tax'
      ]
    }))
    dataCFChartCompare.value.splice(0, dataCFChartCompare.value.length, ...CompCF)
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

const getResultCFChart = computed(() => {
  return dataCFChartCompare.value
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

const showListComp = ref(false)

const comparelist = computed(() => {
  const _lst = appStore.caseCompare
  if (_lst.length === 0)
    return _lst
  if (_lst[0].source !== CompareConf.value.source) {
    const idx_ = _lst.findIndex(l => l.source === CompareConf.value.source)
    if (idx_ !== -1) {
      _lst.splice(0, 0, _lst[idx_])
      _lst.splice(idx_ + 1, 1)
    }
  }

  return _lst
})

const getTargetLst = (comp: any[]) => {
  return comp.map(c => {
    const case_ = appStore.caseByID(c)

    return {
      id: c,
      name: case_?.name,
      type: case_?.type,
    }
  })
}

const chgActiveSource = (source: number) => {
  if (CompareConf.value.source !== source) {
    CompareConf.value = appStore.getCompare(source)
    nextTick(() => {
      calcData()
    })
  }
}

const delSource = (source: number) => {
  if (CompareConf.value.source !== source) {
    const idx_ = appStore.caseCompare.findIndex(l => l.source === source)
    if (idx_ !== -1)
      appStore.$patch(state => state.caseCompare.splice(idx_, 1))
  }
}

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

const optOption = computed(() => {
  return (source: string) => [
    { title: 'Copy to clipboard', value: 'copy2clbrd', icon: 'tabler-clipboard', sourceType: source === 'table' ? 'text' : source },
    { title: `Save to file (*.${source === 'table' ? 'xlsx' : 'png'})`, value: 'save2File', icon: 'tabler-download', sourceType: source },
  ]
})

const getDataSource = (refName: any, setName: any, sourceType: string) => {
  const rndid = Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)

  if (sourceType === 'text' || sourceType === 'table') {
    const tblDataScr = refName?.getDataSource()
    if (sourceType === 'text') {
      return tblDataScr.reduce((rowTxt, rowVal) => {
        return `${rowTxt + rowVal.join('\t')}\n`
      }, '')
    }
    else if (sourceType === 'table') {
      return {
        data: [{
          name: 'compare summary',
          header: [],
          data: tblDataScr,
        }],
        filename: `compareSumm_${appStore.caseByID(CompareConf.value.source)?.name}_${rndid}`.replace(/[/\\ #$~&.]/g, ''),
      }
    }
  }
  else {
    return {
      url: refName.getImageSourceUrl(),
      filename: `compare_chart_${rndid}_${appStore.caseByID(CompareConf.value.source)?.name}_${rndid}`.replace(/[/\\ #$~&.]/g, ''),
    }
  }
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
        <VToolbar :color="`rgba(var(--v-theme-primary), ${vuetifyTheme.global.name.value === 'dark' ? 0.2 : 0.8})`">
          <VBtn
            icon
            variant="plain"
            color="white"
            @click="isCompareVisible = false"
          >
            <VIcon icon="tabler-x" />
          </VBtn>

          <VToolbarTitle>
            <div class="d-flex h-100 gap-2 align-center">
              <div>Case comparison</div>
              <IconBtn color="white">
                <VIcon icon="tabler-fold-down" />
                <VMenu
                  v-model="showListComp"
                  activator="parent"
                  persistent
                  offset="15"
                >
                  <VCard
                    class="d-flex flex-column"
                    title="List of comparison"
                    border
                  >
                    <template #append>
                      <IconBtn @click.prevent="showListComp = !showListComp">
                        <VIcon icon="tabler-x" />
                      </IconBtn>
                    </template>
                    <VCardText class="px-2 py-1">
                      <PerfectScrollbar
                        tag="div"
                        :options="{ wheelPropagation: false, suppressScrollX: true }"
                        style="max-block-size: calc(100vh - 13.125rem);"
                      >
                        <VList>
                          <VListItem
                            v-for="item in comparelist"
                            :key="`comp-${item.source}`"
                            :active="item.source === CompareConf.source"
                            lines="two"
                            :title="appStore.caseByID(item.source)?.name"
                            @click.prevent="() => chgActiveSource(item.source)"
                          >
                            <template #append>
                              <IconBtn
                                v-show="CompareConf.source !== item.source"
                                class="ms-10"
                                @click.stop.prevent="() => delSource(item.source)"
                              >
                                <VIcon icon="tabler-trash-filled" />
                              </IconBtn>
                            </template>
                            <template #subtitle>
                              <div
                                class="d-flex gap-1 text-truncate"
                                style="max-inline-size: 900px;"
                              >
                                <VChip
                                  v-for="tgt in getTargetLst(item.comp)"
                                  :key="`comp-tgt-${item.source}-${tgt.id}`"
                                  variant="elevated"
                                  color="default"
                                  density="compact"
                                >
                                  <template #prepend>
                                    <VAvatar
                                      start
                                      size="x-small"
                                      color="primary"
                                      class="text-xsmall"
                                    >
                                      <h6>{{ tgt.type === 1 ? 'CR' : (tgt.type === 2 ? 'GS' : 'T') }}</h6>
                                    </VAvatar>
                                  </template>
                                  <h5
                                    class="text-truncate text-small"
                                    :style="{ maxInlineSize: '80px', overflow: 'hidden', textOverflow: 'ellipsis' }"
                                  >
                                    {{ tgt.name }}
                                  </h5>
                                </VChip>
                              </div>
                            </template>
                            <VTooltip activator="parent">
                              <div class="flex-grow-1">
                                <h4 class="text-secondary text-subtitle-2">
                                  Source:
                                </h4>
                                <h4 class="text-secondary">
                                  {{ appStore.caseByID(item.source)?.name }}
                                </h4>
                                <h4 class="text-secondary text-subtitle-2">
                                  Target:
                                </h4>
                                <h5
                                  v-for="tgt in getTargetLst(item.comp)"
                                  :key="tgt.name"
                                  class="text-secondary"
                                >
                                  {{ tgt.name }}
                                </h5>
                              </div>
                            </VTooltip>
                          </VListItem>
                        </VList>
                      </PerfectScrollbar>
                    </VCardText>
                  </VCard>
                </VMenu>
              </IconBtn>
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
                item-subtitle="subtitle"
                :items="targetCases"
                item-props
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
        <ColapsibleCols class="mt-5">
          <template #left-header="{ isCollapsed }">
            Summary
          </template>
          <template #after-left-header="{ isCollapsed }">
            <DotdotOpt
              v-if="!isCollapsed"
              :menu-list="optOption('table')"
              title="Options"
              item-props
              dot-only
              :get-source="(value: string, sourceType: string) => getDataSource(TableCompareRef, null, sourceType)"
            />
          </template>
          <template #left>
            <TableCompare
              ref="TableCompareRef"
              :columns="tableColumnHeader"
              :data="dataTableCompare"
            />
          </template>
          <template #right-header="{ isCollapsed }">
            <span v-if="isCollapsed">Chart</span>
          </template>
          <template #right>
            <AppCardActions
              title="Radar Chart"
              action-collapsed
              compact-header
              style="overflow:visible !important"
            >
              <template #before-actions="{ isContentCollapsed }">
                <DotdotOpt
                  v-if="!isContentCollapsed"
                  :menu-list="optOption('image')"
                  title="Options"
                  item-props
                  dot-only
                  :get-source="(value: string, sourceType: string) => getDataSource(ChartCompareRef, null, sourceType)"
                />
              </template>

              <ChartCompare
                ref="ChartCompareRef"
                :series="dataChartSeries"
                :data-chart="dataChartCompare"
              />
            </AppCardActions>
            <AppCardActions
              title="Relative Comparison Chart"
              action-collapsed
              compact-header
              class="mt-2"
              style="overflow:visible !important"
            >
              <template #before-actions="{ isContentCollapsed }">
                <DotdotOpt
                  v-if="!isContentCollapsed"
                  :menu-list="optOption('image')"
                  title="Options"
                  item-props
                  dot-only
                  :get-source="(value: string, sourceType: string) => getDataSource(BarChartCompareRef, null, sourceType)"
                />
              </template>
              <BarChartCompare
                ref="BarChartCompareRef"
                :base-data="dataBarChartBase"
                :series="getSeriesBarChart"
                :data-chart="getResultBarChart"
              />
            </AppCardActions>
            <AppCardActions
              title="Cashflow Chart"
              action-collapsed
              compact-header
              class="mt-2"
              style="overflow:visible !important"
            >
              <template #before-actions="{ isContentCollapsed }">
                <DotdotOpt
                  v-if="!isContentCollapsed"
                  :menu-list="optOption('image')"
                  title="Options"
                  item-props
                  dot-only
                  :get-source="(value: string, sourceType: string) => getDataSource(CFChartCompareRef, null, sourceType)"
                />
              </template>
              <CFChartCompare
                ref="CFChartCompareRef"
                :series="dataChartSeries"
                :data-chart="getResultCFChart"
              />
            </AppCardActions>
          </template>
        </ColapsibleCols>
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

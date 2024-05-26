<script setup lang="ts">
import { useAppStore } from "@/stores/appStore";
import { usePyscConfStore } from '@/stores/genfisStore';
import { usePyscMonteStore } from '@/stores/monteStore';
import { usePyscSensStore } from '@/stores/sensStore';
import * as Pysc from "@/utils/pysc/pyscType";
import { useDataStore } from '@/utils/pysc/useDataStore';
import 'handsontable/dist/handsontable.full.css';
import ChartCompare1 from './compareChart1.vue';

interface Emit {
  (e: 'compareDlgDone'): void
}

const emit = defineEmits<Emit>()

const appStore = useAppStore()
const PyscConf = usePyscConfStore()
const PyscSens = usePyscSensStore()
const PyscMonte = usePyscMonteStore()
const numbro = Pysc.useNumbro()

const tblCompare = ref()
const isCompareVisible = ref(false)
const sourceCase = ref()
const selCase = ref([])
const dataChartCompare = ref([])
const isCalcData = ref(false)
const targetCases = computed(() => {
  if (!isEmpty(sourceCase.value))
    return appStore.projects.filter(f => f.type > 0 && f.id !== sourceCase.value).map(v => ({ name: v.name, value: v.id, desc: v.description, tipe: v.type }))
  return []
})

const closeChips = (caseID: number) => {
  const index = selCase.value.findIndex(e => e === caseID)
  selCase.value.splice(index, 1)
}

const templatedata = [
  { param: "Oil Production", unit: "MMSTB" },
  { param: "Oil WAP", unit: "US$/bbl" },
  { param: "Gas Production", unit: "TBTU" },
  { param: "Gas WAP", unit: "US$/MMBTU" },
  { param: "Gross Revenue", unit: "MUS$" },
  { param: 'Gross Share', unit: "", grp: 2 },
  { param: "Contr. Gross Share", unit: "MUS$", grp: -1 },
  { param: "GoI Gross Share", unit: "MUS$", grp: -2 },
  { param: "Sunk Cost", unit: "MUS$" },
  { param: 'Investment', unit: "MUS$", grp: 2 },
  { param: "Tangible", unit: "MUS$", grp: -1 },
  { param: "Intangible", unit: "MUS$", grp: -2 },
  { param: "OPEX + ASR", unit: "MUS$", grp: 2 },
  { param: "OPEX", unit: "MUS$", grp: -1 },
  { param: "ASR", unit: "MUS$", grp: -2 },
  { param: "Cost Recovery / Deductible Cost", unit: "MUS$", grp: 1 },
  { param: "(% Gross Revenue)", unit: "%", grp: -1 },
  { param: "Unrec. Cost / Carry Fwd. Deductible Cost", unit: "MUS$", grp: 1 },
  { param: "(% Gross Revenue)", unit: "%", grp: -1 },
  { param: "Contractor Profitability:", unit: "", grp: 9 },
  { param: "Contr. Net Share", unit: "MUS$", grp: -1 },
  { param: "(% Gross Rev)", unit: "%", grp: -2 },
  { param: "Contr. Net Cash Flow", unit: "MUS$", grp: -3 },
  { param: "(% Gross Rev)", unit: "%", grp: -4 },
  { param: "Contr. NPV", unit: "MUS$", grp: -5 },
  { param: "Contr. IRR", unit: "%", grp: -6 },
  { param: "Contr. POT", unit: "years", grp: -7 },
  { param: "Contr. PV Ratio", unit: "", grp: -8 },
  { param: "Contr. PI", unit: "", grp: -9 },
  { param: "GoI Profitability:", unit: "", grp: 7 },
  { param: "GoI Gross Share", unit: "MUS$", grp: -1 },
  { param: "FTP (PSC Cost Recovery)", unit: "MUS$", grp: -2 },
  { param: "Net DMO", unit: "MUS$", grp: -3 },
  { param: "Tax", unit: "MUS$", grp: -4 },
  { param: "GoI Take", unit: "MUS$", grp: -5 },
  { param: "(% Gross Rev)", unit: "%", grp: -7 },
  { param: "GoI NPV", unit: "MUS$", grp: -8 },
]

function renderedColumn(instance, td, row, col, prop, value, cellProperties) {
  if (col === 0) {
    if (templatedata[row].grp < 0) {
      const span = document.createElement('span')
      span.classList.add("ms-4")
      span.classList.add("text-capitalize")
      span.innerText = value
      td.innerText = ''
      td.appendChild(span)
      if (!isEmpty(templatedata[row].unit)) {
        span.innerText = span.innerText + ", "
        const small = document.createElement('small')
        small.classList.add("text-primary")
        small.innerText = templatedata[row].unit
        td.appendChild(small)
      }
    } else {
      td.classList.add("text-capitalize")
      if (templatedata[row].grp > 0)
        td.classList.add("font-weight-bold")
      td.innerText = value
      if (!isEmpty(templatedata[row].unit)) {
        const small = document.createElement('small')
        small.classList.add("text-primary")
        td.innerText = td.innerText + ", "
        small.innerText = templatedata[row].unit
        td.appendChild(small)
      }
    }
  } else {

    const div = document.createElement('div')
    div.classList.add("d-flex")
    div.classList.add("justify-end")
    const span = document.createElement('span')
    const valTxt = typeof value === 'number' ? numbro(value).format({ mantissa: 3, thousandSeparated: true, negative: "parenthesis", spaceSeparated: true }) : ""
    span.innerText = valTxt
    div.appendChild(span)
    if (col > 1 && typeof value === 'number' && !isEmpty(valTxt)) {
      const iel = document.createElement('span')
      iel.classList.add("font-weight-bold")
      const _indicator = value > CompSetting.value.data[row][1] ? 'tabler-corner-right-up' : (value < CompSetting.value.data[row][1] ? 'tabler-corner-right-down' : '')
      const _color = value > CompSetting.value.data[row][1] ? 'text-primary' : (value < CompSetting.value.data[row][1] ? 'text-error' : '')
      iel.innerHTML = `<i class="v-icon notranslate ${_color} ${_indicator} v-icon notranslate" aria-hidden="true" style="font-size: 16px; height: 16px; width: 16px;"></i>`
      div.appendChild(iel)
    }
    td.innerText = ""
    td.appendChild(div)
  }
  return td
}

const CompSetting = computed(() => {
  let tblCfg = {
    data: templatedata.map(v => [v.param]),
    colHeaders: (index) => {
      if (index === 0)
        return ""
      else {

        const source = index === 1 ? appStore.caseByID(sourceCase.value) : appStore.caseByID(selCase.value[index - 2])
        const _ctrType = ['', 'PSC', 'GS', 'CR-CR', 'CR-GS', 'GS-GS', 'GS-CR']
        return `<div><p class="my-0">${source?.name}</p><h5 class="my-0 text-primary" style=":style="max-inline-size:100px;overflow:hidden;text-overflow:ellipsis;">${_ctrType[source?.type]}</h5></div>`
      }
    },
    columns: [],
    contextMenu: false,
    height: 'auto',
    width: '100%',
    fixedColumnsStart: 1,
    manualColumnResize: true,
    autoWrapRow: false,
    autoWrapCol: false,
    licenseKey: 'non-commercial-and-evaluation'
  }
  tblCfg.columns = Array(2 + selCase.value.length).fill({ readOnly: true, renderer: renderedColumn })
  return tblCfg
})

const execPartData = async (url: string, mode: string, param: object) => {
  const result = await $api(url, {
    params: param,
    method: mode,
    onResponseError({ response }) {
      throw { status: response.status, error: response._data.detail }
    },
  })
  return result
}

const loadData = async (urlpath: string, id: number, costmode: number | undefined = undefined) => {
  let resInit = await execPartData(`/auth/${urlpath}`, 'GET', costmode != undefined ? { wspath: appStore.curWS, mode: costmode, caseid: id } : { wspath: appStore.curWS, caseid: id })
  if (resInit.state !== true) throw `error ${urlpath}`
  return JSON.parse(JSON.stringify(resInit.data))
}


const calcData = async () => {
  const CompOut = templatedata.map(v => [v.param])
  let dataLoaded = false
  try {
    if ((sourceCase.value === appStore.curSelCase || selCase.value.includes(appStore.curSelCase)) &&
      appStore.selectedCase.state === 1)
      await useDataStore().saveCaseData(appStore.curWS, appStore.curSelCase,
        PyscConf.generalConfig, PyscConf.producer, PyscConf.contracts, PyscConf.fiscal,
        PyscConf.tangible, PyscConf.intangible,
        PyscConf.opex, PyscConf.asr,
        PyscSens.sensConfig,
        PyscMonte.monteConfig)

    const listCaseID = [sourceCase.value, ...selCase.value]
    for (let i = 0; i < listCaseID.length; i++) {
      const _caseid = listCaseID[i]
      const dGConf = _caseid === appStore.curSelCase ? PyscConf.generalConfig : (await loadData('rdgenconf', _caseid))
      const dFisc = _caseid === appStore.curSelCase ? PyscConf.fiscal : (await loadData('rdfiscalconf', _caseid))
      const dContr = _caseid === appStore.curSelCase ? PyscConf.contracts : (await loadData('rdcontracts', _caseid))
      const dProd = _caseid === appStore.curSelCase ? PyscConf.producer : (await loadData('rdproducer', _caseid))
      const dTan = _caseid === appStore.curSelCase ? PyscConf.tangible : (await loadData('rdcosts', _caseid, 0))
      const dIntan = _caseid === appStore.curSelCase ? PyscConf.intangible : (await loadData('rdcosts', _caseid, 1))
      const dOpex = _caseid === appStore.curSelCase ? PyscConf.opex : (await loadData('rdcosts', _caseid, 2))
      const dASR = _caseid === appStore.curSelCase ? PyscConf.asr : (await loadData('rdcosts', _caseid, 3))

      const dataJson = useDataStore().makeJSONofCase(_caseid,
        dGConf, dProd, dContr, dFisc, dTan, dIntan, dOpex, dASR, true)

      const result = await $api('/auth/get_case_summaries', {
        params: { type: dGConf.type_of_contract, caseid: _caseid, data: btoa(JSON.stringify(dataJson)) },
        method: 'GET',
        onResponseError({ response }) {
          throw { status: response.status, error: response._data.detail }
        },
      })
      CompOut.forEach((row, index) => row.push(typeof result.summary[index] === "number" ? (result.summary[index] * (templatedata[index].unit === '%' ? 100 : 1)) : result.summary[index]))
    }
    dataLoaded = true
  } catch (err) {
    const error = isObject(err) && err.hasOwnProperty('state') ? err.state : err
    const errorStatus = Array.isArray(error) && error.length === 2 ? error[0] : (isObject(error) && error.hasOwnProperty('status') ? error.status : '')
    let errorMsg = Array.isArray(error) && error.length === 2 ? error[1] : (isObject(error) && error.hasOwnProperty('error') ? error.error : error)
    if (Array.isArray(errorMsg)) errorMsg = errorMsg[0]
    if (errorMsg.toLowerCase().indexOf("<html") !== -1) errorMsg = "Unknown error"
    appStore.showAlert({
      text: `Error ${errorStatus}: ${errorMsg}`,
      isalert: true
    })
  }
  if (dataLoaded) {
    CompSetting.value.data.splice(0, CompSetting.value.data.length, ...CompOut)
    dataChartCompare.value.splice(0, dataChartCompare.value.length, ...[sourceCase.value, ...selCase.value].map((cs, idx) => {
      return [
        CompOut[4][idx + 1], //'Revenue'
        CompOut[15][idx + 1], //'CR/DC'
        CompOut[20][idx + 1], //'NCS'
        CompOut[24][idx + 1], //'Ctr. NPV'
        CompOut[25][idx + 1], //'Ctr. IRR'
        CompOut[28][idx + 1], //'Ctr. PI'
        CompOut[32][idx + 1], //'DMO'
        CompOut[33][idx + 1], //'Tax'
        CompOut[34][idx + 1], //'GoS'
        CompOut[36][idx + 1], //'GoI NPV'
      ]
    }))
  }
  nextTick(() => {
    isCalcData.value = false
    tblCompare.value?.hotInstance.updateSettings(CompSetting.value)
  })
}

watchDebounced(selCase, (val) => {
  if (sourceCase.value) {
    isCalcData.value = true
    nextTick(() => calcData())
  }
}, { deep: true, debounce: 500, maxWait: 1000 })

const showCaseCompare = (caseID: number) => {
  if (!(appStore.caseByID(caseID)?.type > 0))
    return appStore.showAlert({ text: "Only PSC Cost Recovery (CR), PSC Gross Split (GS), and Transition can be compared", isalert: false })
  sourceCase.value = caseID
  CompSetting.value.data = templatedata.map(v => [v.param])
  selCase.value = []
  isCompareVisible.value = true
  nextTick(() => {
    calcData()
  })
}
defineExpose({
  showCaseCompare
})
</script>

<template>
  <VDialog v-model="isCompareVisible" fullscreen :scrim="false" scrollable content-class="scrollable-dialog"
    transition="dialog-bottom-transition" @afterLeave="() => $emit('compareDlgDone')">
    <VCard>
      <div>
        <VToolbar color="primary">
          <VBtn icon variant="plain" @click="isCompareVisible = false">
            <VIcon color="white" icon="tabler-x" />
          </VBtn>

          <VToolbarTitle>
            <div class="d-flex h-100 align-center">
              <div>Case comparison</div>
              <div class="mx-4 my-2 max-w-10">
                <p class="my-0">
                  {{ appStore.caseByID(sourceCase)?.name }}
                </p>
                <h5 class="my-0 text-xs text-truncate">
                  {{ appStore.caseByID(sourceCase)?.description }}
                </h5>
              </div>
              <VIcon size="26" icon="tabler-switch-horizontal" />
              <AppSelect v-model="selCase" class="mx-2" item-value="value" item-title="name" item-subTitle="desc"
                :items="targetCases" multiple clearable clear-icon="tabler-x" placeholder="Select case">
                <template #selection="{ item }">
                  <VChip closable @click:close="() => closeChips(item.value)" variant="elevated" color="default">
                    <template #prepend>
                      <VAvatar start color="primary">
                        <h6>
                          {{ item.raw.tipe === 1 ? "PSC" : (item.raw.tipe === 2 ? "GS" : "T") }}
                        </h6>
                      </VAvatar>
                    </template>
                    <span :style="{ 'max-inline-size': '100px', 'overflow': 'hidden', 'text-overflow': 'ellipsis' }">{{
                      item.raw.name
                    }}</span>
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
            <VRow>
              <VCol cols="12" lg="7" xl="6">
                <AppCardActions action-collapsed title="Summary" compact-header :loading="isCalcData">
                  <VCardText>
                    <hot-table ref="tblCompare" :settings="CompSetting"></hot-table>
                  </VCardText>
                </AppCardActions>
              </VCol>
              <VCol cols="12" lg="5" xl="6">
                <AppCardActions action-collapsed title="Chart" compact-header>
                  <ChartCompare1 :selCase="[sourceCase, ...selCase]" :dataChart="dataChartCompare" />
                </AppCardActions>
              </VCol>
            </VRow>
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

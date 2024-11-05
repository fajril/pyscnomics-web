<script setup lang="ts">
import { useAppStore } from "@/stores/appStore"
import { useHTTP } from "@/utils/pysc/useHttp"
import { BarChart, LineChart } from "echarts/charts"
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from "echarts/components"
import { use } from "echarts/core"
import { CanvasRenderer } from "echarts/renderers"
import * as math from 'mathjs'
import VChart from "vue-echarts"
import type { ThemeInstance } from 'vuetify'
import { useTheme } from 'vuetify'

// import BarChartCompare from '@/views/components/chartBarCompare.vue';
// import ChartCompare from '@/views/components/chartCompare.vue';
import DotdotOpt from "@/pages/components/dotdotOpt.vue"
import { usePyscConfStore } from '@/stores/genfisStore'
import { usePyscMonteStore } from '@/stores/monteStore'
import { usePyscOptimStore } from '@/stores/optimStore'
import { usePyscSensStore } from '@/stores/sensStore'
import * as Pysc from "@/utils/pysc/pyscType"
import { useDataStore } from '@/utils/pysc/useDataStore'
import ColapsibleCols from "@/views/components/colapsibleCols.vue"
import TableCombine from '@/views/components/tableCombine.vue'
import { hexToRgb } from '@layouts/utils'
import 'handsontable/dist/handsontable.full.css'
import { PerfectScrollbar } from "vue3-perfect-scrollbar"

const emit = defineEmits<Emit>()

// import { HotTable, HotColumn } from '@handsontable/vue3';

use([
  CanvasRenderer,
  BarChart,
  LineChart,
  TitleComponent,
  GridComponent,
  TooltipComponent,
  LegendComponent,
])

const vuetifyTheme = useTheme()

const colorVariables = (themeColors: ThemeInstance['themes']['value']['colors'] = vuetifyTheme.current.value) => {
  const themeSecondaryTextColor = `rgba(${hexToRgb(themeColors.colors['on-surface'])},${themeColors.variables['medium-emphasis-opacity']})`
  const themeDisabledTextColor = `rgba(${hexToRgb(themeColors.colors['on-surface'])},${themeColors.variables['disabled-opacity']})`
  const themeBorderColor = `rgba(${hexToRgb(String(themeColors.variables['border-color']))},${themeColors.variables['border-opacity']})`
  const themePrimaryTextColor = `rgba(${hexToRgb(themeColors.colors['on-surface'])},${themeColors.variables['high-emphasis-opacity']})`

  return { themeSecondaryTextColor, themeDisabledTextColor, themeBorderColor, themePrimaryTextColor }
}

interface Emit {
  (e: 'combineDlgDone'): void
}

const tableHeaderType = {
  C_Year: "Year",
  C_Lifting_Oil: "Lifting Oil",
  C_Lifting_Gas: "Lifting Gas",
  C_Revenue: "Revenue",
  C_Depreciable: "Tangible",
  C_Intangible: "Intangible",
  C_Opex: "Opex",
  C_ASR: "ASR",
  C_Depreciation: "Depreciation",
  C_Non_Capital: "Non Capital",
  C_Total_Expenses: "Total Expenses",
  C_FTP: "FTP",
  C_FTP_CTR: "FTP Ctr.",
  C_FTP_GOV: "FTP Gov.",
  C_IC: "IC",
  C_Unrecovered_before_TF: "Unrecovered before TF",
  C_Cost_Recovery: "Cost Recovery",
  C_ETS_before_TF: "ETS before TF",
  C_Unrecovered_after_TF: "Unrecovered after TF",
  C_Cost_to_be_Recovered_after_TF: "Cost to be Recovered after TF",
  C_Cost_Recovery_after_TF: "Cost Recovery after TF",
  C_ETS_after_TF: "ETS after TF",
  C_Cost_To_Be_Deducted: "Cost to be Deducted",
  C_Carry_Forward_Cost: "Carry Forward Cost",
  C_Deductible_Cost: "Deductible Cost",
  C_Carry_Forward_Cost_after_TF: "Carry Forward Cost after TF",
  C_CTR_Share_After: "Ctr. Share After",
  C_CTR_Net_Operating_Profit: "Ctr. Net Operating Profit",
  C_Contractor_Share: "Contractor Share",
  C_Government_Share: "Government Share",
  C_DMO_Volume: "DMO Volume",
  C_DMO_Fee: "DMO Fee",
  C_DDMO: "DDMO",
  C_Taxable_Income: "Taxable Income",
  C_Tax_Due: "Tax Due",
  C_Unpaid_Tax_Balance: "Unpaid Tax Balance",
  C_Tax_Payment: "Tax_Payment",
  C_CTR_Net_Share: "Ctr. Net Share",
  C_Contractor_Take: "Contractor Take",
  C_Cashflow: "Cashflow",
  C_Cum_Cashflow: "Cum.Cashflow",
  C_Government_Take: "Government Take",
} as const

const DataCard = ref([
  { icon: 'tabler-package', color: 'info', title: 'Lifting', value: [{ name: 'Oil', value: '1023.12' }, { name: 'Gas', value: '23.12' }], isHover: false },
  { icon: 'tabler-moneybag', color: 'primary', title: 'Revenue', value: [0, { name: 'Oil', value: '1023.12' }, { name: 'Gas', value: '1023.12' }], isHover: false },
  {
    icon: 'tabler-number-1',
    color: 'warning',
    title: 'Contractor',
    value: [
      { name: 'CTR. Net Share', value: 0 },
      { name: 'Ctr. IRR', value: 0 },
      { name: 'Ctr. PI', value: 0 },
      { name: 'Ctr. POT', value: 0 },
      { name: 'Ctr. NPV', value: 0 },
      { name: 'Ctr. Cashflow', value: 0 },
    ],
    isHover: false,
  },
  {
    icon: 'tabler-number-2',
    color: 'error',
    title: 'Government',
    value: [
      { name: 'Gov. take', value: 0 },
      { name: 'Gov. take NPV', value: 0 },
      { name: 'Gov. DMO', value: 0 },
      { name: 'Gov. FTP', value: 0 },
      { name: 'Gov. tax income', value: 0 },
    ],
    isHover: false,
  },
])

const appStore = useAppStore()
const PyscConf = usePyscConfStore()
const PyscSens = usePyscSensStore()
const PyscMonte = usePyscMonteStore()
const PyscOptim = usePyscOptimStore()
const numbro = Pysc.useNumbro()

const CombineSumm = ref<{ ctrType: number[]; summary: object | null; table: object | null }>({ ctrType: [], summary: null, table: null })
const CombineDist = ref<{ name: string; total: number; dist: Array<number | null> }[]>([])

const CombineConf = ref<Pysc.tCompareType>({
  source: appStore.curSelCase,
  comp: [],
  inflation_rate: 0.0,
  discount_rate: 0.1,
  reference_year: 0,
  npv_mode: 3,
  discounting_mode: 0,
})

const isCombineVisible = ref(false)

const isCalcData = ref(false)

const targetCases = computed(() => {
  if (!isEmpty(CombineConf.value.source))
    return appStore.projects.filter(f => f.type >= 1 && f.type <= 2 && f.id !== CombineConf.value.source).map(v => ({ name: v.name, value: v.id, desc: v.description, tipe: v.type, subtitle: Pysc.is_number(v.type) ? Object.values(Pysc.ContractType)[+v.type] : '' }))

  return []
})

const TablCombineRef = ref()
const tblCombSummRef = ref()
const CombChartRef = ref()
const DistChartRef = ref()

const tableColumnHeader = computed(() => {
  const keys = Object.keys(tableHeaderType)
  const values = Object.values(tableHeaderType)
  const tableKeys = CombineSumm.value.table ? Object.keys(CombineSumm.value.table) : []

  return keys.filter(k => tableKeys.includes(k)).map(k => values[keys.indexOf(k)])
})

const dataTableCombine = computed(() => {
  const values = Object.values(tableHeaderType)
  const tableKeys = CombineSumm.value.table ? Object.keys(CombineSumm.value.table) : []
  const keys = Object.keys(tableHeaderType).filter(k => tableKeys.includes(k))

  return CombineSumm.value.table
    ? CombineSumm.value.table.C_Year.map((row, i) => {
      return keys.map(k => CombineSumm.value.table[k][i])
    })
    : []
})

const closeChips = (caseID: number) => {
  const index = CombineConf.value.comp.findIndex(e => e === caseID)

  CombineConf.value.comp.splice(index, 1)
}

function renderedColumn(instance, td, row, col, prop, value, cellProperties) {
  if (col === 0) {
    const span = document.createElement('span')

    span.classList.add("text-capitalize")
    if (value.search(':') !== -1)
      span.classList.add("font-weight-bold")
    span.innerText = value
    td.innerText = ''
    td.appendChild(span)
  }
  else {
    // const decDot = Intl.NumberFormat().formatToParts(1.1).find(e => e.type === 'decimal').value
    const div = document.createElement('div')
    const unit_ = CombSummSetting.value.data[row] !== undefined ? CombSummSetting.value.data[row][2] : ''

    div.classList.add("d-flex")
    div.classList.add("justify-end")
    div.classList.add("align-center")
    div.innerHTML
      = `<div>${Pysc.fmtNumber(unit_ === '%' ? (value * 100) : value, true, { negative: 'sign' })}</div>`
      + `<div class="ml-3 text-left" style="min-width:78px;font-size:0.6075 !important;">${unit_ ?? ''}</div>`
    td.innerText = ''
    td.appendChild(div)
  }

  return td
}

const CombSummSetting = computed(() => {
  const summList = CombineSumm.value.summary
    ? Object.keys(CombineSumm.value.summary).reduce((rows, k, i) => {
      return [...rows,
        [k + (CombineSumm.value.summary[k].child !== undefined ? ':' : ''),
          CombineSumm.value.summary[k].value,
          CombineSumm.value.summary[k].unit],
        ...CombineSumm.value.summary[k].child
          ? (
            CombineSumm.value.summary[k].child.reduce((child, v, ic) => {
              if (math.isArray(Object.values(v)[0].value)) {
                return [...child,
                  [`   ${Object.keys(v)[0]}`, Object.values(v)[0].value[0], Object.values(v)[0].unit[0]],
                  ['     (% Gross Rev)', Object.values(v)[0].value[1], Object.values(v)[0].unit[1]]]
              }
              else { return [...child, [`   ${Object.keys(v)[0]}`, Object.values(v)[0].value, Object.values(v)[0].unit]] }
            }, [])
          )
          : []]
    }, [])
    : []

  return {
    data: summList,
    contextMenu: Pysc.TableContextMenus([{ name: 'copy' }]),
    columns: [
      { readOnly: true, renderer: renderedColumn },
      { readOnly: true, renderer: renderedColumn },
    ],
    colWidths: [320, 180],
    colHeaders: ["", "Value"],
    height: 'auto',
    width: '100%',
    manualColumnResize: true,
    autoWrapRow: false,
    autoWrapCol: false,
    licenseKey: 'non-commercial-and-evaluation',
  }
})

const chtOption = computed(() => {
  const { themeBorderColor, themeDisabledTextColor, themePrimaryTextColor } = colorVariables(vuetifyTheme.current.value)

  const Opt = {
    backgroundColor: vuetifyTheme.global.name.value === 'dark' ? '#2f3349' : '#ffffff',
    title: { show: false },
    tooltip: {
      trigger: 'axis',
      valueFormatter: value => value !== undefined ? numbro(value).format({ optionalMantissa: true }) : value,
      axisPointer: { type: 'cross' },
    },
    legend: {
      left: "center",
      top: 'bottom',
      textStyle: { width: 80, color: themePrimaryTextColor, overflow: 'truncate' },
      tooltip: { show: true },
    },
    grid: {
      show: true,
      borderColor: themeBorderColor,
      left: 90,
      right: 90,
    },
    xAxis: {
      name: 'Year',
      data: CombineSumm.value.table ? CombineSumm.value.table.C_Year : [],
      axisTick: {
        alignWithLabel: true,
      },
      axisLine: {
        onZero: true,
      },
      nameTextStyle: {
        color: themeDisabledTextColor,
        verticalAlign: "top",
        align: "center",
        padding: 20,
      },
      scale: true,
      nameLocation: "middle",
      axisLabel: { color: themePrimaryTextColor, rotate: 70 },
      splitLine: { show: false, lineStyle: { color: themeBorderColor } },

    },
    yAxis: [{
      type: 'value',
      min: undefined,
      max: undefined,
      minInterval: undefined,
      axisLine: {
        onZero: false,
      },
      name: 'Cum. Cashflow, MUSD',
      splitLine: { show: false, lineStyle: { color: themeBorderColor } },
      axisLabel: {
        color: themePrimaryTextColor,
        formatter: (value, index) => {
          return value !== undefined ? numbro(value).format({ optionalMantissa: true }) : value
        },
      },
      nameTextStyle: {
        color: themeDisabledTextColor,
        verticalAlign: "bottom",
        align: "left",
      },
      nameLocation: "end",
      axisTick: { show: true },
    },
    {
      type: 'value',
      position: 'right',
      name: 'Cashflow, MUSD',
      min: undefined,
      max: undefined,
      minInterval: undefined,
      axisLine: {
        onZero: false,
      },
      splitLine: { show: false, lineStyle: { type: 'dotted', color: themeBorderColor } },
      axisLabel: {
        color: themePrimaryTextColor,
        formatter: (value, index) => {
          return value !== undefined ? numbro(value).format({ optionalMantissa: true }) : value
        },
      },
      nameTextStyle: {
        color: themeDisabledTextColor,
        verticalAlign: "bottom",
        align: "right",
      },
      nameLocation: "end",
      axisTick: { show: true },
    }],
    series: [
      {
        name: "Contr. Cumm. Cashflow",
        type: "line",
        yAxisIndex: 0,
        data: CombineSumm.value.table ? CombineSumm.value.table.C_Cum_Cashflow : [],
        symbol: 'none',
      },
      {
        name: "Contr. Cashflow",
        type: "bar",
        yAxisIndex: 1,
        data: CombineSumm.value.table ? CombineSumm.value.table.C_Cashflow : [],
      },
    ],
  }

  // scale Y axis
  try {
    const lenData = Opt.xAxis.data.length
    const contCF_col = Opt.series[1].data.map(v => Pysc.toNumnber(v))
    const contcumCF_col = Opt.series[0].data.map(v => Pysc.toNumnber(v))
    if (contcumCF_col) {
      let minCFValue = +math.min(contCF_col)
      let maxCFValue = +math.max(contCF_col)
      const lenCFValue = math.abs(maxCFValue - minCFValue)
      const prcLowCFValue = math.abs(minCFValue) / lenCFValue
      const prcHiCFValue = math.abs(maxCFValue) / lenCFValue

      let minCCFValue = +math.min(contcumCF_col)
      let maxCCFValue = +math.max(contcumCF_col)
      const lenCCFValue = math.abs(maxCCFValue - minCCFValue)
      const prcLowCCFValue = math.abs(minCCFValue) / lenCCFValue
      const prcHiCCFValue = math.abs(maxCCFValue) / lenCCFValue

      if (prcLowCCFValue < prcLowCFValue)
        minCCFValue = prcLowCFValue * lenCCFValue * (minCCFValue < 0 ? -1 : 1)
      else if (prcLowCFValue < prcLowCCFValue)
        minCFValue = prcLowCCFValue * lenCFValue * (minCFValue < 0 ? -1 : 1)

      if (prcHiCCFValue < prcHiCFValue)
        maxCCFValue = prcHiCFValue * lenCCFValue * (maxCCFValue < 0 ? -1 : 1)
      else if (prcHiCFValue < prcHiCCFValue)
        maxCFValue = prcHiCCFValue * lenCFValue * (maxCFValue < 0 ? -1 : 1)

      Opt.yAxis[0].min = minCCFValue
      Opt.yAxis[0].max = maxCCFValue
      Opt.yAxis[1].min = minCFValue
      Opt.yAxis[1].max = maxCFValue
    }
  }
  catch (error) {
    console.log(error)
  }

  return Opt
})

const chtDistOption = computed(() => {
  const { themeBorderColor, themeDisabledTextColor, themePrimaryTextColor } = colorVariables(vuetifyTheme.current.value)
  const keyName = Object.keys(tableHeaderType)
  const valueName = Object.values(tableHeaderType)

  return {
    backgroundColor: vuetifyTheme.global.name.value === 'dark' ? '#2f3349' : '#ffffff',
    title: { show: false },
    legend: {
      left: "center",
      top: 'bottom',
      textStyle: CombineConf.value.comp.length ? { width: 80, color: themePrimaryTextColor, overflow: 'truncate' } : { color: themePrimaryTextColor },
      tooltip: { show: true },
    },
    grid: {
      show: true,
      borderColor: themeBorderColor,
      left: 120,
      top: 10,
      right: 10,
    },
    tooltip: {},
    yAxis: {
      type: 'category',
      data: CombineDist.value.map(item => valueName[keyName.indexOf(item.name)]).reverse(),
      axisLabel: {
        color: themePrimaryTextColor,
      },
      axisTick: {

      },
      splitLine: { show: false, lineStyle: { color: themeBorderColor } },
    },
    xAxis: {
      name: '%',
      type: 'value',
      axisLabel: { color: themePrimaryTextColor },
      splitLine: { show: false, lineStyle: { color: themeBorderColor } },
      nameTextStyle: {
        color: themeDisabledTextColor,
        verticalAlign: "top",
        align: "center",
        padding: 10,
      },
      nameLocation: "middle",
      valueFormatter: value => typeof value === 'number' ? numbro(value).format({ optionalMantissa: true }) : value,
    },
    series: [CombineConf.value.source, ...CombineConf.value.comp].map((case_, kesindex) => {
      return {
        type: "bar",
        name: appStore.caseByID(case_)?.name,
        barCategoryGap: 15,
        data: CombineDist.value.map(item => {
          return (item.total ? item.dist[kesindex] / item.total : 0) * 100.0
        }).reverse(),
        tooltip: {
          formatter: (params: Object | [], ticket: string) => {
            const idx_value = valueName.indexOf(params.name)
            const key = keyName[idx_value]
            const idx_dist = CombineDist.value.findIndex(item => item.name === key)
            const distV = idx_dist != -1 ? CombineDist.value[idx_dist].dist : Array(CombineConf.value.comp.length + 1).fill(0.0)
            const distPrc = distV.map(v => CombineDist.value[idx_dist].total ? v / CombineDist.value[idx_dist].total * 100 : 0)

            return `<b>${params.name}:</b><span class="ml-3 font-weight-bold text-caption">${Pysc.fmtNumber(idx_dist != -1 ? CombineDist.value[idx_dist].total : 0)}</span><table>${
              [CombineConf.value.source, ...CombineConf.value.comp].reduce((txt_, v, i) => {
                return `${txt_}<tr><td class="text-truncate" style="max-width:180px !important;">${appStore.caseByID(v)?.name}</td>`
                  + `<td>:</td>`
                  + `<td>${Pysc.fmtNumber(distPrc[i] / 100, true, { output: 'percent' })}</td>`
                  + `<td><span class="text-right text-caption ml-3">${Pysc.fmtNumber(distV[i])}</span></td>`
              }, '')}</table>`
          },
        },
      }
    }),
  }
})

// const loadData = async (urlpath: string, id: number, costmode: number | undefined = undefined) => {
//   const resInit = await execPartData(urlpath, 'GET', costmode != undefined ? { wspath: appStore.curWS, mode: costmode, caseid: id } : { wspath: appStore.curWS, caseid: id })
//   if (resInit.state !== true)
//     throw `error ${urlpath}`

//   return JSON.parse(JSON.stringify(resInit.data))
// }

const calcData = async () => {
  const CombOut = []
  let dataLoaded = false
  let summary_: object | null = null
  let table_: object | null = null
  let ctrType_: number[] = []
  let filename_: string = btoa(appStore.curWS)
  let dataCard_: object | null = null
  let distValue_: object | null = null
  CombineSumm.value = { ctrType: [], summary: null, table: null }
  CombineDist.value.splice(0, CombineDist.value.length, ...[])
  try {
    if ((CombineConf.value.source === appStore.curSelCase || CombineConf.value.comp.includes(appStore.curSelCase))
    /* && appStore.selectedCase.state === 1 */) {
      await useDataStore().saveCaseData(appStore.curWS, appStore.curSelCase,
        PyscConf.generalConfig, PyscConf.producer, PyscConf.contracts, PyscConf.fiscal,
        PyscConf.capCostv2, PyscConf.intangCostv2,
        PyscConf.opexCostv2, PyscConf.asrCostv2, PyscConf.cosCostv2, PyscConf.lbtCostv2,
        PyscSens.sensConfig,
        PyscMonte.monteConfig,
        PyscOptim.optimConfig)
    }
    const listCaseID = [CombineConf.value.source, ...CombineConf.value.comp]
    for (let i = 0; i < listCaseID.length; i++) {
      const _caseid = listCaseID[i]
      const dGConf = _caseid === appStore.curSelCase ? PyscConf.generalConfig : (await useDataStore().loadDataModule('rdgenconf', appStore.curWS, _caseid))
      const dFisc = _caseid === appStore.curSelCase ? PyscConf.fiscal : (await useDataStore().loadDataModule('rdfiscalconf', appStore.curWS, _caseid))
      const dContr = _caseid === appStore.curSelCase ? PyscConf.contracts : (await useDataStore().loadDataModule('rdcontracts', appStore.curWS, _caseid))
      const dProd = _caseid === appStore.curSelCase ? PyscConf.producer : (await useDataStore().loadDataModule('rdproducer', appStore.curWS, _caseid))
      const dTan = _caseid === appStore.curSelCase ? PyscConf.capCostv2 : (await useDataStore().loadDataModule('rdcosts', appStore.curWS, _caseid, 0))
      const dIntan = _caseid === appStore.curSelCase ? PyscConf.intangCostv2 : (await useDataStore().loadDataModule('rdcosts', appStore.curWS, _caseid, 1))
      const dOpex = _caseid === appStore.curSelCase ? PyscConf.opexCostv2 : (await useDataStore().loadDataModule('rdcosts', appStore.curWS, _caseid, 2))
      const dASR = _caseid === appStore.curSelCase ? PyscConf.asrCostv2 : (await useDataStore().loadDataModule('rdcosts', appStore.curWS, _caseid, 3))
      const dCOS = _caseid === appStore.curSelCase ? PyscConf.cosCostv2 : (await useDataStore().loadDataModule('rdcosts', appStore.curWS, _caseid, 4))
      const dLBT = _caseid === appStore.curSelCase ? PyscConf.lbtCostv2 : (await useDataStore().loadDataModule('rdcosts', appStore.curWS, _caseid, 5))

      const dataJson = useDataStore().makeJSONofCase(_caseid,
        dGConf, dProd, dContr, dFisc, dTan, dIntan, dOpex, dASR, dCOS, dLBT, true)

      const { status, result } = await useHTTP().put({
        path: 'combinecase',
        body: {
          ctrtype: dGConf.type_of_contract,
          idx: i,
          last: i === listCaseID.length - 1,
          data: btoa(JSON.stringify({
            CtrType: ctrType_,
            filename: filename_,
            data: dataJson,
            argument: {
              inflation_rate: CombineConf.value.inflation_rate,
              discount_rate: CombineConf.value.discount_rate,
              reference_year: CombineConf.value.reference_year,
              npv_mode: CombineConf.value.npv_mode,
              discounting_mode: CombineConf.value.discounting_mode,
            },
          })),
        },
        onError: (error: any) => { throw error },
      })

      if (status !== 200)
        throw { status, result }

      ctrType_ = JSON.parse(JSON.stringify(result.CtrType))
      filename_ = result.filename
      table_ = result.table ? Object.assign({}, JSON.parse(JSON.stringify(result.table))) : null
      summary_ = result.summary ? Object.assign({}, JSON.parse(JSON.stringify(result.summary))) : null
      dataCard_ = result.dataCard ? Object.assign({}, JSON.parse(JSON.stringify(result.dataCard))) : null
      distValue_ = result.dist ? Object.assign({}, JSON.parse(JSON.stringify(result.dist))) : null
    }
    dataLoaded = true
  }
  catch (err) {
    appStore.showAlert({
      text: `Error ${(err?.status) ?? ''}: ${(err?.result) ?? 'unknown'}`,
      isalert: true,
    })

    // dataTableCompare.value.splice(0, dataTableCompare.value.length, ...[])
    // dataChartCompare.value.splice(0, dataChartCompare.value.length, ...[])
  }
  if (dataLoaded) {
    CombineSumm.value = { ctrType: ctrType_, summary: summary_, table: table_ }

    // lifting
    DataCard.value[0].value[0].value = dataCard_ ? dataCard_.lifting[0] : 0.0
    DataCard.value[0].value[1].value = dataCard_ ? dataCard_.lifting[1] : 0.0

    // revenue
    DataCard.value[1].value[0] = dataCard_ ? dataCard_.revenue[0] : 0.0
    DataCard.value[1].value[1].value = dataCard_ ? dataCard_.revenue[1] : 0.0
    DataCard.value[1].value[2].value = dataCard_ ? dataCard_.revenue[2] : 0.0

    // contractor
    DataCard.value[2].value[0].value = dataCard_ ? (dataCard_.ctr?.NCS) : 0.0
    DataCard.value[2].value[1].value = dataCard_ ? (dataCard_.ctr?.IRR) : 0.0
    DataCard.value[2].value[2].value = dataCard_ ? (dataCard_.ctr?.PI) : 0.0
    DataCard.value[2].value[3].value = dataCard_ ? (dataCard_.ctr?.POT) : 0.0
    DataCard.value[2].value[4].value = dataCard_ ? (dataCard_.ctr?.NPV) : 0.0
    DataCard.value[2].value[5].value = dataCard_ ? (dataCard_.ctr?.CF) : 0.0

    // gov
    DataCard.value[3].value[0].value = dataCard_ ? (dataCard_.gov?.GovTake) : 0.0
    DataCard.value[3].value[1].value = dataCard_ ? (dataCard_.gov?.GovTakeNPV) : 0.0
    DataCard.value[3].value[2].value = dataCard_ ? (dataCard_.gov?.GovDMO) : 0.0
    DataCard.value[3].value[3].value = dataCard_ ? (dataCard_.gov?.FTP) : 0.0
    DataCard.value[3].value[4].value = dataCard_ ? (dataCard_.gov?.GovTaxIncome) : 0.0

    if (distValue_) {
      CombineDist.value.splice(0, CombineDist.value.length, ...Object.keys(distValue_).map(k => {
        return { name: k, total: distValue_[k].total, dist: distValue_[k].case }
      }).filter(item => typeof item.total === 'number' && !isNaN(item.total) && (item.total != 0
        || item.dist.filter(val_ => typeof val_ === 'number' && !isNaN(val_) && val_ != 0).length)),
      )
    }
    updateCombineChart()
    tblCombSummRef.value?.hotInstance.updateSettings(CombSummSetting.value)
  }
  isCalcData.value = false
}

function updateCombineChart() {
  nextTick(() => {
    CombChartRef.value?.setOption(chtOption.value)
    CombChartRef.value?.resize()

    DistChartRef.value?.setOption(chtDistOption.value)
    DistChartRef.value?.resize()
  })
}

const resizeChart = (side: number) => {
  if (side === 0)
    CombChartRef.value?.resize()
  else DistChartRef.value?.resize()
}

watchDebounced(() => [CombineConf.value], val => {
  if (CombineConf.value.source) {
    isCalcData.value = true
    nextTick(() => calcData())
  }
}, { deep: true, debounce: 500, maxWait: 1000 })

const discount_rate = computed({
  get: () => Pysc.numb2Percent(CombineConf.value.discount_rate),
  set: val => {
    if (!isNaN(+val))
      CombineConf.value.discount_rate = Pysc.percent2Numb(val)
  },
})

const inflation_rate = computed({
  get: () => Pysc.numb2Percent(CombineConf.value.inflation_rate),
  set: val => {
    if (!isNaN(+val))
      CombineConf.value.inflation_rate = Pysc.percent2Numb(val)
  },
})

const getNPVSelMode = computed(() => {
  return appStore.NPVSelSett ? Pysc.Field2Array(Pysc.NVPType) : Pysc.Field2Array(Pysc.NVPType).filter(v => v.value >= 2)
})

const optOption = computed(() => {
  return (source: string) => [
    { title: 'Copy to clipboard', value: 'copy2clbrd', icon: 'tabler-clipboard', sourceType: source === 'table' ? 'text' : source },
    { title: `Save to file (*.${source === 'table' ? 'xlsx' : 'png'})`, value: 'save2File', icon: 'tabler-download', sourceType: source },
  ]
})

const getDataSource = (refName: any, setName: any, sourceType: string) => {
  const rndid = Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)
  if (sourceType === 'text' || sourceType === 'table') {
    let tblDataScr = []
    if (!isNullOrUndefined(setName))
      tblDataScr = [refName.hotInstance.getColHeader(), ...refName.hotInstance.getData()]

    else
      tblDataScr = refName.getDataSource()

    if (sourceType === 'text') {
      return tblDataScr.reduce((rowTxt, rowVal) => {
        return `${rowTxt + rowVal.join('\t')}\n`
      }, '')
    }
    else if (sourceType === 'table') {
      return {
        data: [{
          name: (!isNullOrUndefined(setName) ? 'combine summary' : 'combine cashflow'),
          header: [],
          data: tblDataScr,
        }],
        filename: `${!isNullOrUndefined(setName) ? 'combine_summ' : 'combine_cf'}_${rndid}_${appStore.caseByID(CombineConf.value.source)?.name}`.replace(/[/\\ #$~&.]/g, ''),
      }
    }
  }
  else {
    return {
      url: refName.getDataURL({
        type: 'png',
        excludeComponents: ['toolbox'],
      }),
      filename: `combine_chart_${rndid}_${appStore.caseByID(CombineConf.value.source)?.name}`.replace(/[/\\ #$~&.]/g, ''),
    }
  }
}

const showListComb = ref(false)

const combinelist = computed(() => {
  const _lst = appStore.caseCombine
  if (_lst.length === 0)
    return _lst
  if (_lst[0].source !== CombineConf.value.source) {
    const idx_ = _lst.findIndex(l => l.source === CombineConf.value.source)
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
  if (CombineConf.value.source !== source) {
    CombineConf.value = appStore.getCombine(source)
    if (CombineConf.value.reference_year === 0)
      CombineConf.value.reference_year = PyscConf.generalConfig.discount_rate_start_year
    nextTick(() => {
      calcData()
    })
  }
}

const delSource = (source: number) => {
  if (CombineConf.value.source !== source) {
    const idx_ = appStore.caseCombine.findIndex(l => l.source === source)
    if (idx_ !== -1)
      appStore.$patch(state => state.caseCombine.splice(idx_, 1))
  }
}

const showCaseCombine = (caseID: number) => {
  if (!(appStore.caseByID(caseID)?.type > 0))
    return appStore.showAlert({ text: "Only PSC Cost Recovery (CR), PSC Gross Split (GS), and Transition can be combined", isalert: false })
  CombineConf.value = appStore.getCombine(caseID)
  if (CombineConf.value.reference_year === 0)
    CombineConf.value.reference_year = PyscConf.generalConfig.discount_rate_start_year
  isCombineVisible.value = true
  nextTick(() => {
    calcData()
  })
}

defineExpose({
  showCaseCombine,
})
</script>

<template>
  <VDialog
    v-model="isCombineVisible"
    fullscreen
    :scrim="false"
    scrollable
    content-class="scrollable-dialog"
    transition="dialog-bottom-transition"
    @after-leave="() => $emit('combineDlgDone')"
  >
    <VCard>
      <div>
        <VToolbar :color="`rgba(var(--v-theme-primary), ${vuetifyTheme.global.name.value === 'dark' ? 0.2 : 0.8})`">
          <VBtn
            icon
            variant="plain"
            color="white"
            @click="isCombineVisible = false"
          >
            <VIcon icon="tabler-x" />
          </VBtn>

          <VToolbarTitle>
            <div class="d-flex h-100 gap-2 align-center">
              <div>Case Combine</div>
              <IconBtn color="white">
                <VIcon icon="tabler-fold-down" />
                <VMenu
                  v-model="showListComb"
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
                      <IconBtn @click.prevent="showListComb = !showListComb">
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
                            v-for="item in combinelist"
                            :key="`comp-${item.source}`"
                            :active="item.source === CombineConf.source"
                            lines="two"
                            :title="appStore.caseByID(item.source)?.name"
                            @click.prevent="() => chgActiveSource(item.source)"
                          >
                            <template #append>
                              <IconBtn
                                v-show="CombineConf.source !== item.source"
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
                                  :key="`comb-tgt-${item.source}-${tgt.id}`"
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
                  {{ appStore.caseByID(CombineConf.source)?.name }}
                </p>
                <h5 class="my-0 text-xs text-truncate">
                  {{ appStore.caseByID(CombineConf.source)?.description }}
                </h5>
                <VTooltip
                  activator="parent"
                  open-delay="200"
                  scroll-strategy="close"
                >
                  <span>{{ appStore.caseByID(CombineConf.source)?.name }}</span>
                </VTooltip>
              </div>
              <VIcon
                size="26"
                icon="tabler-switch-horizontal"
              />
              <AppSelect
                v-model="CombineConf.comp"
                class="mx-2"
                item-value="value"
                item-title="name"
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
        <VRow>
          <VCol
            cols="12"
            class="d-flex gap-2 justify-start"
          >
            <AppTextField
              v-model.number="CombineConf.reference_year"
              label-placeholder="Discount Rate Start Year"
              :rules="[requiredValidator, integerValidator]"
            />
            <AppTextField
              v-model.number="discount_rate"
              :label-placeholder="['Discount Rate', '%']"
              :rules="[requiredValidator, numberValidator, betweenValidator(discount_rate, 0, 100, appStore.showAlert)]"
            />
            <AppSelect
              v-model="CombineConf.npv_mode"
              :items="getNPVSelMode"
              item-props
              variant="outlined"
              label-placeholder="NPV Mode"
              placeholder="NPV Mode"
            />
            <AppSelect
              v-model="CombineConf.discounting_mode"
              :items="Pysc.Field2Array(Pysc.DiscType)"
              item-props
              variant="outlined"
              label-placeholder="Discounting Mode"
              placeholder="Discounting Mode"
            />
            <AppTextField
              v-model.number="inflation_rate"
              label-placeholder="Inflation Rate, %"
              :rules="[requiredValidator, numberValidator, betweenValidator(inflation_rate, 0, 100, appStore.showAlert)]"
            />
          </VCol>
          <VDivider color="warning" />
        </VRow>
        <VRow>
          <VCol
            v-for="(data, index) in DataCard"
            :key="index"
            cols="12"
            md="3"
            sm="6"
          >
            <div>
              <VCard
                class="logistics-card-statistics cursor-pointer"
                :style="data.isHover ? `border-block-end-color: rgb(var(--v-theme-${data.color}))` : `border-block-end-color: rgba(var(--v-theme-${data.color}),0.38)`"
                @mouseenter="data.isHover = true"
                @mouseleave="data.isHover = false"
              >
                <VCardText :style="{ blockSize: '220px' }">
                  <div class="d-flex align-center gap-x-4 mb-1">
                    <VAvatar
                      variant="tonal"
                      :color="data.color"
                      rounded
                    >
                      <VIcon
                        :icon="data.icon"
                        size="28"
                      />
                    </VAvatar>
                    <h4 class="text-h4">
                      {{ data.title }}
                    </h4>
                  </div>
                  <VTable v-if="Array.isArray(data.value)">
                    <tr v-for="(item, idx) in data.value">
                      <td
                        v-if="!isObject(item)"
                        class="text-h4 mb-1"
                        colspan="2"
                        v-html="Pysc.fmtNumber(item, true, { negative: 'sign' })"
                      />
                      <td v-else>
                        {{ item.name }}
                      </td>
                      <td
                        v-if="isObject(item)"
                        class="text-right"
                        v-html="Pysc.fmtNumber(item.value * (idx == 1 && index == 2 ? 100 : 1), true, {
                          negative: 'sign', spaceSeparated: true, mantissa: 2,
                        })"
                      />
                      <td class="pl-2">
                        <span class="text-sm-caption">{{ !((idx == 1 || idx == 2 || idx == 3) && index == 2) && index
                          != 0
                          ? 'MUSD' : (index == 0
                            && idx == 0 ? ' MMSTB' : (index == 0 && idx == 1 ? ' TBTU' : (idx == 1 && index == 2 ? '%' : (idx
                              == 3
                              && index == 2 ? 'Year' : ''))))
                        }}</span>
                      </td>
                    </tr>
                  </VTable>
                  <!--
                    <div v-if="Array.isArray(data.value)" v-for="(item, idx) in data.value"
                    class="d-flex gap-x-2 align-center">
                    <div v-if="!isObject(item)" class="text-h4 mb-1" v-html="Pysc.fmtNumber(item, true, {
                    negative: 'sign'
                    }) + '<small>  M.USD</small>'" />
                    <div v-else class="d-flex gap-x-2 align-center">
                    <h6 class="text-caption" :class="{ 'mb-2': index < 2 }"
                    :style="{ inlineSize: index >= 2 ? '100px' : '70px' }">
                    {{ item.name }}
                    </h6>
                    <div class="text-disabled" :class="{ 'mb-2': index < 2 }" v-html="Pysc.fmtNumber(item.value, true, {
                    output: (idx == 1 && index == 2 ? 'percent' : 'number'), negative: 'sign', spaceSeparated: true,
                    }) + (!((idx == 1 || idx == 2 || idx == 3) && index == 2) && index != 0 ? '<small> M.USD</small>' : (index == 0 &&
                    idx == 0 ? ' MMSTB' : (index == 0 && idx == 1 ? ' TBTU' : '')))" />
                    </div>
                    </div>
                  -->
                  <div v-else>
                    <div class="text-h4 mb-1">
                      {{ numbro(data.value).format({
                        mantissa: 2, thousandSeparated: true, negative: "sign",
                      }) }}<small>MUSD</small>
                    </div>
                  </div>
                </VCardText>
              </VCard>
            </div>
          </VCol>
        </VRow>
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
              :get-source="(value: string, sourceType: string) => getDataSource(tblCombSummRef, CombSummSetting, sourceType)"
            />
          </template>
          <template #left>
            <HotTable
              ref="tblCombSummRef"
              :settings="CombSummSetting"
              license-key="non-commercial-and-evaluation"
            />
          </template>
          <template #right-header="{ isCollapsed }">
            Cashflow Table
          </template>
          <template #after-right-header="{ isCollapsed }">
            <DotdotOpt
              v-if="!isCollapsed"
              :menu-list="optOption('table')"
              title="Options"
              item-props
              dot-only
              :get-source="(value: string, sourceType: string) => getDataSource(TablCombineRef, null, sourceType)"
            />
          </template>
          <template #right>
            <TableCombine
              ref="TablCombineRef"
              :lst-ctr="CombineSumm.ctrType"
              :columns="tableColumnHeader"
              :data="dataTableCombine"
            />
          </template>
        </ColapsibleCols>
        <ColapsibleCols
          class="mt-5"
          @update:container="resizeChart"
        >
          <template #left-header="{ isCollapsed }">
            Cashflow Chart
          </template>
          <template #after-left-header="{ isCollapsed }">
            <DotdotOpt
              v-if="!isCollapsed"
              :menu-list="optOption('image')"
              title="Options"
              item-props
              dot-only
              :get-source="(value: string, sourceType: string) => getDataSource(CombChartRef, null, sourceType)"
            />
          </template>
          <template #left>
            <VChart
              ref="CombChartRef"
              class="combine-chart"
              :option="chtOption"
            />
          </template>
          <template #right-header="{ isCollapsed }">
            Contribution Chart
          </template>
          <template #after-right-header="{ isCollapsed }">
            <DotdotOpt
              v-if="!isCollapsed"
              :menu-list="optOption('image')"
              title="Options"
              item-props
              dot-only
              :get-source="(value: string, sourceType: string) => getDataSource(DistChartRef, null, sourceType)"
            />
          </template>
          <template #right>
            <VChart
              ref="DistChartRef"
              class="dist-chart"
              :option="chtDistOption"
              :style="{ minBlockSize: `${425 + ((math.max(CombineConf.comp.length, 1) - 1) * (CombineDist.length * 2))}px` }"
            />
          </template>
        </ColapsibleCols>
      </VCardText>
    </VCard>
  </VDialog>
</template>

<style lang="scss" scoped>
@use "@core/scss/base/mixins" as mixins;

.dialog-bottom-transition-enter-active,
.dialog-bottom-transition-leave-active {
  transition: transform 0.2s ease-in-out;
}

.logistics-card-statistics {
  border-block-end-style: solid;
  border-block-end-width: 2px;

  &:hover {
    border-block-end-width: 3px;
    margin-block-end: -1px;

    @include mixins.elevation(8);

    transition: all 0.1s ease-out;
  }
}

.skin--bordered {
  .logistics-card-statistics {
    border-block-end-width: 2px;

    &:hover {
      border-block-end-width: 3px;
      margin-block-end: -2px;
      transition: all 0.1s ease-out;
    }
  }
}

.scrollable-dialog {
  overflow: visible !important;
}

.combine-chart {
  min-block-size: 425px;
}
</style>

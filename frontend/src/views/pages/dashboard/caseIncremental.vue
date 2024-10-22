<script setup lang="ts">
import DotdotOpt from '@/pages/components/dotdotOpt.vue'
import { useAppStore } from '@/stores/appStore'
import { useHTTP } from '@/utils/pysc/useHttp'
import { hexToRgb } from '@layouts/utils'
import { BarChart, LineChart } from "echarts/charts"
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from "echarts/components"
import { use } from "echarts/core"
import { CanvasRenderer } from "echarts/renderers"
import 'handsontable/dist/handsontable.full.css'
import { abs, isArray, isNaN, max, min, sum } from 'mathjs'
import VChart from "vue-echarts"
import type { ThemeInstance } from 'vuetify'
import { useTheme } from 'vuetify'
import { VSpacer, VTooltip } from 'vuetify/lib/components/index.mjs'
import ColapsibleCols from "@/views/components/colapsibleCols.vue"
import { useDataStore } from '@/utils/pysc/useDataStore'
import { ContractType, DiscType, Field2Array, NVPType, fmtNumber, is_number, numb2Percent, percent2Numb, type tIncrType, toNumnber, useNumbro } from '@/utils/pysc/pyscType'
import { usePyscSensStore } from '@/stores/sensStore'
import { usePyscOptimStore } from '@/stores/optimStore'
import { usePyscConfStore } from '@/stores/genfisStore'
import { usePyscMonteStore } from '@/stores/monteStore'

interface Emit {
  (e: 'incrDlgDone'): void
}

const emit = defineEmits<Emit>()

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

const isIncrVisible = ref(false)
const isCalcData = ref(false)
const refIncrCtrlForm = ref()
const CFChartRef = ref()
const appStore = useAppStore()
const PyscConf = usePyscConfStore()
const PyscSens = usePyscSensStore()
const PyscMonte = usePyscMonteStore()
const PyscOptim = usePyscOptimStore()
const numbro = useNumbro()

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

const caseIncrConf = ref<tIncrType>({
  source: appStore.curSelCase,
  comp: null,
  inflation_rate: 0.0,
  discount_rate: 0.1,
  reference_year: 0,
  npv_mode: 3,
  discounting_mode: 0,
})

const IncrSumm = ref<{ ctrType: number[]; summary: object | null; table: object | null }>({ ctrType: [], summary: null, table: null })
const IncrDist = ref<{ name: string; total: number; dist: Array<number | null> }[]>([])

const tblSummRender = (instance, td, row, col, prop, value, cellProperties) => {
  if (col === 0) {
    let _span = td.querySelector('.sum-var-name')
    if (isNullOrUndefined(_span)) {
      td.innerText = ''
      _span = document.createElement('span')
      _span.classList.add("sum-var-name")
      _span.classList.add("text-capitalize")
      td.appendChild(_span)
    }
    if (value.search(':') !== -1) {
      if (!_span.classList.contains('font-weight-bold'))
        _span.classList.add("font-weight-bold")
    }
    else if (_span.classList.contains('font-weight-bold')) { _span.classList.remove("font-weight-bold") }
    _span.innerText = value
  }
  else {
    const data_ = IncrSummSetting.value?.data[cellProperties.row]
    const unit_ = (data_ && data_[2]) ?? ''

    let _div = td.querySelector('.sum-var-value')
    if (isNullOrUndefined(_div)) {
      td.innerText = ''
      _div = document.createElement('div')
      _div.classList.add(".sum-var-value")
      _div.classList.add("d-flex")
      _div.classList.add("justify-end")
      _div.classList.add("align-center")
      td.appendChild(_div)
    }
    _div.innerHTML
      = `<div>${fmtNumber(unit_ === '%' ? (value * 100) : value, true, { negative: 'parenthesis' })}</div>`
      + `<div class="ml-3 text-left" style="min-width:78px;font-size:0.6075 !important;">${unit_ ?? ''}</div>`
  }

  return td
}

const renderedCFColumn = (instance, td, row, col, prop, value, cellProperties) => {
  td.classList.add("htRight")
  td.classList.add("htMiddle")
  if (col === 0) {
    const div = document.createElement('div')

    div.classList.add("d-flex")
    div.classList.add("justify-center")

    const span = document.createElement('span')

    span.innerHTML = `${value ?? ""}<small></small>`
    div.appendChild(span)
    td.innerText = ""
    td.appendChild(div)
  }
  else {
    if (row + 1 === IncrCFSetting.value?.data.length) {
      td.classList.add("bg-light-success")
      td.classList.add("font-weight-bold")
    }

    const div = document.createElement('div')

    div.classList.add("d-flex")
    div.classList.add("justify-end")

    const span = document.createElement('span')

    const valTxt = fmtNumber(value, true, { negative: 'parenthesis' })

    span.innerHTML = valTxt
    div.appendChild(span)
    td.innerText = ""
    td.appendChild(div)
  }

  return td
}

const { TabelContainer: tblIncrContainer, hotTableRef: tblIncrSummRef, htTblSett: IncrSummSetting, updateData: updateDataSumm } = useHTtable({
  data: [],
  colHeaders: ["", "Value"],
  columns: [
    { renderer: tblSummRender },
    { renderer: tblSummRender },
  ],
  readOnly: true,
  rowHeaders: false,
}, "data")

const { TabelContainer: tblIncrCFContainer, hotTableRef: tblIncrCFRef, htTblSett: IncrCFSetting, updateSetting: updateSettingCF } = useHTtable({
  data: [],
  columns: [],
  readOnly: true,
  rowHeaders: false,
}, "data")

const { themeBorderColor, themeDisabledTextColor, themePrimaryTextColor } = colorVariables(vuetifyTheme.current.value)

const incrChtOption = ref({
  backgroundColor: vuetifyTheme.global.name.value === 'dark' ? '#2f3349' : '#ffffff',
  title: {
    show: true,
    text: 'Incremental Cashflow',
    left: 'center',
    textStyle: {
      color: themePrimaryTextColor,
    },
    subtextStyle: {
      color: themePrimaryTextColor,
    },
  },
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
    data: [],
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
      data: [],
      symbol: 'none',
    },
    {
      name: "Contr. Cashflow",
      type: "bar",
      yAxisIndex: 1,
      data: [],
    },
  ],
})

const calcData = async () => {
  isCalcData.value = true
  console.log('calcData')

  const IncrOut = []
  let dataLoaded = false
  let summary_: object | null = null
  let table_: object | null = null
  const dataCard_: object | null = null
  const distValue_: object | null = null

  IncrSumm.value = { ctrType: [], summary: null, table: null }
  IncrDist.value.splice(0, IncrDist.value.length, ...[])

  const listCaseID = [caseIncrConf.value.source, ...(!isNullOrUndefined(caseIncrConf.value.comp) ? [caseIncrConf.value.comp] : [])]
  const dataJson = Array(listCaseID.length).fill(null)
  const ctrType_ = Array(listCaseID.length).fill(null)

  try {
    if (caseIncrConf.value.source === appStore.curSelCase || caseIncrConf.value.comp === appStore.curSelCase) {
      await useDataStore().saveCaseData(appStore.curWS, appStore.curSelCase,
        PyscConf.generalConfig, PyscConf.producer, PyscConf.contracts, PyscConf.fiscal,
        PyscConf.tangible, PyscConf.intangible,
        PyscConf.opex, PyscConf.asr, PyscConf.cos, PyscConf.lbt,
        PyscSens.sensConfig,
        PyscMonte.monteConfig,
        PyscOptim.optimConfig)
    }
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

      ctrType_[i] = dGConf.type_of_contract

      dataJson[i] = useDataStore().makeJSONofCase(_caseid,
        dGConf, dProd, dContr, dFisc, dTan, dIntan, dOpex, dASR, dCOS, dLBT, true)
    }

    const { status, result } = await useHTTP().put({
      path: 'incrementalcase',
      body: {
        CtrType: ctrType_,
        data: btoa(JSON.stringify({
          data: dataJson,
          argument: {
            inflation_rate: caseIncrConf.value.inflation_rate,
            discount_rate: caseIncrConf.value.discount_rate,
            reference_year: caseIncrConf.value.reference_year,
            npv_mode: caseIncrConf.value.npv_mode,
            discounting_mode: caseIncrConf.value.discounting_mode,
          },
        })),
      },
      onError: (error: any) => { throw error },
    })

    if (status !== 200)
      throw { status, result }

    // console.log(result)

    summary_ = result.summary ? Object.assign({}, JSON.parse(JSON.stringify(result.summary))) : null
    table_ = result.table ? Object.assign({}, JSON.parse(JSON.stringify(result.table))) : null

    dataLoaded = true
  }
  catch (err) {
    appStore.showAlert({
      text: `Error ${(err?.status) ?? ''}: ${(err?.result) ?? 'unknown'}`,
      isalert: true,
    })
  }

  if (dataLoaded) {
    // fill table Summ
    updateDataSumm(summary_
      ? Object.keys(summary_).reduce((rows, k, i) => {
        return [...rows,
          [k + (summary_[k].child !== undefined ? ':' : ''),
            summary_[k].value,
            summary_[k].unit],
          ...summary_[k].child
            ? (
                summary_[k].child.reduce((child, v, ic) => {
                  if (isArray(Object.values(v)[0].value)) {
                    return [...child,
                      [`   ${Object.keys(v)[0]}`, Object.values(v)[0].value[0], Object.values(v)[0].unit[0]],
                      ['     (% Gross Rev)', Object.values(v)[0].value[1], Object.values(v)[0].unit[1]]]
                  }
                  else { return [...child, [`   ${Object.keys(v)[0]}`, Object.values(v)[0].value, Object.values(v)[0].unit]] }
                }, [])
              )
            : []]
      }, [])
      : [])

    // fill table CF
    const keys = Object.keys(tableHeaderType)
    const values = Object.values(tableHeaderType)
    const tableKeys = table_ ? Object.keys(table_) : []
    const _keyTableData = keys.filter(k => tableKeys.includes(k))
    const _columnHeader = _keyTableData.map(k => values[keys.indexOf(k)])

    if (useArrayUnique(ctrType_).value.length === 1) {
      IncrCFSetting.value.nestedHeaders = undefined
      IncrCFSetting.value.colHeaders = _columnHeader
    }
    else {
      IncrCFSetting.value.colHeaders = undefined
      IncrCFSetting.value.nestedHeaders = [
        [{ label: '', colspan: 11 }, { label: 'PSC-Cost Recovery', colspan: 11 }, { label: 'PSC-GrossSplit', colspan: 6 }, { label: '', colspan: 6 }, { label: 'PSC-Cost Recovery', colspan: 2 }, { label: '', colspan: 6 }],
        _columnHeader,
      ]
    }

    // IncrCFSetting.value.columns = Array(_columnHeader.length).fill({ type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, negative: "parenthesis" } } })
    IncrCFSetting.value.columns = Array(_columnHeader.length).fill({ renderer: renderedCFColumn })
    IncrCFSetting.value.columns[0] = { type: 'numeric' }
    IncrCFSetting.value.data = table_ ? table_.C_Year.map((row, i) => _keyTableData.map(k => table_[k][i])) : []
    if (IncrCFSetting.value.data.length && IncrCFSetting.value.data[0].length) {
      const sum_rows = Array(IncrCFSetting.value.data[0].length).fill(0.0)
      const crows = sum_rows.length

      sum_rows.splice(0, sum_rows.length, ...sum_rows.map((col, c_) => {
        if (c_ === crows - 2 || (ctrType_.includes(1) && [18, 19].includes(c_))) {
          return IncrCFSetting.value.data[IncrCFSetting.value.data.length - 1][c_]
        }
        else if (c_ !== 0 && c_ !== crows - 2) {
          const cols = IncrCFSetting.value.data.slice(0).map(row => row[c_])

          return sum(IncrCFSetting.value.data.map(row => toNumnber(row[c_])))
        }

        return ""
      }))
      IncrCFSetting.value.data.push(sum_rows)
    }

    updateSettingCF()

    // update Chart
    incrChtOption.value.xAxis.data.splice(0, incrChtOption.value.xAxis.data.length, ...(table_ ? table_.C_Year : []))
    incrChtOption.value.series[0].data.splice(0, incrChtOption.value.series[0].data.length, ...(table_ ? table_.C_Cum_Cashflow : []))
    incrChtOption.value.series[1].data.splice(0, incrChtOption.value.series[1].data.length, ...(table_ ? table_.C_Cashflow : []))

    // scale Y axis
    try {
      const lenData = incrChtOption.value.xAxis.data.length
      const contCF_col = incrChtOption.value.series[1].data.map(v => toNumnber(v))
      const contcumCF_col = incrChtOption.value.series[0].data.map(v => toNumnber(v))
      if (contcumCF_col) {
        let minCFValue = +min(contCF_col)
        let maxCFValue = +max(contCF_col)
        const lenCFValue = abs(maxCFValue - minCFValue)
        const prcLowCFValue = abs(minCFValue) / lenCFValue
        const prcHiCFValue = abs(maxCFValue) / lenCFValue

        let minCCFValue = +min(contcumCF_col)
        let maxCCFValue = +max(contcumCF_col)
        const lenCCFValue = abs(maxCCFValue - minCCFValue)
        const prcLowCCFValue = abs(minCCFValue) / lenCCFValue
        const prcHiCCFValue = abs(maxCCFValue) / lenCCFValue

        if (prcLowCCFValue < prcLowCFValue)
          minCCFValue = prcLowCFValue * lenCCFValue * (minCCFValue < 0 ? -1 : 1)
        else if (prcLowCFValue < prcLowCCFValue)
          minCFValue = prcLowCCFValue * lenCFValue * (minCFValue < 0 ? -1 : 1)

        if (prcHiCCFValue < prcHiCFValue)
          maxCCFValue = prcHiCFValue * lenCCFValue * (maxCCFValue < 0 ? -1 : 1)
        else if (prcHiCFValue < prcHiCCFValue)
          maxCFValue = prcHiCCFValue * lenCFValue * (maxCFValue < 0 ? -1 : 1)

        incrChtOption.value.yAxis[0].min = minCCFValue
        incrChtOption.value.yAxis[0].max = maxCCFValue
        incrChtOption.value.yAxis[1].min = minCFValue
        incrChtOption.value.yAxis[1].max = maxCFValue
      }
    }
    catch (error) {
      console.log(error)
    }
  }
  isCalcData.value = false
}

const optOption = computed(() => {
  return (source: string) => [
    { title: 'Copy to clipboard', value: 'copy2clbrd', icon: 'tabler-clipboard', sourceType: source === 'table' ? 'text' : source },
    { title: `Save to file (*.${source === 'table' ? 'xlsx' : 'png'})`, value: 'save2File', icon: 'tabler-download', sourceType: source },
  ]
})

const getDataSource = (refName: any, setName: any, title: string, sourceType: string) => {
  const rndid = Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)
  if (sourceType === 'text' || sourceType === 'table') {
    let tblDataScr = []
    tblDataScr = [refName.hotInstance.getColHeader(), ...refName.hotInstance.getData()]

    if (sourceType === 'text') {
      return tblDataScr.reduce((rowTxt, rowVal) => {
        return `${rowTxt + rowVal.join('\t')}\n`
      }, '')
    }
    else if (sourceType === 'table') {
      return {
        data: [{
          name: title,
          header: [],
          data: tblDataScr,
        }],
        filename: `${title}_${rndid}_${appStore.caseByID(caseIncrConf.value.source)?.name}`.replace(/[/\\ #$~&.]/g, ''),
      }
    }
  }
  else {
    return {
      url: refName.getDataURL({
        type: 'png',
        excludeComponents: ['toolbox'],
      }),
      filename: `${title}_${rndid}_${appStore.caseByID(caseIncrConf.value.source)?.name}`.replace(/[/\\ #$~&.]/g, ''),
    }
  }
}

watchDebounced(caseIncrConf, val => {
  refIncrCtrlForm.value?.validate().then(({ valid }) => {
    if (valid && !isCalcData.value)
      calcData()
  })
}, { debounce: 1000, immediate: false, maxWait: 5000, deep: true })

const switchSource = ev => {
  ev.stopImmediatePropagation()
  ev.preventDefault()
  if (!isNullOrUndefined(caseIncrConf.value.comp)) {
    const _incrConf = appStore.getIncr(caseIncrConf.value.comp)

    _incrConf.comp = caseIncrConf.value.source
    _incrConf.discount_rate = caseIncrConf.value.discount_rate
    _incrConf.discounting_mode = caseIncrConf.value.discounting_mode
    _incrConf.inflation_rate = caseIncrConf.value.inflation_rate
    _incrConf.npv_mode = caseIncrConf.value.npv_mode
    _incrConf.reference_year = caseIncrConf.value.reference_year

    caseIncrConf.value = _incrConf
  }
}

const targetCases = computed(() => {
  if (!isEmpty(caseIncrConf.value.source))
    return appStore.projects.filter(f => [1, 2].includes(f.type) && f.id !== caseIncrConf.value.source).map(v => ({ name: v.name, value: v.id, desc: v.description, tipe: v.type, subtitle: is_number(v.type) ? Object.values(ContractType)[+v.type] : '' }))

  return []
})

const discount_rate = computed({
  get: () => numb2Percent(caseIncrConf.value.discount_rate),
  set: val => {
    if (!isNaN(+val))
      caseIncrConf.value.discount_rate = percent2Numb(val)
  },
})

const inflation_rate = computed({
  get: () => numb2Percent(caseIncrConf.value.inflation_rate),
  set: val => {
    if (!isNaN(+val))
      caseIncrConf.value.inflation_rate = percent2Numb(val)
  },
})

const getNPVSelMode = computed(() => {
  return appStore.NPVSelSett ? Field2Array(NVPType) : Field2Array(NVPType).filter(v => v.value >= 2)
})

const showCaseIncr = (caseID: number) => {
  if (![1, 2].includes(appStore.caseByID(caseID)?.type))
    return appStore.showAlert({ text: "Only PSC Cost Recovery (CR), PSC Gross Split (GS) can be process", isalert: false })
  caseIncrConf.value = appStore.getIncr(caseID)
  if (caseIncrConf.value.reference_year === 0)
    caseIncrConf.value.reference_year = PyscConf.generalConfig.discount_rate_start_year
  isIncrVisible.value = true

  nextTick(() => {
    calcData()
  })
}

defineExpose({
  showCaseIncr,
})
</script>

<template>
  <VDialog
    v-model="isIncrVisible"
    fullscreen
    :scrim="false"
    scrollable
    content-class="scrollable-dialog"
    transition="dialog-bottom-transition"
    @after-leave="() => $emit('incrDlgDone')"
  >
    <VCard :loading="isCalcData">
      <div>
        <VToolbar :color="`rgba(var(--v-theme-primary), ${vuetifyTheme.global.name.value === 'dark' ? 0.2 : 0.9})`">
          <VBtn
            icon
            variant="plain"
            color="white"
            @click="isIncrVisible = false"
          >
            <VIcon icon="tabler-x" />
          </VBtn>

          <VToolbarTitle>
            <div class="d-flex h-100 align-center">
              <div>Case Increamental</div>
              <div
                class="mx-4 my-2"
                :style="{ maxInlineSize: '270px' }"
              >
                <p class="my-0 text-truncate">
                  {{ appStore.caseByID(caseIncrConf.source)?.name }}
                </p>
                <h5 class="my-0 text-xs text-truncate">
                  {{ appStore.caseByID(caseIncrConf.source)?.description }}
                </h5>
                <VTooltip
                  activator="parent"
                  open-delay="200"
                  scroll-strategy="close"
                >
                  <span>{{ appStore.caseByID(caseIncrConf.source)?.name }}</span>
                </VTooltip>
              </div>
              <VIcon
                size="24"
                class="me-1"
                icon="tabler-minus"
              />
              <AppSelect
                v-model="caseIncrConf.comp"
                class="mx-2"
                item-value="value"
                item-title="name"
                :items="targetCases"
                item-props
                placeholder="Select case"
              >
                <template #prepend-inner="{ blur }">
                  <IconBtn
                    :disabled="isNullOrUndefined(caseIncrConf.comp)"
                    @click="(ev) => switchSource(ev)"
                  >
                    <VIcon
                      size="21"
                      icon="tabler-switch-horizontal"
                    />
                    <VTooltip activator="parent">
                      Switch as source
                    </VTooltip>
                  </IconBtn>
                </template>
                <template #selection="{ item }">
                  <VAvatar
                    start
                    color="primary"
                  >
                    <h6>
                      {{ item.raw.tipe === 1 ? "CR" : (item.raw.tipe === 2 ? "GS" : "T") }}
                    </h6>
                  </VAvatar>
                  <span class="text-truncate">
                    {{ item.raw.name }}
                  </span>
                  <VTooltip
                    activator="parent"
                    open-delay="200"
                    scroll-strategy="close"
                  >
                    <span>{{ item.raw.name }}</span>
                  </VTooltip>
                </template>
              </AppSelect>
            </div>
          </VToolbarTitle>
        </VToolbar>
      </div>
      <VCardText>
        <VForm
          ref="refIncrCtrlForm"
          @submit.prevent="() => {}"
        >
          <VRow>
            <VCol
              cols="12"
              class="d-flex gap-2 justify-start"
            >
              <AppTextField
                v-model.number="caseIncrConf.reference_year"
                label-placeholder="Discount Rate Start Year"
                :rules="[requiredValidator, integerValidator]"
              />
              <AppTextField
                v-model.number="discount_rate"
                :label-placeholder="['Discount Rate', '%']"
                :rules="[requiredValidator, numberValidator, betweenValidator(discount_rate, 0, 100, appStore.showAlert)]"
              />
              <AppSelect
                v-model="caseIncrConf.npv_mode"
                :items="getNPVSelMode"
                item-props
                variant="outlined"
                label-placeholder="NPV Mode"
                placeholder="NPV Mode"
              />
              <AppSelect
                v-model="caseIncrConf.discounting_mode"
                :items="Field2Array(DiscType)"
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
          </VRow>
        </VForm>
        <VSpacer class="mb-2" />
        <ColapsibleCols>
          <template #left-header="{ isCollapsed }">
            Summary
          </template>
          <template #after-left-header="{ isCollapsed }">
            <DotdotOpt
              :menu-list="optOption('table')"
              title="Options"
              item-props
              dot-only
              :get-source="(value: string, sourceType: string) => getDataSource(tblIncrSummRef, IncrSummSetting, 'Incremental Summary', sourceType)"
            />
          </template>
          <template #left>
            <VCardText ref="tblIncrContainer">
              <HotTable
                ref="tblIncrSummRef"
                :settings="IncrSummSetting"
                license-key="non-commercial-and-evaluation"
              />
            </VCardText>
          </template>
          <template #right-header="{ isCollapsed }">
            Cashflow Table
          </template>
          <template #after-right-header="{ isCollapsed }">
            <DotdotOpt
              :menu-list="optOption('table')"
              title="Options"
              item-props
              dot-only
              :get-source="(value: string, sourceType: string) => getDataSource(tblIncrCFRef, IncrCFSetting, 'Incremental Cashflow', sourceType)"
            />
          </template>
          <template #right>
            <VCardText ref="tblIncrCFContainer">
              <HotTable
                ref="tblIncrCFRef"
                :settings="IncrCFSetting"
                license-key="non-commercial-and-evaluation"
              />
            </VCardText>
          </template>
        </ColapsibleCols>
        <AppCardActions
          action-collapsed
          title="Cashflow"
          compact-header
          class="mt-4"
          style="overflow: visible !important;"
        >
          <template #before-actions="{ isContentCollapsed }">
            <DotdotOpt
              v-if="!isContentCollapsed"
              :menu-list="optOption('image')"
              title="Options"
              item-props
              dot-only
              :get-source="(value: string, sourceType: string) => getDataSource(CFChartRef, null, 'Incremental Cashflow', sourceType)"
            />
          </template>
          <VCardText>
            <VChart
              ref="CFChartRef"
              class="incr-cf-chart"
              :option="incrChtOption"
            />
          </VCardText>
        </AppCardActions>
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

.incr-cf-chart {
  min-block-size: 425px;
}

.col-collapsed-1 {
  .v-col {
    &:last-child {
      div {
        &:first-child{
          height: 100%;
        }
      }
    }
  }
}
</style>

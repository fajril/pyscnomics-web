<script setup lang="ts">
import { useAppStore } from '@/stores/appStore'
import { useHTTP } from '@/utils/pysc/useHttp'
import { breakpointsVuetifyV3 } from '@vueuse/core'
import * as math from 'mathjs'
import { useDraggable } from 'vue-draggable-plus'
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'
import DotdotOpt from '../components/dotdotOpt.vue'
import { usePyscConfStore } from '@/stores/genfisStore'
import { optimParamType, optimTarget, usePyscOptimStore } from '@/stores/optimStore'
import * as Pysc from "@/utils/pysc/pyscType"
import { useDataStore } from '@/utils/pysc/useDataStore'
import BarChartCompare from '@/views/components/chartBarCompare.vue'
import ChartCompare from '@/views/components/chartCompare.vue'
import ColapsibleCols from '@/views/components/colapsibleCols.vue'
import TableCompare from '@/views/components/tableCompare.vue'

definePage({
  name: 'pysc-optim',
  path: '/pysc-optim',
  meta: {
    title: "Optimization",
  },
})

const isLessThanCardBreaklg = computed(() => useMediaQuery(`(max-width: ${breakpointsVuetifyV3.lg}px)`).value)

const appStore = useAppStore()
const PyscConf = usePyscConfStore()
const PyscOptim = usePyscOptimStore()
const { optimConfig } = storeToRefs(PyscOptim)
const numbro = Pysc.useNumbro()
const dayjs = Pysc.useDayJs()

const isLoading = ref(false)

const isPSC = computed(() => {
  return [1, 3, 6].includes(PyscConf.generalConfig.type_of_contract)
})

const paramsOptim = computed(() => {
  const lst = isPSC.value
    ? [0, 1, 2, 3, 4, 5, 6, 7, /* 8, */9, 12, 13, 11]
    : [/* 8, */9, 12, 13, 11, 10]

  return lst.map((v, i) => ({ title: Object.values(optimParamType)[v], value: v }))
})

const isHigher = (paramId: number) => ![2, 3, 8, 9].includes(paramId)

const getInfoParam = (paramId: number) => {
  const higher = '<span class="text-success font-weight-bold">higher</span>'
  const lower = '<span class="text-error font-weight-bold">lower</span>'
  if (paramId === 0)
    return `A ${higher} value of this optimization parameter enhances the contractor's economic indicator while diminishing the government's economic indicator`
  else if (paramId === 1)
    return `A ${higher} value of this parameter enhances the contractor's economic indicator while diminishing the government's economic indicator`
  else if (paramId === 2)
    return `A ${lower} value of this parameter enhances the contractor's economic indicator while diminishing the government's economic indicator`
  else if (paramId === 3)
    return `A ${lower} value of this parameter enhances the contractor's economic indicator while diminishing the government's economic indicator`
  else if (paramId === 4)
    return `A ${higher} value of this parameter typically enhances the contractor's economic indicator while diminishing the government's. However, under certain conditions, the opposite effect may occur`
  else if (paramId === 5)
    return `A ${higher} value of this parameter typically enhances the contractor's economic indicator while diminishing the government's. However, under certain conditions, the opposite effect may occur`
  else if (paramId === 6)
    return `A ${higher} value of this parameter enhances the contractor's economic indicator while diminishing the government's economic indicator`
  else if (paramId === 7)
    return `A ${higher} value of this parameter enhances the contractor's economic indicator while diminishing the government's economic indicator`
  else if (paramId === 8)
    return `A ${lower} value of this parameter enhances the contractor's economic indicator while diminishing the government's economic indicator`
  else if (paramId === 9)
    return `A ${lower} value of this parameter enhances the contractor's economic indicator while diminishing the government's economic indicator`
  else if (paramId === 10)
    return `A ${higher} value of this parameter enhances the contractor's economic indicator while diminishing the government's economic indicator`
  else if (paramId === 11)
    return `A ${higher} value of this parameter enhances the contractor's economic indicator while diminishing the government's economic indicator.`
  else if (paramId === 12)
    return `A ${higher}  value of this parameter enhances the contractor's economic indicator while diminishing the government's economic indicator`
  else if (paramId === 13)
    return `A ${higher} value of this parameter enhances the contractor's economic indicator while diminishing the government's economic indicator`

  return ''
}

const optimParamChanged = (parID: number) => {
  if (parID === -2) {
    PyscOptim.$patch(state => {
      const lParsChecked = state.optimConfig.optimization.filter(p => paramsOptim.value.map(l => l.value).includes(p.parameter) && p.checked).map(p => p.pos)
      let nIndex = lParsChecked.length ? math.max(lParsChecked) : 0
      const lParsUnchecked = state.optimConfig.optimization.filter(p => paramsOptim.value.map(l => l.value).includes(p.parameter) && !p.checked)
      if (lParsUnchecked.length) {
        lParsUnchecked.forEach(p => {
          p.checked = true
          p.pos = ++nIndex
        })
      }
    })
  }
  else if (parID === -3) {
    PyscOptim.$patch(state => {
      state.optimConfig.optimization.forEach(p => p.checked = false)
    })
  }
  else {
    const index = optimConfig.value.optimization.findIndex(p => p.parameter === parID)

    PyscOptim.$patch(state => {
      const lParsChecked = state.optimConfig.optimization.filter(p => paramsOptim.value.map(l => l.value).includes(p.parameter) && p.checked).map(p => p.pos)
      const nIndex = lParsChecked.length ? (math.max(lParsChecked) + 1) : 0

      state.optimConfig.optimization[index].checked = !state.optimConfig.optimization[index].checked
      if (state.optimConfig.optimization[index].checked)
        state.optimConfig.optimization[index].pos = nIndex
    })
  }
  nextTick(() => buildDataParams())
}

const dragAbleList = ref()

const dataParams = ref<{
  parameter: number
  min: number | null
  max: number | null
  base: number | null
}[]>([])

const watcherOptimData = pausableWatch(dataParams,
  (value, oldValue) => {
    if (appStore.watcherSelCase.isActive && PyscOptim.watcherOptimCfg.isActive) {
      value.forEach(el => {
        const index = optimConfig.value.optimization.findIndex(o => o.parameter === el.parameter)

        optimConfig.value.optimization[index].min = el.min !== null && !isNaN(+el.min) ? +el.min / 100.0 : 0.0
        optimConfig.value.optimization[index].max = el.max !== null && !isNaN(+el.max) ? +el.max / 100.0 : 0.0
      })
    }
  }, { deep: true })

const getBaseValue = (paramID: number) => {
  if (paramID >= 0 && paramID <= 7) {
    const cr: Pysc.costRec = PyscConf.generalConfig.type_of_contract >= 3 ? (PyscConf.dataContr.second as Pysc.costRec) : PyscConf.dataContr.cr
    if (paramID === 0)
      return cr.TaxSplit.pre_tax_ctr_oil
    else if (paramID === 1)
      return cr.TaxSplit.pre_tax_ctr_gas
    else if (paramID === 2)
      return cr.oil_ftp.ftp_portion
    else if (paramID === 3)
      return cr.gas_ftp.ftp_portion
    else if (paramID === 4)
      return cr.IC.ic_oil
    else if (paramID === 5)
      return cr.IC.ic_gas
    else if (paramID === 6)
      return cr.OilDMO.fee
    else if (paramID === 7)
      return cr.GasDMO.fee
  }
  else if (paramID === 8) {
    if (PyscConf.generalConfig.type_of_contract >= 3)
      return PyscConf.fiscal.Fiskal2.VAT.vat_mode === 1 ? PyscConf.fiscal.Fiskal2.VAT.multi_vat_init : PyscConf.fiscal.Fiskal2.VAT.vat_rate_init
    else
      return PyscConf.fiscal.Fiskal.VAT.vat_mode === 1 ? PyscConf.fiscal.Fiskal.VAT.multi_vat_init : PyscConf.fiscal.Fiskal.VAT.vat_rate_init
  }
  else if (paramID === 9) {
    if (PyscConf.generalConfig.type_of_contract >= 3)
      return PyscConf.fiscal.Fiskal2.Tax.tax_mode === 1 ? PyscConf.fiscal.Fiskal2.Tax.multi_tax_init : PyscConf.fiscal.Fiskal2.Tax.tax_rate_init
    else
      return PyscConf.fiscal.Fiskal.Tax.tax_mode === 1 ? PyscConf.fiscal.Fiskal.Tax.multi_tax_init : PyscConf.fiscal.Fiskal.Tax.tax_rate_init
  }
  else if (paramID === 10) {
    const gs: Pysc.GS = PyscConf.generalConfig.type_of_contract >= 3 ? (PyscConf.dataContr.second as Pysc.GS) : PyscConf.dataContr.gs

    return gs.ministry_discretion_split
  }
  else if (paramID === 11) {
    const endY = dayjs.utc(PyscConf.dataGConf.end_date_project).local().year()
    const values = PyscConf.tangible.map(r => ({ year: r[0], rate: r[4] }))
    if (PyscConf.dataGConf.type_of_contract >= 3)
      return values.filter(r => r.year > endY).sort((a, b) => a.year - b.year)

    return values.sort((a, b) => a.year - b.year)
  }
  else if (paramID === 12) {
    if (PyscConf.generalConfig.type_of_contract >= 3)
      return PyscConf.fiscal.Fiskal2.vat_discount
    else
      return PyscConf.fiscal.Fiskal.vat_discount
  }
  else if (paramID === 13) {
    if (PyscConf.generalConfig.type_of_contract >= 3)
      return PyscConf.fiscal.Fiskal2.lbt_discount
    else
      return PyscConf.fiscal.Fiskal.lbt_discount
  }

  return null
}

const baseTarget = ref<number[]>([0.0, 0.0, 0.0])

const getBaseTarget = (targetIndex: number | string, valueOnly: boolean = false) => {
  if (targetIndex !== null && targetIndex !== undefined)
    return valueOnly ? (baseTarget.value[+targetIndex] / (+targetIndex === 0 ? 100 : 1)) : numbro(baseTarget.value[+targetIndex]).format({ mantissa: 2, optionalMantissa: true })

  return ""
}

const buildDataParams = async (calcBase: boolean = false) => {
  watcherOptimData.pause()

  console.log(PyscOptim.optimConfig.optimization)

  const lParsChecked = PyscOptim.optimConfig.optimization
    .filter(p => paramsOptim.value.map(l => l.value).includes(p.parameter) && p.parameter !== 8 && p.checked)
    .sort((a, b) => a.pos - b.pos)

  dataParams.value.splice(0, dataParams.value.length, ...lParsChecked.map(el =>
    ({
      parameter: el.parameter,
      min: +numbro(el.min * 100).format({ mantissa: 2, optionalMantissa: true }),
      max: +numbro(el.max * 100).format({ mantissa: 2, optionalMantissa: true }),
      base: getBaseValue(el.parameter),
    }),
  ))
  try {
    const { status, result } = await useHTTP().put({
      path: 'get_optim_base_target',
      body: {
        type: PyscConf.dataGConf.type_of_contract,
        json: btoa(JSON.stringify(useDataStore().curCase2Json(true))),
      },
      onError: (error: any) => { throw error },
    })

    if (status !== 200)
      throw { status, result }
    baseTarget.value.splice(0, baseTarget.value.length, ...[result.IRR * 100, result.NPV, result.PI])
  }
  catch (error) {
    baseTarget.value.splice(0, baseTarget.value.length, ...[0.0, 0.0, 0.0])
  }
  nextTick(() => watcherOptimData.resume())
}

const updateDragAble = () => {
  if (dragAbleList.value) {
    const draggable = useDraggable(dragAbleList, dataParams, {
      animation: 500,
      handle: ".list-drag-handle",
      direction: 'vertical',
      onStart() {
      },
      onUpdate() {
        PyscOptim.$patch(state => {
          state.optimConfig.optimization.forEach(el => {
            const index = dataParams.value.findIndex(v => v.parameter === el.parameter)

            el.pos = index
          })
        })
      },
    })
  }
}

const isValid = computed(() => {
  return optimConfig.value.target_optimization
    && dataParams.value.length && dataParams.value.filter(v => v.min < v.max).length === dataParams.value.length
})

const optimResult = ref<object>({})

const getOptimResultValue = (paramID: number) => {
  if (optimResult.value?.result) {
    if (paramID === 11) {
      const res = optimResult.value.result.list_params_value[Object.values(optimParamType)[paramID]]['Accelerated Depreciation']
      if (typeof res !== 'string')
        return [res]

      return res
    }
    else { return optimResult.value.result.list_params_value[Object.values(optimParamType)[paramID] === 'Gas DMO Fee' ? 'Gas Dmo Fee' : Object.values(optimParamType)[paramID]] }
  }

  return false
}

const getOptimResult = (paramID: number) => {
  if (optimResult.value.result) {
    const key = Object.values(optimParamType)[paramID]

    const val = paramID === 11
      ? optimResult.value.result.list_params_value[key]['Accelerated Depreciation']
      : optimResult.value.result.list_params_value[key === 'Gas DMO Fee' ? 'Gas Dmo Fee' : key]

    if (typeof val === 'string' && val.toLowerCase() === 'base value') {
      const valBase = getBaseValue(paramID)

      return Pysc.is_number(valBase) ? Pysc.fmtNumber(valBase, false, { output: 'percent', optionalMantissa: true, mantissa: 2 }) : valBase
    }
    if (paramID === 11) {
      return optimResult.value.result.list_params_value[key].optimized_useful_life.useful_life_optimized.map((v, r) => ({
        year: optimResult.value.result.list_params_value[key].optimized_useful_life.year[r],
        rate: v,
      }))
    }
    if (Pysc.is_number(val)) {
      return numbro(val).format({
        mantissa: 2,
        optionalMantissa: true,
        output: 'percent',
        spaceSeparated: true,
        thousandSeparated: true,
      })
    }
    else if (Array.isArray(val)) {
      const type_of_contract = PyscConf.dataGConf.type_of_contract
      const startY = dayjs.utc(PyscConf.dataGConf.start_date_project).local().year()
      let endY = dayjs.utc(PyscConf.dataGConf.end_date_project).local().year()
      const end2Y = dayjs.utc(PyscConf.dataGConf.end_date_project_second).local().year()
      if (type_of_contract >= 3)
        endY = math.max([endY, end2Y])
      const mapY = Array.from({ length: endY - startY + 1 }, (_, i) => (startY - 1) + i + 1)
      const valArr = mapY.map((v, i) => ({ year: v, rate: val[i] }))

      return useArrayUnique(valArr, (a, b) => a.rate === b.rate).value
    }
  }

  return '-'
}

const CalcOptim = async () => {
  if (!isValid.value)
    return
  try {
    const parameters = dataParams.value.map(v => Object.values(optimParamType)[v.parameter])
    const hasIC = parameters.findIndex(k => ['Oil IC', 'Gas IC'].includes(k))
    const contractJSON = useDataStore().curCase2Json(true)
    if (hasIC) {
      if ([3, 6].includes(PyscConf.dataGConf.type_of_contract))
        contractJSON.contract_2.costrecovery.ic_is_available = true
      else if (PyscConf.dataGConf.type_of_contract === 1)
        contractJSON.costrecovery.ic_is_available = true
    }

    const dataJson = {
      ...contractJSON,
      optimization_arguments: {
        dict_optimization: {
          parameter: parameters,
          min: dataParams.value.map(v => v.min / 100),
          max: dataParams.value.map(v => v.max / 100),
        },
        target_optimization: optimConfig.value.target_optimization / (optimConfig.value.target_parameter === 0 ? 100 : 1),
        target_parameter: Object.values(optimTarget)[optimConfig.value.target_parameter],
      },
    }

    const { status, result } = await useHTTP().put({
      path: 'calc_optim',
      body: {
        type: PyscConf.dataGConf.type_of_contract,
        json: btoa(JSON.stringify(dataJson)),
      },
      onError: (error: any) => { throw error },
    })

    if (status !== 200)
      throw { status, result }

    if (result.state === true) {
      const optOut = JSON.parse(JSON.stringify(result.out))

      // convert % values
      if (optOut.result && Array.isArray(optOut.summary1) && Array.isArray(optOut.summary2)) {
        optOut.summary1 = optOut.summary1.map((v, i) => {
          return typeof v === "number" ? (v * (Pysc.templateSummary[i].unit === '%' ? 100 : 1)) : v
        })
        optOut.summary2 = optOut.summary2.map((v, i) => {
          return typeof v === "number" ? (v * (Pysc.templateSummary[i].unit === '%' ? 100 : 1)) : v
        })
      }
      optimResult.value = optOut
    }
    else { throw "unknown error calculation" }
    nextTick(() => appStore.dataChanges())
  }
  catch (err) {
    optimResult.value = {}
    appStore.showAlert({
      text: `Error ${(err?.status) ?? ''}: ${(err?.result) ?? 'unknown'}`,
      isalert: true,
    })
  }
}

const getResultTable = computed(() => {
  if (optimResult.value.result && Array.isArray(optimResult.value.summary1) && Array.isArray(optimResult.value.summary2)) {
    return optimResult.value.summary1.map((v, i) => {
      return [v, optimResult.value.summary2[i]]
    })
  }
  else { return [] }
})

const getResultChart = computed(() => {
  if (optimResult.value.result && Array.isArray(optimResult.value.summary1) && Array.isArray(optimResult.value.summary2)) {
    return [optimResult.value.summary1, optimResult.value.summary2].map((cs, idx) => {
      return [
        cs[4], // 'Revenue'
        cs[15], // 'CR/DC'
        cs[20], // 'NCS'
        cs[24], // 'Ctr. NPV'
        cs[25], // 'Ctr. IRR'
        cs[28], // 'Ctr. PI'
        cs[32], // 'DMO'
        cs[33], // 'Tax'
        cs[34], // 'GoS'
        cs[36], // 'GoI NPV'
      ]
    })
  }
  else { return [] }
})

const getResultBartSeries = [
  { id: 0, title: 'NCS' },
  { id: 1, title: 'Ctr. NPV' },
  { id: 2, title: 'Ctr. PI' },
  { id: 3, title: 'Ctr. IRR' },
  { id: 4, title: 'Ctr. POT' },
  { id: 5, title: 'CR/DC' },
  { id: 6, title: 'GoS' },
  { id: 7, title: 'GoI NPV' },
  { id: 8, title: 'DMO' },
  { id: 9, title: 'Tax' },
]

const getBaseResult = computed(() => {
  if (optimResult.value.result && Array.isArray(optimResult.value.summary1) && Array.isArray(optimResult.value.summary2)) {
    const csb = optimResult.value.summary1

    return {
      name: 'Base',
      value:
        [csb[20], // 'NCS'
          csb[24], // 'Ctr. NPV'
          csb[28], // 'Ctr. PI'
          csb[25], // 'Ctr. IRR'
          csb[26], // 'Ctr. POT'
          csb[15], // 'CR/DC'
          csb[34], // 'GoS'
          csb[36], // 'GoI NPV'
          csb[32], // 'DMO'
          csb[33], // 'Tax'
        ],
    }
  }
  else { return { name: 'Base', value: [] } }
})

const getResultBarChart = computed(() => {
  if (optimResult.value.hasOwnProperty('result') && Array.isArray(optimResult.value.summary1) && Array.isArray(optimResult.value.summary2)) {
    const csb = optimResult.value.summary1
    const csc = optimResult.value.summary2

    return [
      [{ value: csc[20], percent: ((csc[20] - csb[20]) !== 0.0 ? ((csc[20] - csb[20]) / csb[20]) : 0.0) * 100.0 }, // 'NCS'
        { value: csc[24], percent: ((csc[24] - csb[24]) !== 0.0 ? ((csc[24] - csb[24]) / csb[24]) : 0.0) * 100.0 }, // 'Ctr. NPV'
        { value: csc[28], percent: ((csc[28] - csb[28]) !== 0.0 ? ((csc[28] - csb[28]) / csb[28]) : 0.0) * 100.0 }, // 'Ctr. PI'
        { value: csc[25], percent: ((csc[25] - csb[25]) !== 0.0 ? ((csc[25] - csb[25]) / csb[25]) : 0.0) * 100.0 }, // 'Ctr. IRR'
        { value: csc[26], percent: ((csc[26] - csb[26]) !== 0.0 ? ((csc[26] - csb[26]) / csb[26]) : 0.0) * 100.0 }, // 'Ctr. POT'
        { value: csc[15], percent: ((csc[15] - csb[15]) !== 0.0 ? ((csc[15] - csb[15]) / csb[15]) : 0.0) * 100.0 }, // 'CR/DC'
        { value: csc[34], percent: ((csc[34] - csb[34]) !== 0.0 ? ((csc[34] - csb[34]) / csb[34]) : 0.0) * 100.0 }, // 'GoS'
        { value: csc[36], percent: ((csc[36] - csb[36]) !== 0.0 ? ((csc[36] - csb[36]) / csb[36]) : 0.0) * 100.0 }, // 'GoI NPV'
        { value: csc[32], percent: ((csc[32] - csb[32]) !== 0.0 ? ((csc[32] - csb[32]) / csb[32]) : 0.0) * 100.0 }, // 'DMO'
        { value: csc[33], percent: ((csc[33] - csb[33]) !== 0.0 ? ((csc[33] - csb[33]) / csb[33]) : 0.0) * 100.0 }, // 'Tax'
      ],
    ]
  }
  else { return [] }
})

const createNewCase = async () => {
  if (optimResult.value.result) {
    const optimcases: Pysc.ProjectBase = JSON.parse(JSON.stringify(appStore.selectedCase))

    optimcases.id = Math.floor(Math.random() * (2000000 - 1000)) + 1000
    optimcases.name += ' - optimized'
    optimcases.state = 0
    optimcases.updated_at = dayjs.utc().valueOf()

    const dataGConf: Pysc.genConfig = JSON.parse(JSON.stringify(PyscConf.dataGConf))
    const dataProd: Pysc.producerConfig[] = JSON.parse(JSON.stringify(PyscConf.dataProd))
    const dataContr: Pysc.Contracts = JSON.parse(JSON.stringify(PyscConf.dataContr))
    const dataFisc: Pysc.Fiskal = JSON.parse(JSON.stringify(PyscConf.dataFisc))
    const dataTan = JSON.parse(JSON.stringify(PyscConf.dataTan))
    const dataIntan = JSON.parse(JSON.stringify(PyscConf.dataIntan))
    const dataOpex = JSON.parse(JSON.stringify(PyscConf.dataOpex))
    const dataASR = JSON.parse(JSON.stringify(PyscConf.dataASR))
    const dataCOS = JSON.parse(JSON.stringify(PyscConf.dataCOS))
    const dataLBT = JSON.parse(JSON.stringify(PyscConf.dataLBT))

    let _hasUpdated = false

    dataParams.value.forEach(v => {
      const key = Object.values(optimParamType)[v.parameter]
      let val = optimResult.value.result.list_params_value[key === 'Gas DMO Fee' ? 'Gas Dmo Fee' : key]
      if (v.parameter === 11)
        val = val['Accelerated Depreciation']
      if (!(typeof val === 'string' && val.toLowerCase() === 'base value')) {
        if ([1, 3, 6].includes(dataGConf.type_of_contract) && v.parameter >= 0 && v.parameter <= 7) {
          _hasUpdated = true

          const cr: Pysc.costRec = dataGConf.type_of_contract >= 3 ? (dataContr.second as Pysc.costRec) : dataContr.cr
          if (v.parameter === 0)
            cr.TaxSplit.pre_tax_ctr_oil = val
          else if (v.parameter === 1)
            cr.TaxSplit.pre_tax_ctr_gas = val
          else if (v.parameter === 2)
            cr.oil_ftp.ftp_portion = val
          else if (v.parameter === 3)
            cr.gas_ftp.ftp_portion = val
          else if (v.parameter === 4)
            cr.IC.ic_oil = val
          else if (v.parameter === 5)
            cr.IC.ic_gas = val
          else if (v.parameter === 6)
            cr.OilDMO.fee = val
          else if (v.parameter === 7)
            cr.GasDMO.fee = val
        }
        else if (v.parameter === 8) {
          _hasUpdated = true

          const fiscal = dataGConf.type_of_contract < 3 ? dataFisc.Fiskal : dataFisc.Fiskal2
          if (fiscal.VAT.vat_mode === 1 && Array.isArray(val)) {
            const type_of_contract = dataGConf.type_of_contract
            const startY = dayjs.utc(dataGConf.start_date_project).local().year()
            let endY = dayjs.utc(dataGConf.end_date_project).local().year()
            const end2Y = dayjs.utc(dataGConf.end_date_project_second).local().year()
            if (type_of_contract >= 3)
              endY = math.max([endY, end2Y])
            const mapY = Array.from({ length: endY - startY + 1 }, (_, i) => (startY - 1) + i + 1)
            const valArr = mapY.map((v, i) => ({ year: v, rate: val[i] }))

            fiscal.VAT.multi_vat_init = JSON.parse(JSON.stringify(useArrayUnique(valArr, (a, b) => a.rate === b.rate).value))
          }
          else if (fiscal.VAT.vat_mode === 1 && typeof val === 'number') {
            fiscal.VAT.vat_mode = 0
            fiscal.VAT.vat_rate_init = val
          }
        }
        else if (v.parameter === 9) {
          _hasUpdated = true

          const fiscal = dataGConf.type_of_contract < 3 ? dataFisc.Fiskal : dataFisc.Fiskal2

          fiscal.Tax.tax_mode = 0
          fiscal.Tax.tax_rate_init = val
        }
        else if ([2, 4, 5].includes(dataGConf.type_of_contract) && v.parameter === 10) {
          _hasUpdated = true

          const gs: Pysc.GS = dataGConf.type_of_contract >= 3 ? (dataContr.second as Pysc.GS) : dataContr.gs

          gs.ministry_discretion_split = val
        }
        else if (v.parameter === 11) {
          _hasUpdated = true

          const res_y = optimResult.value.result.list_params_value[key].optimized_useful_life.year
          const res_v = optimResult.value.result.list_params_value[key].optimized_useful_life.useful_life_optimized
          const res = res_y.map((v, i) => ({ y: v, useful: res_v[i] }))

          useArrayUnique(res, (a, b) => a.y === b.y).value.forEach(v => {
            dataTan.filter(r => r.expense_year === v.y).forEach(r => {
              r.useful_life = v.useful
            })
          })
        }
        else if (v.parameter === 12) {
          _hasUpdated = true

          const fiscal = dataGConf.type_of_contract < 3 ? dataFisc.Fiskal : dataFisc.Fiskal2

          fiscal.vat_discount = val
        }
        else if (v.parameter === 13) {
          _hasUpdated = true

          const fiscal = dataGConf.type_of_contract < 3 ? dataFisc.Fiskal : dataFisc.Fiskal2

          fiscal.lbt_discount = val
        }
      }
    })

    if (_hasUpdated) {
      await useDataStore().addOptimCase(optimcases, dataGConf, dataProd, dataContr, dataFisc,
        dataTan, dataIntan, dataOpex, dataASR, dataCOS, dataLBT)
    }
    else { appStore.showAlert({ text: 'Optimization value is the same as baseCase', isalert: false }) }
  }
}

const isAccomplished = computed(() => {
  if (optimResult.value && optimResult.value.result) {
    const resVal = +(optimResult.value.result?.optimization_result * (optimConfig.value.target_parameter === 0 ? 100 : 1)).toPrecision(15)

    const txtval = numbro(resVal).format({
      mantissa: 2,
      spaceSeparated: true,
      thousandSeparated: true,
    })

    return +txtval === optimConfig.value.target_optimization
  }

  return false
})

const chartMonteRadar = ref()
const chartMonteBar = ref()

const tableResOptim = ref()

const optOption = computed(() => {
  return (source: string) => [
    { title: 'Copy to clipboard', value: 'copy2clbrd', icon: 'tabler-clipboard', sourceType: source === 'table' ? 'text' : source },
    { title: `Save to file (*.${source === 'table' ? 'xlsx' : 'png'})`, value: 'save2File', icon: 'tabler-download', sourceType: source },
  ]
})

const getDataSource = (refName: any, setName: any, sourceType: string) => {
  const rndid = Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)
  if (sourceType === 'text' || sourceType === 'table') {
    const tblDataScr = [...refName?.getDataSource()]

    if (sourceType === 'text') {
      return tblDataScr.reduce((rowTxt, rowVal) => {
        return `${rowTxt + rowVal.join('\t')}\n`
      }, '')
    }
    else if (sourceType === 'table') {
      return {
        data: [{
          name: `Optimization`,
          header: [],
          data: tblDataScr,
        }],
        filename: `optim_summary_${appStore.selectedCase.name}_${rndid}`.replace(/[/\\ #$~&.]/g, ''),
      }
    }
  }
  else {
    return {
      url: refName?.getImageSourceUrl(),
      filename: `optim_${appStore.selectedCase.name}`.replace(/[/\\ #$~&.]/g, ''),
    }
  }
}

watchDebounced(optimConfig, val => {
  if (PyscOptim.watcherOptimCfg.isActive && watcherOptimData.isActive?.value)
    optimResult.value = {}

  // if (isValid.value)
  //   nextTick(() => CalcOptim())
}, { debounce: 500, deep: true, maxWait: 1000 })

const { stopCaseID, CallableFunc } = useDataStore().useWatchCaseID(() => {
  console.log("sens trigger")
  buildDataParams(true)
  if (isValid.value)
    nextTick(() => CalcOptim())
  else
    optimResult.value = {}
  nextTick(() => updateDragAble())
})

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
    :title="$t('Optimization')"
    :subtitle="$t('Analysis')"
  >
    <VCardText v-if="PyscConf.generalConfig.type_of_contract === 0">
      <VAlert
        density="comfortable"
        color="success"
        variant="tonal"
      >
        Only PSC Contract can be optimized
      </VAlert>
    </VCardText>
    <VCardText v-else>
      <VRow>
        <VCol
          cols="12"
          xl="8"
          lg="10"
        >
          <span class="font-weight-bold text-primary">{{ $t('Target') }}</span>
          <div class="d-flex align-center w-100 mt-2">
            <AppSelect
              v-model="optimConfig.target_parameter"
              :items="Object.values(optimTarget).map((v, i) => ({ title: v, value: i }))"
              item-props
              variant="outlined"
              label-placeholder="Parameters"
            />
            <AppTextField
              v-model.number="optimConfig.target_optimization"
              :label-placeholder="`Target value${optimConfig.target_parameter === 0 ? ', %' : (optimConfig.target_parameter === 1 ? ', M.US$' : '')}`"
            />
            <AppTextField
              :model-value="getBaseTarget(optimConfig.target_parameter)"
              :label-placeholder="`base value${optimConfig.target_parameter === 0 ? ', %' : (optimConfig.target_parameter === 1 ? ', M.US$' : '')}`"
              read-only
            />
            <VBtn
              class="ms-4"
              :disabled="!isValid"
              @click.prevent="CalcOptim"
            >
              {{ $t('Run') }}
            </VBtn>
            <VBtn
              v-if="optimResult?.result"
              class="ms-4"
              variant="outlined"
              size="small"
              color="success"
              @click.prevent="createNewCase"
            >
              Add as New Case
            </VBtn>
          </div>
        </VCol>
        <VCol
          cols="12"
          md="8"
          class="px-0 pr-1"
        >
          <VRow>
            <VCol cols="12">
              <AppCardActions
                action-collapsed
                :title="$t(`${isPSC ? 'Cost Recovery (CR)' : 'Gross Split (GS)'} ${PyscConf.dataGConf.type_of_contract >= 3 ? 'Transition ' : ''}Optimization`)"
                compact-header
              >
                <template #before-actions>
                  <IconBtn
                    density="compact"
                    color="disabled"
                  >
                    <VIcon
                      size="26"
                      icon="tabler-plus"
                    />
                    <VMenu
                      activator="parent"
                      :close-on-content-click="false"
                    >
                      <VList density="compact">
                        <template
                          v-for="(item, index) in [...paramsOptim, { title: 'separator', value: -1 }, { title: 'Checked All', value: -2 }, { title: 'Unchecked All', value: -3 }]"
                          :key="item.title"
                        >
                          <VDivider v-if="item.value === -1" />
                          <VListItem
                            v-else
                            density="compact"
                            @click="() => optimParamChanged(item.value)"
                          >
                            <template #prepend>
                              <VIcon
                                v-if="item.value >= 0"
                                :icon="optimConfig.optimization.filter(p => p.parameter === item.value).findIndex(l => l.checked) !== -1 ? 'tabler-check' : ''"
                              />
                            </template>
                            <VListItemTitle>
                              {{ item.title }}
                            </VListItemTitle>
                          </VListItem>
                        </template>
                      </VList>
                    </VMenu>
                  </IconBtn>
                </template>
                <VCardText>
                  <VList
                    ref="dragAbleList"
                    density="comfortable"
                    lines="two"
                  >
                    <template
                      v-for="(item, index) in dataParams"
                      :key="item.parameter"
                    >
                      <VListItem
                        border
                        class="mx-1"
                        :title="Object.values(optimParamType)[item.parameter]"
                        :subtitle="Array.isArray(item.base) ? JSON.stringify(item.base) : (`base value: ${Pysc.is_number(item.base) ? numbro(item.base).format({ output: 'percent', mantissa: 2, optionalMantissa: true, spaceSeparated: true }) : ''}`)"
                      >
                        <template #title="{ title }">
                          {{ title }}
                          <IconBtn size="x-small">
                            <VIcon
                              icon="tabler-info-triangle-filled"
                              :color="isHigher(Object.values(optimParamType).findIndex(v => v === title)) ? 'success' : 'error'"
                            />
                            <VTooltip
                              activator="parent"
                              max-width="340"
                            >
                              <span v-html="getInfoParam(Object.values(optimParamType).findIndex(v => v === title)) " />
                            </VTooltip>
                          </IconBtn>
                        </template>
                        <template #subtitle="{ subtitle }">
                          <VListItemSubtitle v-if="Array.isArray(item.base)">
                            base value:<span
                              class="ms-1 text-primary text-decoration-underline"
                              style="cursor: pointer;opacity: 0.8;"
                            >
                              <VMenu
                                activator="parent"
                                location="bottom end"
                                :close-on-content-click="false"
                              >
                                <VCard>
                                  <VCardItem class="info-section">
                                    {{ Object.values(optimParamType)[item.parameter] }}, %:
                                  </VCardItem>
                                  <VCardText>
                                    <PerfectScrollbar
                                      :options="{ wheelPropagation: false }"
                                      style="max-block-size: 10.75rem;"
                                    >
                                      <table>
                                        <thead>
                                          <tr>
                                            <th>Year</th>
                                            <th>{{ item.parameter === 11 ? 'Useful life' : 'Rate, %' }}</th>
                                          </tr>
                                        </thead>
                                        <tbody>

                                          <tr v-for="v in JSON.parse(subtitle)">
                                            <td class="ps-2 pe-3">{{ v.year }}</td>
                                            <td class="ps-1 pe-2 text-right">{{
                                              Pysc.is_number(v.rate) ? numbro(v.rate * (item.parameter === 11 ? 1 : 100)).format({ mantissa: item.parameter === 11 ? 0 : 2 }) : '' }}</td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </PerfectScrollbar>
                                  </VCardText>
                                </VCard>
                              </VMenu>
                              multi values
                            </span>
                          </VListItemSubtitle>
                          <VListItemSubtitle v-else>
                            {{ subtitle }}
                          </VListItemSubtitle>
                        </template>
                        <template #prepend>
                          <VIcon
                            icon="tabler-arrows-move-vertical"
                            style="cursor: ns-resize;inline-size: 24px;"
                            class="ms-n3 list-drag-handle"
                            tabler-arrows-move-vertical
                          />
                        </template>
                        <template #append>
                          <VRow
                            no-gutters
                            align="center"
                            style="min-inline-size: 200px;"
                          >
                            <VCol
                              cols="6"
                              class="mx-0 pt-1"
                            >
                              <AppTextField
                                v-model.number="item.min"
                                density="compact"
                                label-placeholder="Min, %"
                                :rules="[requiredValidator, numberValidator, betweenValidator(item.min, 0, 100, appStore.showAlert)]"
                                hide-details="true"
                              />
                            </VCol>
                            <VCol
                              cols="6"
                              class="mx-0 pt-1"
                            >
                              <AppTextField
                                v-model.number="item.max"
                                density="compact"
                                label-placeholder="Max, %"
                                :rules="[requiredValidator, numberValidator, betweenValidator(item.max, 0, 100, appStore.showAlert)]"
                                hide-details="true"
                              />
                            </VCol>
                          </VRow>
                        </template>
                      </VListItem>
                    </template>
                  </VList>
                </VCardText>
              </AppCardActions>
            </VCol>
          </VRow>
        </VCol>
        <VCol
          cols="12"
          md="4"
          class="px-0 pl-1"
        >
          <AppCardActions
            action-collapsed
            :title="$t('Result')"
            compact-header
          >
            <VCardText>
              <VList density="comfortable">
                <VListItem
                  class="mx-0 px-1"
                  :title="`Target ${Object.values(optimTarget)[optimConfig.target_parameter]}`"
                  density="compact"
                  :subtitle="getBaseTarget(optimConfig.target_parameter, true)"
                >
                  <template #subtitle="{ subtitle }">
                    <span class="text-caption text-primary">
                      base: {{ numbro(subtitle).format({
                        mantissa: 2,
                        optionalMantissa: true,
                        output: optimConfig.target_parameter === 0 ? 'percent' : 'number',
                        spaceSeparated: true,
                        thousandSeparated: true,
                      }) }}
                    </span>
                  </template>
                  <template #append>
                    <VIcon
                      v-if="optimResult.result"
                      :icon="isAccomplished ? 'tabler-checks' : 'tabler-info-triangle'"
                      :class="isAccomplished ? 'text-success' : 'text-error'"
                      class="me-2"
                      size="24"
                    />
                    <span
                      :class="isAccomplished ? 'text-success' : 'text-error'"
                      class="text-right font-weight-bold"
                    >{{ optimResult.result
                      ? numbro(optimResult.result.optimization_result).format({
                        mantissa: 2,
                        output: optimConfig.target_parameter === 0 ? 'percent' : 'number',
                        spaceSeparated: true,
                        thousandSeparated: true,
                      }) : '-' }}</span>
                  </template>
                </VListItem>
                <VDivider />
                <template
                  v-for="(item, index) in dataParams"
                  :key="item.parameter"
                >
                  <VListItem
                    class="mx-0 px-1"
                    :title="Object.values(optimParamType)[item.parameter]"
                    density="compact"
                    :subtitle="Array.isArray(item.base) ? JSON.stringify(item.base) : (Pysc.is_number(item.base) ? numbro(item.base).format({ output: 'percent', mantissa: 2, optionalMantissa: true, spaceSeparated: true }) : '')"
                  >
                    <template #subtitle="{ subtitle }">
                      <VListItemSubtitle v-if="Array.isArray(item.base)">
                        <span class="text-caption text-primary">base: </span><span
                          class="ms-1 text-primary text-decoration-underline"
                          style="cursor: pointer;opacity: 0.8;"
                        >
                          <VMenu
                            activator="parent"
                            location="bottom end"
                            :close-on-content-click="false"
                          >
                            <VCard>
                              <VCardItem class="info-section">
                                {{ Object.values(optimParamType)[item.parameter] }}, %:
                              </VCardItem>
                              <VCardText>
                                <PerfectScrollbar
                                  :options="{ wheelPropagation: false }"
                                  style="max-block-size: 10.75rem;"
                                >

                                  <table class="table__wrapper">
                                    <thead>
                                      <tr>
                                        <th>Year</th>
                                        <th>{{ item.parameter === 11 ? 'Useful life' : 'Rate, %' }}</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr v-for="v in JSON.parse(subtitle)">
                                        <td class="ps-2 pe-3">{{ v.year }}</td>
                                        <td class="ps-1 pe-2 text-right">{{
                                          Pysc.is_number(v.rate) ? numbro(v.rate * (item.parameter === 11 ? 1 : 100)).format({ mantissa: (item.parameter === 11 ? 0 : 2) }) : '' }}</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </PerfectScrollbar>
                              </VCardText>
                            </VCard>
                          </VMenu>
                          multi values
                        </span>
                      </VListItemSubtitle>
                      <VListItemSubtitle v-else>
                        <span class="text-caption text-primary">base: {{ subtitle }}</span>
                      </VListItemSubtitle>
                    </template>
                    <template #append>
                      <span
                        v-if="['string', 'number'].includes(typeof getOptimResultValue(item.parameter)) || Array.isArray(getOptimResultValue(item.parameter))"
                        class="text-right"
                        :class="`${(typeof getOptimResultValue(item.parameter) === 'string' ? ' text-primary' : ' text-default') + (Array.isArray(getBaseValue(item.parameter)) ? ' text-decoration-underline' : '')}`"
                        :style="`${Array.isArray(getBaseValue(item.parameter)) ? 'cursor:pointer;opacity:0.8;' : ''}`"
                      >
                        {{ Array.isArray(getBaseValue(item.parameter)) ? 'values' : getOptimResult(item.parameter) }}
                        <VMenu
                          v-if="Array.isArray(getBaseValue(item.parameter))"
                          activator="parent"
                          location="bottom end"
                          :close-on-content-click="false"
                        >
                          <VCard>
                            <VCardItem class="info-section">
                              {{ Object.values(optimParamType)[item.parameter] }}, %:
                            </VCardItem>
                            <VCardText>
                              <PerfectScrollbar
                                :options="{ wheelPropagation: false }"
                                style="max-block-size: 10.75rem;"
                              >
                                <table class="table__wrapper">
                                  <thead>
                                    <tr>
                                      <th>Year</th>
                                      <th>{{ item.parameter === 11 ? 'Useful life' : 'Rate, %' }}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr v-for="v in getOptimResult(item.parameter)">
                                      <td class="ps-2 pe-3">{{ v.year }}</td>
                                      <td class="ps-1 pe-2 text-right">{{
                                        Pysc.is_number(v.rate) ? numbro(v.rate * (item.parameter === 11 ? 1 : 100)).format({ mantissa: (item.parameter === 11 ? 0 : 2) }) : '' }}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </PerfectScrollbar>
                            </VCardText>
                          </VCard>
                        </VMenu>
                      </span>
                      <span
                        v-else
                        class="text-right"
                      >-</span>
                    </template>
                  </VListItem>
                  <VDivider />
                </template>
              </VList>
            </VCardText>
          </AppCardActions>
        </VCol>
        <VCol cols="12">
          <ColapsibleCols>
            <template #left-header="{ isCollapsed }">
              Summary
            </template>
            <template #after-left-header="{ isCollapsed }">
              <DotdotOpt
                v-if="!isCollapsed"
                :menu-list="optOption('table')"
                title="Options"
                item-props
                size="x-small"
                dot-only
                :get-source="(value: string, sourceType: string) => getDataSource(tableResOptim, null, sourceType)"
              />
            </template>
            <template #left>
              <TableCompare
                ref="tableResOptim"
                :columns="[{ title: 'Base Case' }, { title: 'Optimized Case' }]"
                :data="getResultTable"
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
                style="overflow: visible !important;"
              >
                <template #before-actions="{ isContentCollapsed }">
                  <DotdotOpt
                    v-if="!isContentCollapsed"
                    :menu-list="optOption('image')"
                    title="Options"
                    item-props
                    dot-only
                    :get-source="(value: string, sourceType: string) => getDataSource(chartMonteRadar, null, sourceType)"
                  />
                </template>
                <ChartCompare
                  ref="chartMonteRadar"
                  :series="[{ id: 0, title: 'Base case' }, { id: 1, title: 'Optimized case' }]"
                  :data-chart="getResultChart"
                />
              </AppCardActions>
              <AppCardActions
                title="Bar Chart"
                action-collapsed
                compact-header
                class="mt-2"
                style="overflow: visible !important;"
              >
                <template #before-actions="{ isContentCollapsed }">
                  <DotdotOpt
                    v-if="!isContentCollapsed"
                    :menu-list="optOption('image')"
                    title="Options"
                    item-props
                    dot-only
                    :get-source="(value: string, sourceType: string) => getDataSource(chartMonteBar, null, sourceType)"
                  />
                </template>

                <BarChartCompare
                  ref="chartMonteBar"
                  :base-data="getBaseResult"
                  :series="[{ id: 1, title: 'Optimized case' }]"
                  :data-chart="getResultBarChart"
                  :mode="1"
                />
              </AppCardActions>
            </template>
          </ColapsibleCols>
        </VCol>
      </VRow>
    </VCardText>
  </VCard>
</template>

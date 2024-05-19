<script setup lang="ts">
import { useAppStore } from '@/stores/appStore';
import { usePyscConfStore } from '@/stores/genfisStore';
import { useNumbro } from "@/utils/pysc/pyscType";
import { useDataStore } from '@/utils/pysc/useDataStore';
import CardSumm from '@/views/pages/dashboard/cardSumm.vue';
import CardSummFull from '@/views/pages/dashboard/cardSummFull.vue';
import Project from '@/views/pages/dashboard/projectlist.vue';
import EcoSummary from '@/views/pages/dashboard/projectsumm.vue';
import * as math from 'mathjs';

const appStore = useAppStore()
const PyscConf = usePyscConfStore()
const numbro = useNumbro()

definePage({
  name: 'dashboard',
  meta: {
    title: 'Dashboard',
  },
})

const isLoading = ref(false)
const templatedata = [
  { param: "Oil Production", unit: "MMSTB", ctrl: null },
  { param: "Oil WAP	", unit: "US$/bbl", ctrl: null },
  { param: "Gas Production", unit: "TBTU", ctrl: null },
  { param: "Gas WAP", unit: "US$/MMBTU", ctrl: null },
  { param: "Gross Revenue	", unit: "MUS$", ctrl: null },
  {
    grp: 1, param: 'Gross Share', child: [
      { param: "Contr. Gross Share", unit: "MUS$", ctrl: null },
      { param: "GoI Gross Share", unit: "MUS$", ctrl: null },
    ]
  },
  { param: "Sunk Cost", unit: "MUS$", ctrl: null },
  {
    grp: 2, param: 'Investment', unit: "MUS$", ctrl: null, child: [
      { param: "Tangible", unit: "MUS$", ctrl: null },
      { param: "Intangible", unit: "MUS$", ctrl: null },
    ]
  },
  {
    grp: 3, param: "OPEX + ASR", unit: "MUS$", ctrl: null, child: [
      { param: "OPEX", unit: "MUS$", ctrl: null },
      { param: "ASR", unit: "MUS$", ctrl: null },
    ]
  },
  {
    grp: 4, param: "Cost Recovery / Deductible Cost", unit: "MUS$", ctrl: null, child: [
      { param: "(% Gross Revenue)", unit: "%", ctrl: null },

    ]
  },
  {
    grp: 5, param: "Unrec. Cost / Carry Fwd. Deductible Cost", unit: "MUS$", ctrl: null, child: [
      { param: "(% Gross Revenue)", unit: "%", ctrl: null },

    ]
  },
  {
    grp: 6, param: "Contractor Profitability:", child: [
      { param: "Contr. Net Share", unit: "MUS$", ctrl: null },
      { param: "(% Gross Rev)", unit: "%", ctrl: null },
      { param: "Contr. Net Cash Flow", unit: "MUS$", ctrl: null },
      { param: "(% Gross Rev)", unit: "%", ctrl: null },
      { param: "Contr. NPV", unit: "MUS$", ctrl: null },
      { param: "Contr. IRR", unit: "%", ctrl: null },
      { param: "Contr. POT", unit: "years", ctrl: null },
      { param: "Contr. PV Ratio", unit: "", ctrl: null },
      { param: "Contr. PI", unit: "", ctrl: null },
    ]
  },
  {
    grp: 7, param: "GoI Profitability:", child: [
      { param: "GoI Gross Share", unit: "MUS$", ctrl: null },
      { param: "FTP (PSC Cost Recovery)", unit: "MUS$", ctrl: null },
      { param: "Net DMO", unit: "MUS$", ctrl: null },
      { param: "Tax", unit: "MUS$", ctrl: null },
      { param: "GoI Take", unit: "MUS$", ctrl: null },
      { param: "(% Gross Rev)", unit: "%", ctrl: null },
      { param: "GoI NPV", unit: "MUS$ ", ctrl: null },
    ]
  },
]
const dataSumm = ref(JSON.parse(JSON.stringify(templatedata)))
const dataCard = ref({
  "year": [],
  "Oil": { "table": [], "sum": 0 },
  "Gas": { "table": [], "sum": 0 },
  "Revenue": { "table": [], "sum": 0 },
  "Investment": { "table": [], "sum": 0 },
  "Expenses": { "table": [], "sum": 0 },
  "Tax": { "table": [], "sum": 0 },
  "pie": { "data": { "GoS": { table: [], value: 0.0 }, "NCS": { table: [], value: 0.0 }, "CR": { table: [], value: 0.0 }, "DMO": { table: [], value: 0.0 }, "Tax": { table: [], value: 0.0 } }, "sum": 0 },
})

const prettyFmt = (val: number | null | undefined, type: 'currency' | 'unit' | 'percent' = 'currency') => {
  const decDot = Intl.NumberFormat().formatToParts(1.1).find(e => e.type === 'decimal').value
  if (typeof val === 'number') {
    const valstr = numbro(val * (type === 'currency' ? 1000000 : 1)).format({ average: type === 'currency', mantissa: type === 'unit' ? 1 : 2 })
    const valArr = valstr.split(decDot)
    if (valArr.length > 1) {
      if (valArr[1].indexOf(" ") != -1)
        valArr.splice(1, 1, ...valArr[1].split(" "))
      if (valArr.slice(-1)[0].indexOf(")") != -1)
        valArr.splice(-1, 1, ...[valArr.slice(-1)[0].split(")")[0], ')'])

    }
    return valArr[0].toUpperCase() + (valArr.length > 1 ? `.<small>${valArr[1]}</small>` : '').toUpperCase() +
      (valArr.length > 2 ? ` ${valArr[2]}` : '').toUpperCase() +
      (valArr.length > 3 ? `${valArr[3]}` : '').toUpperCase()
  }
  return "-"
}
const loadSummary = async () => {
  isLoading.value = true
  dataSumm.value = JSON.parse(JSON.stringify(templatedata))
  dataCard.value = {
    "year": [],
    "Oil": { "table": [], "sum": 0 },
    "Gas": { "table": [], "sum": 0 },
    "Revenue": { "table": [], "sum": 0 },
    "Investment": { "table": [], "sum": 0 },
    "Expenses": { "table": [], "sum": 0 },
    "Tax": { "table": [], "sum": 0 },
    "pie": { "data": { "GoS": { table: [], value: 0.0 }, "NCS": { table: [], value: 0.0 }, "CR": { table: [], value: 0.0 }, "DMO": { table: [], value: 0.0 }, "TAX": { table: [], value: 0.0 } }, "sum": 0 },
  }

  try {

    const result = await $api('/auth/calc_ext_summ',
      {
        params: { type: PyscConf.dataGConf.type_of_contract, data: btoa(JSON.stringify(PyscConf.makeJSON(appStore.curSelCase))) },
        method: 'GET',
        onResponseError({ response }) {
          throw [response.status, response._data.detail]
        },
      })

    if (!(isObject(result) && !isEmpty(result))) throw "Error Calculation"

    dataCard.value = JSON.parse(JSON.stringify(result.card))

    dataSumm.value[0].ctrl = result.summary.lifting_oil
    dataSumm.value[1].ctrl = result.summary.oil_wap
    dataSumm.value[2].ctrl = result.summary.lifting_gas
    dataSumm.value[3].ctrl = result.summary.gas_wap
    dataSumm.value[4].ctrl = result.summary.gross_revenue

    dataSumm.value[5].child[0].ctrl = result.summary.ctr_gross_share
    dataSumm.value[5].child[1].ctrl = result.summary.gov_gross_share

    dataSumm.value[6].ctrl = result.summary.sunk_cost

    dataSumm.value[7].ctrl = result.summary.investment
    dataSumm.value[7].child[0].ctrl = result.summary.tangible
    dataSumm.value[7].child[1].ctrl = result.summary.intangible

    dataSumm.value[8].ctrl = result.summary.opex_and_asr
    dataSumm.value[8].child[0].ctrl = result.summary.opex
    dataSumm.value[8].child[1].ctrl = result.summary.asr

    dataSumm.value[9].ctrl = result['summary']["cost_recovery/deductible_cost"]
    dataSumm.value[9].child[0].ctrl = result['summary']["cost_recovery_over_gross_rev"]

    dataSumm.value[10].ctrl = result['summary']["unrec_cost"]
    dataSumm.value[10].child[0].ctrl = result['summary']["unrec_over_gross_rev"]

    dataSumm.value[11].child[0].ctrl = result['summary']["ctr_net_share"]
    dataSumm.value[11].child[1].ctrl = result['summary']["ctr_net_share_over_gross_share"]
    dataSumm.value[11].child[2].ctrl = result['summary']['ctr_net_cashflow']
    dataSumm.value[11].child[3].ctrl = result['summary']['ctr_net_cashflow_over_gross_rev']
    dataSumm.value[11].child[4].ctrl = result['summary']['ctr_npv']
    dataSumm.value[11].child[5].ctrl = result['summary']['ctr_irr']
    dataSumm.value[11].child[6].ctrl = result['summary']['ctr_pot']
    dataSumm.value[11].child[7].ctrl = result['summary']['ctr_pv_ratio']
    dataSumm.value[11].child[8].ctrl = result['summary']['ctr_pi']

    dataSumm.value[12].child[0].ctrl = result['summary']['gov_gross_share']
    dataSumm.value[12].child[1].ctrl = result['summary']['gov_ftp_share']
    dataSumm.value[12].child[2].ctrl = result['summary']['gov_ddmo']
    dataSumm.value[12].child[3].ctrl = result['summary']['gov_tax_income']
    dataSumm.value[12].child[4].ctrl = result['summary']['gov_take']
    dataSumm.value[12].child[5].ctrl = result['summary']['gov_take_over_gross_rev']
    dataSumm.value[12].child[6].ctrl = result['summary']['gov_take_npv']
  } catch (error) {
    appStore.showAlert({
      text: `Error ${Array.isArray(error) ? error[0] : ''}: ${Array.isArray(error) ? error[1] : error}`,
      isalert: true
    })
  }
  isLoading.value = false
}

const cardSumFull = ref()

const showFull = (chart: number, mode: number | undefined = undefined) => {
  cardSumFull.value?.showSummCardDialog(chart, mode, {
    x: dataCard.value.year,
    d: chart === 0 ? (mode === 0 ? dataCard.value.Oil : dataCard.value.Gas) : (chart === 1 ? dataCard.value.Revenue : (chart === 2 ? dataCard.value.Investment : chart === 3 ? dataCard.value.Expenses : dataCard.value.Tax))
  })
}

const showPieElement = (params: any) => {
  const pieData = dataCard.value.pie.data[Object.keys(dataCard.value.pie.data)[params.dataIndex]]
  const dataChtF = {
    ctrType: PyscConf.dataGConf.type_of_contract,
    x: dataCard.value.year,
    d: {
      table: [
        pieData.table,
        math.cumsum(pieData.table)
      ],
      sum: pieData.value,
    }
  }
  cardSumFull.value?.showSummCardDialog(5, params.dataIndex, dataChtF)
}

const { stopCaseID, CallableFunc } = useDataStore().useWatchCaseID(() => {
  console.log("client trigger")
  loadSummary()
})
onMounted(() => CallableFunc())
onUnmounted(() => stopCaseID())
</script>

<template>
  <VRow>
    <VCol cols="12">
      <Project />
    </VCol>
    <VCol class="d-none d-lg-block" cols="12">
      <VRow>
        <VCol cols="8">
          <VRow>
            <VCol cols="4">
              <CardSumm title="Oil" subtitle="MMSTB" :chart="0" :mode="0" @click="() => showFull(0, 0)"
                :table="{ y: dataCard.year, d: dataCard.Oil.table }" :value="prettyFmt(dataCard.Oil.sum, 'unit')" />
            </VCol>
            <VCol v-if="PyscConf.prodHasGas()" cols="2">
              <CardSumm title="Gas" subtitle="TBTU" :chart="0" :mode="1" @click="() => showFull(0, 1)"
                :table="{ y: dataCard.year, d: dataCard.Gas.table }" :value="prettyFmt(dataCard.Gas.sum, 'unit')" />
            </VCol>
            <VCol cols="4">
              <CardSumm title="Revenue" subtitle="US$" :chart="1" @click="() => showFull(1)"
                :table="{ y: dataCard.year, d: dataCard.Revenue.table }" :value="prettyFmt(dataCard.Revenue.sum)" />
            </VCol>
            <VCol cols="4">
              <CardSumm title="Capex" subtitle="US$" :chart="2" @click="() => showFull(2)"
                :table="{ y: dataCard.year, d: dataCard.Investment.table }"
                :value="prettyFmt(dataCard.Investment.sum)" />
            </VCol>
            <VCol cols="4">
              <CardSumm title="Expenditures" subtitle="US$" :chart="3" @click="() => showFull(3)"
                :table="{ y: dataCard.year, d: dataCard.Expenses.table }" :value="prettyFmt(dataCard.Expenses.sum)" />
            </VCol>
            <VCol cols="4">
              <CardSumm title="Tax" subtitle="US$" :chart="4" :table="{ y: dataCard.year, d: dataCard.Tax.table }"
                @click="() => showFull(4)" :value="prettyFmt(dataCard.Tax.sum)" />
            </VCol>
          </VRow>
        </VCol>
        <VCol cols="4">
          <CardSumm title="Revenue Distribution" subtitle="US$" :chart="5"
            :ctrType="PyscConf.dataGConf.type_of_contract"
            :table="{ y: dataCard.year, d: dataCard.pie.data, sum: dataCard.pie.sum }"
            :value="prettyFmt(dataCard.pie.sum)" @show-detail="showPieElement" />
        </VCol>
      </VRow>
    </VCol>
    <VCol cols="12">
      <EcoSummary :is-loading="isLoading" :data="dataSumm" />
    </VCol>
    <VCol cols="12">
      <h6 class="text-h7 text-disabled">* {{ $t('Monetary') }}: 1 MUS$ = 1,000,000 US$ | {{ $t('Production') }}: 1
        M(unit) =
        1,000 (unit)</h6>
    </VCol>
  </VRow>
  <CardSummFull ref="cardSumFull" />
</template>

<style lang="scss">
@use "@core/scss/template/libs/apex-chart.scss";
</style>

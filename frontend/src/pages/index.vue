<script setup lang="ts">
import { useAppStore } from '@/stores/appStore'
import { useHTTP } from '@/utils/pysc/useHttp'
import * as math from 'mathjs'
import { usePyscConfStore } from '@/stores/genfisStore'
import { usePyscSensStore } from '@/stores/sensStore'
import { fmtNumber, is_number, useNumbro } from "@/utils/pysc/pyscType"
import { useDataStore } from '@/utils/pysc/useDataStore'
import CardSumm from '@/views/pages/dashboard/cardSumm.vue'
import CardSummFull from '@/views/pages/dashboard/cardSummFull.vue'
import Project from '@/views/pages/dashboard/projectlist.vue'
import Projectsumm from '@/views/pages/dashboard/projectsumm.vue'

const appStore = useAppStore()
const PyscConf = usePyscConfStore()
const SensStore = usePyscSensStore()
const numbro = useNumbro()

definePage({
  name: 'dashboard',
  meta: {
    title: 'Home',
  },
})

const isLoading = ref(false)
const isSensLoading = ref(false)

const templatedata = [
  { param: "Oil Production", unit: "MSTB", ctrl: null },
  { param: "Oil WAP	", unit: "US$/bbl", ctrl: null },
  { param: "Gas Production", unit: "TBTU", ctrl: null },
  { param: "Gas WAP", unit: "US$/MMBTU", ctrl: null },
  { param: "Gross Revenue	", unit: "MUS$", ctrl: null },
  {
    grp: 1,
    param: 'Gross Share',
    child: [
      { param: "Contr. Gross Share", unit: "MUS$", ctrl: null },
      { param: "GoI Gross Share", unit: "MUS$", ctrl: null },
    ],
  },
  { param: "Sunk Cost", unit: "MUS$", ctrl: null },
  {
    grp: 2,
    param: 'Investment',
    unit: "MUS$",
    ctrl: null,
    child: [
      { param: "Tangible", unit: "MUS$", ctrl: null },
      { param: "Intangible", unit: "MUS$", ctrl: null },
    ],
  },
  {
    grp: 3,
    param: "OPEX + ASR",
    unit: "MUS$",
    ctrl: null,
    child: [
      { param: "OPEX", unit: "MUS$", ctrl: null },
      { param: "ASR", unit: "MUS$", ctrl: null },
    ],
  },
  {
    grp: 4,
    param: "Cost Recovery / Deductible Cost",
    unit: "MUS$",
    ctrl: null,
    child: [
      { param: "(% Gross Revenue)", unit: "%", ctrl: null },

    ],
  },
  {
    grp: 5,
    param: "Unrec. Cost / Carry Fwd. Deductible Cost",
    unit: "MUS$",
    ctrl: null,
    child: [
      { param: "(% Gross Revenue)", unit: "%", ctrl: null },

    ],
  },
  {
    grp: 6,
    param: "Contractor Profitability:",
    child: [
      { param: "Contr. Net Share", unit: "MUS$", ctrl: null },
      { param: "(% Gross Rev)", unit: "%", ctrl: null },
      { param: "Contr. Net Cash Flow", unit: "MUS$", ctrl: null },
      { param: "(% Gross Rev)", unit: "%", ctrl: null },
      { param: "Contr. NPV", unit: "MUS$", ctrl: null },
      { param: "Contr. IRR", unit: "%", ctrl: null },
      { param: "Contr. POT", unit: "years", ctrl: null },
      { param: "Contr. PV Ratio", unit: "", ctrl: null },
      { param: "Contr. PI", unit: "", ctrl: null },
    ],
  },
  {
    grp: 7,
    param: "GoI Profitability:",
    child: [
      { param: "GoI Gross Share", unit: "MUS$", ctrl: null },
      { param: "FTP (PSC Cost Recovery)", unit: "MUS$", ctrl: null },
      { param: "Net DMO", unit: "MUS$", ctrl: null },
      { param: "Tax", unit: "MUS$", ctrl: null },
      { param: "GoI Take", unit: "MUS$", ctrl: null },
      { param: "(% Gross Rev)", unit: "%", ctrl: null },
      { param: "GoI NPV", unit: "MUS$ ", ctrl: null },
    ],
  },
]

const dataSumm = ref(JSON.parse(JSON.stringify(templatedata)))

const dataCard = ref({
  "year": [],
  "Oil": { "table": [], "sum": 0 },
  "Gas": { "table": [], "sum": 0 },
  "Revenue": { "table": [], "sum": 0 },
  "Expenses": { "table": [], "sum": 0 },

  // "Investment": { "table": [], "sum": 0 },
  // "Tax": { "table": [], "sum": 0 },
  "CashFlow": { "table": [], "sum": 0 },
  "GoI": { "table": [], "sum": 0 },
  "pie": { "data": { "GoS": { table: [], value: 0.0 }, "NCS": { table: [], value: 0.0 }, "CR": { table: [], value: 0.0 }, "DMO": { table: [], value: 0.0 }, "Tax": { table: [], value: 0.0 } }, "sum": 0 },
  'IRR': {},
})

const prettyFmt = (val: number | null | undefined, type: 'currency' | 'unit' | 'percent' = 'currency') => {
  if (is_number(val))

    // return fmtNumber(val * (type === 'currency' ? 1000000 : 1), true, { average: type === 'currency', mantissa: type === 'unit' ? 1 : 2 })
    return fmtNumber(val, true, { mantissa: type === 'unit' ? 1 : 2 })

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

    // "Investment": { "table": [], "sum": 0 },
    "Expenses": { "table": [], "sum": 0 },

    // "Tax": { "table": [], "sum": 0 },
    "CashFlow": { "table": [], "sum": 0 },
    "GoI": { "table": [], "sum": 0 },
    "pie": { "data": { "GoS": { table: [], value: 0.0 }, "NCS": { table: [], value: 0.0 }, "CR": { table: [], value: 0.0 }, "DMO": { table: [], value: 0.0 }, "TAX": { table: [], value: 0.0 } }, "sum": 0 },
    'IRR': {},
  }

  try {
    const { sensConfig } = SensStore

    const DataJson = {
      config: { min: sensConfig[0] / 100, max: sensConfig[1] / 100 },
      parameter: ["Oil Price", "OPEX", "CAPEX", "Lifting"],
      contract: useDataStore().curCase2Json(),
    }

    if (PyscConf.prodHasGas())
      DataJson.parameter.splice(1, 0, "Gas Price")

    const resp = await useHTTP().put({
      path: 'calc_ext_summ',
      body: {
        type: PyscConf.dataGConf.type_of_contract,
        json: btoa(JSON.stringify(DataJson)),
      },
    }).finally(() => { })

    const { status, result } = resp ?? { status: 500, result: 'unknown' }
    if (status !== 200)
      throw resp

    if (!(isObject(result) && !isEmpty(result)))
      throw "Error Calculation"

    dataCard.value = JSON.parse(JSON.stringify(result.card))

    // console.log(dataCard.value["IRR"])
    // calc IRR Sens using async
    nextTick(() => {
      try {
        isSensLoading.value = true
        useHTTP().put({
          path: 'calc_ext_summ_irr',
          body: {
            type: PyscConf.dataGConf.type_of_contract,
            json: btoa(JSON.stringify(DataJson)),
          },
          onSuccess: (response: any) => {
            if (typeof response === 'object')
              dataCard.value.IRR = response.card.IRR
          },
          onError: (error: any) => { throw error },
        }).finally(() => isSensLoading.value = false)
      }
      catch (error) {
        console.log(['error irr', error])
      }
    })

    // console.log(result.summary)

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

    dataSumm.value[9].ctrl = result.summary["cost_recovery/deductible_cost"]
    dataSumm.value[9].child[0].ctrl = result.summary.cost_recovery_over_gross_rev

    dataSumm.value[10].ctrl = result.summary.unrec_cost
    dataSumm.value[10].child[0].ctrl = result.summary.unrec_over_gross_rev

    dataSumm.value[11].child[0].ctrl = result.summary.ctr_net_share
    dataSumm.value[11].child[1].ctrl = result.summary.ctr_net_share_over_gross_share
    dataSumm.value[11].child[2].ctrl = result.summary.ctr_net_cashflow
    dataSumm.value[11].child[3].ctrl = result.summary.ctr_net_cashflow_over_gross_rev
    dataSumm.value[11].child[4].ctrl = result.summary.ctr_npv
    dataSumm.value[11].child[5].ctrl = result.summary.ctr_irr
    dataSumm.value[11].child[6].ctrl = result.summary.ctr_pot
    dataSumm.value[11].child[7].ctrl = result.summary.ctr_pv_ratio
    dataSumm.value[11].child[8].ctrl = result.summary.ctr_pi

    dataSumm.value[12].child[0].ctrl = result.summary.gov_gross_share
    dataSumm.value[12].child[1].ctrl = result.summary.gov_ftp_share
    dataSumm.value[12].child[2].ctrl = result.summary.gov_ddmo
    dataSumm.value[12].child[3].ctrl = result.summary.gov_tax_income
    dataSumm.value[12].child[4].ctrl = result.summary.gov_take
    dataSumm.value[12].child[5].ctrl = result.summary.gov_take_over_gross_rev
    dataSumm.value[12].child[6].ctrl = result.summary.gov_take_npv
  }
  catch (error) {
    console.log(['error', error])

    // appStore.showAlert({
    //   text: `Error ${Array.isArray(error) ? error[0] : ''}: ${Array.isArray(error) ? error[1] : error}`,
    //   isalert: true
    // })
  }
  isLoading.value = false
}

const cardSumFull = ref()

const showFull = (chart: number, mode: number | undefined = undefined) => {
  cardSumFull.value?.showSummCardDialog(chart, mode, {
    x: dataCard.value.year,
    d: chart === 0
      ? (mode === 0 ? dataCard.value.Oil : [dataCard.value.Oil, dataCard.value.Gas])
      : (chart === 1
        ? dataCard.value.Revenue
          : (chart === 2
          ? dataCard.value.Investment
              : chart === 3
            ? dataCard.value.Expenses
                : chart === 4
              ? dataCard.value.Tax
                  : chart === 6
                ? dataCard.value.CashFlow
                    : chart === 7 ? dataCard.value.GoI : dataCard.value.IRR
        )),
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
        math.cumsum(pieData.table),
      ],
      sum: pieData.value,
    },
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
    <VCol
      class="d-none d-lg-block"
      cols="12"
    >
      <VRow>
        <VCol cols="8">
          <VRow>
            <VCol
              v-if="PyscConf.prodHasGas()"
              cols="4"
            >
              <CardSumm
                title="Oil & Gas"
                subtitle="MSTB & TBTU"
                :chart="0"
                :mode="1"
                color-card="success"
                :table="{ y: dataCard.year, d: [dataCard.Oil.table, dataCard.Gas.table] }"
                :value="`${prettyFmt(dataCard.Oil.sum, 'unit')} & ${prettyFmt(dataCard.Gas.sum, 'unit')}`"
                @click="() => showFull(0, 1)"
              />
            </VCol>
            <VCol
              v-else
              cols="4"
            >
              <CardSumm
                title="Production"
                subtitle="MSTB"
                :chart="0"
                :mode="0"
                color-card="info"
                :table="{ y: dataCard.year, d: dataCard.Oil.table }"
                :value="prettyFmt(dataCard.Oil.sum, 'unit')"
                @click="() => showFull(0, 0)"
              />
            </VCol>
            <VCol cols="4">
              <CardSumm
                title="Revenue"
                subtitle="MUSD"
                :chart="1"
                color-card="primary"
                :table="{ y: dataCard.year, d: dataCard.Revenue.table }"
                :value="prettyFmt(dataCard.Revenue.sum)"
                @click="() => showFull(1)"
              />
            </VCol>
            <!--
              <VCol cols="4">
              <CardSumm title="Capex" subtitle="US$" :chart="2" @click="() => showFull(2)"
              :table="{ y: dataCard.year, d: dataCard.Investment.table }"
              :value="prettyFmt(dataCard.Investment.sum)" />
              </VCol>
            -->
            <VCol cols="4">
              <CardSumm
                title="Expenditures"
                subtitle="MUSD"
                :chart="3"
                color-card="error"
                :table="{ y: dataCard.year, d: dataCard.Expenses.table }"
                :value="prettyFmt(dataCard.Expenses.sum[0] + dataCard.Expenses.sum[1])"
                @click="() => showFull(3)"
              />
            </VCol>
            <!--
              <VCol cols="4">
              <CardSumm title="Tax" subtitle="US$" :chart="4" :table="{ y: dataCard.year, d: dataCard.Tax.table }"
              @click="() => showFull(4)" :value="prettyFmt(dataCard.Tax.sum)" />
              </VCol>
            -->
            <VCol cols="4">
              <CardSumm
                title="Ctr. CashFlow"
                subtitle="MUSD"
                :chart="6"
                color-card="secondary"
                :table="{ y: dataCard.year, d: dataCard.CashFlow.table }"
                :value="prettyFmt(dataCard.CashFlow.sum)"
                @click="() => showFull(6)"
              />
            </VCol>
            <VCol cols="4">
              <CardSumm
                title="GoI"
                subtitle="MUSD"
                :chart="7"
                :table="{ y: dataCard.year, d: dataCard.GoI.table }"
                color-card="primary"
                :value="prettyFmt(dataCard.GoI.sum)"
                @click="() => showFull(7)"
              />
            </VCol>
            <VCol cols="4">
              <CardSumm
                title="Sensitivity"
                subtitle="%"
                :chart="8"
                :table="dataCard.IRR"
                :is-loading="isSensLoading"
                color-card="warning"
                :value="`-${SensStore.sensConfig[0]}% - ${SensStore.sensConfig[1]}%`"
                @click="() => showFull(8)"
              />
            </VCol>
          </VRow>
        </VCol>
        <VCol cols="4">
          <CardSumm
            title="Revenue Distribution"
            subtitle="MUSD"
            :chart="5"
            color-card="muted"
            :ctr-type="PyscConf.dataGConf.type_of_contract"
            :table="{ y: dataCard.year, d: dataCard.pie.data, sum: dataCard.pie.sum }"
            :value="prettyFmt(dataCard.pie.sum)"
            @show-detail="showPieElement"
          />
        </VCol>
      </VRow>
    </VCol>
    <VCol cols="12">
      <Projectsumm
        :is-loading="isLoading"
        :data="dataSumm"
      />
    </VCol>
    <VCol cols="12">
      <!--
        <h6 class="text-h7 text-disabled">
        * {{ $t('Monetary') }}: 1 MUS$ = 1,000,000 US$ | {{ $t('Production') }}: 1
        M(unit) =
        1,000 (unit)
        </h6>
      -->
      <h6 class="text-h7 text-disabled">
        * 1 M = 1,000
      </h6>
    </VCol>
  </VRow>
  <CardSummFull ref="cardSumFull" />
</template>

<style lang="scss">
@use "@core/scss/template/libs/apex-chart.scss";
</style>

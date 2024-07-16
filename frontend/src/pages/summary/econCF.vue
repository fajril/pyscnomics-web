<script setup lang="ts">
import { useAppStore } from '@/stores/appStore'
import { usePyscConfStore } from '@/stores/genfisStore'
import * as Pysc from "@/utils/pysc/pyscType"
import { useDataStore } from '@/utils/pysc/useDataStore'
import { useHTTP } from '@/utils/pysc/useHttp'
import ColCollapsible from '@/views/components/colCollapsible.vue'
import ChartCF from '@/views/pages/summary/cfChart.vue'
import TableCF from '@/views/pages/summary/cfTable.vue'
import { breakpointsVuetifyV3 } from '@vueuse/core'
import 'handsontable/dist/handsontable.full.min.css'
import { add } from 'mathjs'

definePage({
  name: 'pysc-ecocf',
  path: '/pysc-ecocf',
  meta: {
    title: "Cashflow",
  },
})

const appStore = useAppStore()
const PyscConf = usePyscConfStore()

const tableOil1 = ref()
const tableOil2 = ref()
const tableGas1 = ref()
const tableGas2 = ref()
const tableCons1 = ref()
const tableCons2 = ref()

// 👉 Misc
const isLessThanCardBreak = computed(() => useMediaQuery(`(max-width: ${breakpointsVuetifyV3.md}px)`).value)

const tableCollapsed = ref<Array<boolean[]>>([[false, false], [false, false], [false, false]])

const OilOpt = ref<Pysc.TableCFOption[]>([
  {
    data: [Array(34).fill(null)],
    headers: [],
    columns: [],
    cells: [],
  }, {
    data: [Array(34).fill(null)],
    headers: [],
    columns: [],
    cells: [],
  },
])

const oil_ctr1 = computed(() => OilOpt.value[0])
const oil_ctr2 = computed(() => OilOpt.value[1])

const GasOpt = ref<Pysc.TableCFOption[]>([
  {
    data: [Array(34).fill(null)],
    headers: [],
    columns: [],
    cells: [],
  }, {
    data: [Array(34).fill(null)],
    headers: [],
    columns: [],
    cells: [],
  },
])

const gas_ctr1 = computed(() => GasOpt.value[0])
const gas_ctr2 = computed(() => GasOpt.value[1])

const ConstOpt = ref<Pysc.TableCFOption[]>([
  {
    data: [Array(35).fill(null)],
    headers: [],
    columns: [],
    cells: [],
  }, {
    data: [Array(35).fill(null)],
    headers: [],
    columns: [],
    cells: [],
  },
])

const const_ctr1 = computed(() => ConstOpt.value[0])
const const_ctr2 = computed(() => ConstOpt.value[1])

const isLoading = ref(false)

const numbro = Pysc.useNumbro()

const RefOChartCF1 = ref()
const RefOChartCF2 = ref()
const RefGChartCF1 = ref()
const RefGChartCF2 = ref()
const RefCChartCF1 = ref()
const RefCChartCF2 = ref()

const updateTable = () => {
  nextTick(() => {
    tableCons1.value?.updateTable()
    tableCons2.value?.updateTable()
    tableOil1.value?.updateTable()
    tableOil2.value?.updateTable()
    tableGas1.value?.updateTable()
    tableGas2.value?.updateTable()
  })
}

const updateChart = () => {
  nextTick(() => {
    RefCChartCF1.value?.updateChart()
    RefCChartCF2.value?.updateChart()
    RefOChartCF1.value?.updateChart()
    RefOChartCF2.value?.updateChart()
    RefGChartCF1.value?.updateChart()
    RefGChartCF2.value?.updateChart()
  })
}

const loadCF = async () => {
  isLoading.value = true

  // clear data
  OilOpt.value.forEach(value => value.data.splice(0, value.data.length, ...JSON.parse(JSON.stringify([Array(34).fill(null)]))))
  GasOpt.value.forEach(value => value.data.splice(0, value.data.length, ...JSON.parse(JSON.stringify([Array(34).fill(null)]))))
  ConstOpt.value.forEach(value => value.data.splice(0, value.data.length, ...JSON.parse(JSON.stringify([Array(35).fill(null)]))))
  try {
    const { status, result } = await useHTTP().put({
      path: 'calc_cf',
      body: {
        type: PyscConf.dataGConf.type_of_contract,
        json: btoa(JSON.stringify(useDataStore().curCase2Json())),
      },
      onError: (error: any) => { throw error },
    })

    if (status !== 200)
      throw { status, result }
    if (!(isObject(result) && !isEmpty(result)))
      throw "Error Calculation"

    const MapDataCF = (dataOil: any, dataGas: any, dataConst: any, isCR: boolean = true, icontract: number = 0) => {
      if (PyscConf.dataGConf.type_of_contract === 0) {
        OilOpt.value[icontract].headers.splice(0, OilOpt.value[icontract].headers.length, ...["Year", "Lifting", "Price", "Revenue", "Tangible", "Intangible", "OPEX", "ASR", "Cashflow"])
        GasOpt.value[icontract].headers.splice(0, OilOpt.value[icontract].headers.length, ...["Year", "Lifting", "Price", "Revenue", "Tangible", "Intangible", "OPEX", "ASR", "Cashflow"])
        ConstOpt.value[icontract].headers.splice(0, OilOpt.value[icontract].headers.length, ...["Year", "Lifting", "Price", "Revenue", "Tangible", "Intangible", "OPEX", "ASR", "Cashflow"])
      }
      else {
        if (isCR) {
          OilOpt.value[icontract].headers.splice(0, OilOpt.value[icontract].headers.length, ...["Year", "Lifting", "Price", "Revenue", "Depreciable", "Intangible", "OPEX", "ASR", "Depreciation", "Non Capital", "FTP", "FTP - CTR", "FTP - GOV", "Investment Credit", "Unrecovered Cost", "Cost To Be Recovered", "Cost Recovery", "Equity To Be Shared (ETS) Before Transfer", "Transfer (Tf) to GAS", "Unrec. After Tf", "Cost To Be Recovered After Tf", "Cost Recovery After Tf", "ETS After Tf", "Contractor Share", "Government Share", "DMO Volume", "DMO Fee", "DDMO", "Taxable Income", "Tax Payment", "Contractor Share", "Cashflow", "Cum. Cashflow", "Governent Take"])
          GasOpt.value[icontract].headers.splice(0, OilOpt.value[icontract].headers.length, ...["Year", "Lifting", "Price", "Revenue", "Depreciable", "Intangible", "OPEX", "ASR", "Depreciation", "Non Capital", "FTP", "FTP - CTR", "FTP - GOV", "Investment Credit", "Unrecovered Cost", "Cost To Be Recovered", "Cost Recovery", "Equity To Be Shared (ETS) Before Transfer", "Transfer (Tf) to GAS", "Unrec. After Tf", "Cost To Be Recovered After Tf", "Cost Recovery After Tf", "ETS After Tf", "Contractor Share", "Government Share", "DMO Volume", "DMO Fee", "DDMO", "Taxable Income", "Tax Payment", "Contractor Share", "Cashflow", "Cum. Cashflow", "Governent Take"])
          ConstOpt.value[icontract].headers.splice(0, OilOpt.value[icontract].headers.length, ...["Year", "Lifting Oil", "Lifting Gas", "Revenue", "Depreciable", "Intangible", "OPEX", "ASR", "Depreciation", "Non Capital", "FTP", "FTP - CTR", "FTP - GOV", "Investment Credit", "Unrecovered Cost", "Cost Recovery", "Equity To Be Shared (ETS) Before Transfer", "Unrec. After Tf", "Cost To Be Recovered After Tf", "Cost Recovery After Tf", "ETS After Tf", "Contractor Share", "Government Share", "DMO Volume", "DMO Fee", "DDMO", "Taxable Income", "Tax Due", "Unpaid Tax Balance", "Tax Payment", "CTR Net Share", "CTR Take", "Cashflow", "Cum. Cash Flow", "Government Take"])
        }
        else {
          OilOpt.value[icontract].headers.splice(0, OilOpt.value[icontract].headers.length, ...["Year", "Lifting", "Price", "Depreciable", "Intangible", "Opex", "ASR", "Revenue", "BaseSplit", "Variable Split", "Progressive Split", "Contractor Split", "Contractor Share", "Government Share", "Depreciation", "Non Capital", "Total Expenses", "Cost To Be Deducted", "Carry Forward Cost", "Deductible Cost", "Transfer To Gas", "Carry Forward Cost after TF", "CTR Share After TF", "CTR Net Operating Profit", "DMO Volume", "DMO Fee", "DDMO", "Taxable Income", "Tax", "Net CTR Share", "CTR Cash Flow", "Cum CashFlow", "Government Take"])
          GasOpt.value[icontract].headers.splice(0, GasOpt.value[icontract].headers.length, ...["Year", "Lifting", "Price", "Depreciable", "Intangible", "Opex", "ASR", "Revenue", "BaseSplit", "Variable Split", "Progressive Split", "Contractor Split", "Contractor Share", "Government Share", "Depreciation", "Non Capital", "Total Expenses", "Cost To Be Deducted", "Carry Forward Cost", "Deductible Cost", "Transfer To Gas", "Carry Forward Cost after TF", "CTR Share After TF", "CTR Net Operating Profit", "DMO Volume", "DMO Fee", "DDMO", "Taxable Income", "Tax", "Net CTR Share", "CTR Cash Flow", "Cum CashFlow", "Government Take"])
          ConstOpt.value[icontract].headers.splice(0, ConstOpt.value[icontract].headers.length, ...["Year", "Lifting Oil", "Lifting Gas", "Revenue", "Government Share", "Contractor Share", "Depreciation", "Opex", "ASR", "Non Capital", "Total Expenses", "Cost To Be Deducted", "Carry Forward Cost", "Deductible Cost", "Carry Forward Cost after TF", "CTR Share After", "CTR Net Operating Profit", "DMO Volume", "DMO Fee", "DDMO", "Taxable Income", "Tax", "Net CTR Share", "CashFlow", "cum CashFlow", "Government Take"])
        }
      }

      const mapO = JSON.parse(JSON.stringify(['Year', ...Object.keys(dataOil)]))
      const mapG = JSON.parse(JSON.stringify(['Year', ...Object.keys(dataGas)]))
      const mapCons = JSON.parse(JSON.stringify(['Year', ...Object.keys(dataConst)]))
      const DYear = Object.keys(dataOil[mapO[1]])
      const CYear = Object.keys(dataConst[mapCons[1]])

      // Oil
      OilOpt.value[icontract].data.splice(0, OilOpt.value[icontract].data.length,
        ...Array(DYear.length + 1).fill(Array(mapO.length).fill(null)).map((row, ir) => {
          if (ir === DYear.length) {
            return row.map((col, ic) => {
              if (ic > 0) {
                if (PyscConf.dataGConf.type_of_contract === 0)
                  return Object.values(dataOil[mapO[ic]]).reduce((total, current) => total + current, 0)
                else
                  return Object.values(dataOil[mapO[ic]]).reduce((total, current) => (ic === row.length - 2 || (isCR && [14, 15].includes(ic))) ? current : total + current, 0)
              }
              else { return col }
            })
          }

          return row.map((col, ic) => {
            if (ic === 0)
              return +DYear[ir]
            else return dataOil[mapO[ic]][DYear[ir]]
          })
        }))
      OilOpt.value[icontract].columns.splice(0, OilOpt.value[icontract].columns.length,
        ...Array(mapO.length).fill({}).map((col, i) => {
          if (i === 0)
            return { type: 'numeric', numericFormat: { pattern: '0' } }
          else
            return { type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, optionalMantissa: true, negative: "parenthesis" } } }
        }))
      OilOpt.value[icontract].cells.splice(0, OilOpt.value[icontract].cells.length,
        ...Array(mapO.length).fill({}).map((col, i) => {
          return { row: DYear.length, col: i, className: 'Row-Sum font-weight-bold' }
        }))

      // Gas
      GasOpt.value[icontract].data.splice(0, GasOpt.value[icontract].data.length,
        ...Array(DYear.length + 1).fill(Array(mapG.length).fill(null)).map((row, ir) => {
          if (ir === DYear.length) {
            return row.map((col, ic) => {
              if (ic > 0) {
                if (PyscConf.dataGConf.type_of_contract === 0)
                  return Object.values(dataGas[mapO[ic]]).reduce((total, current) => total + current, 0)
                else
                  return Object.values(dataGas[mapG[ic]]).reduce((total, current) => (ic === row.length - 2 || (isCR && [14, 15].includes(ic))) ? current : total + current, 0)
              }
              else { return col }
            })
          }

          return row.map((col, ic) => {
            if (ic === 0)
              return +DYear[ir]
            else return dataGas[mapG[ic]][DYear[ir]]
          })
        }))
      GasOpt.value[icontract].columns.splice(0, GasOpt.value[icontract].columns.length,
        ...Array(mapG.length).fill({}).map((col, i) => {
          if (i === 0)
            return { type: 'numeric', numericFormat: { pattern: '0' } }
          else
            return { type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, optionalMantissa: true, negative: "parenthesis" } } }
        }))
      GasOpt.value[icontract].cells.splice(0, GasOpt.value[icontract].cells.length,
        ...Array(mapG.length).fill({}).map((col, i) => {
          return { row: DYear.length, col: i, className: 'Row-Sum font-weight-bold' }
        }))

      // consolidated
      ConstOpt.value[icontract].data.splice(0, ConstOpt.value[icontract].data.length,
        ...Array(CYear.length + 1).fill(Array(mapCons.length).fill(null)).map((row, ir) => {
          if (ir === CYear.length) {
            return row.map((col, ic) => {
              if (ic > 0) {
                if (PyscConf.dataGConf.type_of_contract === 0)
                  return Object.values(dataConst[mapO[ic]]).reduce((total, current) => total + current, 0)
                else
                  return Object.values(dataConst[mapCons[ic]]).reduce((total, current) => (ic === row.length - 2 || (isCR && ic === 14)) ? current : total + current, 0)
              }
              else { return col }
            })
          }

          return row.map((col, ic) => {
            if (ic === 0)
              return +CYear[ir]
            else return dataConst[mapCons[ic]][CYear[ir]]
          })
        }))
      ConstOpt.value[icontract].columns.splice(0, ConstOpt.value[icontract].columns.length,
        ...Array(mapCons.length).fill({}).map((col, i) => {
          if (i === 0)
            return { type: 'numeric', numericFormat: { pattern: '0' } }
          else
            return { type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, optionalMantissa: true, negative: "parenthesis" } } }
        }))
      ConstOpt.value[icontract].cells.splice(0, ConstOpt.value[icontract].cells.length,
        ...Array(mapCons.length).fill({}).map((col, i) => {
          return { row: CYear.length, col: i, className: 'Row-Sum font-weight-bold' }
        }))
    }

    // update table
    if (PyscConf.dataGConf.type_of_contract <= 3) {
      MapDataCF(result.oil, result.gas, result.consolidated, PyscConf.dataGConf.type_of_contract === 1, 0)
    }
    else {
      MapDataCF(result.contract_1.oil, result.contract_1.gas, result.contract_1.consolidated, [3, 4].includes(PyscConf.dataGConf.type_of_contract), 0)
      MapDataCF(result.contract_2.oil, result.contract_2.gas, result.contract_2.consolidated, [3, 6].includes(PyscConf.dataGConf.type_of_contract), 1)
    }

    updateTable()
    updateChart()
  }
  catch (err) {
    appStore.showAlert({
      text: `Error ${(err?.status) ?? ''}: ${(err?.result ? err.result : (err?.error ? err.error : 'unknown'))}`,
      isalert: true,
    })
  }
  isLoading.value = false
}

const { stopCaseID, CallableFunc } = useDataStore().useWatchCaseID(() => {
  console.log("cf trigger")
  nextTick(() => loadCF())
})

onMounted(() => {
  CallableFunc()
})
onUnmounted(() => {
  stopCaseID()
})

const currentTab = ref(0)

watch(currentTab, val => {
  if (val === 1)
    updateChart()
  else
    updateTable()
})

const dataCombineChart = computed(() => {
  let _dataCh = []
  try {
    _dataCh = ConstOpt.value[0].data.map((row, i) => [row[0], ...add(row.slice(-3), ConstOpt.value[1].data[i].slice(-3))])
  }
  catch (error) {
  }

  const _out: Pysc.TableCFOption = {
    data: _dataCh,
    headers: [],
    columns: [],
    cells: [],
  }

  return _out
})
</script>

<template>
  <VCard
    :Loading="isLoading ? 'primary' : false"
    :title="$t('Cashflow')"
    :subtitle="$t('Summary')"
  >
    <VCardText>
      <VTabs v-model="currentTab">
        <VTab>{{ $t('Table') }}</VTab>
        <VTab>{{ $t('Chart') }}</VTab>
      </VTabs>
      <VCardText class="px-1">
        <VWindow v-model="currentTab">
          <VWindowItem value="0">
            <ColCollapsible :col-ratio="PyscConf.dataGConf.type_of_contract >= 3 ? [50, 50] : [100, 0]">
              <template #left="{ collapsible, collapsed }">
                <TableCF
                  ref="tableCons1"
                  v-model="tableCollapsed[2][0]"
                  title="Consolidated"
                  :data-table="const_ctr1"
                  :multi-contract="PyscConf.dataGConf.type_of_contract >= 3"
                  :collapsed="collapsible"
                  @collapsed="val => collapsed(val)"
                />
              </template>
              <template
                v-if="PyscConf.dataGConf.type_of_contract >= 3"
                #right="{ collapsible, collapsed }"
              >
                <TableCF
                  ref="tableCons2"
                  v-model="tableCollapsed[2][1]"
                  title="Consolidated"
                  :data-table="const_ctr2"
                  multi-contract
                  is-contract2
                  :collapsed="collapsible"
                  @collapsed="val => collapsed(val)"
                />
              </template>
            </ColCollapsible>
            <ColCollapsible :col-ratio="PyscConf.dataGConf.type_of_contract >= 3 ? [50, 50] : [100, 0]">
              <template #left="{ collapsible, collapsed }">
                <TableCF
                  ref="tableOil1"
                  v-model="tableCollapsed[0][0]"
                  title="Oil/Condensate"
                  :data-table="oil_ctr1"
                  :multi-contract="PyscConf.dataGConf.type_of_contract >= 3"
                  :collapsed="collapsible"
                  @collapsed="val => collapsed(val)"
                />
              </template>
              <template
                v-if="PyscConf.dataGConf.type_of_contract >= 3"
                #right="{ collapsible, collapsed }"
              >
                <TableCF
                  ref="tableOil2"
                  v-model="tableCollapsed[0][1]"
                  title="Oil/Condensate"
                  :data-table="oil_ctr2"
                  multi-contract
                  is-contract2
                  :collapsed="collapsible"
                  @collapsed="val => collapsed(val)"
                />
              </template>
            </ColCollapsible>
            <ColCollapsible
              v-if="PyscConf.prodHasGas()"
              :col-ratio="PyscConf.dataGConf.type_of_contract >= 3 ? [50, 50] : [100, 0]"
            >
              <template #left="{ collapsible, collapsed }">
                <TableCF
                  ref="tableGas1"
                  v-model="tableCollapsed[1][0]"
                  title="Gas"
                  :data-table="gas_ctr1"
                  :multi-contract="PyscConf.dataGConf.type_of_contract >= 3"
                  :collapsed="collapsible"
                  @collapsed="val => collapsed(val)"
                />
              </template>
              <template
                v-if="PyscConf.dataGConf.type_of_contract >= 3"
                #right="{ collapsible, collapsed }"
              >
                <TableCF
                  ref="tableGas2"
                  v-model="tableCollapsed[1][1]"
                  title="Gas"
                  :data-table="gas_ctr2"
                  multi-contract
                  is-contract2
                  :collapsed="collapsible"
                  @collapsed="val => collapsed(val)"
                />
              </template>
            </ColCollapsible>
          </VWindowItem>
          <VWindowItem value="1">
            <ColCollapsible
              v-if="PyscConf.dataGConf.type_of_contract >= 3"
              :col-ratio="[100, 0]"
            >
              <template #left="{ collapsible, collapsed }">
                <ChartCF
                  ref="RefCChartCF1"
                  title="Consolidated CashFlow"
                  :data-chart="dataCombineChart"
                  type="Cons"
                  contract-type="CR"
                  :collapsed="collapsible"
                  @collapsed="val => collapsed(val)"
                />
              </template>
            </ColCollapsible>
            <ColCollapsible :col-ratio="PyscConf.dataGConf.type_of_contract >= 3 ? [50, 50] : [100, 0]">
              <template #left="{ collapsible, collapsed }">
                <ChartCF
                  ref="RefCChartCF1"
                  title="Consolidated CashFlow"
                  :data-chart="const_ctr1"
                  type="Cons"
                  :multi-contract="PyscConf.dataGConf.type_of_contract >= 3"
                  :contract-type="PyscConf.dataGConf.type_of_contract === 0 ? 'BASE' : ([1, 3, 4].includes(PyscConf.dataGConf.type_of_contract) ? 'CR' : 'GS')"
                  :collapsed="collapsible"
                  @collapsed="val => collapsed(val)"
                />
              </template>
              <template
                v-if="PyscConf.dataGConf.type_of_contract >= 3"
                #right="{ collapsible, collapsed }"
              >
                <ChartCF
                  ref="RefCChartCF2"
                  title="Consolidated CashFlow"
                  :data-chart="const_ctr2"
                  type="Cons"
                  multi-contract
                  is-contract2
                  :contract-type="[3, 6].includes(PyscConf.dataGConf.type_of_contract) ? 'CR' : 'GS'"
                  :collapsed="collapsible"
                  @collapsed="val => collapsed(val)"
                />
              </template>
            </ColCollapsible>
            <ColCollapsible :col-ratio="PyscConf.dataGConf.type_of_contract >= 3 ? [50, 50] : [100, 0]">
              <template #left="{ collapsible, collapsed }">
                <ChartCF
                  ref="RefOChartCF1"
                  title="Oil/Condensate CashFlow"
                  :data-chart="oil_ctr1"
                  type="Oil"
                  :multi-contract="PyscConf.dataGConf.type_of_contract >= 3"
                  :contract-type="PyscConf.dataGConf.type_of_contract === 0 ? 'BASE' : ([1, 3, 4].includes(PyscConf.dataGConf.type_of_contract) ? 'CR' : 'GS')"
                  :collapsed="collapsible"
                  @collapsed="val => collapsed(val)"
                />
              </template>
              <template
                v-if="PyscConf.dataGConf.type_of_contract >= 3"
                #right="{ collapsible, collapsed }"
              >
                <ChartCF
                  ref="RefOChartCF2"
                  title="Oil/Condensate CashFlow"
                  :data-chart="oil_ctr2"
                  type="Oil"
                  multi-contract
                  is-contract2
                  :contract-type="[3, 6].includes(PyscConf.dataGConf.type_of_contract) ? 'CR' : 'GS'"
                  :collapsed="collapsible"
                  @collapsed="val => collapsed(val)"
                />
              </template>
            </ColCollapsible>
            <ColCollapsible
              v-if="PyscConf.prodHasGas()"
              :col-ratio="PyscConf.dataGConf.type_of_contract >= 3 ? [50, 50] : [100, 0]"
            >
              <template #left="{ collapsible, collapsed }">
                <ChartCF
                  ref="RefGChartCF1"
                  title="Gas CashFlow"
                  :data-chart="gas_ctr1"
                  type="Gas"
                  :multi-contract="PyscConf.dataGConf.type_of_contract >= 3"
                  :contract-type="PyscConf.dataGConf.type_of_contract === 0 ? 'BASE' : ([1, 3, 4].includes(PyscConf.dataGConf.type_of_contract) ? 'CR' : 'GS')"
                  :collapsed="collapsible"
                  @collapsed="val => collapsed(val)"
                />
              </template>
              <template
                v-if="PyscConf.dataGConf.type_of_contract >= 3"
                #right="{ collapsible, collapsed }"
              >
                <ChartCF
                  ref="RefGChartCF2"
                  title="Gas CashFlow"
                  :data-chart="gas_ctr2"
                  type="Gas"
                  multi-contract
                  is-contract2
                  :contract-type="[3, 6].includes(PyscConf.dataGConf.type_of_contract) ? 'CR' : 'GS'"
                  :collapsed="collapsible"
                  @collapsed="val => collapsed(val)"
                />
              </template>
            </ColCollapsible>
          </VWindowItem>
        </VWindow>
      </VCardText>
    </VCardText>
  </VCard>
</template>

<style lang="scss">
@use "@core/scss/template/libs/apex-chart.scss";

td.Row-Sum {
  background-color: #b1bec5;
}

.date-picker-wrapper {
  inline-size: 10.5rem;
}

#apex-chart-wrapper {
  .v-card-item__append {
    padding-inline-start: 0;
  }
}
</style>

<script setup lang="ts">
import { useAppStore } from '@/stores/appStore';
import { usePyscConfStore } from '@/stores/genfisStore';
import * as Pysc from "@/utils/pysc/pyscType";
import ChartCF from '@/views/pages/summary/cfChart.vue';
import TableCF from '@/views/pages/summary/cfTable.vue';
import 'handsontable/dist/handsontable.full.min.css';

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

const OilOpt = ref<Pysc.TableCFOption[]>([
  {
    data: [Array(34).fill(null)],
    headers: [],
    columns: [],
    cells: []
  }, {
    data: [Array(34).fill(null)],
    headers: [],
    columns: [],
    cells: []
  }
])
const GasOpt = ref<Pysc.TableCFOption[]>([
  {
    data: [Array(34).fill(null)],
    headers: [],
    columns: [],
    cells: []
  }, {
    data: [Array(34).fill(null)],
    headers: [],
    columns: [],
    cells: []
  }
])
const ConstOpt = ref<Pysc.TableCFOption[]>([
  {
    data: [Array(35).fill(null)],
    headers: [],
    columns: [],
    cells: []
  }, {
    data: [Array(35).fill(null)],
    headers: [],
    columns: [],
    cells: []
  }
])

const curSelCase = computed(() => appStore.curSelCase)
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
    tableOil1.value?.updateTable()
    tableOil2.value?.updateTable()
    tableGas1.value?.updateTable()
    tableGas2.value?.updateTable()
    tableCons1.value?.updateTable()
    tableCons2.value?.updateTable()
  })

}
const updateChart = () => {
  nextTick(() => {
    RefOChartCF1.value?.updateChart()
    RefOChartCF2.value?.updateChart()
    RefGChartCF1.value?.updateChart()
    RefGChartCF2.value?.updateChart()
    RefCChartCF1.value?.updateChart()
    RefCChartCF2.value?.updateChart()
  })
}

const loadCF = async () => {
  isLoading.value = true
  //clear data
  OilOpt.value.forEach(value => value.data.splice(0, value.data.length, ...JSON.parse(JSON.stringify([Array(34).fill(null)]))))
  GasOpt.value.forEach(value => value.data.splice(0, value.data.length, ...JSON.parse(JSON.stringify([Array(34).fill(null)]))))
  ConstOpt.value.forEach(value => value.data.splice(0, value.data.length, ...JSON.parse(JSON.stringify([Array(35).fill(null)]))))
  try {
    const result = await $api('auth/calc_cf', {
      params: {
        type: PyscConf.dataGConf.type_of_contract,
        data: btoa(JSON.stringify(PyscConf.makeJSON(appStore.curSelCase)))
      },
      method: 'GET',
      onResponseError({ response }) {
        throw [response.status, response._data.detail]
      },
    })
    if (!(isObject(result) && !isEmpty(result))) throw "Error Calculation"

    const MapDataCF = (dataOil: any, dataGas: any, dataConst: any, isCR: boolean = true, icontract: number = 0) => {
      if (isCR) {
        OilOpt.value[icontract].headers.splice(0, OilOpt.value[icontract].headers.length, ...["Year", "Lifting", "Price", "Revenue", "Depreciable", "Intangible", "OPEX", "ASR", "Depreciation", "Non Capital", "FTP", "FTP - CTR", "FTP - GOV", "Investment Credit", "Unrecovered Cost", "Cost To Be Recovered", "Cost Recovery", "Equity To Be Shared (ETS) Before Transfer", "Transfer (Tf) to GAS", "Unrec. After Tf", "Cost To Be Recovered After Tf", "Cost Recovery After Tf", "ETS After Tf", "Contractor Share", "Government Share", "DMO Volume", "DMO Fee", "DDMO", "Taxable Income", "Tax Payment", "Contractor Share", "Cashflow", "Cum. Cashflow", "Governent Take"])
        GasOpt.value[icontract].headers.splice(0, OilOpt.value[icontract].headers.length, ...["Year", "Lifting", "Price", "Revenue", "Depreciable", "Intangible", "OPEX", "ASR", "Depreciation", "Non Capital", "FTP", "FTP - CTR", "FTP - GOV", "Investment Credit", "Unrecovered Cost", "Cost To Be Recovered", "Cost Recovery", "Equity To Be Shared (ETS) Before Transfer", "Transfer (Tf) to GAS", "Unrec. After Tf", "Cost To Be Recovered After Tf", "Cost Recovery After Tf", "ETS After Tf", "Contractor Share", "Government Share", "DMO Volume", "DMO Fee", "DDMO", "Taxable Income", "Tax Payment", "Contractor Share", "Cashflow", "Cum. Cashflow", "Governent Take"])
        ConstOpt.value[icontract].headers.splice(0, OilOpt.value[icontract].headers.length, ...["Year", "Lifting Oil", "Lifting Gas", "Revenue", "Depreciable", "Intangible", "OPEX", "ASR", "Depreciation", "Non Capital", "FTP", "FTP - CTR", "FTP - GOV", "Investment Credit", "Unrecovered Cost", "Cost Recovery", "Equity To Be Shared (ETS) Before Transfer", "Unrec. After Tf", "Cost To Be Recovered After Tf", "Cost Recovery After Tf", "ETS After Tf", "Contractor Share", "Government Share", "DMO Volume", "DMO Fee", "DDMO", "Taxable Income", "Tax Due", "Unpaid Tax Balance", "Tax Payment", "CTR Net Share", "CTR Take", "Cashflow", "Cum. Cash Flow", "Government Take"])
      } else {
        OilOpt.value[icontract].headers.splice(0, OilOpt.value[icontract].headers.length, ...["Year", "Lifting", "Price", "Depreciable", "Intangible", "Opex", "ASR", "Revenue", "BaseSplit", "Variable Split", "Progressive Split", "Contractor Split", "Contractor Share", "Government Share", "Depreciation", "Non Capital", "Total Expenses", "Cost To Be Deducted", "Carry Forward Cost", "Deductible Cost", "Transfer To Gas", "Carry Forward Cost after TF", "CTR Share After TF", "CTR Net Operating Profit", "DMO Volume", "DMO Fee", "DDMO", "Taxable Income", "Tax", "Net CTR Share", "CTR Cash Flow", "Cum CashFlow", "Government Take"])
        GasOpt.value[icontract].headers.splice(0, GasOpt.value[icontract].headers.length, ...["Year", "Lifting", "Price", "Depreciable", "Intangible", "Opex", "ASR", "Revenue", "BaseSplit", "Variable Split", "Progressive Split", "Contractor Split", "Contractor Share", "Government Share", "Depreciation", "Non Capital", "Total Expenses", "Cost To Be Deducted", "Carry Forward Cost", "Deductible Cost", "Transfer To Gas", "Carry Forward Cost after TF", "CTR Share After TF", "CTR Net Operating Profit", "DMO Volume", "DMO Fee", "DDMO", "Taxable Income", "Tax", "Net CTR Share", "CTR Cash Flow", "Cum CashFlow", "Government Take"])
        ConstOpt.value[icontract].headers.splice(0, ConstOpt.value[icontract].headers.length, ...["Year", "Lifting Oil", "Lifting Gas", "Revenue", "Government Share", "Contractor Share", "Depreciation", "Opex", "ASR", "Non Capital", "Total Expenses", "Cost To Be Deducted", "Carry Forward Cost", "Deductible Cost", "Carry Forward Cost after TF", "CTR Share After", "CTR Net Operating Profit", "DMO Volume", "DMO Fee", "DDMO", "Taxable Income", "Tax", "Net CTR Share", "CashFlow", "Government Take", "cum CashFlow"])
      }

      const mapO = JSON.parse(JSON.stringify(['Year', ...Object.keys(dataOil)]))
      const mapG = JSON.parse(JSON.stringify(['Year', ...Object.keys(dataGas)]))
      const mapCons = JSON.parse(JSON.stringify(['Year', ...Object.keys(dataConst)]))
      const DYear = Object.keys(dataOil[mapO[1]])
      const CYear = Object.keys(dataConst[mapCons[1]])

      //Oil
      OilOpt.value[icontract].data.splice(0, OilOpt.value[icontract].data.length,
        ...Array(DYear.length + 1).fill(Array(mapO.length).fill(null)).map((row, ir) => {
          if (ir === DYear.length)
            return row.map((col, ic) => {
              if (ic > 0)
                return Object.values(dataOil[mapO[ic]]).reduce((total, current) => total + current, 0)
              else return col
            })
          return row.map((col, ic) => {
            if (ic === 0) return +DYear[ir]
            else return dataOil[mapO[ic]][DYear[ir]]
          })
        }))
      OilOpt.value[icontract].columns.splice(0, OilOpt.value[icontract].columns.length,
        ...Array(mapO.length).fill({}).map((col, i) => {
          if (i === 0)
            return { type: 'numeric', numericFormat: { pattern: '0' } }
          else
            return { type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 3, optionalMantissa: true, negative: "parenthesis" } } }
        }))
      OilOpt.value[icontract].cells.splice(0, OilOpt.value[icontract].cells.length,
        ...Array(mapO.length).fill({}).map((col, i) => {
          return { row: DYear.length, col: i, className: 'Row-Sum font-weight-bold' }
        }))

      //Gas
      GasOpt.value[icontract].data.splice(0, GasOpt.value[icontract].data.length,
        ...Array(DYear.length + 1).fill(Array(mapG.length).fill(null)).map((row, ir) => {
          if (ir === DYear.length)
            return row.map((col, ic) => {
              if (ic > 0)
                return Object.values(dataGas[mapG[ic]]).reduce((total, current) => total + current, 0)
              else return col
            })
          return row.map((col, ic) => {
            if (ic === 0) return +DYear[ir]
            else return dataGas[mapG[ic]][DYear[ir]]
          })
        }))
      GasOpt.value[icontract].columns.splice(0, GasOpt.value[icontract].columns.length,
        ...Array(mapG.length).fill({}).map((col, i) => {
          if (i === 0)
            return { type: 'numeric', numericFormat: { pattern: '0' } }
          else
            return { type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 3, optionalMantissa: true, negative: "parenthesis" } } }
        }))
      GasOpt.value[icontract].cells.splice(0, GasOpt.value[icontract].cells.length,
        ...Array(mapG.length).fill({}).map((col, i) => {
          return { row: DYear.length, col: i, className: 'Row-Sum font-weight-bold' }
        }))

      //consolidated
      ConstOpt.value[icontract].data.splice(0, ConstOpt.value[icontract].data.length,
        ...Array(CYear.length + 1).fill(Array(mapCons.length).fill(null)).map((row, ir) => {
          if (ir === CYear.length) return row.map((col, ic) => {
            if (ic > 0)
              return Object.values(dataConst[mapCons[ic]]).reduce((total, current) => total + current, 0)
            else return col
          })
          return row.map((col, ic) => {
            if (ic === 0) return +CYear[ir]
            else return dataConst[mapCons[ic]][CYear[ir]]
          })
        }))
      ConstOpt.value[icontract].columns.splice(0, ConstOpt.value[icontract].columns.length,
        ...Array(mapCons.length).fill({}).map((col, i) => {
          if (i === 0)
            return { type: 'numeric', numericFormat: { pattern: '0' } }
          else
            return { type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 3, optionalMantissa: true, negative: "parenthesis" } } }
        }))
      ConstOpt.value[icontract].cells.splice(0, ConstOpt.value[icontract].cells.length,
        ...Array(mapCons.length).fill({}).map((col, i) => {
          return { row: CYear.length, col: i, className: 'Row-Sum font-weight-bold' }
        }))
    }

    //update table
    if (PyscConf.dataGConf.type_of_contract <= 3) {
      MapDataCF(result.oil, result.gas, result.consolidated, PyscConf.dataGConf.type_of_contract === 1, 0)
    } else {
      MapDataCF(result.contract_1.oil, result.contract_1.gas, result.contract_1.consolidated, [3, 4].includes(PyscConf.dataGConf.type_of_contract), 0)
      MapDataCF(result.contract_2.oil, result.contract_2.gas, result.contract_2.consolidated, [3, 6].includes(PyscConf.dataGConf.type_of_contract), 1)
    }

    updateTable()
    updateChart()

  } catch (error) {
    appStore.showAlert({
      text: `Error ${Array.isArray(error) ? error[0] : ''}: ${Array.isArray(error) ? error[1] : error}`,
      isalert: true
    })
  }
  isLoading.value = false
}

watch(curSelCase, val => nextTick(() => loadCF()), { deep: true })

const currentTab = ref(0)
watch(currentTab, val => {
  if (val === 1)
    updateChart()
  else
    updateTable()
})
onMounted(() => nextTick(() => loadCF()))
</script>

<template>
  <VCard :Loading="isLoading" title="Cashflow" subtitle="Summary">
    <VCardText>
      <VTabs v-model="currentTab">
        <VTab>Table</VTab>
        <VTab>Chart</VTab>
      </VTabs>
      <VCardText class="px-1">
        <VWindow v-model="currentTab">
          <VWindowItem value="0">
            <VRow>
              <VCol cols="12" :md="PyscConf.dataGConf.type_of_contract >= 3 ? 6 : 12">
                <TableCF ref="tableOil1" title="Oil" :data-table="OilOpt[0]"
                  :multiContract="PyscConf.dataGConf.type_of_contract >= 3" />
              </VCol>
              <VCol v-if="PyscConf.dataGConf.type_of_contract >= 3" cols="12" md="6">
                <TableCF ref="tableOil2" title="Oil" :data-table="OilOpt[1]" multiContract isContract2 />
              </VCol>
            </VRow>
            <VRow v-if="PyscConf.prodHasGas()">
              <VCol cols="12" :md="PyscConf.dataGConf.type_of_contract >= 3 ? 6 : 12">
                <TableCF ref="tableGas1" title="Gas" :data-table="GasOpt[0]"
                  :multiContract="PyscConf.dataGConf.type_of_contract >= 3" />
              </VCol>
              <VCol v-if="PyscConf.dataGConf.type_of_contract >= 3" cols="12" md="6">
                <TableCF ref="tableGas2" title="Gas" :dataTable="GasOpt[1]" multiContract isContract2 />
              </VCol>
            </VRow>
            <VRow v-if="PyscConf.prodHasGas()">
              <VCol cols="12" :md="PyscConf.dataGConf.type_of_contract >= 3 ? 6 : 12">
                <TableCF ref="tableCons1" title="Consolidated" :dataTable="ConstOpt[0]"
                  :multiContract="PyscConf.dataGConf.type_of_contract >= 3" />
              </VCol>
              <VCol v-if="PyscConf.dataGConf.type_of_contract >= 3" cols="12" md="6">
                <TableCF ref="tableCons2" title="Consolidated" :dataTable="ConstOpt[1]" multiContract isContract2 />
              </VCol>
            </VRow>
          </VWindowItem>
          <VWindowItem value="1">
            <VRow>
              <VCol cols="12" :md="PyscConf.dataGConf.type_of_contract >= 3 ? 6 : 12">
                <ChartCF ref="RefOChartCF1" title="Oil CashFlow" :dataChart="OilOpt[0]" type="Oil"
                  :multiContract="PyscConf.dataGConf.type_of_contract >= 3"
                  :contract-type="[1, 3, 4].includes(PyscConf.dataGConf.type_of_contract) ? 'CR' : 'GS'" />
              </VCol>
              <VCol v-if="PyscConf.dataGConf.type_of_contract >= 3" cols="12" md="6">
                <ChartCF ref="RefOChartCF2" title="Oil CashFlow" :dataChart="OilOpt[0]" type="Oil" multiContract
                  isContract2 :contract-type="[3, 6].includes(PyscConf.dataGConf.type_of_contract) ? 'CR' : 'GS'" />
              </VCol>
            </VRow>
            <VRow v-if="PyscConf.prodHasGas()">
              <VCol cols="12" :md="PyscConf.dataGConf.type_of_contract >= 3 ? 6 : 12">
                <ChartCF ref="RefGChartCF1" title="Gas CashFlow" :dataChart="GasOpt[0]" type="Gas"
                  :multiContract="PyscConf.dataGConf.type_of_contract >= 3"
                  :contract-type="[1, 3, 4].includes(PyscConf.dataGConf.type_of_contract) ? 'CR' : 'GS'" />
              </VCol>
              <VCol v-if="PyscConf.dataGConf.type_of_contract >= 3" cols="12" md="6">
                <ChartCF ref="RefGChartCF2" title="Gas CashFlow" :dataChart="GasOpt[1]" type="Gas" multiContract
                  isContract2 :contract-type="[3, 6].includes(PyscConf.dataGConf.type_of_contract) ? 'CR' : 'GS'" />
              </VCol>
            </VRow>
            <VRow v-if="PyscConf.prodHasGas()">
              <VCol cols="12" :md="PyscConf.dataGConf.type_of_contract >= 3 ? 6 : 12">
                <ChartCF ref="RefCChartCF1" title="Consolidated CashFlow" :dataChart="ConstOpt[0]" type="Cons"
                  :multiContract="PyscConf.dataGConf.type_of_contract >= 3"
                  :contract-type="[1, 3, 4].includes(PyscConf.dataGConf.type_of_contract) ? 'CR' : 'GS'" />
              </VCol>
              <VCol v-if="PyscConf.dataGConf.type_of_contract >= 3" cols="12" md="6">
                <ChartCF ref="RefCChartCF2" title="Consolidated CashFlow" :dataChart="ConstOpt[1]" type="Cons"
                  multiContract isContract2
                  :contract-type="[3, 6].includes(PyscConf.dataGConf.type_of_contract) ? 'CR' : 'GS'" />
              </VCol>
            </VRow>
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

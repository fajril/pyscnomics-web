<script setup lang="ts">
import { useAppStore } from '@/stores/appStore';
import { usePyscConfStore } from '@/stores/genfisStore';
import { MonteDistType, usePyscMonteStore } from '@/stores/monteStore';
import { useWSStore } from '@/stores/wsStore';
import * as Pysc from "@/utils/pysc/pyscType";
import MonteResChart from '@/views/pages/analysis/monteResChart.vue';
import MonteResTable from '@/views/pages/analysis/monteResTable.vue';
import 'handsontable/dist/handsontable.full.min.css';
import HyperFormula from 'hyperformula';
import * as math from 'mathjs';

definePage({
  name: 'pysc-monte',
  path: '/pysc-monte',
  meta: {
    title: "Uncertainity",
  },
})

const appStore = useAppStore()
const PyscConf = usePyscConfStore()
const MonteStore = usePyscMonteStore()
const wsStore = useWSStore()
const isLoading = ref(false)
const isValid = ref(false)
const cardParams = ref()
const cardResult = ref()
const { monteConfig: monteCfg } = storeToRefs(MonteStore)

const { top, left, width, height } = useElementBounding(cardParams)

const oilProd = PyscConf.getProducer(Pysc.ProducerType.Oil)
const idxGas = monteCfg.value.params.findIndex(v => v.id === 1)

const dataTable = ref(JSON.parse(JSON.stringify(monteCfg.value.params.map(v => {
  return {
    id: v.id,
    name: v.id === 0 ? 'Oil Price, <small>USD/BBL</small>' : (v.id === 1 ? 'Gas Price, <small>USD/MMBTU</small>' : (v.id === 2 ? 'Opex, <small>MUSD</small>' : (v.id === 3 ? 'Capex, <small>MUSD</small>' : 'Cum. Prod, <small>MBOPY</small>'))),
    dist: Object.values(MonteDistType)[v.dist],
    min: v.min,
    base: v.base,
    max: v.max,
    stddev: v.stddev
  }
}))))

if (PyscConf.prodHasGas() && idxGas === -1) {
  dataTable.value.splice(1, 0, { id: 1, name: 'Gas Price, <small>USD/MMBTU</small>', dist: 'Normal', min: null, max: null, base: null, stddev: 1.25 })
} else if (!PyscConf.prodHasGas() && idxGas != -1) {
  dataTable.value.splice(idxGas, idxGas)
}


dataTable.value.forEach(el => {
  if (el.id === 0)
    el.base = (oilProd?.prod_price[0][oilProd?.prod_price[0].length - 1].price) ?? 65
  else if (el.id === 1 && PyscConf.prodHasGas()) {
    const gasProd = PyscConf.getProducer(Pysc.ProducerType.Gas)
    el.base = (gasProd?.prod_price[0][gasProd?.prod_price[0].length - 1].price) ?? 4.5
  }
  else if (el.id === 2)
    el.base = math.sum(PyscConf.dataOpex.map(v => v[2]))
  else if (el.id === 3)
    el.base = math.sum(PyscConf.dataTan.map(v => v[2]))
  else if (el.id === 4)
    el.base = math.sum(oilProd?.prod_price[0].map(v => v.sales)) ?? 0

  if (el.base) {
    if (el.min === null || el.min === undefined || el.min >= el.base)
      el.min = 0.7 * el.base
    if (el.max === null || el.max === undefined || el.max >= el.base)
      el.max = 1.3 * el.base
  }
})

const refTableMonteCfg = ref()
const tableMonteConfig = computed(() => {
  const Opt = {
    data: dataTable.value,
    colHeaders: ['Parameter', 'Distribution', 'Min', 'Base', 'Max', 'Std.Dev'],
    columns: [
      { data: 'name', renderer: 'html', readOnly: true },
      { data: 'dist', type: 'dropdown', source: Object.values(MonteDistType), visibleRows: 15 },
      { data: 'min', type: 'numeric', validator: 'numeric', allowInvalid: false, numericFormat: { pattern: { thousandSeparated: true, mantissa: 3, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } },
      { data: 'base', type: 'numeric', readOnly: true, numericFormat: { pattern: { thousandSeparated: true, mantissa: 3, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } },
      { data: 'max', type: 'numeric', validator: 'numeric', allowInvalid: false, numericFormat: { pattern: { thousandSeparated: true, mantissa: 3, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } },
      { data: 'stddev', type: 'numeric', validator: 'numeric', allowInvalid: false, numericFormat: { pattern: { thousandSeparated: true, mantissa: 3, trimMantissa: true, optionalMantissa: true, negative: "parenthesis" } } },
    ],
    afterValidate(isValid, value, row, prop) {
      if (!isValid) {
        appStore.showAlert({
          text: `"${value}" Is invalid value`,
          isalert: true
        })
      }
      else {
        const iCol = tableMonteConfig.value.columns.findIndex(c => c.data === prop)
        const ctype = refTableMonteCfg.value.hotInstance.getDataType(row, iCol, row, iCol)
        nextTick(() => {
          if (ctype === 'numeric' && (typeof dataTable.value[row][prop] === 'string') &&
            dataTable.value[row][prop].indexOf('=') != -1) {
            dataTable.value[row][prop] = value
            refTableMonteCfg.value.hotInstance.updateData(dataTable.value)
          }
        })
      }
      return isValid
    },
    formulas: {
      engine: HyperFormula,
    },
    rowHeaders: false,
    height: 'auto',
    autoWrapRow: false,
    stretchH: 'all',
    manualColumnResize: true,
    autoWrapCol: false,
    AutoRowSize: true,
    autoColumnSize: { allowSampleDuplicates: true, useHeaders: true, samplingRatio: 30 },
    fixedColumnsStart: 1,
    licenseKey: 'non-commercial-and-evaluation'
  }
  return Opt
})

function ValidateData() {
  let valid = true
  dataTable.value.forEach(el => {
    if (math.isNaN(+el.min) || el.min === null || el.min >= el.base ||
      math.isNaN(+el.max) || el.max === null || el.max <= el.base || math.isNaN(+el.stddev) || el.stddev === null ||
      !(typeof el.dist === 'string' && ['uniform', 'triangular', 'normal'].includes(el.dist.toLowerCase())))
      valid = false
  })
  return valid
}

watch(dataTable, val => {
  isValid.value = ValidateData()
}, { deep: true })

const selPanel = ref([0])

const ResultParams = ref(['Oil Price', 'Opex', 'Capex', 'Cum. prod.'])
const ResultTable = ref({
  NPV: [],
  IRR: [],
  "P/I": [],
  POT: [],
  "Government Take": [],
  "Contractor Net Share": []
})


const curCaseID = ref()
const progress = ref(0)
const addBroadCast = () => {
  if (appStore.curSelCase) {
    wsStore.addBroadCast('monte', appStore.curSelCase, (msg: any) => {
      if (msg.id === curCaseID.value) {
        if (msg.data.progress === -1) {
          //done
          if (PyscConf.prodHasGas())
            ResultParams.value.splice(0, ResultParams.value.length, ...['Oil Price', 'Gas Price', 'Opex', 'Capex', 'Cum. prod.'])
          else
            ResultParams.value.splice(0, ResultParams.value.length, ...['Oil Price', 'Opex', 'Capex', 'Cum. prod.'])

          Object.keys(ResultTable.value).forEach((key, index) => {
            ResultTable.value[key].splice(0, ResultTable.value[key].length, ...
              msg.data.output.results.map(el => [el[0], el[index + 1], ...el.slice(-(el.length - 6 - 1))]))
          })
          MonteStore.$patch({ IsOnCalc: false })
        } else {
          progress.value = msg.data.progress
          if (!MonteStore.IsOnCalc) MonteStore.$patch({ IsOnCalc: true })
        }
      }
    })
    curCaseID.value = appStore.curSelCase
  }
}

function Calc() {
  progress.value = 0
  if (ValidateData())
    MonteStore.MonteCalc(curCaseID.value, dataTable.value)
  else
    appStore.showAlert({
      text: "Invalid data entries",
      isalert: true
    })
}


onMounted(() => {
  nextTick(() => {
    isValid.value = ValidateData()
    addBroadCast()
  })
})

onUnmounted(() => {
  if (curCaseID.value)
    wsStore.removeBroadCast('monte', curCaseID.value)
})

const curSelCase = computed(() => appStore.curSelCase)

watchDebounced(curSelCase, () => {
  if (curCaseID.value) {
    wsStore.removeBroadCast('monte', curCaseID.value)
    MonteStore.$patch({
      IsOnCalc: false
    })
  }
  nextTick(() => {
    addBroadCast()
  })
}, { debounce: 2000, deep: true })

</script>

<template>
  <VCard :loading="isLoading" title="Uncertainity" subtitle="Analysis">
    <VCardText v-if="MonteStore.IsOnCalc" class="py-0">
      <VProgressLinear v-model="progress" striped color="rgba(var(--v-theme-success), 0.6)" height="5"
        bg-color="background" />
    </VCardText>
    <VCardText>
      <AppCardActions ref="cardParams" action-collapsed title="Parameter" compact-header
        :disabled="MonteStore.IsOnCalc">
        <VCardText>
          <VRow>
            <VCol cols="12" class="d-flex align-center justify-content-start">
              <VTextField v-model.number="monteCfg.numsim" label="Number of simulation" variant="outlined"
                style="max-inline-size: 200px;" :rules="[requiredValidator, numberValidator]" />
              <VBtn class="ms-4" :disabled="!isValid" @click.prevent="Calc">
                Run
              </VBtn>
            </VCol>
            <VCol cols="12">
              <hot-table ref="refTableMonteCfg" :settings="tableMonteConfig"></hot-table>
            </VCol>
          </VRow>
        </VCardText>
      </AppCardActions>
    </VCardText>
    <VCardText>
      <AppCardActions ref="cardResult" action-collapsed title="Result" compact-header>
        <VCardText class="px-2">
          <VExpansionPanels multiple v-model="selPanel">
            <VExpansionPanel class="custom-expan-monte-panel"
              v-for="(item, index) in Object.keys(ResultTable).map((v, i) => ({ name: v, value: i }))"
              :key="`monteres_${item.name}`" :value="item.value" selected-class="v-list-item--active">
              <v-expansion-panel-title collapse-icon="tabler-chevron-left" expand-icon="tabler-chevron-down">
                <template v-slot:default="{ expanded }">
                  <span>{{ item.name }}</span>
                </template>
              </v-expansion-panel-title>
              <VExpansionPanelText>
                <VRow>
                  <VCol cols="12" md="4">
                    <MonteResTable :has-gas="PyscConf.prodHasGas()" :data-table="ResultTable[item.name]"
                      :parameter="ResultParams" />
                  </VCol>
                  <VCol cols="12" md="8">
                    <MonteResChart :has-gas="PyscConf.prodHasGas()" :data-chart="ResultTable[item.name]"
                      :title="item.name"
                      :unit="item.value === 1 ? '%' : (item.value === 3 ? 'Year' : (item.value != 2 ? 'MUSD' : ''))" />
                  </VCol>
                </VRow>
              </VExpansionPanelText>
            </VExpansionPanel>
          </VExpansionPanels>
        </VCardText>
      </AppCardActions>
    </VCardText>
  </VCard>
</template>

<style lang="scss">
.custom-expan-monte-panel>.v-expansion-panel-title--active>.v-expansion-panel-title__overlay,
.v-expansion-panel-title[aria-haspopup="menu"][aria-expanded="true"]>.v-expansion-panel-title__overlay {
  background-color: transparent !important;
}

.not_to_dimmed {
  .handsontable .htDimmed {
    color: inherit !important
  }
}
</style>

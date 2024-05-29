<script setup lang="ts">
import { useAppStore } from '@/stores/appStore';
import { usePyscConfStore } from '@/stores/genfisStore';
import { optimParamType, optimTarget, usePyscOptimStore } from '@/stores/optimStore';
import * as Pysc from "@/utils/pysc/pyscType";
import { useDataStore } from '@/utils/pysc/useDataStore';
import ChartCompare from '@/views/components/chartCompare.vue';
import TableCompare from '@/views/components/tableCompare.vue';
import * as math from 'mathjs';
import { useDraggable } from 'vue-draggable-plus';


definePage({
  name: 'pysc-optim',
  path: '/pysc-optim',
  meta: {
    title: "Optimization",
  },
})

const appStore = useAppStore()
const PyscConf = usePyscConfStore()
const PyscOptim = usePyscOptimStore()
const { optimConfig } = storeToRefs(PyscOptim)
const numbro = Pysc.useNumbro()

const isLoading = ref(false)

const paramsOptim = computed(() => {
  const lst = PyscConf.generalConfig.type_of_contract === 1 ?
    Array(10).fill(0).map((v, i) => i) : [8, 9, 10]
  return lst.map((v, i) => ({ title: Object.values(optimParamType)[v], value: v }))
})

const optimParamChanged = (parID: number) => {
  if (parID === -2) {
    PyscOptim.$patch((state) => {
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
  } else if (parID === -3) {
    PyscOptim.$patch((state) => {
      state.optimConfig.optimization.forEach(p => p.checked = false)
    })
  } else {
    const index = optimConfig.value.optimization.findIndex(p => p.parameter === parID)
    PyscOptim.$patch((state) => {
      const lParsChecked = state.optimConfig.optimization.filter(p => paramsOptim.value.map(l => l.value).includes(p.parameter) && p.checked).map(p => p.pos)
      const nIndex = lParsChecked.length ? (math.max(lParsChecked) + 1) : 0
      state.optimConfig.optimization[index].checked = !state.optimConfig.optimization[index].checked
      if (state.optimConfig.optimization[index].checked) state.optimConfig.optimization[index].pos = nIndex
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
  if (paramID === 0)
    return PyscConf.dataContr.cr.TaxSplit.pre_tax_ctr_oil
  else if (paramID === 1)
    return PyscConf.dataContr.cr.TaxSplit.pre_tax_ctr_gas
  else if (paramID === 2)
    return PyscConf.dataContr.cr.oil_ftp.ftp_portion
  else if (paramID === 3)
    return PyscConf.dataContr.cr.gas_ftp.ftp_portion
  else if (paramID === 4)
    return PyscConf.dataContr.cr.IC.ic_oil
  else if (paramID === 5)
    return PyscConf.dataContr.cr.IC.ic_gas
  else if (paramID === 6)
    return PyscConf.dataContr.cr.OilDMO.fee
  else if (paramID === 7)
    return PyscConf.dataContr.cr.GasDMO.fee
  else if (paramID === 8)
    return PyscConf.fiscal.Fiskal.VAT.vat_rate_init
  else if (paramID === 9)
    return PyscConf.fiscal.Fiskal.Tax.tax_rate_init
  else if (paramID === 10)
    return PyscConf.contracts.gs.ministry_discretion_split
  return null
}

const baseTarget = ref<number[]>([0.0, 0.0, 0.0])
const getBaseTarget = (targetIndex: number | string) => {
  if (targetIndex !== null && targetIndex !== undefined)
    return numbro(baseTarget.value[+targetIndex]).format({ mantissa: 2, optionalMantissa: true })
  return ""
}

const buildDataParams = async (calcBase: boolean = false) => {
  watcherOptimData.pause()
  const lParsChecked = PyscOptim.optimConfig.optimization
    .filter(p => paramsOptim.value.map(l => l.value).includes(p.parameter) && p.checked)
    .sort((a, b) => a.pos - b.pos)
  dataParams.value.splice(0, dataParams.value.length, ...lParsChecked.map(el =>
  ({
    parameter: el.parameter,
    min: +numbro(el.min * 100).format({ mantissa: 3, optionalMantissa: true }),
    max: +numbro(el.max * 100).format({ mantissa: 3, optionalMantissa: true }),
    base: getBaseValue(el.parameter)
  })
  ))
  try {
    const result = await $api('auth/get_optim_base_target', {
      params: {
        type: PyscConf.dataGConf.type_of_contract,
        data: btoa(JSON.stringify(useDataStore().makeJSONofCase(appStore.curSelCase,
          PyscConf.dataGConf, PyscConf.dataProd, PyscConf.dataContr, PyscConf.dataFisc,
          PyscConf.dataTan, PyscConf.dataIntan, PyscConf.dataOpex, PyscConf.dataASR, true)))
      },
      method: 'GET',
      onResponseError({ response }) {
        throw [response.status, response._data.detail]
      },
    })
    baseTarget.value.splice(0, baseTarget.value.length, ...[result.IRR * 100, result.NPV, result.PI])
  } catch (error) {
    baseTarget.value.splice(0, baseTarget.value.length, ...[0.0, 0.0, 0.0])
  }
  nextTick(() => watcherOptimData.resume())
}


const draggable = useDraggable(dragAbleList, dataParams, {
  animation: 500,
  handle: ".list-drag-handle",
  direction: 'vertical',
  onStart() {
  },
  onUpdate() {
    PyscOptim.$patch((state) => {
      state.optimConfig.optimization.forEach(el => {
        const index = dataParams.value.findIndex(v => v.parameter === el.parameter)
        el.pos = index
      })
    })
  }
})

const isValid = computed(() => {
  return optimConfig.value.target_optimization &&
    dataParams.value.length && dataParams.value.filter(v => v.min < v.max).length === dataParams.value.length
})
const optimResult = ref<object>({})

const getOptimResult = (paramID: number) => {
  if (optimResult.value.hasOwnProperty('result')) {
    let val = optimResult.value.result.list_params_value[Object.values(optimParamType)[paramID]]
    if (typeof val !== 'number')
      val = getBaseValue(paramID)
    return numbro(val).format({
      mantissa: 2,
      optionalMantissa: true, output: 'percent',
      spaceSeparated: true, thousandSeparated: true
    })
  }
  return '-'
}

const CalcOptim = async () => {
  if (!isValid.value) return
  try {
    const dataJson = {
      ...useDataStore().makeJSONofCase(appStore.curSelCase,
        PyscConf.dataGConf, PyscConf.dataProd, PyscConf.dataContr, PyscConf.dataFisc,
        PyscConf.dataTan, PyscConf.dataIntan, PyscConf.dataOpex, PyscConf.dataASR, true),
      optimization_arguments: {
        dict_optimization: {
          parameter: dataParams.value.map(v => Object.values(optimParamType)[v.parameter]),
          min: dataParams.value.map(v => v.min / 100),
          max: dataParams.value.map(v => v.max / 100)
        },
        target_optimization: optimConfig.value.target_optimization / (optimConfig.value.target_parameter == 0 ? 100 : 1),
        target_parameter: Object.values(optimTarget)[optimConfig.value.target_parameter]
      },
    }
    const result = await $api('auth/calc_optim', {
      params: {
        type: PyscConf.dataGConf.type_of_contract,
        data: btoa(JSON.stringify(dataJson))
      },
      method: 'GET',
      onResponseError({ response }) {
        throw [response.status, response._data.detail]
      },
    })
    if (result.state === true) {
      optimResult.value = JSON.parse(JSON.stringify(result.out))
    } else throw "unknown error calculation"
    nextTick(() => appStore.dataChanges())
  } catch (error) {
    optimResult.value = {}
    const err = Pysc.extractError(error)
    appStore.showAlert({
      text: `Error ${err.status}: ${err.msg}`,
      isalert: true
    })
  }
}

const getResultTable = computed(() => {
  if (optimResult.value.hasOwnProperty('result') && Array.isArray(optimResult.value.summary1) && Array.isArray(optimResult.value.summary2)) {
    return optimResult.value.summary1.map((v, i) => [v, optimResult.value.summary2[i]])
  } else
    return []
})

const getResultChart = computed(() => {
  if (optimResult.value.hasOwnProperty('result') && Array.isArray(optimResult.value.summary1) && Array.isArray(optimResult.value.summary2)) {
    return [optimResult.value.summary1, optimResult.value.summary2].map((cs, idx) => {
      return [
        cs[4], //'Revenue'
        cs[15], //'CR/DC'
        cs[20], //'NCS'
        cs[24], //'Ctr. NPV'
        cs[25], //'Ctr. IRR'
        cs[28], //'Ctr. PI'
        cs[32], //'DMO'
        cs[33], //'Tax'
        cs[34], //'GoS'
        cs[36], //'GoI NPV'
      ]
    })
  } else
    return []
})

watchDebounced(optimConfig, (val) => {
  if (PyscOptim.watcherOptimCfg.isActive && watcherOptimData.isActive?.value) {
    optimResult.value = {}
    // if (isValid.value)
    //   nextTick(() => CalcOptim())
  }
}, { debounce: 500, deep: true, maxWait: 1000 })


const { stopCaseID, CallableFunc } = useDataStore().useWatchCaseID(() => {
  console.log("sens trigger")
  buildDataParams(true)
  if (isValid.value)
    nextTick(() => CalcOptim())
  else
    optimResult.value = {}
})

onMounted(() => {
  CallableFunc()
})

onUnmounted(() => {
  stopCaseID()
})
</script>

<template>
  <VCard :loading="isLoading" :title="$t('Optimization')" :subtitle="$t('Analysis')">
    <VCardText v-if="![1, 2].includes(PyscConf.generalConfig.type_of_contract)">
      <VAlert density="comfortable" color="success" variant="tonal">
        Only PSC Cost Recovery (CR) and PSC Gross Split (GS) can be optimized
      </VAlert>
    </VCardText>
    <VCardText v-else>
      <VRow>
        <VCol cols="12" xl="8" lg="10">
          <span class="font-weight-bold text-primary">{{ $t('Target') }}</span>
          <div class="d-flex align-center w-100 mt-2">
            <AppSelect v-model="optimConfig.target_parameter"
              :items="Object.values(optimTarget).map((v, i) => ({ title: v, value: i }))" item-props variant="outlined"
              label-placeholder="Parameters" />
            <AppTextField v-model.number="optimConfig.target_optimization"
              :label-placeholder="'Target value' + (optimConfig.target_parameter === 0 ? ', %' : (optimConfig.target_parameter === 1 ? ', M.US$' : ''))" />
            <AppTextField :model-value="getBaseTarget(optimConfig.target_parameter)"
              :label-placeholder="'base value' + (optimConfig.target_parameter === 0 ? ', %' : (optimConfig.target_parameter === 1 ? ', M.US$' : ''))"
              readOnly />
            <VBtn class="ms-4" :disabled="!isValid" @click.prevent="CalcOptim">
              {{ $t('Run') }}
            </VBtn>
          </div>
        </VCol>
        <VCol cols="12" md="8" class="px-0 pr-1">
          <VRow>
            <VCol cols="12">
              <AppCardActions action-collapsed
                :title="$t((PyscConf.generalConfig.type_of_contract === 1 ? 'Cost Recovery (CR)' : 'Gross Split (GS)') + ' Optimization')"
                compact-header>
                <template #before-actions>
                  <IconBtn density="compact" color="disabled">
                    <VIcon size="26" icon="tabler-plus" />
                    <VMenu activator="parent">
                      <VList density="compact">
                        <template
                          v-for="(item, index) in [...paramsOptim, { title: 'separator', value: -1 }, { title: 'Checked All', value: -2 }, { title: 'Unchecked All', value: -3 }]"
                          :key="item.title">
                          <VDivider v-if="item.value === -1" />
                          <VListItem v-else @click="() => optimParamChanged(item.value)" density="compact">
                            <template #prepend>
                              <VIcon v-if="item.value >= 0"
                                :icon="optimConfig.optimization.filter(p => p.parameter === item.value).findIndex(l => l.checked) != -1 ? 'tabler-check' : ''" />
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
                  <VList ref="dragAbleList" density="comfortable" lines="two">
                    <template v-for="(item, index) in dataParams" :key="item.parameter">
                      <VListItem border class="mx-1" :title="Object.values(optimParamType)[item.parameter]"
                        :subtitle="'base value: ' + (item.base ? numbro(item.base).format({ output: 'percent', mantissa: 2, optionalMantissa: true, spaceSeparated: true }) : '')">
                        <template #prepend>
                          <VIcon icon="tabler-dots-vertical" style="cursor:move;inline-size:24px;"
                            class="ms-n3 list-drag-handle" />
                        </template>
                        <template #append>
                          <VRow no-gutters align="center" style="min-inline-size: 200px;">
                            <VCol cols="6" class="mx-0 pt-1">
                              <AppTextField density="compact" label-placeholder="Min, %" v-model.number="item.min" />
                            </VCol>
                            <VCol cols="6" class="mx-0 pt-1">
                              <AppTextField density="compact" label-placeholder="Max, %" v-model.number="item.max" />
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
        <VCol cols="12" md="4" class="px-0 pl-1">
          <AppCardActions action-collapsed :title="$t('Result')" compact-header>
            <VCardText>
              <VList density="comfortable">
                <VListItem class="mx-0 px-1" :title="Object.values(optimTarget)[optimConfig.target_parameter]"
                  density="compact" :subtitle="getBaseTarget(optimConfig.target_parameter)">
                  <template #subtitle="{ subtitle }">
                    <span class="text-caption text-primary">
                      base: {{ numbro(subtitle).format({
                        mantissa: 2,
                        optionalMantissa: true, output: optimConfig.target_parameter === 0 ? 'percent' : 'number',
                        spaceSeparated: true, thousandSeparated: true
                      }) }}
                    </span>
                  </template>
                  <template #append>
                    <span class="text-right">{{ optimResult.result ?
                      numbro(optimResult.result.optimization_result).format({
                        mantissa: 2,
                        optionalMantissa: true, output: optimConfig.target_parameter === 0 ? 'percent' : 'number',
                        spaceSeparated: true, thousandSeparated: true
                      }) : '-' }}</span>

                  </template>
                </VListItem>
                <VDivider />
                <template v-for="(item, index) in dataParams" :key="item.parameter">
                  <VListItem class="mx-0 px-1" :title="Object.values(optimParamType)[item.parameter]" density="compact"
                    :subtitle="item.base ? numbro(item.base).format({ output: 'percent', mantissa: 2, optionalMantissa: true, spaceSeparated: true }) : 0">
                    <template #subtitle="{ subtitle }">
                      <span class="text-caption text-primary">
                        base: {{ subtitle }}
                      </span>
                    </template>
                    <template #append>
                      <span class="text-right"
                        :class="{ 'text-primary': typeof optimResult.result?.list_params_value[Object.values(optimParamType)[item.parameter]] !== 'number' }">{{
                          getOptimResult(item.parameter) }}</span>
                    </template>
                  </VListItem>
                  <VDivider />
                </template>
              </VList>
            </VCardText>

          </AppCardActions>
        </VCol>
        <VCol cols="12">
          <VRow>
            <VCol cols="12" lg="7" class="px-0 pr-1">
              <AppCardActions action-collapsed title="Summary" compact-header>
                <TableCompare :columns="[{ title: 'Base Case' }, { title: 'Optimized Case' }]" :data="getResultTable" />
              </AppCardActions>
            </VCol>
            <VCol cols="12" lg="5" class="px-0 pl-1">
              <AppCardActions action-collapsed title="Chart" compact-header style="overflow:visible !important;">
                <ChartCompare :series="[{ id: 0, title: 'Base case' }, { id: 1, title: 'Optimized case' }]"
                  :dataChart="getResultChart" />
              </AppCardActions>
            </VCol>
          </VRow>
        </VCol>
      </VRow>
    </VCardText>
  </VCard>
</template>

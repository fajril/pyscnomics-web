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
const dayjs = Pysc.useDayJs()

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
    return PyscConf.fiscal.Fiskal.VAT.vat_mode === 1 ? PyscConf.fiscal.Fiskal.VAT.multi_vat_init : PyscConf.fiscal.Fiskal.VAT.vat_rate_init
  else if (paramID === 9)
    return PyscConf.fiscal.Fiskal.Tax.tax_mode === 1 ? PyscConf.fiscal.Fiskal.Tax.multi_tax_init : PyscConf.fiscal.Fiskal.Tax.tax_rate_init
  else if (paramID === 10)
    return PyscConf.contracts.gs.ministry_discretion_split
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
        data: btoa(JSON.stringify(useDataStore().curCase2Json(true)))
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

const updateDragAble = () => {
  if (dragAbleList.value) {
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
  }
}

const isValid = computed(() => {
  return optimConfig.value.target_optimization &&
    dataParams.value.length && dataParams.value.filter(v => v.min < v.max).length === dataParams.value.length
})
const optimResult = ref<object>({})

const getOptimResultValue = (paramID: number) => {
  if (optimResult.value?.result)
    return optimResult.value.result.list_params_value[Object.values(optimParamType)[paramID] === 'Gas DMO Fee' ? 'Gas Dmo Fee' : Object.values(optimParamType)[paramID]]
  return false
}
const getOptimResult = (paramID: number) => {
  if (optimResult.value.hasOwnProperty('result')) {
    const key = Object.values(optimParamType)[paramID]
    let val = optimResult.value.result.list_params_value[key === 'Gas DMO Fee' ? 'Gas Dmo Fee' : key]
    if (typeof val === 'string' && val.toLowerCase() === 'base value')
      return getBaseValue(paramID)
    if (typeof val === 'number')
      return numbro(val).format({
        mantissa: 2,
        optionalMantissa: true, output: 'percent',
        spaceSeparated: true, thousandSeparated: true
      })
    else if (Array.isArray(val)) {
      const type_of_contract = PyscConf.dataGConf.type_of_contract
      const startY = dayjs.utc(PyscConf.dataGConf.start_date_project).local().year()
      let endY = dayjs.utc(PyscConf.dataGConf.end_date_project).local().year()
      const end2Y = dayjs.utc(PyscConf.dataGConf.end_date_project_second).local().year()
      if (type_of_contract >= 3) endY = math.max([endY, end2Y])
      const mapY = Array.from({ length: endY - startY + 1 }, (_, i) => (startY - 1) + i + 1)
      const valArr = mapY.map((v, i) => ({ year: v, rate: val[i] }))
      return useArrayUnique(valArr, (a, b) => a.rate === b.rate).value
    }
  }
  return '-'
}

const CalcOptim = async () => {
  if (!isValid.value) return
  try {
    const dataJson = {
      ...useDataStore().curCase2Json(true),
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
                        :subtitle="Array.isArray(item.base) ? JSON.stringify(item.base) : ('base value: ' + (item.base ? numbro(item.base).format({ output: 'percent', mantissa: 2, optionalMantissa: true, spaceSeparated: true }) : ''))">
                        <template #subtitle="{ subtitle }">
                          <VListItemSubtitle v-if="Array.isArray(item.base)">
                            base value:<span class="ms-1 text-primary text-decoration-underline"
                              style="cursor:pointer;opacity:0.8;">
                              <VMenu activator="parent" location="bottom end" :close-on-content-click="false">
                                <VCard>
                                  <VCardItem class="info-section">
                                    {{ Object.values(optimParamType)[item.parameter] }}, %:
                                  </VCardItem>
                                  <VCardText>
                                    <table>
                                      <thead>
                                        <tr>
                                          <th>Year</th>
                                          <th>Rate, %</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr v-for="v in JSON.parse(subtitle)">
                                          <td class="ps-2 pe-3">{{ v.year }}</td>
                                          <td class="ps-1 pe-2 text-right">{{
                                            v.rate !== null ? numbro(v.rate * 100).format({ mantissa: 2 }) : '' }}</td>
                                        </tr>
                                      </tbody>
                                    </table>
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
                  density="compact" :subtitle="getBaseTarget(optimConfig.target_parameter, true)">
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
                    :subtitle="Array.isArray(item.base) ? JSON.stringify(item.base) : (item.base ? numbro(item.base).format({ output: 'percent', mantissa: 2, optionalMantissa: true, spaceSeparated: true }) : '')">
                    <template #subtitle="{ subtitle }">
                      <VListItemSubtitle v-if="Array.isArray(item.base)">
                        <span class="text-caption text-primary">base: </span><span
                          class="ms-1 text-primary text-decoration-underline" style="cursor:pointer;opacity:0.8;">
                          <VMenu activator="parent" location="bottom end" :close-on-content-click="false">
                            <VCard>
                              <VCardItem class="info-section">
                                {{ Object.values(optimParamType)[item.parameter] }}, %:
                              </VCardItem>
                              <VCardText>
                                <table class="table__wrapper">
                                  <thead>
                                    <tr>
                                      <th>Year</th>
                                      <th>Rate, %</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr v-for="v in JSON.parse(subtitle)">
                                      <td class="ps-2 pe-3">{{ v.year }}</td>
                                      <td class="ps-1 pe-2 text-right">{{
                                        v.rate !== null ? numbro(v.rate * 100).format({ mantissa: 2 }) : '' }}</td>
                                    </tr>
                                  </tbody>
                                </table>
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
                        :style="`${Array.isArray(getBaseValue(item.parameter)) ? 'cursor:pointer;opacity:0.8;' : ''}`">
                        {{ Array.isArray(getBaseValue(item.parameter)) ? 'values' : getOptimResult(item.parameter) }}
                        <VMenu v-if="Array.isArray(getBaseValue(item.parameter))" activator="parent"
                          location="bottom end" :close-on-content-click="false">
                          <VCard>
                            <VCardItem class="info-section">
                              {{ Object.values(optimParamType)[item.parameter] }}, %:
                            </VCardItem>
                            <VCardText>
                              <table class="table__wrapper">
                                <thead>
                                  <tr>
                                    <th>Year</th>
                                    <th>Rate, %</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr v-for="v in getOptimResult(item.parameter)">
                                    <td class="ps-2 pe-3">{{ v.year }}</td>
                                    <td class="ps-1 pe-2 text-right">{{
                                      v.rate !== null ? numbro(v.rate * 100).format({ mantissa: 2 }) : '' }}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </VCardText>
                          </VCard>
                        </VMenu>
                      </span>
                      <span v-else class="text-right">-</span>
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

<script setup lang="ts">
import { useAppStore } from '@/stores/appStore'
import { useHTTP } from '@/utils/pysc/useHttp'
import { usePyscConfStore } from '@/stores/genfisStore'
import type { LTPConf, RPDConf } from '@/stores/ltp_rdp'
import { useLTP_RPDStore } from '@/stores/ltp_rdp'
import { useDayJs } from '@/utils/pysc/pyscType'
import 'handsontable/dist/handsontable.full.min.css'

interface Emit {
  (e: 'apply', value: 'LTP' | 'RPD'): void
}

const emit = defineEmits<Emit>()

const appStore = useAppStore()
const isDialogVisible = ref(false)
const IsLoading = ref(false)
const confMode = ref<'LTP' | 'RPD'>('LTP')
const LTP_RPDStore = useLTP_RPDStore()
const PyscConf = usePyscConfStore()
const dayjs = useDayJs()
const LTPConfig = ref<LTPConf>(JSON.parse(JSON.stringify(LTP_RPDStore.LTPConfig)))
const RPDConfig = ref<RPDConf>(JSON.parse(JSON.stringify(LTP_RPDStore.RPDConfig)))

const { TabelContainer, hotTableRef: refTableLTPRPD, hotInstance, htTblSett: mainSetting, updateData } = useHTtable({
  data: [],
  colHeaders: ["Year", "Sales (MSTB)"],
  columns: [
    { type: 'numeric', validator: 'numeric', allowInvalid: false },
    { type: 'numeric', validator: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, optionalMantissa: true, negative: "parenthesis" } }, allowInvalid: false },
  ],
  readOnly: true,
  rowHeaders: false,
  height: '380px',
  stretchH: 'last',
}, 'none')

const CalcThis = async () => {
  try {
    const { status, result } = await useHTTP().put({
      path: confMode.value === 'LTP' ? 'calc_ltp' : 'calc_rpd',
      body: confMode.value === 'LTP' ? LTPConfig.value : RPDConfig.value,
      onError: (error: any) => { throw error },
    })

    if (status !== 200)
      throw { status, result }
    const _res = confMode.value === 'LTP' ? result.ltp : result.rpd

    const _resTable = Object.keys(_res).map(k => [+k, _res[+k]])

    updateData(_resTable)
  }
  catch (err) {
    appStore.showAlert({
      text: `Error ${(err?.status) ?? ''}: ${(err?.result) ?? 'unknown'}`,
      isalert: true,
    })
  }
}

const debounceCalc = watchDebounced(() => [LTPConfig.value, RPDConfig.value], async () => {
  await CalcThis()
}, { deep: true, immediate: false, debounce: 1000, maxWait: 3000 })

const applySett = () => {
  LTP_RPDStore.$patch(state => {
    if (confMode.value === 'LTP')
      state.LTPConfig = Object.assign({}, LTPConfig.value)
    else
      state.RPDConfig = Object.assign({}, RPDConfig.value)
  })
  emit('apply', confMode.value)
  isDialogVisible.value = false
}

const ShowLTPRPD = (mode: 'LTP' | 'RPD') => {
  confMode.value = mode
  if (confMode.value === 'LTP')
    LTPConfig.value = Object.assign({}, LTP_RPDStore.LTPConfig)
  else
    RPDConfig.value = Object.assign({}, LTP_RPDStore.RPDConfig)
  const end2Y = dayjs.utc(PyscConf.dataGConf.end_date_project_second).local().year()

  LTPConfig.value.start_year = dayjs.utc(PyscConf.dataGConf.start_date_project).local().year()
  LTPConfig.value.end_year = PyscConf.dataGConf.type_of_contract >= 3 ? end2Y : dayjs.utc(PyscConf.dataGConf.end_date_project).local().year()

  RPDConfig.value.start_year = LTPConfig.value.start_year
  RPDConfig.value.end_year = LTPConfig.value.end_year
  isDialogVisible.value = true
  nextTick(() => CalcThis())
}

defineExpose({
  ShowLTPRPD,
})

onUnmounted(() => {
  debounceCalc()
})
</script>

<template>
  <VDialog
    v-model="isDialogVisible"
    class="v-dialog-sm"
  >
    <DialogCloseBtn @click="isDialogVisible = false" />
    <VCard
      :title="confMode === 'LTP' ? 'Lifting - Long Term Planning' : 'Ramp-Up Plateu Decline'"
      :loading="IsLoading ? 'primary' : false"
    >
      <VCardText>
        <VRow no-gutters>
          <VCol cols="6">
            <VWindow v-model="confMode">
              <VWindowItem value="LTP">
                <VCardText class="px-1">
                  <AppTextField
                    v-model.number="LTPConfig.start_year"
                    label-placeholder="Start Year"
                    :rules="[requiredValidator, integerValidator]"
                    :tooltip-content="$t('start_year')"
                  />
                  <AppTextField
                    v-model.number="LTPConfig.end_year"
                    label-placeholder="End Year"
                    class="mt-4"
                    :rules="[requiredValidator, integerValidator]"
                    :tooltip-content="$t('end_year')"
                  />
                  <AppTextField
                    v-model.number="LTPConfig.volume"
                    label-placeholder="Volume"
                    class="mt-4"
                    :rules="[requiredValidator]"
                    :tooltip-content="$t('volume')"
                  />
                </VCardText>
              </VWindowItem>
              <VWindowItem value="RPD">
                <VCardText class="px-1">
                  <AppTextField
                    v-model.number="RPDConfig.start_year"
                    label-placeholder="Start Year"
                    :rules="[requiredValidator, integerValidator]"
                    :tooltip-content="$t('start_year')"
                  />
                  <AppTextField
                    v-model.number="RPDConfig.end_year"
                    label-placeholder="End Year"
                    class="mt-4"
                    :rules="[requiredValidator, integerValidator]"
                    :tooltip-content="$t('end_year')"
                  />
                  <AppTextField
                    v-model.number="RPDConfig.year_rampup"
                    label-placeholder="Rampup year(s)"
                    class="mt-4"
                    :rules="[requiredValidator, integerValidator]"
                    :tooltip-content="$t('year_rampup')"
                  />
                  <AppTextField
                    v-model.number="RPDConfig.drate"
                    label-placeholder="Decline rate"
                    class="mt-4"
                    :rules="[requiredValidator]"
                    :tooltip-content="$t('drate')"
                  />
                  <AppTextField
                    v-model.number="RPDConfig.q_plateau_ratio"
                    label-placeholder="Ratio of plateau rate and volume"
                    class="mt-4"
                    :rules="[requiredValidator]"
                    :tooltip-content="$t('q_plateau_ratio')"
                  />
                  <AppTextField
                    v-model.number="RPDConfig.q_min_ratio"
                    label-placeholder="Ratio of minimum rate"
                    class="mt-4"
                    :rules="[requiredValidator]"
                    :tooltip-content="$t('q_min_ratio')"
                  />
                  <AppTextField
                    v-model.number="RPDConfig.volume"
                    label-placeholder="Volume"
                    class="mt-4"
                    :rules="[requiredValidator]"
                    :tooltip-content="$t('volume')"
                  />
                </vcardtext>
              </VWindowItem>
            </VWindow>
          </VCol>
          <VCol cols="6">
            <VCardText ref="TabelContainer">
              <HotTable
                ref="refTableLTPRPD"
                :settings="mainSetting"
                license-key="non-commercial-and-evaluation"
              />
            </VCardText>
          </VCol>
        </VRow>
      </VCardText>
      <VCardText class="d-flex justify-end gap-3 flex-wrap">
        <VBtn
          color="secondary"
          variant="tonal"
          @click="isDialogVisible = false"
        >
          Cancel
        </VBtn>
        <VBtn @click="applySett">
          Ok
        </VBtn>
      </VCardText>
    </VCard>
  </VDialog>
</template>

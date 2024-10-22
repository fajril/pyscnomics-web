<script setup lang="ts">
import { useAppStore } from '@/stores/appStore'
import { useTooltip } from '@/utils/pysc/useTooltips'
import { usePyscConfStore } from '@/stores/genfisStore'
import {
  ContractType,
  Field2Array,
  getCtrType,
  numb2Percent,
  percent2Numb,
  useDayJs,
} from '@/utils/pysc/pyscType'

const appStore = useAppStore()
const PyscConf = usePyscConfStore()

const { dataGConf } = storeToRefs(PyscConf)

onMounted(() => {
  if (!dataGConf.value.delayAccMode) {
    dataGConf.value.delayAccMode = 0
    dataGConf.value.delayAccYear = 0
  }
})

const dayjs = useDayJs()

const discount_rate = computed({
  get: () => numb2Percent(dataGConf.value.discount_rate),
  set: val => {
    if (!isNaN(+val))
      dataGConf.value.discount_rate = percent2Numb(val)
  },
})

const updateEndProject = (str: string) => {
  dataGConf.value.end_date_project = dayjs(str).utc().valueOf()
  dataGConf.value.start_date_project_second = dayjs.utc(dataGConf.value.end_date_project).add(1, 'day').valueOf()
  if (dataGConf.value.end_date_project_second <= dataGConf.value.start_date_project_second)
    dataGConf.value.end_date_project_second = dayjs.utc(dataGConf.value.start_date_project_second).add(20, 'year').valueOf()
}

const { getToolTip } = useTooltip()
</script>

<template>
  <VRow no-gutters>
    <VCol cols="12">
      <AppSelect
        v-model="dataGConf.type_of_contract"
        :items="Field2Array(ContractType)"
        item-props
        variant="outlined"
        label-placeholder="Type of Contract"
        placeholder="select contract type"
        :tooltip-content="getToolTip('genfis.toc')"
      />
    </VCol>
    <VCol cols="12">
      <AppDateTimePicker
        :model-value="dataGConf.start_date_project"
        :label-placeholder="['Project Start', ...(dataGConf.type_of_contract >= 3 ? [getCtrType(dataGConf.type_of_contract, 0, { bracket: true })] : [])]"
        variant="outlined"
        class="mt-4"
        :tooltip-content="$t('ArrValue', [getToolTip('genfis.ps'), getCtrType(dataGConf.type_of_contract, 0, { bracket: true })])"
        @update:model-value="(str: string) => dataGConf.start_date_project = dayjs(str).utc().valueOf()"
      />
    </VCol>
    <VCol cols="12">
      <AppDateTimePicker
        :model-value="dataGConf.end_date_project"
        :label-placeholder="['Project End', ...(dataGConf.type_of_contract >= 3 ? [getCtrType(dataGConf.type_of_contract, 0, { bracket: true })] : [])]"
        class="mt-4"
        variant="outlined"
        :tooltip-content="$t('ArrValue', [getToolTip('genfis.es'), getCtrType(dataGConf.type_of_contract, 0, { bracket: true })])"
        @update:model-value="updateEndProject"
      />
    </VCol>
    <VCol
      v-if="dataGConf.type_of_contract >= 3"
      cols="12"
    >
      <AppDateTimePicker
        :model-value="dataGConf.start_date_project_second"
        :label-placeholder="['Project Start', ...[getCtrType(dataGConf.type_of_contract, 1, { bracket: true })]]"
        class="mt-4"
        :tooltip-content="$t('ArrValue', [getToolTip('genfis.ps2'), getCtrType(dataGConf.type_of_contract, 1, { bracket: true })])"
        @update:model-value="(str: string) => dataGConf.start_date_project_second = dayjs(str).utc().valueOf()"
      />
    </VCol>
    <VCol
      v-if="dataGConf.type_of_contract >= 3"
      cols="12"
    >
      <AppDateTimePicker
        :model-value="dataGConf.end_date_project_second"
        :label-placeholder="['Project End', ...[getCtrType(dataGConf.type_of_contract, 1, { bracket: true })]]"
        class="mt-4"
        :tooltip-content="$t('ArrValue', [getToolTip('genfis.es2'), getCtrType(dataGConf.type_of_contract, 1, { bracket: true })])"
        @update:model-value="(str: string) => dataGConf.end_date_project_second = dayjs(str).utc().valueOf()"
      />
    </VCol>
    <VCol
      cols="12"
      class="mt-2"
    >
      <AppCheckBox
        v-model.number="dataGConf.delayAccMode"
        :false-value="0"
        :true-value="1"
        label="Delayed"
        :tooltip-content="getToolTip('genfis.delayed')"
        class="mt-2"
      />
      <AppTextField
        v-model.number="dataGConf.delayAccYear"
        label-placeholder="Year(s)"
        class="mt-4 ms-4"
        :tooltip-content="getToolTip('genfis.delayed')"
        :rules="[requiredValidator, integerValidator]"
        :disabled="!(dataGConf.delayAccMode >= 1)"
      />
    </VCol>
    <VCol
      v-if="[1, 3, 4, 6].includes(dataGConf.type_of_contract)"
      cols="12"
      class="mt-2"
    >
      <AppCheckBox
        v-model.number="dataGConf.useCOS"
        label="use Cost of Sales"
        class="mt-2"
      />
    </VCol>
  </VRow>
</template>

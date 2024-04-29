<script setup lang="ts">
import { usePyscConfStore } from '@/stores/genfisStore';
import {
  ContractType,
  Field2Array,
  InflateToType,
  useDayJs
} from '@/utils/pysc/pyscType';

const PyscConf = usePyscConfStore()

const { dataGConf } = storeToRefs(PyscConf)

const dayjs = useDayJs()

const discount_rate = computed({ get: () => dataGConf.value.discount_rate * 100., set: (val) => { if (!isNaN(+val)) dataGConf.value.discount_rate = +val / 100 } })

const updateEndProject = (str: string) => {
  dataGConf.value.end_date_project = dayjs(str).utc().valueOf()
  dataGConf.value.start_date_project_second = dayjs.utc(dataGConf.value.end_date_project).add(1, 'day').valueOf()
  if (dataGConf.value.end_date_project_second <= dataGConf.value.start_date_project_second)
    dataGConf.value.end_date_project_second = dayjs.utc(dataGConf.value.start_date_project_second).add(20, 'year').valueOf()
}
</script>

<template>
  <VRow no-gutters>
    <VCol cols="12">
      <VSelect v-model="dataGConf.type_of_contract" :items="Field2Array(ContractType)" item-props variant="outlined"
        label="Type of Contract" placeholder="select contract type" />
    </VCol>
    <VCol cols="12">
      <AppDateTimePicker :model-value="dataGConf.start_date_project" placeholder="Project Start" variant="outlined"
        class="mt-4" @update:model-value="(str: string) => dataGConf.start_date_project = dayjs(str).utc().valueOf()" />
    </VCol>
    <VCol cols="12">
      <AppDateTimePicker :model-value="dataGConf.end_date_project" placeholder="Project End" class="mt-4"
        variant="outlined" @update:model-value="updateEndProject" />
    </VCol>
    <VCol v-if="dataGConf.type_of_contract >= 3" cols="12">
      <AppDateTimePicker :model-value="dataGConf.start_date_project_second" placeholder="Project Start (2nd Project)"
        @update:model-value="(str: string) => dataGConf.start_date_project_second = dayjs(str).utc().valueOf()"
        class="mt-4" />
    </VCol>
    <VCol v-if="dataGConf.type_of_contract >= 3" cols="12">
      <AppDateTimePicker :model-value="dataGConf.end_date_project_second" placeholder="Project End (2nd Project)"
        @update:model-value="(str: string) => dataGConf.end_date_project_second = dayjs(str).utc().valueOf()"
        class="mt-4" />
    </VCol>
    <VCol cols="12">
      <AppTextField v-model.number="dataGConf.discount_rate_start_year" placeholder="Discount Rate Start Year"
        class="mt-4" :rules="[requiredValidator, integerValidator]" />
    </VCol>
    <VCol cols="12">
      <VTextField label="Discount Rate, %" class="mt-4" v-model.number="discount_rate"
        :rules="[requiredValidator, numberValidator]" />
    </VCol>
    <VCol cols="12">
      <VSelect v-model="dataGConf.inflation_rate_applied_to" :items="Field2Array(InflateToType)" item-props
        variant="outlined" label="Inflation Rate Applied to" class="mt-4" />
    </VCol>
  </VRow>
</template>

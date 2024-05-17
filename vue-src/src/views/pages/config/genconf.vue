<script setup lang="ts">
import { usePyscConfStore } from '@/stores/genfisStore';
import {
  ContractType,
  Field2Array,
  InflateToType,
  getCtrType,
  useDayJs
} from '@/utils/pysc/pyscType';
import { useTooltip } from '@/utils/pysc/useTooltips';

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

const { getToolTip } = useTooltip()

</script>

<template>
  <VRow no-gutters>
    <VCol cols="12">
      <AppSelect v-model="dataGConf.type_of_contract" :items="Field2Array(ContractType)" item-props variant="outlined"
        label-placeholder="Type of Contract" placeholder="select contract type"
        :tooltip-content="getToolTip('genfis.toc')" />
    </VCol>
    <VCol cols="12">
      <AppDateTimePicker :model-value="dataGConf.start_date_project"
        :label-placeholder="['Project Start', ...(dataGConf.type_of_contract >= 3 ? [getCtrType(dataGConf.type_of_contract, 0, { bracket: true })] : [])]"
        variant="outlined" class="mt-4"
        @update:model-value="(str: string) => dataGConf.start_date_project = dayjs(str).utc().valueOf()"
        :tooltip-content="$t('ArrValue', [getToolTip('genfis.ps'), getCtrType(dataGConf.type_of_contract, 0, { bracket: true })])" />
    </VCol>
    <VCol cols="12">
      <AppDateTimePicker :model-value="dataGConf.end_date_project"
        :label-placeholder="['Project End', ...(dataGConf.type_of_contract >= 3 ? [getCtrType(dataGConf.type_of_contract, 0, { bracket: true })] : [])]"
        class="mt-4" variant="outlined" @update:model-value="updateEndProject"
        :tooltip-content="$t('ArrValue', [getToolTip('genfis.es'), getCtrType(dataGConf.type_of_contract, 0, { bracket: true })])" />
    </VCol>
    <VCol v-if="dataGConf.type_of_contract >= 3" cols="12">
      <AppDateTimePicker :model-value="dataGConf.start_date_project_second"
        :label-placeholder="['Project Start', ...[getCtrType(dataGConf.type_of_contract, 1, { bracket: true })]]"
        @update:model-value="(str: string) => dataGConf.start_date_project_second = dayjs(str).utc().valueOf()"
        class="mt-4"
        :tooltip-content="$t('ArrValue', [getToolTip('genfis.ps'), getCtrType(dataGConf.type_of_contract, 1, { bracket: true })])" />
    </VCol>
    <VCol v-if="dataGConf.type_of_contract >= 3" cols="12">
      <AppDateTimePicker :model-value="dataGConf.end_date_project_second"
        :label-placeholder="['Project End', ...[getCtrType(dataGConf.type_of_contract, 1, { bracket: true })]]"
        @update:model-value="(str: string) => dataGConf.end_date_project_second = dayjs(str).utc().valueOf()"
        class="mt-4"
        :tooltip-content="$t('ArrValue', [getToolTip('genfis.es'), getCtrType(dataGConf.type_of_contract, 1, { bracket: true })])" />
    </VCol>
    <VCol cols="12">
      <AppTextField v-model.number="dataGConf.discount_rate_start_year" label-placeholder="Discount Rate Start Year"
        class="mt-4" :rules="[requiredValidator, integerValidator]" :tooltip-content="getToolTip('genfis.dy')" />
    </VCol>
    <VCol cols="12">
      <AppTextField :label-placeholder="['Discount Rate', '%']" class="mt-4" v-model.number="discount_rate"
        :rules="[requiredValidator, numberValidator]" />
    </VCol>
    <VCol cols="12">
      <AppSelect v-model="dataGConf.inflation_rate_applied_to" :items="Field2Array(InflateToType)" item-props
        :tooltip-content="getToolTip('genfis.iato')" label-placeholder="Inflation Rate Applied to" variant="outlined"
        class="mt-4" />
    </VCol>
  </VRow>
</template>

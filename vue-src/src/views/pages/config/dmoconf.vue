<script setup lang="ts">
import { dmoRec, useDayJs } from '@/utils/pysc/pyscType';

interface Props {
  label: string
}
const dmo = defineModel<dmoRec>({ required: true })
const props = defineProps<Props>()
const dmo_volume = computed({
  get: () => dmo.value.volume * 100,
  set: (val) => { if (!isNaN(+val)) dmo.value.volume = +val / 100 }
})
const dmo_fee = computed({
  get: () => dmo.value.fee * 100,
  set: (val) => { if (!isNaN(+val)) dmo.value.fee = +val / 100 }
})
const dayjs = useDayJs()
</script>

<template>
  <div>
    <span class="mt-2 ms-n4 font-weight-bold text-primary">{{ props.label }} DMO</span>
    <VCheckbox v-model="dmo.holiday" label="Holiday" />
    <VTextField label="Period" class="mt-2" v-model.number="dmo.period"
      :rules="[requiredValidator, integerValidator]" />
    <AppDateTimePicker :model-value="dmo.start_production" placeholder="Start of Production"
      @update:model-value="str => dmo.start_production = dayjs(str).utc().valueOf()" class="mt-4" />
    <VTextField label="Volume, %" v-model.number="dmo_volume" class="mt-4"
      :rules="[requiredValidator, numberValidator]" />
    <VTextField label="Fee, %" v-model.number="dmo_fee" class="mt-4" :rules="[requiredValidator, numberValidator]" />
  </div>
</template>

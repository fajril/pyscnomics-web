<script setup lang="ts">
import { useTooltip } from '@/utils/pysc/useTooltips'
import type { dmoRec } from '@/utils/pysc/pyscType'
import { numb2Percent, percent2Numb, useDayJs } from '@/utils/pysc/pyscType'

interface Props {
  label: string
}
const props = defineProps<Props>()
const { getToolTip } = useTooltip()
const dmo = defineModel<dmoRec>({ required: true })

const dmo_volume = computed({
  get: () => numb2Percent(dmo.value.volume),
  set: val => {
    if (!isNaN(+val))
      dmo.value.volume = percent2Numb(val)
  },
})

const dmo_fee = computed({
  get: () => numb2Percent(dmo.value.fee),
  set: val => {
    if (!isNaN(+val))
      dmo.value.fee = percent2Numb(val)
  },
})

const dayjs = useDayJs()
</script>

<template>
  <div>
    <span class="mt-2 ms-n4 font-weight-bold text-primary">{{ props.label }} DMO</span>
    <AppCheckBox
      v-model="dmo.holiday"
      label="Holiday"
      :tooltip-content="getToolTip('costrec.dmoh')"
    />
    <AppTextField
      v-model.number="dmo.period"
      label-placeholder="Period, Month(s)"
      class="mt-2"
      :disabled="!dmo.holiday"
      :rules="[requiredValidator, integerValidator]"
      :tooltip-content="getToolTip('costrec.dmop')"
    />
    <AppDateTimePicker
      :model-value="dmo.start_production"
      label-placeholder="Start of Production"
      class="mt-4"
      :tooltip-content="getToolTip('costrec.dmos')"
      @update:model-value="str => dmo.start_production = dayjs(str).utc().valueOf()"
    />
    <AppTextField
      v-model.number="dmo_volume"
      label-placeholder="Volume, %"
      class="mt-4"
      :rules="[requiredValidator, numberValidator]"
      :tooltip-content="getToolTip('costrec.dmov')"
    />
    <AppTextField
      v-model.number="dmo_fee"
      label-placeholder="Fee, %"
      class="mt-4"
      :rules="[requiredValidator, numberValidator]"
      :tooltip-content="getToolTip('costrec.dmof')"
    />
  </div>
</template>

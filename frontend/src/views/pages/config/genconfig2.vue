<script setup lang="ts">
import { useAppStore } from '@/stores/appStore'
import { useTooltip } from '@/utils/pysc/useTooltips'
import { isNaN } from 'mathjs'
import { usePyscConfStore } from '@/stores/genfisStore'
import type { ExcelColumnType } from '@/utils/pysc/pyscType'
import { Field2Array, InflateToType, NVPType, numb2Percent, percent2Numb } from '@/utils/pysc/pyscType'

const appStore = useAppStore()
const confStore = usePyscConfStore()
const { dataGConf } = storeToRefs(confStore)

const { t, locale } = useI18n({ useScope: 'global' })
const { getToolTip } = useTooltip()

const columnTable: ExcelColumnType = {
  colHeaders: index => {
    if (index === 0)
      return t('Year')
    else return t('Rate')
  },
  columns: [
    { data: 'year', type: 'numeric', validator: 'numeric', allowInvalid: false },
    { data: 'rate', type: 'numeric', validator: 'numeric', numericFormat: { pattern: '0.00 %' }, allowInvalid: false },
  ],
}

const getNPVSelMode = computed(() => {
  return appStore.NPVSelSett ? Field2Array(NVPType) : Field2Array(NVPType).filter(v => v.value >= 2)
})

const discount_rate = computed({
  get: () => numb2Percent(dataGConf.value.discount_rate),
  set: val => {
    if (!isNaN(+val))
      dataGConf.value.discount_rate = percent2Numb(val)
  },
})

// const inflation_rate_init = computed({
//   get: () => numb2Percent(dataFisc.value.Fiskal.Inflation.inflation_rate_init),
//   set: val => {
//     if (!isNaN(+val))
//       dataFisc.value.Fiskal.Inflation.inflation_rate_init = percent2Numb(val)
//   },
// })
</script>

<template>
  <VRow no-gutters>
    <VCol cols="12">
      <AppTextField
        v-model.number="dataGConf.discount_rate_start_year"
        label-placeholder="Discount Rate Start Year"
        class="mt-4"
        :rules="[requiredValidator, integerValidator]"
        :tooltip-content="getToolTip('genfis.dy')"
      />
    </VCol>
    <VCol cols="12">
      <AppTextField
        v-model.number="discount_rate"
        :label-placeholder="['Discount Rate', '%']"
        class="mt-4"
        :rules="[requiredValidator, numberValidator, betweenValidator(discount_rate, 0, 100, appStore.showAlert)]"
        :tooltip-content="getToolTip('genfis.dr')"
      />
    </VCol>
    <!--
      <VCol
      cols="12"
      class="ms-4 pe-4 mt-2"
      >
      <span class="ml-n4 font-weight-bold text-primary">Net Present Value</span>
      <AppSelect
      v-model="dataFisc.Fiskal.npv_mode"
      :items="getNPVSelMode"
      item-props
      variant="outlined"
      label-placeholder="NPV Mode"
      placeholder="NPV Mode"
      class="mt-4"
      :tooltip-content="getToolTip('fiscal.npv')"
      />
      </VCol>
    -->
    <VCol
      cols="12"
      class="ms-4 pe-4 mt-2"
    >
      <span class="ml-n4 font-weight-bold text-primary">{{ $t('Inflation') }}</span>
      <AppSelect
        v-model="dataGConf.inflation_rate_applied_to"
        :items="Field2Array(InflateToType)"
        item-props
        :tooltip-content="getToolTip('genfis.iato')"
        label-placeholder="Inflation Rate Applied to"
        variant="outlined"
        class="mt-4"
      />

      <!--
        <AppSelect
        v-model="dataFisc.Fiskal.Inflation.inflation_rate_mode"
        :items="Field2Array(GlobalType)"
        item-props
        variant="outlined"
        label-placeholder="Inflation Rate Mode"
        placeholder="Inflation Rate Mode"
        class="mt-4"
        />
      -->
      <!--
        <VCardText
        v-if="dataFisc.Fiskal.Inflation.inflation_rate_mode === 1"
        class="mt-2 ms-4 py-0 px-0"
        >
        <TableEditor
        v-model:model-value="dataFisc.Fiskal.Inflation.multi_inflation_init"
        :columns="columnTable"
        />
        </VCardText>
      -->
      <!--
        <AppTextField
        v-else
        v-model.number="inflation_rate_init"
        label-placeholder="Inflation Rate, %"
        variant="outlined"
        class="ms-4 mt-4"
        :rules="[requiredValidator, numberValidator, betweenValidator(inflation_rate_init, 0, 100, appStore.showAlert)]"
        />
      -->
    </VCol>
    <!--
      <VCol
      cols="12"
      class="ms-4 pe-4 mt-2"
      >
      <span class="ml-n4 font-weight-bold text-primary">{{ t('Sunk Cost Reference Year') }}</span>
      <AppTextField
      v-model.number="dataFisc.Fiskal.sunk_cost_reference_year"
      label-placeholder="Reference Year"
      variant="outlined"
      class="mt-4"
      :rules="[requiredValidator, integerValidator]"
      :tooltip-content="getToolTip('fiscal.sunk')"
      />
      </VCol>
    -->
    <!--
      <VCol
      cols="12"
      class="mt-2 ms-n4"
      >
      <AppCheckBox
      v-model="dataFisc.Fiskal.profitability_discounted"
      class="mt-4"
      label="Calculate Profitability Index with Discounted method"
      />
      </VCol>
    -->
  </VRow>
</template>

<script setup lang="ts">
import {
  DepreciationType,
  DiscType,
  ExcelColumnType,
  Field2Array,
  FiskalBase,
  GlobalType,
  NVPType,
  OthRevType,

  TaxPaymentType,
  TaxType
} from '@/utils/pysc/pyscType';
import TableEditor from '@/views/components/TableEditor.vue';

interface Props {
  contractType: number,
  fiscal: FiskalBase
  secondContract?: boolean
  isPSCContrat?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  secondContract: false,
  isPSCContrat: false
})

const fiscal = toRef(props, 'fiscal')

const { t, locale } = useI18n({ useScope: 'global' })

const columnTable: ExcelColumnType = {
  colHeaders: (index) => {
    if (index === 0) return t('Year')
    else return t('Rate')
  },
  columns: [
    { data: 'year', type: 'numeric', validator: 'numeric', allowInvalid: false },
    { data: 'rate', type: 'numeric', validator: 'numeric', numericFormat: { pattern: '0.00 %' }, allowInvalid: false },
  ]
}

const tax_rate_init = computed({
  get: () => fiscal.value.Tax.tax_rate_init * 100,
  set: (val) => { if (!isNaN(+val)) fiscal.value.Tax.tax_rate_init = +val / 100 }
})
const asr_future_rate = computed({
  get: () => fiscal.value.asr_future_rate * 100,
  set: (val) => { if (!isNaN(+val)) fiscal.value.asr_future_rate = +val / 100 }
})
const inflation_rate_init = computed({
  get: () => fiscal.value.Inflation.inflation_rate_init * 100,
  set: (val) => { if (!isNaN(+val)) fiscal.value.Inflation.inflation_rate_init = +val / 100 }
})
const vat_rate_init = computed({
  get: () => fiscal.value.VAT.vat_rate_init * 100,
  set: (val) => { if (!isNaN(+val)) fiscal.value.VAT.vat_rate_init = +val / 100 }
})
const lbt_rate_init = computed({
  get: () => fiscal.value.LBT.lbt_rate_init * 100,
  set: (val) => { if (!isNaN(+val)) fiscal.value.LBT.lbt_rate_init = +val / 100 }
})
const vat_discount = computed({
  get: () => fiscal.value.vat_discount * 100,
  set: (val) => { if (!isNaN(+val)) fiscal.value.vat_discount = +val / 100 }
})
const lbt_discount = computed({
  get: () => fiscal.value.lbt_discount * 100,
  set: (val) => { if (!isNaN(+val)) fiscal.value.lbt_discount = +val / 100 }
})
</script>

<template>
  <VRow no-gutters>
    <VCol v-if="props.secondContract" cols="12" class="ms-4 pe-4">
      <span class="ml-n4 font-weight-bold text-primary">{{ $t('Transition') }}</span>
      <AppTextField v-model.number="fiscal.transferred_unrec_cost" label-placeholder="Transferred Unrec. Cost"
        variant="outlined" class="mt-4" :rules="[requiredValidator, numberValidator]" />
    </VCol>

    <VCol cols="12" class="ms-4 pe-4">
      <span class="ml-n4 font-weight-bold text-primary">{{ $t('Tax') }}</span>
      <AppSelect v-model="fiscal.Tax.tax_mode" :items="Field2Array(TaxType)" item-props variant="outlined"
        label-placeholder="Tax Mode" placeholder="Tax Mode" class="mt-4" />
      <VCardText v-if="fiscal.Tax.tax_mode === 1" class="mt-2 ms-4 py-0 px-0">
        <TableEditor v-model:model-value="fiscal.Tax.multi_tax_init" :columns="columnTable" />
      </VCardText>
      <AppTextField v-if="fiscal.Tax.tax_mode === 0" v-model.number="tax_rate_init" label-placeholder="Tax Rate, %"
        variant="outlined" class="ms-4 mt-4" :rules="[requiredValidator, numberValidator]" />
    </VCol>
    <VCol v-if="props.isPSCContrat" cols="12" class="ms-4 pe-4 mt-2">
      <span class="ml-n4 font-weight-bold text-primary">{{ $t('Tax Payment') }}</span>
      <AppSelect v-model="fiscal.tax_payment_config" :items="Field2Array(TaxPaymentType)" item-props variant="outlined"
        label-placeholder="Tax of PSC Cost Recovery" placeholder="Tax of PSC Cost Recovery" class="mt-4" />
    </VCol>
    <VCol cols="12" class="ms-4 pe-4 mt-2">
      <span class="ml-n4 font-weight-bold text-primary">ASR</span>
      <AppTextField v-model.number="asr_future_rate" label-placeholder="Future Rate, %" variant="outlined" class="mt-4"
        :rules="[requiredValidator, numberValidator]" />
    </VCol>

    <VCol cols="12" class="ms-4 pe-4 mt-2">
      <span class="ml-n4 font-weight-bold text-primary">{{ $t('Depreciation') }}</span>
      <AppSelect v-model="fiscal.Depreciation.depreciation_method" :items="Field2Array(DepreciationType)" item-props
        variant="outlined" label-placeholder="Depreciation Method" placeholder="Depreciation Method" class="mt-4" />
      <AppTextField v-if="fiscal.Depreciation.depreciation_method === 0"
        v-model.number="fiscal.Depreciation.decline_factor" label-placeholder="Decline Factor" variant="outlined"
        class="ms-4 mt-4" :rules="[requiredValidator, numberValidator]" />
    </VCol>

    <VCol cols="12" class="ms-4 pe-4 mt-2">
      <span class="ml-n4 font-weight-bold text-primary">{{ $t('Inflation') }}</span>
      <AppSelect v-model="fiscal.Inflation.inflation_rate_mode" :items="Field2Array(GlobalType)" item-props
        variant="outlined" label-placeholder="Inflation Rate Mode" placeholder="Inflation Rate Mode" class="mt-4" />
      <VCardText v-if="fiscal.Inflation.inflation_rate_mode === 1" class="mt-2 ms-4 py-0 px-0">
        <TableEditor v-model:model-value="fiscal.Inflation.multi_inflation_init" :columns="columnTable" />
      </VCardText>
      <AppTextField v-else v-model.number="inflation_rate_init" label-placeholder="Inflation Rate, %" variant="outlined"
        class="ms-4 mt-4" :rules="[requiredValidator, numberValidator]" />
    </VCol>

    <VCol cols="12" class="ms-4 pe-4 mt-2">
      <span class="ml-n4 font-weight-bold text-primary">VAT</span>
      <AppSelect v-model="fiscal.VAT.vat_mode" :items="Field2Array(GlobalType)" item-props variant="outlined"
        label-placeholder="VAT Mode" placeholder="VAT Mode" class="mt-4" />
      <VCardText v-if="fiscal.VAT.vat_mode === 1" class="mt-2 ms-4 py-0 px-0">
        <TableEditor v-model:model-value="fiscal.VAT.multi_vat_init" :columns="columnTable" />
      </VCardText>
      <AppTextField v-else v-model.number="vat_rate_init" label-placeholder="VAT Rate, %" variant="outlined"
        class="ms-4 mt-4" :rules="[requiredValidator, numberValidator]" />
    </VCol>

    <VCol cols="12" class="ms-4 pe-4 mt-2">
      <span class="ml-n4 font-weight-bold text-primary">LBT</span>
      <AppSelect v-model="fiscal.LBT.lbt_mode" :items="Field2Array(GlobalType)" item-props variant="outlined"
        label-placeholder="LBT Mode" placeholder="LBT Mode" class="mt-4" />
      <VCardText v-if="fiscal.LBT.lbt_mode === 1" class="mt-2 ms-4 py-0 px-0">
        <TableEditor v-model:model-value="fiscal.LBT.multi_lbt_init" :columns="columnTable" />
      </VCardText>
      <AppTextField v-else v-model.number="lbt_rate_init" label-placeholder="LBT Rate, %" variant="outlined"
        class="ms-4 mt-4" :rules="[requiredValidator, numberValidator]" />
    </VCol>

    <VCol cols="12" class="ms-4 pe-4 mt-2">
      <span class="ml-n4 font-weight-bold text-primary">VAT and LBT Discount</span>
      <AppTextField v-model.number="vat_discount" label-placeholder="VAT Discount" variant="outlined" class="mt-4"
        :rules="[requiredValidator, numberValidator]" />
      <AppTextField v-model.number="lbt_discount" label-placeholder="LBT Discount" variant="outlined" class="mt-4"
        :rules="[requiredValidator, numberValidator]" />
    </VCol>

    <VCol v-if="!props.secondContract" cols="12" class="ms-4 pe-4 mt-2">
      <span class="ml-n4 font-weight-bold text-primary">Net Present Value</span>
      <AppSelect v-model="fiscal.npv_mode" :items="Field2Array(NVPType)" item-props variant="outlined"
        label-placeholder="NPV Mode" placeholder="NPV Mode" class="mt-4" />
      <AppSelect v-model="fiscal.discounting_mode" :items="Field2Array(DiscType)" item-props variant="outlined"
        label-placeholder="Discounting Mode" placeholder="Discounting Mode" class="mt-4" />
    </VCol>

    <VCol cols="12" class="ms-4 pe-4 mt-2">
      <span class="ml-n4 font-weight-bold text-primary">{{ $t('Other Revenue') }}</span>
      <AppSelect v-model="fiscal.sulfur_revenue_config" :items="Field2Array(OthRevType)" item-props variant="outlined"
        label-placeholder="Sulfur Revenue" placeholder="Sulfur Revenue" class="mt-4" />
      <AppSelect v-model="fiscal.electricity_revenue_config" :items="Field2Array(OthRevType)" item-props
        variant="outlined" label-placeholder="Electricity Revenue" placeholder="Electricity Revenue" class="mt-4" />
      <AppSelect v-model="fiscal.co2_revenue_config" :items="Field2Array(OthRevType)" item-props variant="outlined"
        label-placeholder="CO2 Revenue" placeholder="CO2 Revenue" class="mt-4" />
    </VCol>

    <VCol cols="12" class="ms-4 pe-4 mt-2">
      <span class="ml-n4 font-weight-bold text-primary">{{ t('Sunk Cost Reference Year') }}</span>
      <AppTextField v-model.number="fiscal.sunk_cost_reference_year" label-placeholder="Reference Year"
        variant="outlined" class="mt-4" :rules="[requiredValidator, integerValidator]" />
    </VCol>
  </VRow>
</template>

<script setup lang="ts">
import { useAppStore } from '@/stores/appStore';
import { usePyscConfStore } from '@/stores/genfisStore';
import {
  ExcelColumnType,
  Field2Array,
  TaxSplitType,
  costRec,
  useDayJs,
} from '@/utils/pysc/pyscType';
import TableEditor from '@/views/components/TableEditor.vue';
import DmoUI from './dmoconf.vue';

interface Props {
  subProject: number
}

const props = withDefaults(defineProps<Props>(), {
  subProject: 0,
})

const appStore = useAppStore()
const PyscConf = usePyscConfStore()

const { prodHasGas } = PyscConf
const { dataContr } = storeToRefs(PyscConf)
const dataGConf = computed(() => PyscConf.dataGConf)

const columnTable = (type: string): ExcelColumnType => ({
  colHeaders: [`${type} Bottom Limit (<)`, `(<=) ${type} Top Limit`, 'Pre Tax CTR Oil', ' Pre Tax CTR Gas'],
  columns: [
    { data: 'bottom_limit', type: 'numeric', validator: 'numeric', allowInvalid: false },
    { data: 'top_limit', type: 'numeric', validator: 'numeric', allowInvalid: false },
    { data: 'pre_tax_ctr_oil', type: 'numeric', validator: 'numeric', numericFormat: { pattern: '0.00 %' }, allowInvalid: false },
    { data: 'pre_tax_ctr_gas', type: 'numeric', validator: 'numeric', numericFormat: { pattern: '0.00 %' }, allowInvalid: false },
  ]
})
const columnIndicatorTable: ExcelColumnType = {
  colHeaders: ['Year', 'Indicator'],
  columns: [
    { data: 'year', type: 'numeric', validator: 'numeric', allowInvalid: false },
    { data: 'indicator', type: 'numeric', validator: 'numeric', allowInvalid: false },
  ]
}

const dayjs = useDayJs()

const contractValue = computed(() => (props.subProject ? <costRec>dataContr.value.second : dataContr.value.cr))

const oil_ftp_portion = computed({
  get: () => contractValue.value.oil_ftp.ftp_portion * 100,
  set: (val) => { if (!isNaN(+val)) contractValue.value.oil_ftp.ftp_portion = +val / 100 }
})
const gas_ftp_portion = computed({
  get: () => contractValue.value.gas_ftp.ftp_portion * 100,
  set: (val) => { if (!isNaN(+val)) contractValue.value.gas_ftp.ftp_portion = +val / 100 }
})
const Tax_pre_tax_ctr_oil = computed({
  get: () => contractValue.value.TaxSplit.pre_tax_ctr_oil * 100,
  set: (val) => { if (!isNaN(+val)) contractValue.value.TaxSplit.pre_tax_ctr_oil = +val / 100 }
})
const Tax_pre_tax_ctr_gas = computed({
  get: () => contractValue.value.TaxSplit.pre_tax_ctr_gas * 100,
  set: (val) => { if (!isNaN(+val)) contractValue.value.TaxSplit.pre_tax_ctr_gas = +val / 100 }
})
const IC_ic_oil = computed({
  get: () => contractValue.value.IC.ic_oil * 100,
  set: (val) => { if (!isNaN(+val)) contractValue.value.IC.ic_oil = +val / 100 }
})
const IC_ic_gas = computed({
  get: () => contractValue.value.IC.ic_gas * 100,
  set: (val) => { if (!isNaN(+val)) contractValue.value.IC.ic_gas = +val / 100 }
})
const CR_oil_cr_cap_rate = computed({
  get: () => contractValue.value.CR.oil_cr_cap_rate * 100,
  set: (val) => { if (!isNaN(+val)) contractValue.value.CR.oil_cr_cap_rate = +val / 100 }
})
const CR_gas_cr_cap_rate = computed({
  get: () => contractValue.value.CR.gas_cr_cap_rate * 100,
  set: (val) => { if (!isNaN(+val)) contractValue.value.CR.gas_cr_cap_rate = +val / 100 }
})
</script>

<template>
  <VRow no-gutters>
    <VCol cols="12" class="ms-4 pe-4">
      <span class="ml-n4 font-weight-bold text-primary">First Tranche Petroleum (FTP)</span>
      <VCheckbox v-model="contractValue.oil_ftp.ftp_availability" label="Oil FTP Availability" />
      <VCheckbox v-model="contractValue.oil_ftp.ftp_is_shared" label="Oil FTP is Shared"
        :disabled="!contractValue.oil_ftp.ftp_availability" />
      <AppTextField label-placeholder="Oil FTP Portion, %" class="mt-4" v-model.number="oil_ftp_portion"
        :rules="[requiredValidator, numberValidator]" :disabled="!contractValue.oil_ftp.ftp_availability" />
      <VCheckbox v-model="contractValue.gas_ftp.ftp_availability" label="Gas FTP Availability" />
      <VCheckbox v-model="contractValue.gas_ftp.ftp_is_shared" label="Gas FTP is Shared"
        :disabled="!contractValue.gas_ftp.ftp_availability" />
      <AppTextField label-placeholder="Gas FTP Portion, %" class="mt-4" v-model.number="gas_ftp_portion"
        :rules="[requiredValidator, numberValidator]" :disabled="!contractValue.gas_ftp.ftp_availability" />
    </VCol>
    <VCol cols="12" class="ms-4 pe-4 mt-4">
      <span class="ml-n4 font-weight-bold text-primary">Pre Tax Split Configuration</span>
      <AppSelect v-model="contractValue.TaxSplit.split_type" :items="Field2Array(TaxSplitType)" item-props
        variant="outlined" label-placeholder="Split Type" class="mt-4" />
      <AppTextField label-placeholder="Oil Contractor Pre Tax, %" v-model.number="Tax_pre_tax_ctr_oil" class="mt-4"
        :rules="[requiredValidator, numberValidator]" />
      <AppTextField label-placeholder="Gas Contractor Pre Tax, %" v-model.number="Tax_pre_tax_ctr_gas" class="mt-4"
        :rules="[requiredValidator, numberValidator]" />
    </VCol>
    <VCol v-if="contractValue.TaxSplit.split_type === 1" cols="12" class="ms-4 pe-4 mt-2">
      <span class="font-weight-bold text-primary">RC Split</span>
      <TableEditor v-model:model-value="contractValue.RCSlidingScale" :columns="columnTable('RC')" colAutoWidth="all" />
    </VCol>
    <VCol v-else-if="contractValue.TaxSplit.split_type === 2" cols="12" class="ms-4 pe-4 mt-2">
      <span class="font-weight-bold text-primary">ICP Split</span>
      <TableEditor v-model:model-value="contractValue.ICPSlidingScale" :columns="columnTable('ICP')"
        colAutoWidth="all" />
    </VCol>
    <VCol v-if="contractValue.TaxSplit.split_type != 0" cols="12" class="ms-8 pe-8 mt-2">
      <span class="font-weight-bold text-primary">Indicator</span>
      <TableEditor v-model:model-value="contractValue.Indicator" :columns="columnIndicatorTable" colAutoWidth="last" />
    </VCol>

    <VCol cols="12" class="ms-4 pe-4 mt-4">
      <span class="ml-n4 font-weight-bold text-primary">Investment Credit (IC) Configuration</span>
      <VCheckbox v-model="contractValue.IC.ic_availability" label="IC Availability" />
      <AppTextField label-placeholder="Oil IC, %" v-model.number="IC_ic_oil" class="mt-4"
        :rules="[requiredValidator, numberValidator]" />
      <AppTextField label-placeholder="Gas IC, %" v-model.number="IC_ic_gas" class="mt-4"
        :rules="[requiredValidator, numberValidator]" />
    </VCol>
    <VCol cols="12" class="ms-4 pe-4 mt-4">
      <span class="ml-n4 font-weight-bold text-primary">Cost Recovery (CR) Configuration</span>
      <AppTextField label-placeholder="Oil CR Cap Rate, %" v-model.number="CR_oil_cr_cap_rate" class="mt-4"
        :rules="[requiredValidator, numberValidator]" />
      <AppTextField label-placeholder="Gas CR Cap Rate, %" v-model.number="CR_gas_cr_cap_rate" class="mt-4"
        :rules="[requiredValidator, numberValidator]" />
    </VCol>
    <VCol cols="12" class="ms-4 pe-4 mt-4">
      <span class="ml-n4 font-weight-bold text-primary">DMO Configuration</span>
      <Checkbox v-model="contractValue.dmo_is_weighted" label="DMO is Weighted" />
      <DmoUI v-model="contractValue.OilDMO" label="Oil" class="ms-4" />
      <DmoUI v-if="prodHasGas()" v-model="contractValue.GasDMO" label="Gas" class="ms-4" />
    </VCol>
  </VRow>
</template>

<script setup lang="ts">
import { usePyscConfStore } from '@/stores/genfisStore';
import {
  APiType,
  CO2Type,
  DCUType,
  ExcelColumnType,
  Field2Array,
  FieldLoc,
  FieldStat,
  GS,
  H2SType,
  InfAvail,
  ResDepth,
  ResType,
  TahapProdType,
  useDayJs,
} from '@/utils/pysc/pyscType';
import TableEditor from '@/views/components/TableEditor.vue';
import { isNull } from 'mathjs';
import DmoUI from './dmoconf.vue';

interface Props {
  subProject: number
}


const props = defineProps<Props>()

const PyscConf = usePyscConfStore()

const dayjs = useDayJs()

const { prodHasGas } = PyscConf
const { dataContr } = storeToRefs(PyscConf)
const dataGConf = computed(() => PyscConf.dataGConf)

const contractValue = computed(() => (props.subProject ? <GS>dataContr.value.second : dataContr.value.gs))

const ministry_discretion_split = computed({
  get: () => contractValue.value.ministry_discretion_split * 100,
  set: (val) => { if (!isNaN(+val)) contractValue.value.ministry_discretion_split = +val / 100 }
})
const oil_base_split = computed({
  get: () => contractValue.value.oil_base_split * 100,
  set: (val) => { if (!isNaN(+val)) contractValue.value.oil_base_split = +val / 100 }
})
const gas_base_split = computed({
  get: () => contractValue.value.gas_base_split * 100,
  set: (val) => { if (!isNaN(+val)) contractValue.value.gas_base_split = +val / 100 }
})

const { t, locale } = useI18n({ useScope: 'global' })

const columnTable = computed((): ExcelColumnType => {
  const start2Y = dayjs.utc(dataGConf.value.end_date_project).add(1, 'day').local().year()
  const endY = dayjs.utc(dataGConf.value.end_date_project).local().year()
  const startY = props.subProject ? start2Y : dayjs.utc(dataGConf.value.start_date_project).local().year()
  const end2Y = dayjs.utc(dataGConf.value.end_date_project_second).local().year()
  console.log([startY, endY, start2Y, end2Y])
  return {
    colHeaders: (index) => {
      if (index === 0) return t('Year') + '<br>' + `[${props.subProject ? start2Y : startY}-${props.subProject ? end2Y : endY}]`
      else return t('Split') + '<br>[fraction]'
    },
    columns: [
      { data: 'year', type: 'numeric', validator: 'numeric', allowInvalid: false },
      { data: 'split', type: 'numeric', validator: 'numeric', numericFormat: { pattern: { mantissa: 2, negative: "parenthesis" } }, allowInvalid: false },
    ]
  }
})

const cum_production_split = computed(() => {
  const start2Y = dayjs.utc(dataGConf.value.end_date_project).add(1, 'day').local().year()
  const startY = props.subProject ? start2Y : dayjs.utc(dataGConf.value.start_date_project).local().year()
  if (contractValue.value.cum_production_split_offset.split.length === 0)
    contractValue.value.cum_production_split_offset.split = [{ year: startY, split: 0 }]
  else if (isNull(contractValue.value.cum_production_split_offset.split[0].year))
    contractValue.value.cum_production_split_offset.split[0].year = startY
  return contractValue.value.cum_production_split_offset.split
})

</script>

<template>
  <VRow no-gutters>
    <VCol cols="12" class="ms-4 pe-4">
      <span class="ml-n4 font-weight-bold text-primary">Split Configuration</span>
      <AppSelect v-model="contractValue.field_status" :items="Field2Array(FieldStat)" item-props variant="outlined"
        label-placeholder="Split Type" class="mt-4" />
      <AppSelect v-model="contractValue.field_location" :items="Field2Array(FieldLoc)" item-props variant="outlined"
        label-placeholder="Location" class="mt-4" />
      <AppSelect v-model="contractValue.reservoir_depth" :items="Field2Array(ResDepth)" item-props variant="outlined"
        label-placeholder="Reservoir Depth, m" class="mt-4" />
      <AppSelect v-model="contractValue.infrastructure_availability" :items="Field2Array(InfAvail)" item-props
        label-placeholder="Infrastructure" class="mt-4" />
      <AppSelect v-model="contractValue.reservoir_type" :items="Field2Array(ResType)" item-props variant="outlined"
        label-placeholder="Reservoir Type" class="mt-4" />
      <AppSelect v-model="contractValue.co2_content" :items="Field2Array(CO2Type)" item-props variant="outlined"
        label-placeholder="CO2 Content" class="mt-4" />
      <AppSelect v-model="contractValue.h2s_content" :items="Field2Array(H2SType)" item-props variant="outlined"
        label-placeholder="H2S Content" class="mt-4" />
      <AppSelect v-model="contractValue.oil_api" :items="Field2Array(APiType)" item-props variant="outlined"
        label-placeholder="Oil API" class="mt-4" />
      <AppSelect v-model="contractValue.domestic_content_use" :items="Field2Array(DCUType)" item-props
        variant="outlined" label-placeholder="Domestic Content Use" class="mt-4" />
      <AppSelect v-model="contractValue.production_stage" :items="Field2Array(TahapProdType)" item-props
        variant="outlined" label-placeholder="Production Stage" class="mt-4" />
      <AppTextField label-placeholder="Ministerial Discretion Split, %" class="mt-4"
        v-model.number="ministry_discretion_split" :rules="[requiredValidator, numberValidator]" />
      <AppTextField label-placeholder="Base Oil Split, %" class="mt-4" :rules="[requiredValidator, numberValidator]"
        v-model.number="oil_base_split" />
      <AppTextField label-placeholder="Base Gas Split, %" class="mt-4" :rules="[requiredValidator, numberValidator]"
        v-model.number="gas_base_split" />
    </VCol>
    <VCol cols="12" class="ms-4 pe-4 mt-4">
      <span class="ml-n4 font-weight-bold text-primary">DMO Configuration</span>
      <VCheckbox v-model="contractValue.dmo_is_weighted" label="DMO is Weighted" />
      <DmoUI v-model="contractValue.OilDMO" label="Oil" class="ms-4" />
      <DmoUI v-if="prodHasGas()" v-model="contractValue.GasDMO" label="Gas" class="ms-4" />
    </VCol>
    <VCol cols="12" class="ms-4 pe-4 mt-4">
      <span class="ml-n4 font-weight-bold text-primary">Cummulative Production</span>
      <AppSelect v-model="contractValue.cum_production_split_offset.mode"
        :items="[{ title: 'Offset (MMBOE)', value: 0 }, { title: 'Split (fraction)', value: 1 }]" item-props
        variant="outlined" label-placeholder="Offset/Split Mode" class="mt-4" />
      <VCardText v-if="contractValue.cum_production_split_offset.mode === 1" class="mt-2 ms-4 py-0 px-0">
        <TableEditor v-model:model-value="cum_production_split" :columns="columnTable" colAutoWidth="all" />
      </VCardText>
      <AppTextField v-else label-placeholder="Cum.Prod. Offset, MMBOE" class="ms-4 mt-4"
        :rules="[requiredValidator, numberValidator]"
        v-model.number="contractValue.cum_production_split_offset.offset" />
    </VCol>
  </VRow>
</template>

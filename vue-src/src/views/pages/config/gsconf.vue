<script setup lang="ts">
import { usePyscConfStore } from '@/stores/genfisStore';
import {
  APiType,
  CO2Type,
  DCUType,
  Field2Array,
  FieldLoc,
  FieldStat,
  GS,
  H2SType,
  InfAvail,
  ResDepth,
  ResType,
  TahapProdType,
} from '@/utils/pysc/pyscType';
import DmoUI from './dmoconf.vue';

interface Props {
  subProject: number
}


const props = defineProps<Props>()

const PyscConf = usePyscConfStore()

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
</script>

<template>
  <VRow no-gutters>
    <VCol cols="12" class="ms-4 pe-4">
      <span class="ml-n4 font-weight-bold text-primary">Split Configuration</span>
      <VSelect v-model="contractValue.field_status" :items="Field2Array(FieldStat)" item-props variant="outlined"
        label="Split Type" class="mt-4" />
      <VSelect v-model="contractValue.field_location" :items="Field2Array(FieldLoc)" item-props variant="outlined"
        label="Location" class="mt-4" />
      <VSelect v-model="contractValue.reservoir_depth" :items="Field2Array(ResDepth)" item-props variant="outlined"
        label="Reservoir Depth, m" class="mt-4" />
      <VSelect v-model="contractValue.infrastructure_availability" :items="Field2Array(InfAvail)" item-props
        variant="outlined" label="Infrastructure" class="mt-4" />
      <VSelect v-model="contractValue.reservoir_type" :items="Field2Array(ResType)" item-props variant="outlined"
        label="Reservoir Type" class="mt-4" />
      <VSelect v-model="contractValue.co2_content" :items="Field2Array(CO2Type)" item-props variant="outlined"
        label="CO2 Content" class="mt-4" />
      <VSelect v-model="contractValue.h2s_content" :items="Field2Array(H2SType)" item-props variant="outlined"
        label="H2S Content" class="mt-4" />
      <VSelect v-model="contractValue.oil_api" :items="Field2Array(APiType)" item-props variant="outlined"
        label="Oil API" class="mt-4" />
      <VSelect v-model="contractValue.domestic_content_use" :items="Field2Array(DCUType)" item-props variant="outlined"
        label="Domestic Content Use" class="mt-4" />
      <VSelect v-model="contractValue.production_stage" :items="Field2Array(TahapProdType)" item-props
        variant="outlined" label="Production Stage" class="mt-4" />
      <VTextField label="Ministerial Discretion Split, %" class="mt-4" v-model.number="ministry_discretion_split"
        :rules="[requiredValidator, numberValidator]" />
      <VTextField label="Base Oil Split, %" class="mt-4" :rules="[requiredValidator, numberValidator]"
        v-model.number="oil_base_split" />
      <VTextField label="Base Gas Split, %" class="mt-4" :rules="[requiredValidator, numberValidator]"
        v-model.number="gas_base_split" />
    </VCol>
    <VCol cols="12" class="ms-4 pe-4 mt-4">
      <span class="ml-n4 font-weight-bold text-primary">DMO Configuration</span>
      <VCheckbox v-model="contractValue.dmo_is_weighted" label="DMO is Weighted" />
      <DmoUI v-model="contractValue.OilDMO" label="Oil" class="ms-4" />
      <DmoUI v-if="prodHasGas()" v-model="contractValue.GasDMO" label="Gas" class="ms-4" />
    </VCol>
  </VRow>
</template>

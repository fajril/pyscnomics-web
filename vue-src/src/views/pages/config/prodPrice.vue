<script setup lang="ts">
import {
  ExcelColumnType,
  ProducerType,
  prodPriceUnit,
  prodUnit
} from '@/utils/pysc/pyscType';
import TableEditor from '@/views/components/TableEditor.vue';

import { usePyscConfStore } from '@/stores/genfisStore';

interface Props {
  prodType: number
}
const selProdIndex = defineModel('selProdIndex', { type: Number, default: 0 })

const props = defineProps<Props>()

const PyscConf = usePyscConfStore()
const { dataProd } = storeToRefs(PyscConf)

const ProdIndex = computed(() => dataProd.value.findIndex(e => e.Tipe === props.prodType))


const columnTable = computed((): ExcelColumnType => {
  // console.log(props.prodType)
  if (props.prodType === 0)
    return {
      colHeaders: ['Year', 'Oil Sales (MBOPY)', 'Oil Price (USD/BBL)', 'Condensate Sales (MBOPY)', 'Condensate Price (USD/BBL)'],
      columns: [
        { data: 'year', type: 'numeric', validator: 'numeric', allowInvalid: false },
        { data: 'sales', type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, optionalMantissa: true, negative: "parenthesis" } }, validator: 'numeric', allowInvalid: false },
        { data: 'price', type: 'numeric', validator: 'numeric', allowInvalid: false },
        { data: 'condensate_sales', type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, optionalMantissa: true, negative: "parenthesis" } }, validator: 'numeric', allowInvalid: false },
        { data: 'condensate_price', type: 'numeric', validator: 'numeric', allowInvalid: false },
      ]
    }
  else if (props.prodType === 1) {
    let hGSA = ['Year', 'Gas Production (BSCF)']
    let columns = [
      { data: 'year', type: 'numeric', validator: 'numeric', allowInvalid: false },
      { data: 'production', type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, optionalMantissa: true, negative: "parenthesis" } }, validator: 'numeric', allowInvalid: false },
    ]
    for (let i = 1; i <= dataProd.value[ProdIndex.value].GSANumber; i++) {
      hGSA.push(`GSA ${i} Volume (BSCF) /1000`, `GSA ${i} GHV (BTU/SCF)`, `GSA ${i} Price (USD/MMBTU)`)

      columns.push({ data: `gsa.vol${i}`, type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, optionalMantissa: true, negative: "parenthesis" } }, validator: 'numeric', allowInvalid: false })
      columns.push({ data: `gsa.ghv${i}`, type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, optionalMantissa: true, negative: "parenthesis" } }, validator: 'numeric', allowInvalid: false })
      columns.push({ data: `gsa.price${i}`, type: 'numeric', validator: 'numeric', allowInvalid: false })
    }
    return {
      colHeaders: hGSA,
      columns: columns
    }
  }

  const prodName = Object.values(ProducerType)[props.prodType]
  return {
    colHeaders: ['Year', `${prodName} Sales ${prodUnit(props.prodType)}`, `Price ${prodPriceUnit(props.prodType)}`],
    columns: [
      { data: 'year', type: 'numeric', validator: 'numeric', allowInvalid: false },
      { data: 'sales', type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, optionalMantissa: true, negative: "parenthesis" } }, validator: 'numeric', allowInvalid: false },
      { data: 'price', type: 'numeric', validator: 'numeric', allowInvalid: false },
    ]
  }
})

const copy2all = (ProdIdx, selProdIdx) => {
  dataProd.value[ProdIdx].prod_price.forEach((item, i) => {
    if (i != selProdIdx)
      item.splice(0, item.length, ...JSON.parse(JSON.stringify(dataProd.value[ProdIdx].prod_price[selProdIdx])))
  })
}

</script>

<template>
  <VRow no-gutters>
    <VCol v-if="dataProd[ProdIndex].ProdNumber > 1" cols="12" class="mt-4 mb-2 d-flex justify-start gap-x-3">
      <VSelect v-model="selProdIndex"
        :items="Array.from({ length: dataProd[ProdIndex].ProdNumber }, (_, i) => ({ title: `${Object.values(ProducerType)[dataProd[ProdIndex].Tipe]} ${i + 1}`, value: i }))"
        item-props variant="outlined" label="for Production" />
      <VBtn variant="outlined" color="success" @click="() => copy2all(ProdIndex, selProdIndex)">
        <VIcon icon="tabler-copy" />
        <VTooltip location="top" activator="parent">
          Copy to All
        </VTooltip>
      </VBtn>
    </VCol>
    <VCol cols="12">
      <TableEditor v-model:model-value="dataProd[ProdIndex].prod_price[selProdIndex]" :columns="columnTable"
        colAutoWidth="none" />
    </VCol>
  </VRow>
</template>

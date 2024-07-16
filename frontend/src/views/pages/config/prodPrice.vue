<script setup lang="ts">
import { useAppStore } from "@/stores/appStore"
import type {
  ExcelColumnType,
  contextMenuType,
} from '@/utils/pysc/pyscType'
import {
  ProducerType,
  defContextMenus,
  prodBase,
  prodPriceUnit,
  prodUnit,
} from '@/utils/pysc/pyscType'
import TableEditor from '@/views/components/TableEditor.vue'

import { usePyscConfStore } from '@/stores/genfisStore'

interface Props {
  prodType: number
}
const props = defineProps<Props>()

const selProdIndex = defineModel('selProdIndex', { type: Number, default: 0 })

const appStore = useAppStore()
const PyscConf = usePyscConfStore()
const { dataProd } = storeToRefs(PyscConf)

// console.log(dataProd.value)
const ProdIndex = computed(() => dataProd.value.findIndex(e => e.Tipe === props.prodType))

const columnTable = computed((): ExcelColumnType => {
  // console.log(props.prodType)
  if (props.prodType === 0) {
    return {
      colHeaders: ['Year',
        `Prod. Rate baseline (${prodBase(props.prodType)})`,
        `Sales (${prodUnit(props.prodType)})`,
        `Price (${prodPriceUnit(props.prodType)})`,
        'Condensate Sales (MBOPY)',
        'Condensate Price (USD/BBL)'],
      columns: [
        { data: 'year', type: 'numeric', validator: 'numeric', allowInvalid: false },
        { data: 'base', type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, optionalMantissa: true, negative: "parenthesis" } }, validator: 'numeric', allowInvalid: false },
        { data: 'sales', type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, optionalMantissa: true, negative: "parenthesis" } }, validator: 'numeric', allowInvalid: false },
        { data: 'price', type: 'numeric', validator: 'numeric', allowInvalid: false },
        { data: 'condensate_sales', type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, optionalMantissa: true, negative: "parenthesis" } }, validator: 'numeric', allowInvalid: false },
        { data: 'condensate_price', type: 'numeric', validator: 'numeric', allowInvalid: false },
      ],
    }
  }
  else if (props.prodType === 1) {
    const hGSA = ['Year',
      `Prod. Rate baseline (${prodBase(props.prodType)})`,
      `Production (${prodUnit(props.prodType)})`]

    const columns = [
      { data: 'year', type: 'numeric', validator: 'numeric', allowInvalid: false },
      { data: 'base', type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, optionalMantissa: true, negative: "parenthesis" } }, validator: 'numeric', allowInvalid: false },
      { data: 'production', type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, optionalMantissa: true, negative: "parenthesis" } }, validator: 'numeric', allowInvalid: false },
    ]

    for (let i = 1; i <= dataProd.value[ProdIndex.value].GSANumber; i++) {
      hGSA.push(`GSA ${i} Volume (BSCF)`, `GSA ${i} GHV (BTU/SCF)`, `GSA ${i} Price (USD/MMBTU)`)

      columns.push({ data: `gsa.vol${i}`, type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, optionalMantissa: true, negative: "parenthesis" } }, validator: 'numeric', allowInvalid: false })
      columns.push({ data: `gsa.ghv${i}`, type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, optionalMantissa: true, negative: "parenthesis" } }, validator: 'numeric', allowInvalid: false })
      columns.push({ data: `gsa.price${i}`, type: 'numeric', validator: 'numeric', allowInvalid: false })
    }

    return {
      colHeaders: hGSA,
      columns,
    }
  }

  const prodName = Object.values(ProducerType)[props.prodType]

  return {
    colHeaders: ['Year',
      `Prod. Rate baseline (${prodBase(props.prodType)})`,
      `Sales (${prodUnit(props.prodType)})`,
      `Price (${prodPriceUnit(props.prodType)})`],
    columns: [
      { data: 'year', type: 'numeric', validator: 'numeric', allowInvalid: false },
      { data: 'base', type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, optionalMantissa: true, negative: "parenthesis" } }, validator: 'numeric', allowInvalid: false },
      { data: 'sales', type: 'numeric', numericFormat: { pattern: { thousandSeparated: true, mantissa: 2, optionalMantissa: true, negative: "parenthesis" } }, validator: 'numeric', allowInvalid: false },
      { data: 'price', type: 'numeric', validator: 'numeric', allowInvalid: false },
    ],
  }
})

const copy2all = (ProdIdx, selProdIdx) => {
  dataProd.value[ProdIdx].prod_price.forEach((item, i) => {
    if (i != selProdIdx)
      item.splice(0, item.length, ...JSON.parse(JSON.stringify(dataProd.value[ProdIdx].prod_price[selProdIdx])))
  })
}

const contextMenus: contextMenuType[] = [...defContextMenus, { name: 'separator' }, {
  name: 'import',
  label: 'Import from Excel-sheet',
  callback: (key, selection, clickEvent) => {
    const _columnKeys = columnTable.value.columns.map(c => c.data)
    const prodName = Object.values(ProducerType)[props.prodType]

    appStore.showXlsxImport({
      SheetName: `Prod ${prodName + (selProdIndex.value > 0 ? (` (${selProdIndex.value + 2})`) : '')}`,
      Format: ['i', ...Array(_columnKeys.length - 1).fill('f')],
      Callback: (data: any[]) => {
        if (data.length === 0) { appStore.showAlert({ text: 'Data empty.', isalert: true }) }
        else {
          if (data[0].length < _columnKeys.length)
            data = data.map(row => [...row, ...Array<any>(_columnKeys.length - row.length).fill(null)])

          const _prodData = data.map(row => {
            return _columnKeys.reduce((_rowData, ck, i) => {
              if (ck.includes('gsa')) {
                const kArr = ck.match(/([a-z]+)\.(([a-z]+)([1-9]+))/d)
                if (!_rowData.hasOwnProperty('gsa')) { return { ..._rowData, ...{ gsa: { [kArr[2]]: row[i] } } } }
                else {
                  _rowData.gsa = { ..._rowData.gsa, ...{ [kArr[2]]: row[i] } }

                  return _rowData
                }
              }
              else { return { ..._rowData, ...{ [ck]: row[i] } } }
            }, {})
          })

          // console.log(_prodData)
          dataProd.value[ProdIndex.value].prod_price[selProdIndex.value].splice(0,
            dataProd.value[ProdIndex.value].prod_price[selProdIndex.value].length,
            ..._prodData)
        }
      },
    })
  },
}]
</script>

<template>
  <VRow no-gutters>
    <VCol
      v-if="dataProd[ProdIndex].ProdNumber > 1"
      cols="12"
      class="mt-4 mb-2 d-flex justify-start gap-x-3"
    >
      <VSelect
        v-model="selProdIndex"
        :items="Array.from({ length: dataProd[ProdIndex].ProdNumber }, (_, i) => ({ title: `${Object.values(ProducerType)[dataProd[ProdIndex].Tipe]} ${i + 1}`, value: i }))"
        item-props
        variant="outlined"
        label="for Production"
      />
      <VBtn
        variant="outlined"
        color="success"
        @click="() => copy2all(ProdIndex, selProdIndex)"
      >
        <VIcon icon="tabler-copy" />
        <VTooltip
          location="top"
          activator="parent"
        >
          Copy to All
        </VTooltip>
      </VBtn>
    </VCol>
    <VCol cols="12">
      <TableEditor
        v-model:model-value="dataProd[ProdIndex].prod_price[selProdIndex]"
        :columns="columnTable"
        col-auto-width="none"
        :context-menus="contextMenus"
      />
    </VCol>
  </VRow>
</template>

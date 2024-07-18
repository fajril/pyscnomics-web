<script setup lang="ts">
import * as math from "mathjs"
import * as Pysc from "@/utils/pysc/pyscType"

interface Props {
  columns: string[]
  data: []
  lstCtr: number[]
}
const props = defineProps<Props>()
const tblCombine = ref()
const numbro = Pysc.useNumbro()

function renderedColumn(instance, td, row, col, prop, value, cellProperties) {
  td.classList.add("htRight")
  td.classList.add("htMiddle")
  if (col === 0) {
    const div = document.createElement('div')

    div.classList.add("d-flex")
    div.classList.add("justify-center")

    const span = document.createElement('span')

    span.innerHTML = `${value ?? ""}<small></small>`
    div.appendChild(span)
    td.innerText = ""
    td.appendChild(div)
  }
  else {
    if (row === props.data.length) {
      td.classList.add("bg-light-success")
      td.classList.add("font-weight-bold")
    }

    const div = document.createElement('div')

    div.classList.add("d-flex")
    div.classList.add("justify-end")

    const span = document.createElement('span')

    const valTxt = Pysc.fmtNumber(value, true, { negative: 'sign' })

    span.innerHTML = valTxt
    div.appendChild(span)
    td.innerText = ""
    td.appendChild(div)

    // td.innerHTML = Pysc.fmtNumber(value, true, { negative: 'sign' })
  }

  return td
}

const dataTable = computed(() => {
  const _resData = props.data.length ? JSON.parse(JSON.stringify(props.data)) : []
  if (_resData.length && _resData[0].length) {
    const sum_rows = Array(_resData[0].length).fill(0.0)
    const crows = sum_rows.length

    sum_rows.splice(0, sum_rows.length, ...sum_rows.map((col, c_) => {
      if (c_ == crows - 2 || (props.lstCtr.includes(1) && [18, 19].includes(c_))) {
        return _resData[_resData.length - 1][c_]
      }
      else if (c_ != 0 && c_ != crows - 2) {
        const cols = _resData.slice(0).map(row => row[c_])

        return math.sum(_resData.map(row => typeof row[c_] === 'number' ? row[c_] : 0.0))
      }

      return ""
    }))
    _resData.push(sum_rows)
  }

  return _resData
})

const CompSetting = computed(() => {
  return {
    data: dataTable.value,
    colHeaders: true,
    nestedHeaders: props.lstCtr.length <= 1
      ? [props.columns]
      : [
        [{ label: '', colspan: 11 }, { label: 'PSC-Cost Recovery', colspan: 11 }, { label: 'PSC-GrossSplit', colspan: 6 }, { label: '', colspan: 6 }, { label: 'PSC-Cost Recovery', colspan: 2 }, { label: '', colspan: 6 }],
        props.columns,
      ],
    columns: Array(props.columns.length).fill({ readOnly: true, renderer: renderedColumn }),
    colWidths: 120,
    contextMenu: Pysc.TableContextMenus([{ name: 'copy' }, { name: 'copy_with_column_headers' }]),
    height: 'auto',
    width: '100%',
    fixedColumnsStart: 1,
    manualColumnResize: true,
    autoWrapRow: false,
    autoWrapCol: false,
    licenseKey: 'non-commercial-and-evaluation',
  }
})

watchDebounced(() => [props.columns, props.data], val => {
  nextTick(() => {
    // CompSetting.value.data.splice(0, CompSetting.value.data.length, ...dataTable.value)
    tblCombine.value?.hotInstance.updateSettings(CompSetting.value)
  })
}, { debounce: 800, deep: true })
watch(() => [props.data, props.columns], val => {
  nextTick(() => {
    // CompSetting.value.data.splice(0, CompSetting.value.data.length, ...dataTable.value)
    tblCombine.value?.hotInstance.updateSettings(CompSetting.value)
  })
}, { deep: true })
</script>

<template>
  <VCardText>
    <HotTable
      ref="tblCombine"
      class="combine-class"
      :settings="CompSetting"
      license-key="non-commercial-and-evaluation"
    />
  </VCardText>
</template>

<style lang="scss">
.combine-class {
  .handsontable th {
    vertical-align: middle;
    // white-space: normal !important;
  }
}
</style>

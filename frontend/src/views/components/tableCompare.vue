<script setup lang="ts">
import { isNull } from "mathjs"
import * as Pysc from "@/utils/pysc/pyscType"

interface Props {
  columns: {
    title: string
    subtitle?: string
  }[]
  data: []
}
const props = defineProps<Props>()

const propColumn = toRef(props, 'columns')
const propData = toRef(props, 'data')

const numbro = Pysc.useNumbro()
const tblCompare = ref()

const dataTable = computed(() => {
  return Pysc.templateSummary.map((v, i) => {
    const values = (i < propData.value.length ? (Array.isArray(propData.value[i]) ? propData.value[i] : [propData.value[i]]) : Array(propColumn.value.length).fill(null))

    return [v.param, ...values]
  })
})

const CompSetting = computed(() => {
  const tblCfg = {
    data: dataTable.value,
    colHeaders: index => {
      if (index === 0) { return "" }
      else {
        const source = props.columns[index - 1].title

        return `<div style="max-inline-size:110px;"><p class="my-0 text-truncate" style="max-inline-size=150px;">${source}</p><h5 class="my-0 text-primary" style=":style="max-inline-size:100px;overflow:hidden;text-overflow:ellipsis;">${props.columns[index - 1].subtitle ?? ''}</h5></div>`
      }
    },
    columns: [],
    contextMenu: Pysc.TableContextMenus([{ name: 'copy' }, { name: 'copy_with_column_headers' }]),
    beforeCopy: (data, coords) => {
      if (data.length)
        data.splice(0, data.length, ...data.map(r => r.map(c => `${c ?? ''}`.replace(/<\/?("[^"]*"|'[^']*'|[^>])*(>|$)/g, " "))))
    },
    height: 'auto',
    width: '100%',
    fixedColumnsStart: 1,
    manualColumnResize: true,
    autoWrapRow: false,
    autoWrapCol: false,
    licenseKey: 'non-commercial-and-evaluation',
  }

  tblCfg.columns = Array(1 + props.columns.length).fill({ readOnly: true, renderer: renderedColumn })

  return tblCfg
})

function renderedColumn(instance, td, row, col, prop, value, cellProperties) {
  if (col === 0) {
    if ((Pysc.templateSummary[row].grp ?? 0) < 0) {
      const span = document.createElement('span')

      span.classList.add("ms-4")
      span.classList.add("text-capitalize")
      span.innerText = value
      td.innerText = ''
      td.appendChild(span)
      if (!isEmpty(Pysc.templateSummary[row].unit)) {
        span.innerText = `${span.innerText}, `

        const small = document.createElement('small')

        small.classList.add("text-primary")
        small.innerText = Pysc.templateSummary[row].unit
        td.appendChild(small)
      }
    }
    else {
      td.classList.add("text-capitalize")
      if ((Pysc.templateSummary[row].grp ?? 0) > 0)
        td.classList.add("font-weight-bold")
      td.innerText = value
      if (!isEmpty(Pysc.templateSummary[row].unit)) {
        const small = document.createElement('small')

        small.classList.add("text-primary")
        td.innerText = `${td.innerText}, `
        small.innerText = Pysc.templateSummary[row].unit
        td.appendChild(small)
      }
    }
  }
  else {
    if (row < dataTable.value.length && col < dataTable.value[row].length && !isNull(dataTable.value[row][col])) {
      // const decDot = Intl.NumberFormat().formatToParts(1.1).find(e => e.type === 'decimal').value
      const div = document.createElement('div')

      div.classList.add("d-flex")
      div.classList.add("justify-end")

      const span = document.createElement('span')
      const valCell = dataTable.value[row][col]
      const valTxt = Pysc.fmtNumber(valCell, true)

      span.innerHTML = valTxt

      // let valTxt = typeof valCell === 'number' ? numbro(valCell).format({ mantissa: 2, thousandSeparated: true, negative: "parenthesis", spaceSeparated: true }) : ''
      // if (valTxt.length) {
      //   const valArr = valTxt.split(decDot)
      //   const valDec = valArr.length > 1 ? (valCell < 0 ? `.<small>${valArr[1].split(")")[0]}</small>)` : `.<small>${valArr[1]}</small>`) : ("")
      //   valTxt = valArr[0] + valDec
      // }
      // span.innerHTML = valTxt
      div.appendChild(span)
      if (col > 1 && !isNull(dataTable.value[row][1]) && !isEmpty(valTxt)) {
        const iel = document.createElement('span')

        iel.classList.add("font-weight-bold")

        const _bv = numbro.unformat(numbro(typeof dataTable.value[row][1] === 'number' ? dataTable.value[row][1] : 0).format({ mantissa: 5 }))
        const _dv = numbro.unformat(numbro(typeof valCell === 'number' ? valCell : 0).format({ mantissa: 5 }))
        const _indicator = _dv > _bv ? 'tabler-corner-right-up' : (_dv < _bv ? 'tabler-corner-right-down' : '')
        const _color = _dv > _bv ? 'text-primary' : (_dv < _bv ? 'text-error' : '')

        iel.innerHTML = `<i class="v-icon notranslate ${_color} ${_indicator} v-icon notranslate" aria-hidden="true" style="font-size: 16px; height: 16px; width: 16px;"></i>`
        div.appendChild(iel)
      }
      td.innerText = ""
      td.appendChild(div)
    }
    else { td.innerText = "" }
  }

  return td
}

watch(() => [propData.value, propColumn.value], val => {
  nextTick(() => {
    CompSetting.value.data.splice(0, CompSetting.value.data.length, ...dataTable.value)
    tblCompare.value?.hotInstance.updateSettings(CompSetting.value)
  })
}, { deep: true })

const getDataSource = () => {
  return [tblCompare.value?.hotInstance.getColHeader().map(v => v.replace(/<\/?("[^"]*"|'[^']*'|[^>])*(>|$)/g, " ")), ...tblCompare.value?.hotInstance.getData()]
}

defineExpose({
  getDataSource,
})
</script>

<template>
  <VCardText>
    <HotTable
      ref="tblCompare"
      class="ht-compare-case"
      :settings="CompSetting"
      license-key="non-commercial-and-evaluation"
    />
  </VCardText>
</template>

<style lang="scss">
 .ht-compare-case {
  $bg-rank-1: #01c014;
  $bg-rank-2: #00948d;
  $bg-rank-3: #0011ab;
  $bg-rank-4: #a900af;
  $bg-rank-5: #b4b700;
  $bg-rank-6: #c68400;
  $bg-rank-7: #b20059;
  $bg-rank-8: #6f0101;
  $bg-rank-9: #730177;
  $bg-rank-10: #0d0071;
  $bg-rank-11: #00655ed4;
  $bg-rank-12: #00651493;
  $bg-rank-13: #445000;
  $bg-rank-14: #c62100;
  th:nth-child(2) {
    background-color: rgba($bg-rank-1, 0.7) !important;
  }
  th:nth-child(3) {
    background-color: rgba($bg-rank-2, 0.7) !important;
  }
  th:nth-child(4) {
    background-color: rgba($bg-rank-3, 0.7) !important;
  }
  th:nth-child(5) {
    background-color: rgba($bg-rank-4, 0.7) !important;
  }
  th:nth-child(6) {
    background-color: rgba($bg-rank-5, 0.7) !important;
  }
  th:nth-child(7) {
    background-color: rgba($bg-rank-6, 0.7) !important;
  }
  th:nth-child(8) {
    background-color: rgba($bg-rank-7, 0.7) !important;
  }
  th:nth-child(9) {
    background-color: rgba($bg-rank-8, 0.7) !important;
  }
  th:nth-child(10) {
    background-color: rgba($bg-rank-9, 0.7) !important;
  }
  th:nth-child(11) {
    background-color: rgba($bg-rank-10, 0.7) !important;
  }
  th:nth-child(12) {
    background-color: rgba($bg-rank-11, 0.7) !important;
  }
  th:nth-child(13) {
    background-color: rgba($bg-rank-12, 0.7) !important;
  }
  th:nth-child(14) {
    background-color: rgba($bg-rank-13, 0.7) !important;
  }
  th:nth-child(15) {
    background-color: rgba($bg-rank-14, 0.7) !important;
  }

 }
</style>

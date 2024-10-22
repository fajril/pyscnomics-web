<script setup lang="ts">
import { useAppStore } from "@/stores/appStore"
import { useTooltip } from "@/utils/pysc/useTooltips"
import type { ExcelColumnType, contextMenuType } from '@/utils/pysc/pyscType'
import { TableContextMenus, defContextMenus } from '@/utils/pysc/pyscType'
import 'handsontable/dist/handsontable.full.css'
import HyperFormula from 'hyperformula'

interface Props {
  columns: ExcelColumnType
  colAutoWidth?: 'none' | 'last' | 'all'
  contextMenus?: contextMenuType[]
  hintGroup?: string
}

const props = withDefaults(defineProps<Props>(), {
  colAutoWidth: 'last',
  contextMenus: [...defContextMenus],
  hintGroup: undefined,
})

const modelValue = defineModel<Object[]>({ required: true })

const appStore = useAppStore()
const { getToolTip } = useTooltip()

const { locale } = useI18n({ useScope: 'global' })

const columnnSett = toRef(props, 'columns')

const { TabelContainer, hotTableRef: tblhot, hotInstance, htTblSett: hotSettings, updateData, updateSetting, onGetHintTooltip, onAfterValidate } = useHTtable({
  data: modelValue,
  colHeaders: columnnSett.value.colHeaders,
  columns: columnnSett.value.columns,
  fillHandle: {
    direction: 'vertical',
    autoInsertRow: true,
  },
  formulas: {
    engine: HyperFormula,
  },
  beforeRemoveRow(index, amount, physicalRows) {
    return (modelValue.value.length - amount > 0)
  },
  rowHeaders: true,
  stretchH: props.colAutoWidth,
  contextMenu: TableContextMenus(props.contextMenus),
}, 'all')

onGetHintTooltip.value = (rowData, value, cellProperties, isHeader) => {
  if (isHeader) {
    const headerTxt_ = hotSettings.value.colHeaders[cellProperties.col]
    if (props.hintGroup) {
      if ((headerTxt_).startsWith('Year'))
        return getToolTip(`${props.hintGroup}.Year`)
      else if ((headerTxt_).startsWith('Sales'))
        return getToolTip(`${props.hintGroup}.Sales`)
      else if ((headerTxt_).startsWith('Price'))
        return getToolTip(`${props.hintGroup}.Price`)
      else if ((headerTxt_).startsWith('Condensate Sales'))
        return getToolTip(`${props.hintGroup}.Cond_sales`)
      else if ((headerTxt_).startsWith('Condensate Price'))
        return getToolTip(`${props.hintGroup}.Cond_price`)
      else if ((headerTxt_).startsWith('Production'))
        return getToolTip(`${props.hintGroup}.Production`)
      else if ((/GSA \d+ Volume/).test(headerTxt_))
        return getToolTip(`${props.hintGroup}.GSA_Volume`)
      else if ((/GSA \d+ GHV/).test(headerTxt_))
        return getToolTip(`${props.hintGroup}.GSA_GHV`)
      else if ((/GSA \d+ Price/).test(headerTxt_))
        return getToolTip(`${props.hintGroup}.GSA_Price`)
    }

    return headerTxt_
  }

  else {
    return !isNullOrUndefined(value) ? `${value}` : null
  }
}

onAfterValidate.value = (isValid, value, row, prop) => {
  const iCol = hotSettings.value.columns.findIndex(c => c.data === prop)
  const ctype = hotInstance.value?.getDataType(row, iCol, row, iCol)

  nextTick(() => {
    try {
      if (ctype === 'numeric' && (typeof modelValue.value[row][prop] === 'string')
            && modelValue.value[row][prop].includes('=')) {
        modelValue.value[row][prop] = +(+value).toPrecision(15)
        updateData(modelValue.value)
      }
    }
    catch (error) {

    }
  })
}

// const hotSettings = ref({
//   data: modelValue,
//   formulas: {
//     engine: HyperFormula,
//   },
//   colHeaders: columnnSett.value.colHeaders,
//   columns: columnnSett.value.columns,
//   afterValidate(isValid, value, row, prop) {
//     if (!isValid) {
//       appStore.showAlert({
//         text: `"${value}" Is invalid value`,
//         isalert: true,
//       })
//     }
//     else {
//       const iCol = hotSettings.value.columns.findIndex(c => c.data === prop)
//       const ctype = tblhot.value.hotInstance.getDataType(row, iCol, row, iCol)

//       nextTick(() => {
//         try {
//           if (ctype === 'numeric' && (typeof modelValue.value[row][prop] === 'string')
//             && modelValue.value[row][prop].includes('=')) {
//             modelValue.value[row][prop] = +(+value).toPrecision(15)
//             tblhot.value.hotInstance.updateData(modelValue.value)
//           }
//         }
//         catch (error) {

//         }
//       })
//     }

//     return isValid
//   },
//   beforeRemoveRow(index, amount, physicalRows) {
//     return (modelValue.value.length - amount > 0)
//   },
//   fillHandle: {
//     direction: 'vertical',
//     autoInsertRow: true,
//   },
//   rowHeaders: true,
//   height: 'auto',
//   contextMenu: TableContextMenus(props.contextMenus),
//   autoWrapRow: false,
//   stretchH: props.colAutoWidth,
//   manualColumnResize: true,
//   autoWrapCol: false,
//   licenseKey: 'non-commercial-and-evaluation',
// })

watch([modelValue, columnnSett], ([val1, val2]) => {
  hotSettings.value.colHeaders = columnnSett.value.colHeaders
  hotSettings.value.columns = columnnSett.value.columns
  hotSettings.value.data = modelValue
  updateSetting(hotSettings.value)
}, { deep: true })

watch(locale, val => updateSetting(hotSettings.value))

const getTblData = () => {
  return [hotSettings.value.colHeaders, ...hotInstance.value?.getData()]
}

defineExpose({
  getTblData,
})
</script>

<template>
  <HotTable
    ref="tblhot"
    :settings="hotSettings"
    license-key="non-commercial-and-evaluation"
  />
</template>

<style lang="scss">
.handsontable span.colHeader {
  white-space: pre-wrap !important
}
</style>

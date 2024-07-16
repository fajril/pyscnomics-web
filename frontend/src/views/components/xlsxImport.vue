<script setup lang="ts">
import { useAppStore } from "@/stores/appStore"
import type { TImportData } from '@/utils/pysc/pyscType'
import { TableContextMenus, defContextMenus } from '@/utils/pysc/pyscType'
import 'handsontable/dist/handsontable.full.css'
import { isArray, isNull, max } from 'mathjs'
import * as XLSX from "xlsx"

const appStore = useAppStore()

const IsLoading = ref(false)

const selectXlsx = ref<File[] | null>(null)
const selectedSheet = ref<string | null>(null)
const defSheetName = ref<string | null>(null)
const ValidatorFmt = ref<string[]>([])
const callbackFunc = ref<Function | null>(null)

// const WB = ref<XLSX.WorkBook | null | undefined>(undefined)
const sheetNames = ref<string[]>([])
const sheets = ref<XLSX.WorkSheet[]>([])
const DataSheet = ref<any[]>([])
const DataSelected = ref<{ row0: number; col0: number; row1: number; col1: number }>({ row0: -1, col0: -1, row1: -1, col1: -1 })
const _isDialogVisible = ref(false)

const resetData = () => {
  selectXlsx.value = null
  selectedSheet.value = null
  sheets.value = []
  sheetNames.value = []
  DataSheet.value = []
}

const isDialogVisible = computed({
  get: () => _isDialogVisible.value,
  set: val => {
    // resetData()
    _isDialogVisible.value = val
  },
})

const ImportSettings = computed(() => {
  return {
    data: DataSheet.value,

    // readOnly: true,
    contextMenu: TableContextMenus(defContextMenus.slice(0, 8)),
    colHeaders: true,
    rowHeaders: true,
    height: 'auto',
    autoWrapRow: false,
    stretchH: 'none',
    manualColumnResize: true,
    autoWrapCol: false,
    afterSelectionEnd: (row, column, row2, column2, selectionLayerLevel) => {
      DataSelected.value.row0 = row
      DataSelected.value.col0 = column
      DataSelected.value.row1 = row2
      DataSelected.value.col1 = column2
    },
    licenseKey: 'non-commercial-and-evaluation',
  }
})

const InportData = () => {
  const _t = max(0, DataSelected.value.row0)
  const _b = max(0, DataSelected.value.row1)
  const _l = max(0, DataSelected.value.col0)
  const _r = max(0, DataSelected.value.col1)
  const _result = JSON.parse(JSON.stringify(DataSheet.value.filter((v, r) => r >= _t && r <= _b).map(row => row.slice(_l, _r - _l + 1))))
  let _valid = true
  if (ValidatorFmt.value.length) {
    // check data
    _result.every(row => {
      row.every((col, c) => {
        try {
          if (c >= ValidatorFmt.value.length) {
            _valid = false
            appStore.showAlert({ text: `Expected ${ValidatorFmt.value.length} columns but receives ${row.length}`, isalert: true })

            return false
          }
          if (typeof col === 'number' || typeof col === 'string') {
            if (ValidatorFmt.value[c] === 'i' || ValidatorFmt.value[c] === 'f') {
              const _val = !isNaN(+col) ? +col : null
              if (!isNull(_val)) {
                if (ValidatorFmt.value[c] === 'i')
                  row[c] = Number.parseInt(`${_val}`)
                else
                  row[c] = _val
              }
              else { row[c] = null }
            }
            else if (ValidatorFmt.value[c] === 's') {
              if (typeof col === 'number')
                row[c] = `${col}`
              else
                row[c] = col
            }
            else if (isArray(ValidatorFmt.value[c]) && ValidatorFmt.value[c].includes(`${col}`)) { row[c] = `${col}` }
            else { row[c] = null }
          }
          else { row[c] = null }

          return _valid
        }
        catch (error) {
          appStore.showAlert({ text: error, isalert: true })
          _valid = false
        }
      })

      return _valid
    })
  }
  if (_valid && callbackFunc.value) {
    callbackFunc.value(_result)
    isDialogVisible.value = false
  }
}

watch(selectedSheet, val => {
  if (typeof val === 'string') {
    const ws = sheets.value[val]
    if (ws) {
      const _data = JSON.parse(JSON.stringify(XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, skipHidden: true })))

      DataSheet.value.splice(0, DataSheet.value.length, ..._data)
    }
  }
})

watch(selectXlsx, val => {
  if (!selectXlsx.value) {
    resetData()

    return
  }
  if (selectXlsx.value) {
    IsLoading.value = true
    selectedSheet.value = null

    const reader = new FileReader()

    reader.onload = e => {
      /* Parse data */
      const bstr = e.target.result
      const WB = XLSX.read(bstr, { type: "binary" })

      sheets.value = JSON.parse(JSON.stringify(WB.Sheets))
      sheetNames.value.splice(0, sheetNames.value.length, ...WB.SheetNames)
      IsLoading.value = false
      if (defSheetName.value && sheetNames.value.findIndex(s => s === defSheetName.value) !== -1)
        nextTick(() => selectedSheet.value = defSheetName.value)
    }
    reader.readAsArrayBuffer(selectXlsx.value[0])
  }
})

const makeImport = (param: TImportData) => {
  defSheetName.value = param.SheetName
  if (defSheetName.value && sheetNames.value.findIndex(s => s === defSheetName.value) !== -1)
    nextTick(() => selectedSheet.value = defSheetName.value)

  callbackFunc.value = param.Callback
  ValidatorFmt.value = param.Format ?? []
  isDialogVisible.value = true
}

const DlgExpContainer = ref()
const cardDlgExpContainer = ref()
const cardDlgExpHeader = ref()

defineExpose({
  makeImport,
})
</script>

<template>
  <VDialog
    ref="DlgExpContainer"
    v-model="isDialogVisible"
    persistent
    eager
    class="v-dialog-sm"
  >
    <!-- Dialog close btn -->
    <DialogCloseBtn @click="isDialogVisible = !isDialogVisible" />
    <!-- Dialog Content -->
    <VCard
      ref="cardDlgExpContainer"
      :loading="IsLoading ? 'primary' : false"
    >
      <VCardItem ref="cardDlgExpHeader">
        <VCardTitle>
          <slot name="title">
            Import Data from XLSX
          </slot>
        </VCardTitle>
      </VCardItem>
      <VCardText>
        <VRow>
          <VCol cols="12">
            <VFileInput
              v-model="selectXlsx"
              accept=".xlsx;*.xlsm;*.xlsb"
              label="File input(xlsx)"
              outlined
              show-size
            />
          </VCol>
          <VCol
            v-if="sheetNames.length"
            cols="6"
            class="py-0 pb-2"
          >
            <AppSelect
              v-model="selectedSheet"
              :items="sheetNames"
              item-props
              variant="outlined"
              label-placeholder="Select Sheet"
              class="mt-4"
            />
          </VCol>
          <VDivider />
          <VCol
            v-if="DataSheet.length"
            cols="12"
          >
            <VAlert
              color="primary"
              class="my-2"
            >
              <div class="d-flex w-100 justify-space-between align-center">
                <span>Select the cells to be imported then click import</span>
                <VBtn
                  color="secondary"
                  size="small"
                  @click="InportData"
                >
                  Import
                </VBtn>
              </div>
            </VAlert>
            <HotTable
              ref="tblImport"
              :settings="ImportSettings"
              license-key="non-commercial-and-evaluation"
            />
          </VCol>
        </VRow>
      </VCardText>
    </VCard>
  </VDialog>
</template>

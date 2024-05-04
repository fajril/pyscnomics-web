<script setup lang="ts">
import { useAppStore } from '@/stores/appStore';
import * as Pysc from '@/utils/pysc/pyscType';
import 'handsontable/dist/handsontable.full.css';

const appStore = useAppStore()
const numbro = Pysc.useNumbro()

const isDialogVisible = ref(false)
const isDialogSecCode = ref(false)
const IsLoading = ref(false)
const ItsValidTaxSett = ref(false)
const ItsValidGSSett = ref(false)
const currentTab = ref(0)
const tblTax = ref()
const tblSetGS = ref()
const SecCode = ref<string>('')
const showCode = ref(false)
const TaxSetting = ref({
  data: [],
  colHeaders: ["Year", "Tax, %"],
  columns: [
    { data: 'year', type: 'numeric', validator: 'numeric', allowInvalid: false },
    { data: 'tax', type: 'numeric', validator: 'numeric', numericFormat: { pattern: { output: 'percent', mantissa: 2, negative: "parenthesis" } }, allowInvalid: false },
  ],
  fillHandle: {
    direction: 'vertical',
    autoInsertRow: true
  },
  // formulas: {
  //   engine: HyperFormula,
  // },
  afterValidate(isValid, value, row, prop) {
    if (!isValid) {
      appStore.showAlert({
        text: `"${value}" Is invalid value`,
        isalert: true
      })
    }
    return isValid
  },
  beforeRemoveRow(index, amount, physicalRows) {
    return (TaxSetting.value.data.length - amount > 0)
  },
  rowHeaders: true,
  width: '100%',
  stretchH: 'last',
  height: 'auto',
  contextMenu: ['row_above', 'row_below', 'remove_row', '---------', 'cut', 'copy', '---------', 'undo', 'redo',],
  autoWrapRow: false,
  manualColumnResize: true,
  autoWrapCol: false,
  licenseKey: 'non-commercial-and-evaluation'
})

const GSSetting = ref({
  data: [
    { char: 'Field Status', par: 'POD I', val: 0.05 },
    { char: '', par: 'POD II', val: 0.03 },
    { char: '', par: 'No POD', val: 0 },
    { char: "Field Location (*h=sea depth in meter)", par: 'Onshore', val: 0.00 },
    { char: "", par: 'Offshore (0<h<=20)', val: 0.08 },
    { char: "", par: 'Offshore (20<h<=50)', val: 0.10 },
    { char: "", par: 'Offshore (50<h<=150)', val: 0.12 },
    { char: "", par: 'Offshore (150<h<=1000)', val: 0.14 },
    { char: "", par: 'Offshore (h>1000)', val: 0.16 },

    { char: "Reservoir Depth (m)", par: "<=2500", val: 0.00 },
    { char: "", par: ">2500", val: 0.01 },
    { char: "Infrastructure Availability", par: "Well Developed", val: 0.00 },
    { char: "", par: "New Frontier Offshore", val: 0.02 },
    { char: "", par: "New Frontier Onshore", val: 0.04 },
    { char: "Reservoir Type", par: "Conventional", val: 0.00 },
    { char: "", par: "Non Conventional", val: 0.16 },
    { char: "Oil API", par: "<25", val: 0.01 },
    { char: "", par: ">=25", val: 0.00 },
    { char: "Domestic Content Use (%)", par: "x<30", val: 0.00 },
    { char: "", par: "30<=x<50", val: 0.02 },
    { char: "", par: "50<=x<70", val: 0.03 },
    { char: "", par: "70<=x<100", val: 0.04 },
    { char: "Tahapan Produksi", par: "Primary", val: 0.00 },
    { char: "", par: "Secondary", val: 0.06 },
    { char: "", par: "Tertiary", val: 0.1 },
    { char: "CO2 Content (%)", par: "<5", val: 0.00 },
    { char: "", par: "5<=x<10", val: 0.005 },
    { char: "", par: "10<=x<20", val: 0.01 },
    { char: "", par: "20<=x<40", val: 0.015 },
    { char: "", par: "40<=x<60", val: 0.02 },
    { char: "", par: "60<=x", val: 0.04 },
    { char: "H2S Content (ppm)", par: "<100", val: 0.00 },
    { char: "", par: "100<=x<1000", val: 0.01 },
    { char: "", par: "1000<=x<2000", val: 0.02 },
    { char: "", par: "2000<=x<3000", val: 0.03 },
    { char: "", par: "3000<=x<4000", val: 0.04 },
    { char: "", par: "4000<=x", val: 0.05 },
  ],
  colHeaders: ["Karakteristik", "Parameter", "Value, %"],
  colWidths: [180, 160],
  columns: [
    { data: 'char', readOnly: true },
    { data: 'par', readOnly: true },
    { data: 'val', type: 'numeric', validator: 'numeric', numericFormat: { pattern: { output: 'percent', mantissa: 2, negative: "parenthesis" } }, allowInvalid: false },
  ],
  mergeCells: [
    { row: 0, col: 0, rowspan: 3, colspan: 1 },
    { row: 3, col: 0, rowspan: 6, colspan: 1 },
    { row: 9, col: 0, rowspan: 2, colspan: 1 },
    { row: 11, col: 0, rowspan: 3, colspan: 1 },
    { row: 14, col: 0, rowspan: 2, colspan: 1 },
    { row: 16, col: 0, rowspan: 2, colspan: 1 },
    { row: 18, col: 0, rowspan: 4, colspan: 1 },
    { row: 22, col: 0, rowspan: 3, colspan: 1 },
    { row: 25, col: 0, rowspan: 6, colspan: 1 },
    { row: 31, col: 0, rowspan: 6, colspan: 1 },
  ],
  fillHandle: {
    direction: 'vertical',
    autoInsertRow: true
  },
  // formulas: {
  //   engine: HyperFormula,
  // },
  afterValidate(isValid, value, row, prop) {
    if (!isValid) {
      appStore.showAlert({
        text: `"${value}" Is invalid value`,
        isalert: true
      })
    }
    return isValid
  },
  rowHeaders: true,
  height: 'auto',
  width: '100%',
  stretchH: 'last',
  contextMenu: false,
  autoWrapRow: false,
  manualColumnResize: true,
  autoWrapCol: false,
  licenseKey: 'non-commercial-and-evaluation'
})

const TaxData = computed(() => TaxSetting.value.data)
const GSData = computed(() => GSSetting.value.data)

const { stop: stopTaxSett, pause: pauseTaxSett, resume: resumeTaxSett } = watchPausable(
  TaxData,
  v => {
    //validate data
    ItsValidTaxSett.value = true
  }, { deep: true }
)
const { stop: stopGSSett, pause: pauseGSSett, resume: resumeGSSett } = watchPausable(
  GSData,
  v => {
    //validate data
    ItsValidGSSett.value = true
  }, { deep: true }
)

function ShowSetting(tab: number) {
  //fill data 
  pauseTaxSett()
  pauseGSSett()
  TaxSetting.value.data.splice(0, TaxSetting.value.data.length, ...JSON.parse(JSON.stringify(appStore.taxSett)))
  GSSetting.value.data.forEach((value, index) => { value.val = appStore.gsSett[index] })
  isDialogVisible.value = true
  currentTab.value = tab
  nextTick(() => {
    resumeTaxSett()
    resumeGSSett()
    ItsValidTaxSett.value = true
    ItsValidGSSett.value = true
  })
}

const applySett = (step: number) => {
  if (step === 0) {
    SecCode.value = ''
    isDialogSecCode.value = true
  } else {
    isDialogSecCode.value = false
    if (SecCode.value.trim().length) {
      //tes sec-code
      appStore.$patch({
        taxSett: JSON.parse(JSON.stringify(TaxSetting.value.data)),
        gsSett: JSON.parse(JSON.stringify(GSSetting.value.data.map(v => v.val)))
      })
    }
    isDialogVisible.value = false
  }
}

defineExpose({
  ShowSetting
})
</script>

<template>
  <VDialog v-model="isDialogVisible" class="v-dialog-sm">
    <!-- Dialog close btn -->
    <DialogCloseBtn @click="isDialogVisible = false" />
    <VCard title="PySCnomics Setting" :loading="IsLoading">
      <VCardText>
        <VTabs v-model="currentTab">
          <VTab>Tax</VTab>
          <VTab>GrossSplit</VTab>
        </VTabs>
        <VWindow v-model="currentTab">
          <VWindowItem value="0">
            <VCardText class="px-1">
              <hot-table ref="tblTax" :settings="TaxSetting"></hot-table>
            </VCardText>
          </VWindowItem>
          <VWindowItem value="1">
            <VCardText class="px-1">
              <hot-table ref="tblSetGS" :settings="GSSetting"></hot-table>
            </VCardText>
          </VWindowItem>
        </VWindow>


      </VCardText>
      <VCardText class="d-flex justify-end gap-3 flex-wrap">
        <VBtn color="secondary" variant="tonal" @click="isDialogVisible = false">
          Cancel
        </VBtn>
        <VBtn @click="() => applySett(0)" :disabled="!ItsValidTaxSett || !ItsValidGSSett">
          Ok
        </VBtn>
      </VCardText>
    </VCard>
  </VDialog>
  <VDialog v-model="isDialogSecCode" persistent class="v-dialog-sm">
    <!-- Dialog close btn -->
    <DialogCloseBtn @click="isDialogSecCode = false" />

    <VCard title="Enter Security Code">
      <VCardText>
        <AppTextField v-model="SecCode" :rules="[requiredValidator]"
          :append-inner-icon="showCode ? 'tabler-eye-off' : 'tabler-eye'" :type="showCode ? 'text' : 'password'"
          name="input-10-2" placeholder="security code" persistent-placeholder
          @click:append-inner="showCode = !showCode" />
      </VCardText>
      <VCardText class="d-flex flex-wrap gap-3">
        <VSpacer />
        <VBtn @click="() => applySett(1)" :disabled="SecCode.length < 4">
          Continue
        </VBtn>
      </VCardText>
    </VCard>
  </VDialog>
</template>

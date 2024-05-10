<script setup lang="ts">
import { useAppStore } from "@/stores/appStore";
import * as Pysc from "@/utils/pysc/pyscType";
import { VDataTableVirtual } from 'vuetify/labs/VDataTable';

interface Emit {
  (e: 'update:importcase', param: Pysc.selImprCases): void
}
const emit = defineEmits<Emit>()

const appStore = useAppStore()

const isDialogVisible = ref(false)
const caseList = ref([])
const selCase = ref([])
const tableCaseSelect = ref()
const filePath = ref<string | null>(null)

const headers = [
  { title: "Name", key: "name", align: 'start' },
  { title: "Type", key: "type", align: 'start', value: item => Object.values(Pysc.ContractType)[parseInt(item.type)] },
]

const applyCase = () => {
  isDialogVisible.value = false
  emit("update:importcase", { path: filePath.value, caseID: selCase.value })
}

const ShowCaseDialogs = (path: string, cases: Array<any>) => {
  filePath.value = path
  caseList.value.splice(0, caseList.value.length, ...cases.filter(el => el.type != -1))
  selCase.value.splice(0, selCase.value.length, ...caseList.value.map(el => el.id))

  isDialogVisible.value = true
}

defineExpose({
  ShowCaseDialogs
})
</script>

<template>
  <VDialog v-model="isDialogVisible" class="v-dialog-sm">
    <DialogCloseBtn @click="isDialogVisible = !isDialogVisible" />
    <VCard title="Select Cases">
      <VCardText>
        <VDataTableVirtual ref="tableCaseSelect" :headers="headers" :items="caseList" item-value="id" density="compact"
          v-model="selCase" show-select class="mb-6">

        </VDataTableVirtual>
      </VCardText>
      <VCardText class="d-flex justify-end gap-3 flex-wrap">
        <VBtn color="secondary" variant="tonal" @click="isDialogVisible = false">
          Cancel
        </VBtn>
        <VBtn @click="applyCase" :disabled="selCase.length === 0">
          Apply
        </VBtn>
      </VCardText>
    </VCard>
  </VDialog>
</template>

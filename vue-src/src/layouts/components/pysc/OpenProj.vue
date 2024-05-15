<script setup lang="ts">
import { useAppStore } from '@/stores/appStore';
import { useDataStore } from '@/utils/pysc/useDataStore';
import dirDialogs from "@/views/components/fileDialogs/dirDialogs.vue";
const router = useRouter()
const appStore = useAppStore()

const SelLocRef = ref(null)
const isOpenProgress = ref(false)
const isDialogConfirmSave = ref(false)

const OpenProj = () => {
  if (appStore.selectedCase.state === 1 && !isEmpty(appStore.curProjectPath))
    isDialogConfirmSave.value = true
  else {
    if (!isEmpty(appStore.curProjectPath))
      SelLocRef.value?.loadMyDris("open", appStore.curProjectPath?.split(/\/|\\/).slice(0, -1).join("\\"))
    else
      SelLocRef.value?.loadMyDris("open", "__local__")
  }
}

const GetDataServ = async (path: string) => {
  await useDataStore().openProject(path)
  nextTick(() => {
    router.replace('/')
  })
  isOpenProgress.value = false
}
const updateSelPath = (value: string) => {
  isOpenProgress.value = true
  GetDataServ(value)
}

const saveCurProject = async () => {
  isDialogConfirmSave.value = false
  isOpenProgress.value = true
  const saveRes = await useDataStore().saveProject(appStore.curProjectPath)
  isOpenProgress.value = false
  if (saveRes) {
    if (!isEmpty(appStore.curProjectPath))
      SelLocRef.value?.loadMyDris("open", appStore.curProjectPath?.split(/\/|\\/).slice(0, -1).join("\\"))
    else
      SelLocRef.value?.loadMyDris("open", "__local__")
  }
}

const continueOpen = () => {
  isDialogConfirmSave.value = false
  if (!isEmpty(appStore.curProjectPath))
    SelLocRef.value?.loadMyDris("open", appStore.curProjectPath?.split(/\/|\\/).slice(0, -1).join("\\"))
  else
    SelLocRef.value?.loadMyDris("open", "__local__")
}

</script>

<template>
  <div v-if="isOpenProgress" class="position-fixed" style="z-index: 9999; inset-block-start: 0; inset-inline: 0 0;">
    <VProgressLinear indeterminate striped color="primary" height="3" bg-color="background" />
  </div>
  <IconBtn color="rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity))" @click="OpenProj">
    <VIcon icon="tabler-folder-open" size="26" />

    <VTooltip activator="parent" open-delay="500" scroll-strategy="close">
      <span class="text-capitalize">Open Project</span>
    </VTooltip>
  </IconBtn>
  <dirDialogs ref="SelLocRef" @update:path="updateSelPath" />
  <VDialog v-model="isDialogConfirmSave" persistent class="v-dialog-sm">
    <!-- Dialog close btn -->
    <DialogCloseBtn @click="isDialogConfirmSave = !isDialogConfirmSave" />

    <!-- Dialog Content -->
    <VCard title="Confirmation">
      <VCardText>
        The data has changed, do you want to save it first?
      </VCardText>

      <VCardText class="d-flex justify-end gap-3 flex-wrap">
        <VBtn color="secondary" variant="tonal" @click="continueOpen">
          No
        </VBtn>
        <VBtn @click="saveCurProject">
          Yes
        </VBtn>
      </VCardText>
    </VCard>
  </VDialog>
</template>

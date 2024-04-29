<script setup lang="ts">
import { useToolBarCtrl } from '@/utils/pysc/useToolBarCtrl';

const router = useRouter()
const isDialogVisible = ref(false)
const newProject = () => {
  isDialogVisible.value = false
  const useToolBar = useToolBarCtrl()
  //reset all data
  useToolBar.newProject()

  nextTick(() => {
    router.replace('/')

  })
}

</script>

<template>
  <IconBtn color="rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity))" @click="isDialogVisible = true">
    <VIcon icon="tabler-file" size="26" />

    <VTooltip activator="parent" open-delay="500" scroll-strategy="close">
      <span class="text-capitalize">New Project</span>
    </VTooltip>
  </IconBtn>
  <VDialog v-model="isDialogVisible" persistent class="v-dialog-sm">
    <!-- Dialog close btn -->
    <DialogCloseBtn @click="isDialogVisible = !isDialogVisible" />

    <!-- Dialog Content -->
    <VCard title="Confirmation">
      <VCardText>
        You will create a new project, all data will be reset, continue?
      </VCardText>

      <VCardText class="d-flex justify-end gap-3 flex-wrap">
        <VBtn color="secondary" variant="tonal" @click="isDialogVisible = false">
          No
        </VBtn>
        <VBtn @click="newProject">
          Yes
        </VBtn>
      </VCardText>
    </VCard>
  </VDialog>
</template>

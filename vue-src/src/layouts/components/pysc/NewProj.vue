<script setup lang="ts">
import { useDataStore } from '@/utils/pysc/useDataStore';

const router = useRouter()
const isDialogVisible = ref(false)
const newProject = async () => {
  isDialogVisible.value = false
  await useDataStore().newProject()
  nextTick(() => {
    router.replace('/')
  })
}

</script>

<template>
  <IconBtn color="rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity))" @click="isDialogVisible = true">
    <VIcon icon="tabler-file" size="26" />

    <VTooltip activator="parent" open-delay="500" scroll-strategy="close">
      <span class="text-capitalize">{{ $t("New") }}</span>
    </VTooltip>
  </IconBtn>
  <VDialog v-model="isDialogVisible" persistent class="v-dialog-sm">
    <!-- Dialog close btn -->
    <DialogCloseBtn @click="isDialogVisible = !isDialogVisible" />

    <!-- Dialog Content -->
    <VCard :title="$t('Confirmation')">
      <VCardText>
        {{ $t('NewPrjConf') }}
      </VCardText>

      <VCardText class="d-flex justify-end gap-3 flex-wrap">
        <VBtn color="secondary" variant="tonal" @click="isDialogVisible = false">
          {{ $t('No') }}
        </VBtn>
        <VBtn @click="newProject">
          {{ $t('Yes') }}
        </VBtn>
      </VCardText>
    </VCard>
  </VDialog>
</template>

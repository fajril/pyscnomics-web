<script setup lang="ts">
import { useAppStore } from '@/stores/appStore';
import { useDataStore } from '@/utils/pysc/useDataStore';
import DirDialogs from "@/views/components/fileDialogs/dirDialogs.vue";

const appStore = useAppStore()

const SelLocRef = ref(null)
const isSaveProgress = ref(false)

const PostDataProj = async (path: string) => {
  isSaveProgress.value = true

  const sukses = await useDataStore().saveProject(path)

  nextTick(() => isSaveProgress.value = false)

  return sukses
}

const updateSelPath = (value: string) => {
  PostDataProj(value)
}

const SaveProj = async () => {
  if (isEmpty(appStore.curProjectPath)) {
    SelLocRef.value?.loadMyDris("save", null)
  }
  else { PostDataProj(appStore.curProjectPath) }
}
</script>

<template>
  <div v-if="isSaveProgress" class="position-fixed" style="z-index: 9999; inset-block-start: 0; inset-inline: 0 0;">
    <VProgressLinear indeterminate striped color="primary" height="3" bg-color="background" />
  </div>
  <IconBtn color="rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity))" @click="SaveProj">
    <VIcon icon="tabler-device-floppy" size="26" />

    <VTooltip activator="parent" open-delay="500" scroll-strategy="close">
      <span class="text-capitalize">{{ $t('Save') }}</span>
    </VTooltip>
  </IconBtn>
  <DirDialogs ref="SelLocRef" @update:path="updateSelPath" />
</template>

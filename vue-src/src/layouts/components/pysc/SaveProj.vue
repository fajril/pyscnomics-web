<script setup lang="ts">
import { useAppStore } from '@/stores/appStore';
import { useToolBarCtrl } from '@/utils/pysc/useToolBarCtrl';
import dirDialogs from "@/views/components/fileDialogs/dirDialogs.vue";
const appStore = useAppStore()

const SelLocRef = ref(null)
const isSaveProgress = ref(false)

const PostDataProj = async (path: string) => {
  isSaveProgress.value = true
  const sukses = await useToolBarCtrl().saveProject(path)
  if (sukses)
    appStore.$patch({ curProjectPath: path })
  nextTick(() => isSaveProgress.value = false)
  return sukses
}

const updateSelPath = (value: string) => {
  PostDataProj(value)
}

const SaveProj = () => {
  if (isEmpty(appStore.curProjectPath))
    SelLocRef.value?.loadMyDris("save", "__local__")
  else
    PostDataProj(appStore.curProjectPath)
}
</script>

<template>
  <div v-if="isSaveProgress" class="position-fixed" style="z-index: 9999; inset-block-start: 0; inset-inline: 0 0;">
    <VProgressLinear indeterminate striped color="primary" height="3" bg-color="background" />
  </div>
  <IconBtn color="rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity))" @click="SaveProj">
    <VIcon icon="tabler-device-floppy" size="26" />

    <VTooltip activator="parent" open-delay="500" scroll-strategy="close">
      <span class="text-capitalize">Save Project</span>
    </VTooltip>
  </IconBtn>
  <dirDialogs ref="SelLocRef" @update:path="updateSelPath" />
</template>

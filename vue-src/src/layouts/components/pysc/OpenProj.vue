<script setup lang="ts">
import { useAppStore } from '@/stores/appStore';
import { useToolBarCtrl } from '@/utils/pysc/useToolBarCtrl';
import dirDialogs from "@/views/components/fileDialogs/dirDialogs.vue";
const router = useRouter()
const appStore = useAppStore()

const SelLocRef = ref(null)
const isOpenProgress = ref(false)

const OpenProj = () => {
  console.log(appStore.curProjectPath)
  if (!isEmpty(appStore.curProjectPath))
    SelLocRef.value?.loadMyDris("open", appStore.curProjectPath?.split(/\/|\\/).slice(0, -1).join("\\"))
  else
    SelLocRef.value?.loadMyDris("open", "__local__")
}

const GetDataServ = async (path: string) => {
  await useToolBarCtrl().openProject(path)
  nextTick(() => {
    router.replace('/')
  })
  isOpenProgress.value = false
}
const updateSelPath = (value: string) => {
  isOpenProgress.value = true
  GetDataServ(value)
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
</template>

<script setup lang="ts">
interface Props {
  sourceType: 'image' | 'text' | 'table'
  getSource: Function
}

const props = defineProps<Props>()

const showDownloadTag = ref()
const downloadTagRef = ref()

const { saved, saveImage, saveTable } = useClpbrd()

const save2File = () => {
  if (props.sourceType === 'image') {
    const { url, filename } = props.getSource()

    showDownloadTag.value = true
    nextTick(() => {
      saveImage(downloadTagRef.value, url, 'image/png', filename)
      showDownloadTag.value = false
    })
  }
  else if (props.sourceType === 'table') {
    const { data, filename } = props.getSource()

    showDownloadTag.value = true
    nextTick(() => {
      saveTable(downloadTagRef.value, data, filename)
      showDownloadTag.value = false
    })
  }
}
</script>

<template>
  <a
    v-if="showDownloadTag"
    ref="downloadTagRef"
    href="#"
  />
  <IconBtn
    :class="$attrs.class"
    color="rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity))"
    @click.stop.prevent="save2File"
  >
    <VIcon
      color="rgba(var(--v-default), var(--v-high-emphasis-opacity))"
      icon="tabler-download"
    />
    <VTooltip activator="parent">
      {{ saved ? 'download ready' : `Save to ${props.sourceType} file (*.${props.sourceType === 'image' ? 'png' : (props.sourceType === 'table' ? 'xlsx' : 'txt')})` }}
    </VTooltip>
  </IconBtn>
</template>

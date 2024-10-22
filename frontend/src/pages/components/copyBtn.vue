<script setup lang="ts">
interface Props {
  sourceType: 'image' | 'text'
  getSource: Function
  size?: number | string
}

const props = withDefaults(defineProps<Props>(), {
  size: 18,
})

const { copied, copyImage, copyText } = useClpbrd()

const cpy2Clipboard = () => {
  if (props.sourceType === 'image') {
    const { url } = props.getSource()

    copyImage(url, 'image/png')
  }
  else {
    copyText(props.getSource())
  }
}
</script>

<template>
  <IconBtn
    :class="$attrs.class"
    color="rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity))"
    @click.stop.prevent="cpy2Clipboard"
  >
    <VIcon
      :color="copied ? 'success' : 'rgba(var(--v-default), var(--v-high-emphasis-opacity))'"
      :icon="copied ? 'tabler-clipboard-check' : 'tabler-clipboard'"
      :size="props.size"
    />
    <VTooltip activator="parent">
      {{ copied ? 'Copied' : 'Copy to clipboard' }}
    </VTooltip>
  </IconBtn>
</template>

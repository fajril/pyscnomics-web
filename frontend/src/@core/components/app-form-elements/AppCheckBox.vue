<script lang="ts" setup>
defineOptions({
  name: 'AppCheckBox',
  inheritAttrs: false,
})

const tooltipContent = computed(() => {
  if (useAttrs()["tooltip-content"] !== undefined) {
    if (typeof useAttrs()["tooltip-content"] === 'object')
      return useAttrs()["tooltip-content"]["content"]
    else
      return useAttrs()["tooltip-content"]
  }
})
</script>

<template>
  <div>
    <VCheckbox v-bind="$attrs" />
    <VTooltip v-if="tooltipContent" activator="parent" open-delay="1000" scroll-strategy="close">
      <span v-html="tooltipContent" />
    </VTooltip>
  </div>
</template>

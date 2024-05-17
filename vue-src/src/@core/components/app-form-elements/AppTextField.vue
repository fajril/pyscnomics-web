<script lang="ts" setup>
defineOptions({
  name: 'AppTextField',
  inheritAttrs: false,
})

const elementId = computed(() => {
  const attrs = useAttrs()
  const _elementIdToken = attrs.id || attrs.label

  return _elementIdToken ? `app-text-field-${_elementIdToken}-${Math.random().toString(36).slice(2, 7)}` : undefined
})

const label = computed(() => (useAttrs()['label-placeholder'] ? undefined : (useAttrs().label as string | undefined)))
const labelOutline = computed(() => (useAttrs()['label-placeholder'] ?? (label.value ? undefined : (useAttrs().placeholder as string))))
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
  <div class="app-text-field flex-grow-1" :class="$attrs.class">
    <VLabel v-if="label" :for="elementId" class="mb-1 text-body-2 text-high-emphasis" :text="label" />
    <VTextField v-bind="{
      ...$attrs,
      class: null,
      label: labelOutline ? (Array.isArray(labelOutline) ? $t(labelOutline[0], labelOutline.slice(1)) : $t(labelOutline)) : undefined,
      variant: 'outlined',
      id: elementId,
    }">
      <template v-for="(_, name) in $slots" #[name]="slotProps">
        <slot :name="name" v-bind="slotProps || {}" />
      </template>
    </VTextField>
    <VTooltip v-if="tooltipContent" activator="parent" open-delay="1000" scroll-strategy="close">
      <span v-html="tooltipContent" />
    </VTooltip>
  </div>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'AppSelect',
  inheritAttrs: false,
})

const elementId = computed(() => {
  const attrs = useAttrs()
  const _elementIdToken = attrs.id || attrs.label

  return _elementIdToken ? `app-select-${_elementIdToken}-${Math.random().toString(36).slice(2, 7)}` : undefined
})

const labelPlaceholder = computed(() => useAttrs()["label-placeholder"] as string | [] | undefined)
const tooltipContent = computed(() => {
  if (useAttrs()["tooltip-content"] !== undefined) {
    if (typeof useAttrs()["tooltip-content"] === 'object')
      return useAttrs()["tooltip-content"]["content"]
    else
      return useAttrs()["tooltip-content"]
  }
})
const label = computed(() => (labelPlaceholder.value ? undefined : (useAttrs().label as string | undefined)))
</script>

<template>
  <div class="app-select flex-grow-1" :class="$attrs.class">
    <VLabel v-if="label" :for="elementId" class="mb-1 text-body-2 text-high-emphasis" :text="$t(label)" />
    <VSelect v-bind="{
      ...$attrs,
      class: null,
      label: labelPlaceholder ? (Array.isArray(labelPlaceholder) ? $t(labelPlaceholder[0], labelPlaceholder.slice(1)) : $t(labelPlaceholder)) : undefined,
      variant: 'outlined',
      id: elementId,
      menuProps: { contentClass: ['app-inner-list', 'app-select__content', 'v-select__content', $attrs.multiple !== undefined ? 'v-list-select-multiple' : ''] },
    }">
      <template v-for="(_, name) in $slots" #[name]="slotProps">
        <slot :name="name" v-bind="slotProps || {}" />
      </template>
    </VSelect>
    <VTooltip v-if="tooltipContent" activator="parent" open-delay="1000" scroll-strategy="close">
      <span v-html="tooltipContent" />
    </VTooltip>
  </div>
</template>

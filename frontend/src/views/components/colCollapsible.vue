<script setup lang="ts">
import { breakpointsVuetifyV3 } from '@vueuse/core';

interface Props {
  colRatio?: number[]
}

const props = withDefaults(defineProps<Props>(), {
  colRatio: [50, 50]
})

interface Emit {
  (e: 'update:container', pos: number): void
}
const emit = defineEmits<Emit>()

const leftCollapsible = ref(false)
const rightCollapsible = ref(false)

const isLessThanCardBreakmd = computed(() => useMediaQuery(`(max-width: ${breakpointsVuetifyV3.md}px)`).value)
const isLessThanCardBreaklg = computed(() => useMediaQuery(`(max-width: ${breakpointsVuetifyV3.lg}px)`).value)
const isLessThanCardBreakxl = computed(() => useMediaQuery(`(max-width: ${breakpointsVuetifyV3.xl}px)`).value)

const LeftColref = ref()
const RightColref = ref()

useResizeObserver(LeftColref, (entries) => {
  const entry = entries[0]
  const { width, height } = entry.contentRect
  nextTick(() => { if (LeftColref.value && !leftCollapsible.value) emit('update:container', 0) })
}, { box: 'device-pixel-content-box' })
useResizeObserver(RightColref, (entries) => {
  const entry = entries[0]
  const { width, height } = entry.contentRect
  nextTick(() => { if (RightColref.value && !rightCollapsible.value) emit('update:container', 1) })
}, { box: 'device-pixel-content-box' })

</script>

<template>
  <VRow>
    <VCol ref="LeftColref" cols="12" :style="{
      maxWidth: leftCollapsible ? `${isLessThanCardBreakmd ? 30 : (isLessThanCardBreaklg ? 25 : 20)}% !important` :
        (rightCollapsible ? (isLessThanCardBreakmd ? undefined : (`${isLessThanCardBreaklg ? 75 : 80}% !important`)) :
          (isLessThanCardBreakmd ? undefined : `${props.colRatio[0]}% !important`))
    }" :class="{ 'mr-auto': !isLessThanCardBreakmd }">
      <slot name="left" :collapsible="leftCollapsible" :collapsed="(val: boolean) => leftCollapsible = val" />
    </VCol>
    <VCol ref="RightColref" cols="12" :style="{
      maxWidth: rightCollapsible ? `${isLessThanCardBreakmd ? 30 : (isLessThanCardBreaklg ? 25 : 20)}% !important` :
        (leftCollapsible ? (isLessThanCardBreakmd ? undefined : (`${isLessThanCardBreaklg ? 75 : 80}% !important`)) :
          (isLessThanCardBreakmd ? undefined : `${props.colRatio[1]}% !important`))
    }" :class="{ 'ml-auto': !isLessThanCardBreakmd }">
      <slot name="right" :collapsible="rightCollapsible" :collapsed="(val: boolean) => rightCollapsible = val" />
    </VCol>
  </VRow>
</template>

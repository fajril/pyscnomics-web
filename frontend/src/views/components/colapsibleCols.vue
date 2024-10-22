<script setup lang="ts">
import { breakpointsVuetifyV3 } from '@vueuse/core'

interface Props {
  colRatio?: number[]
  leftHeader?: string
  rightHeader?: string
  fillHeight?: boolean
  leftLoading?: boolean
  rightLoading?: boolean
  allowRight?: boolean
}
interface Emit {
  (e: 'update:container', pos: number): void
}

const props = withDefaults(defineProps<Props>(), {
  colRatio: [50, 50],

  // leftHeader: 'left column',
  // rightHeader: 'right column',
  fillHeight: false,
  leftLoading: false,
  rightLoading: false,
  allowRight: true,
})

const emit = defineEmits<Emit>()
const leftCollapsed = ref(false)
const rightCollapsed = ref(false)

const onleftCollapsed = () => {
  leftCollapsed.value = !leftCollapsed.value
  if (leftCollapsed.value && rightCollapsed.value)
    rightCollapsed.value = false
}

const onrightCollapsed = () => {
  rightCollapsed.value = !rightCollapsed.value
  if (rightCollapsed.value && leftCollapsed.value)
    leftCollapsed.value = false
}

const isLessThanCardBreakmd = computed(() => useMediaQuery(`(max-width: ${breakpointsVuetifyV3.md}px)`).value)
const isLessThanCardBreaklg = computed(() => useMediaQuery(`(max-width: ${breakpointsVuetifyV3.lg}px)`).value)
const isLessThanCardBreakxl = computed(() => useMediaQuery(`(max-width: ${breakpointsVuetifyV3.xl}px)`).value)

const LeftColref = ref()
const RightColref = ref()

useResizeObserver(LeftColref, entries => {
  const entry = entries[0]
  const { width, height } = entry.contentRect

  nextTick(() => {
    if (LeftColref.value && !leftCollapsed.value)
      emit('update:container', 0)
  })
}, { box: 'device-pixel-content-box' })
useResizeObserver(RightColref, entries => {
  const entry = entries[0]
  const { width, height } = entry.contentRect

  nextTick(() => {
    if (RightColref.value && !rightCollapsed.value)
      emit('update:container', 1)
  })
}, { box: 'device-pixel-content-box' })
</script>

<template>
  <div class="collapsible-content">
    <div
      ref="LeftColref"
      class="left-content"
      :style="{
        maxWidth: allowRight ? (leftCollapsed ? `${isLessThanCardBreakmd ? undefined : (isLessThanCardBreaklg ? 180 : 220)}px !important`
          : (rightCollapsed ? (isLessThanCardBreakmd ? undefined : (`calc(100% - ${isLessThanCardBreaklg ? 180 : (isLessThanCardBreakmd ? 0 : 220)}px) !important`))
            : (isLessThanCardBreakmd ? undefined : `${props.colRatio[0]}% !important`))) : undefined,
      }"
      :class="{ 'mr-auto': !isLessThanCardBreakmd }"
    >
      <div class="header-content">
        <VProgressLinear
          v-show="props.leftLoading"
          indeterminate
          :height="1"
          rounded
          color="primary"
          style="position: absolute;"
          :style="{
            maxWidth: leftCollapsed ? `${isLessThanCardBreakmd ? undefined : (isLessThanCardBreaklg ? 200 : 240)}px !important`
              : (rightCollapsed ? (isLessThanCardBreakmd ? undefined : (`calc(100% - ${isLessThanCardBreaklg ? 200 : (isLessThanCardBreakmd ? 20 : 240)}px) !important`))
                : (isLessThanCardBreakmd ? undefined : `calc(${props.colRatio[0]}% - 20px) !important`)),
          }"
        />
        <div class="header-titte">
          <slot
            name="left-header"
            :is-collapsed="leftCollapsed"
          >
            {{ props.leftHeader }}
          </slot>
        </div>
        <div class="after-header-content">
          <VSpacer />
          <slot
            name="after-left-header"
            :is-collapsed="leftCollapsed"
          />
          <IconBtn
            size="small"
            @click="onleftCollapsed"
          >
            <VIcon
              size="18"
              :icon="isLessThanCardBreakmd ? 'tabler-chevron-up' : 'tabler-chevron-left'"
              :style="{ transform: leftCollapsed ? (isLessThanCardBreakmd ? 'rotate(-180deg)' : 'rotate(-90deg)') : undefined }"
              style="transition-duration: 0.28s;"
            />
          </IconBtn>
        </div>
      </div>
      <VExpandTransition>
        <div
          v-show="!leftCollapsed"
          class="v-col-content"
          :style="{ 'margin-inline-end': !isLessThanCardBreakmd && rightCollapsed ? `-${isLessThanCardBreaklg ? 180 : 220}px` : undefined }"
        >
          <slot name="left" />
        </div>
      </VExpandTransition>
    </div>
    <div
      v-if="props.allowRight"
      ref="RightColref"
      class="right-content"
      :style="{
        maxWidth: rightCollapsed ? `${isLessThanCardBreakmd ? undefined : (isLessThanCardBreaklg ? 180 : 220)}px !important`
          : (leftCollapsed ? (isLessThanCardBreakmd ? undefined : (`calc(100% - ${isLessThanCardBreaklg ? 180 : 220}px) !important`))
            : (isLessThanCardBreakmd ? undefined : `${props.colRatio[1]}% !important`)),
      }"
      :class="{ 'ml-auto': !isLessThanCardBreakmd }"
    >
      <div class="header-content">
        <VProgressLinear
          v-show="props.rightLoading"
          indeterminate
          :height="1"
          rounded
          color="primary"
          style="position: absolute;"
          :style="{
            maxWidth: rightCollapsed ? `${isLessThanCardBreakmd ? undefined : (isLessThanCardBreaklg ? 200 : 240)}px !important`
              : (leftCollapsed ? (isLessThanCardBreakmd ? undefined : (`calc(100% - ${isLessThanCardBreaklg ? 200 : 240}px) !important`))
                : (isLessThanCardBreakmd ? undefined : `calc(${props.colRatio[1]}% - 20px) !important`)),
          }"
        />
        <div class="header-titte">
          <slot
            name="right-header"
            :is-collapsed="rightCollapsed"
          >
            {{ props.rightHeader }}
          </slot>
        </div>
        <div class="after-header-content">
          <VSpacer />
          <slot
            name="after-right-header"
            :is-collapsed="rightCollapsed"
          />
          <IconBtn
            size="small"
            @click="onrightCollapsed"
          >
            <VIcon
              size="18"
              :icon="isLessThanCardBreakmd ? 'tabler-chevron-up' : 'tabler-chevron-left'"
              :style="{ transform: rightCollapsed ? (isLessThanCardBreakmd ? 'rotate(-180deg)' : 'rotate(-90deg)') : undefined }"
              style="transition-duration: 0.28s;"
            />
          </IconBtn>
        </div>
      </div>
      <VExpandTransition>
        <div
          v-show="!rightCollapsed"
          class="v-col-content"
          :style="{ 'margin-inline-start': !isLessThanCardBreakmd && leftCollapsed ? `-${isLessThanCardBreaklg ? 180 : 220}px` : undefined }"
        >
          <slot name="right" />
        </div>
      </VExpandTransition>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.collapsible-content {
  display: flex;
  column-gap: .3125rem;
  width: 100%;
  @media screen and (max-width: 960px) {
    flex-direction: column;
  }
  .left-content {
    display: flex;
    flex-direction: column;
    width: 100%;
    +.v-col-content {
      .v-card-text:first-child {
        padding-block-start: 0;
      }
    }
  }
  .right-content {
    display: flex;
    flex-direction: column;
    width: 100%;
    +.v-col-content {
      .v-card-text:first-child {
        padding-block-start: 0;
      }
    }
  }
  .header-content {
    display: flex;
    padding-inline: .625rem;
    padding-block: .125rem;
    align-items: center;
    column-gap: .25rem;
    border-top-left-radius: .1875rem;
    border-top-right-radius: .1875rem;
    background-color: rgba(var(--v-theme-on-surface), 0.05);
    .header-titte {
      inline-size: 100%;
      overflow-x: hidden;
    }
    .after-header-content {
      display: flex;
      gap: .3125rem;
      justify-content: end;
      align-items: center;
      padding-block: .1875rem;
      overflow-x: hidden;
    }
  }
}
</style>

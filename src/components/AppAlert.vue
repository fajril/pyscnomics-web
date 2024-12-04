<script setup lang="ts">
import { useConfigStore } from '@/@core/stores/config'
import { layoutConfig } from '@layouts'

interface Props {
  header?: string
  msg: string | object
  position?: any
  isAlert?: boolean
  timeout?: number
  color?: string
  variant?: "tonal" | "flat" | "text" | "elevated" | "outlined" | "plain"
}
interface Emit {
  (e: 'hideAlert'): void
}

const props = withDefaults(defineProps<Props>(), {
  header: layoutConfig.app.title,
  isAlert: false,
  position: 'top end',
})

const emit = defineEmits<Emit>()

const configStore = useConfigStore()

const isShowAlert = defineModel<boolean>({ required: true })

const extractMsg = (msg: object | string | []) => {
  const { t, locale } = useI18n({ useScope: 'global' })

  return isObject(msg)
    && msg.name && typeof msg.name === 'string'
    ? (t(msg.name, msg.arg ?? []))
    : msg
}
</script>

<template>
  <VSnackbar
    v-model="isShowAlert"
    transition="scale-transition"
    multi-line
    close-on-content-click
    variant="tonal"
    :color="props.isAlert ? 'rgba(var(--v-theme-error), 0.8)' : 'rgba(var(--v-theme-success), 0.8)'"
    :location="props.position ? props.position : 'top end'"
    :timeout="props.timeout ? props.timeout : (props.isAlert ? 5000 : 3000)"
    rounded="lg"
    :z-index="9999"
    :content-props="{ style: '-webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);' }"
    style="margin-block-start: 80px; margin-inline-end: 1.5rem;"
    @update:model-value="() => emit('hideAlert')"
  >
    <p class="text-sm font-weight-bold mb-1">
      {{ props.header ? props.header : layoutConfig.app.title }}
    </p>
    <p
      class="text-sm"
      :style="{ color: props.isAlert ? (configStore.theme === 'dark' ? 'rgba(255, 250, 250, 0.9)' : 'rgba(26, 25, 25, 0.9)') : (configStore.theme === 'dark' ? 'rgba(250, 255, 250, 0.9)' : 'rgba(25, 25, 25, 0.9)') }"
      v-html="extractMsg(props.msg)"
    />
  </VSnackbar>
</template>

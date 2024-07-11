<script setup lang="ts">
interface Props {
  header?: string
  msg: string | object
  position?: any
  isAlert?: boolean
  color?: string
  variant?: "tonal" | "flat" | "text" | "elevated" | "outlined" | "plain"
}
interface Emit {
  (e: 'hideAlert'): void
}
const isShowAlert = defineModel<boolean>({ required: true })

const props = withDefaults(defineProps<Props>(), {
  header: 'PySCnomicApp',
  isAlert: false,
  position: 'top end'
})
const emit = defineEmits<Emit>()


const extractMsg = (msg: object | string | []) => {
  const { t, locale } = useI18n({ useScope: 'global' })
  return isObject(msg) &&
    msg.hasOwnProperty('name') && typeof msg.name === 'string' ?
    (t(msg.name, msg['arg'] ?? [])) : msg
}
</script>

<template>
  <VSnackbar v-model="isShowAlert" transition="scale-transition" multi-line close-on-content-click
    :variant="props.variant ?? (props.isAlert ? 'elevated' : 'tonal')"
    :color="color ?? (props.isAlert ? 'error' : 'success')" :location="props.position ?? 'top end'"
    :timeout="props.isAlert ? 5000 : 3000" rounded="lg" style="margin-block-start: 80px; margin-inline-end: 1.5rem;"
    @update:modelValue="() => emit('hideAlert')">
    <p :class="`text-sm font-weight-bold mb-1`">
      {{ props.header ?? "PySCnomicApp" }}
    </p>
    <p class="text-sm">
      {{ extractMsg(msg) }}
    </p>
  </VSnackbar>
</template>

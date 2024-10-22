<script setup lang="ts">
import ManualHelp from '@/views/components/helpManualDialog.vue'

const isHelpSown = ref(false)

const showHelp = async () => {
  isHelpSown.value = true
}
</script>

<template>
  <IconBtn
    color="rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity))"
    @click="showHelp"
  >
    <VIcon
      icon="tabler-help-circle"
      size="26"
    />

    <VTooltip
      activator="parent"
      open-delay="500"
      scroll-strategy="close"
    >
      <span class="text-capitalize">{{ $t("User manual") }}</span>
    </VTooltip>
  </IconBtn>
  <ManualHelp
    v-if="isHelpSown"
    :is-dialog-visible="isHelpSown"
    @update:is-dialog-visible="(val) => isHelpSown = val"
  />
</template>

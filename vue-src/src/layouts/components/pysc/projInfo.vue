<script setup lang="ts">
import { useAppStore } from '@/stores/appStore';

const appStore = useAppStore()
const curProjectPath = computed(() => appStore.curProjectPath)
</script>

<template>
  <div class="me-2">
    <VIcon icon="tabler-file-info" size="26" />

    <VTooltip activator="parent" scroll-strategy="close">
      <span>{{ curProjectPath ?? "It's New File project" }}</span>
    </VTooltip>
  </div>
</template>

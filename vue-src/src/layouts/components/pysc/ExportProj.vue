<script setup lang="ts">
import jsonExport from "@/views/components/jsonExport.vue";

const jsonexportref = ref(null)
const selectedItem = ref(null)
const exportType = [
  { name: "Json File Format", icon: "tabler-json", value: "json" },
  { name: "XLSX File Format", icon: "tabler-file-spreadsheet", value: "xlsx" }
]

const ExportTo = (value) => {
  if (value == 'json')
    jsonexportref.value?.LoadJsonFormat()

}
</script>
<template>
  <IconBtn color="rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity))">
    <VIcon icon="tabler-file-export" size="26" />

    <VTooltip activator="parent" open-delay="500" scroll-strategy="close">
      <span class="text-capitalize">{{ $t('Export') }}</span>
    </VTooltip>
    <VMenu activator="parent" offset="14px">
      <VList>
        <VListItem v-for="{ name, icon, value } in exportType" :key="name" :value="value" :prepend-icon="icon"
          @click="() => ExportTo(value)" color="primary" class="text-capitalize">
          {{ name }}
        </VListItem>
      </VList>
    </VMenu>
  </IconBtn>
  <jsonExport ref="jsonexportref" />
</template>

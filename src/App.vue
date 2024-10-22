<script setup lang="ts">
import { useTheme } from 'vuetify'
import AppAlert from '@/components/AppAlert.vue'
import type { tAlert } from '@/stores/appStore'
import { useAppStore } from '@/stores/appStore'
import { useWSStore } from '@/stores/wsStore'
import ScrollToTop from '@core/components/ScrollToTop.vue'
import initCore from '@core/initCore'
import { initConfigStore, useConfigStore } from '@core/stores/config'
import { hexToRgb } from '@layouts/utils'

const { global } = useTheme()

// ℹ️ Sync current theme with initial loader theme
initCore()
initConfigStore()

const configStore = useConfigStore()
const appStore = useAppStore()
const wsStore = useWSStore()
const { alertFunc } = storeToRefs(appStore)
const isShowAlert = ref(false)

const alertProps = ref<tAlert>({
  header: undefined,
  text: '',
  isalert: false,
})

console.log(wsStore.clientID)

watch(alertFunc, val => {
  if (!isEmpty(val)) {
    if (isShowAlert.value)
      isShowAlert.value = false

    // update content
    alertProps.value.header = val?.header ?? 'PSCnomics'
    alertProps.value.text = val?.text ?? ''
    alertProps.value.isalert = val?.isalert ?? false

    isShowAlert.value = true
  }
}, { deep: true })
</script>

<template>
  <VLocaleProvider :rtl="configStore.isAppRTL">
    <!-- ℹ️ This is required to set the background color of active nav link based on currently active global theme's primary -->
    <VApp :style="`--v-global-theme-primary: ${hexToRgb(global.current.value.colors.primary)}`">
      <RouterView />
      <AppAlert
        v-model="isShowAlert"
        :msg="alertProps.text"
        :header="alertProps.header"
        :position="alertProps.position"
        :color="alertProps.color"
        :variant="alertProps.variant"
        :is-alert="alertProps.isalert"
        @hide-alert="() => nextTick(() => appStore.$patch({ alertFunc: null }))"
      />
      <ScrollToTop />
    </VApp>
  </VLocaleProvider>
</template>

<style lang="scss">
html {
 overflow-y: auto !important;
}

.htMenu.htContextMenu.handsontable {
  z-index: 9000 !important;
}

.v-card {
  .v-card-item {
    >div:has(.v-card-title) {
      border-block-end: 2px solid rgba(var(--v-border-color), var(--v-border-opacity)) !important;
    }
  }

  .v-card--variant-elevated {
    box-shadow: 0 1px 10px rgba(var(--v-shadow-key-umbra-color), 0.4), 0 0 transparent, 0 0 transparent !important;
  }
}
</style>

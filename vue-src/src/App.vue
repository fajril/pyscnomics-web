<script setup lang="ts">
import ScrollToTop from '@core/components/ScrollToTop.vue'
import initCore from '@core/initCore'
import { initConfigStore, useConfigStore } from '@core/stores/config'
import { hexToRgb } from '@layouts/utils'
import { useTheme } from 'vuetify'

import SettDialogs from '@/pages/components/settPysc.vue'
import { tAlert, useAppStore } from "@/stores/appStore"
import { usePyscConfStore } from '@/stores/genfisStore'

const { global } = useTheme()

// ℹ️ Sync current theme with initial loader theme
initCore()
initConfigStore()

const configStore = useConfigStore()
const appStore = useAppStore()
const PyscConf = usePyscConfStore()
const { settFunc, alertFunc } = storeToRefs(appStore)
const isShowAlert = ref(false)

const RefSettDialogs = ref()

const curVer = 2 //add multiple case, dashboard

if (+appStore.appver !== curVer) {
  const oldVer = +appStore.appver
  appStore.chgVer(oldVer, curVer)
  PyscConf.chgVer(oldVer, curVer)
}

const alertProps = ref<tAlert>({
  header: null,
  text: '',
  isalert: false
})

watch(alertFunc, val => {
  if (!isEmpty(val)) {
    if (isShowAlert.value) isShowAlert.value = false
    //update content
    alertProps.value.header = val?.header ?? 'PySCnomicsApp'
    alertProps.value.text = val?.text ?? ''
    alertProps.value.isalert = val?.isalert ?? false

    isShowAlert.value = true
  }
}, { deep: true })

const hideSnackbar = (val: boolean) => {
  if (!val) {
    appStore.$patch({
      alertFunc: null
    })
  }
}

settFunc.value = (tab: number) => RefSettDialogs.value?.ShowSetting(tab)

</script>

<template>
  <VLocaleProvider :rtl="configStore.isAppRTL">
    <!-- ℹ️ This is required to set the background color of active nav link based on currently active global theme's primary -->
    <VApp :style="`--v-global-theme-primary: ${hexToRgb(global.current.value.colors.primary)}`">
      <RouterView />
      <VSnackbar v-model="isShowAlert" transition="scale-transition" location="top end" multi-line
        close-on-content-click variant="tonal" :color="alertProps.isalert ? 'error' : 'success'"
        :timeout="alertProps.isalert ? 5000 : 3000" rounded="lg"
        style="margin-block-start: 80px; margin-inline-end: 1.5rem;" @update:modelValue="hideSnackbar">
        <p :class="`text-sm font-weight-bold mb-1`">
          {{ alertProps.header ?? "PySCnomicApp" }}
        </p>
        <p class="text-sm">
          {{ alertProps.text }}
        </p>
      </VSnackbar>
      <ScrollToTop />
      <SettDialogs ref="RefSettDialogs" />
    </VApp>
  </VLocaleProvider>
</template>

<style lang="scss">
.htMenu.htContextMenu.handsontable {
  z-index: 9000 !important;
}
</style>

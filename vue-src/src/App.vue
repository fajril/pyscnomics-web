<script setup lang="ts">
import ScrollToTop from '@core/components/ScrollToTop.vue'
import initCore from '@core/initCore'
import { initConfigStore, useConfigStore } from '@core/stores/config'
import { hexToRgb } from '@layouts/utils'
import { useTheme } from 'vuetify'

import SettDialogs from '@/pages/components/settPysc.vue'
import { tAlert, useAppStore } from "@/stores/appStore"
import { usePyscConfStore } from '@/stores/genfisStore'
import { useWSStore } from '@/stores/wsStore'
import * as Pysc from '@/utils/pysc/pyscType'
import { useDataStore } from '@/utils/pysc/useDataStore'

const { global } = useTheme()

// ℹ️ Sync current theme with initial loader theme
initCore()
initConfigStore()

const configStore = useConfigStore()
const appStore = useAppStore()
const PyscConf = usePyscConfStore()
const wsStore = useWSStore()
const { settFunc, alertFunc } = storeToRefs(appStore)
const isShowAlert = ref(false)
const dayjs = Pysc.useDayJs()

const RefSettDialogs = ref()

/*              2 add multiple case, dashboard
*               3 browser local storage (blc), hanya menyimpan per-case saja   
*                 load to server on demand
*/
const curVer = 3

appStore.mainCallbackCaseID = async (value, oldValue) => {
  if (value != oldValue && oldValue != -1) {
    const oldIndex = appStore.projects.findIndex(p => p.id === oldValue)
    if (oldIndex != -1 && appStore.projects[oldIndex].state === 1) {
      await useDataStore().saveCaseData(appStore.curWS, oldValue,
        PyscConf.generalConfig, PyscConf.producer, PyscConf.contracts, PyscConf.fiscal,
        PyscConf.tangible, PyscConf.intangible,
        PyscConf.opex, PyscConf.asr)
    }
  }
  await useDataStore().applyCase(appStore.curWS, [], true)
  appStore.watcherSelCase.resume()
}

const oldWS = appStore.curWS
if (+appStore.appver !== curVer || isEmpty(appStore.curWS)) {
  const oldVer = +appStore.appver
  const newWS = "D" + Math.random().toString(36).slice(2)

  //reset
  appStore.watcherSelCase.pause()
  PyscConf.watcherAllData.pause()
  if (oldVer <= 2) {
    useDataStore().resetDataStore(curVer, newWS, true, false)
  }

  const extractState = ref<string | boolean | null>(false)
  useDataStore().extractProject(appStore.curProjectPath, newWS, oldWS).then(result => {
    extractState.value = true
  }, err => {
    extractState.value = false
    //show alert for error
    const error = isObject(err) && err.hasOwnProperty('state') ? err.state : err
    const errorStatus = Array.isArray(error) && error.length === 2 ? error[0] : ''
    const errorMsg = Array.isArray(error) && error.length === 2 ? error[1] : (error.toLowerCase().indexOf("<html") === -1 ? error : "Unknown error")
    appStore.showAlert({
      text: `Error ${errorStatus}: ${errorMsg}`,
      isalert: true
    })
  }).finally(async () => {
    appStore.$patch({ curWS: newWS })
    appStore.watcherSelCase.resume()
    PyscConf.watcherAllData.resume()
  })
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
          {{ isObject(alertProps.text) ? ($t(alertProps.text['name'], alertProps.text['arg'] ?? [])) : alertProps.text }}
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

<script setup lang="ts">
import AppAlert from '@/components/AppAlert.vue'
import type { tAlert } from '@/stores/appStore'
import { useAppStore } from '@/stores/appStore'
import ScrollToTop from '@core/components/ScrollToTop.vue'
import initCore from '@core/initCore'
import { initConfigStore, useConfigStore } from '@core/stores/config'
import { hexToRgb } from '@layouts/utils'
import { useTheme } from 'vuetify'

import { useWSStore } from '@/stores/wsStore'
import SettDialogs from '@/pages/components/settPysc.vue'
import { usePyscConfStore } from '@/stores/genfisStore'
import { usePyscMonteStore } from '@/stores/monteStore'
import { usePyscOptimStore } from '@/stores/optimStore'
import { usePyscSensStore } from '@/stores/sensStore'
import * as Pysc from '@/utils/pysc/pyscType'
import { useDataStore } from '@/utils/pysc/useDataStore'
import DirDialogs from "@/views/components/fileDialogs/dirDialogs.vue"
import XlsxImport from '@/views/components/xlsxImport.vue'

const { global } = useTheme()

// ℹ️ Sync current theme with initial loader theme
initCore()
initConfigStore()

const configStore = useConfigStore()
const appStore = useAppStore()
const PyscConf = usePyscConfStore()
const wsStore = useWSStore()
const PyscSens = usePyscSensStore()
const PyscMonte = usePyscMonteStore()
const PyscOptim = usePyscOptimStore()
const { settFunc, alertFunc, xlsxImportFunc, fileDialogFunc } = storeToRefs(appStore)
const isShowAlert = ref(false)
const dayjs = Pysc.useDayJs()

const RefSettDialogs = ref()

/*              2 add multiple case, dashboard
*               3 browser local storage (blc), hanya menyimpan per-case saja
*                 load to server on demand
*               4 (+) field post_uu_22_year2001:bool/def.=True/ (PSC),
*                 (+) field cum_production_split_offset:list[len proj]|float/def.=0/ (GS)
*/
const curVer = 6 // increment every released

appStore.mainCallbackCaseID = async (value, oldValue) => {
  if (value != oldValue && oldValue != -1) {
    const oldIndex = appStore.projects.findIndex(p => p.id === oldValue)
    if (oldIndex != -1 && appStore.projects[oldIndex].state === 1) {
      await useDataStore().saveCaseData(appStore.curWS, oldValue,
        PyscConf.generalConfig, PyscConf.producer, PyscConf.contracts, PyscConf.fiscal,
        PyscConf.tangible, PyscConf.intangible,
        PyscConf.opex, PyscConf.asr,
        PyscSens.sensConfig,
        PyscMonte.monteConfig,
        PyscOptim.optimConfig)
    }
  }
  await useDataStore().applyCase(appStore.curWS, [], true)
  appStore.watcherSelCase.resume()
}

const oldWS = appStore.curWS
if (+appStore.appver !== curVer || isEmpty(appStore.curWS)) {
  console.log(`reset data ver. ${curVer}`)

  const oldVer = +appStore.appver
  const newWS = `D${Math.random().toString(36).slice(2)}`

  // reset
  appStore.watcherSelCase.pause()
  PyscConf.watcherAllData.pause()
  PyscMonte.watcherMonteCfg.pause()
  PyscOptim.watcherOptimCfg.pause()
  useDataStore().resetDataStore(curVer, newWS, true, false)

  useTimeoutFn(async () => {
    try {
      const extractState: any = await useDataStore().extractProject(appStore.curProjectPath, newWS, oldWS)
    }
    catch (error) {
      console.log(error)
    }
    appStore.$patch({ curWS: newWS })
    nextTick(() => {
      appStore.watcherSelCase.resume()
      PyscConf.watcherAllData.resume()
      PyscMonte.watcherMonteCfg.resume()
      PyscOptim.watcherOptimCfg.resume()
    })
  }, 1000)
}

const alertProps = ref<tAlert>({
  header: null,
  text: '',
  isalert: false,
})

watch(alertFunc, val => {
  if (!isEmpty(val)) {
    if (isShowAlert.value)
      isShowAlert.value = false

    // update content
    alertProps.value.header = val?.header ?? 'PySCnomicsApp'
    alertProps.value.text = val?.text ?? ''
    alertProps.value.isalert = val?.isalert ?? false

    isShowAlert.value = true
  }
}, { deep: true })

settFunc.value = (tab: number) => RefSettDialogs.value?.ShowSetting(tab)

const XlsxImportRef = ref()

xlsxImportFunc.value = (data: Pysc.TImportData) => XlsxImportRef.value?.makeImport(data)

const fileBrowserRef = ref()
const callbackDirs = ref((path: string) => {})

const callbackCloseDirs = () => {
  callbackDirs.value = (path: string) => {}
}

fileDialogFunc.value = (callback: (path: string) => void, mode: string, lookup: string | null) => {
  callbackDirs.value = callback
  fileBrowserRef.value?.loadMyDris(mode, lookup)
}
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
      <SettDialogs ref="RefSettDialogs" />
      <XlsxImport ref="XlsxImportRef" />
      <DirDialogs
        ref="fileBrowserRef"
        @update:path="(path) => callbackDirs(path)"
        @update:close-dialogs="callbackCloseDirs"
      />
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

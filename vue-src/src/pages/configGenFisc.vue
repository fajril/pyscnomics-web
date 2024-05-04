<script setup lang="ts">
import { useAppStore } from '@/stores/appStore';
import { usePyscConfStore } from '@/stores/genfisStore';
import * as Pysc from '@/utils/pysc/pyscType';
import FiscalConfig from '@/views/pages/config/fiscalconf.vue';
import GenConfig from '@/views/pages/config/genconf.vue';

definePage({
  name: 'pysc-conf',
  path: '/pysc-conf',
  meta: {
    title: "Configuration",
  },
})

const appStore = useAppStore()
const { projects } = storeToRefs(appStore)

const dayjs = Pysc.useDayJs()
const PyscConf = usePyscConfStore()
const { dataFisc, dataContr } = storeToRefs(PyscConf)
const dataGConf = computed(() => PyscConf.dataGConf)

const curSelCase = ref(appStore.curSelCase)
const lastTipe = ref(dataGConf.value.type_of_contract)

onMounted(() => {
  curSelCase.value = appStore.curSelCase
})
watch([dataGConf, dataFisc], val => {
  if (curSelCase.value !== appStore.curSelCase) {
    curSelCase.value = appStore.curSelCase
    return
  }
  appStore.dataChanges()

  if (lastTipe.value != val[0].type_of_contract) {
    projects.value[appStore.IndexCase].type = val[0].type_of_contract
    if (val[0].type_of_contract >= 3) {
      if ([3, 6].includes(val[0].type_of_contract)) {
        if (!(dataContr.value.second?.hasOwnProperty('oil_ftp')))
          dataContr.value.second = Object.assign({}, dataContr.value.cr)
      } else if ([4, 5].includes(val[0].type_of_contract)) {
        if (!(dataContr.value.second?.hasOwnProperty('field_status')))
          dataContr.value.second = Object.assign({}, dataContr.value.gs)
      }
    } else {
      if (dataContr.value.second?.hasOwnProperty('oil_ftp') && ![3, 4].includes(lastTipe.value))
        dataContr.value.cr = Object.assign({}, <costRec>dataContr.value.second)
      else if (dataContr.value.second?.hasOwnProperty('field_status') && ![5, 6].includes(lastTipe.value))
        dataContr.value.gs = Object.assign({}, <GS>dataContr.value.second)
      dataContr.value.second = null
    }
    lastTipe.value = val[0].type_of_contract
  }
}, { deep: true })

</script>

<template>
  <VRow no-gutters>
    <VCol cols="12">
      <VCard title="General and Fiscal" subtitle="Configuration">
        <VCardText>
          <VRow>
            <VCol cols="12" md="6">
              <AppCardActions action-collapsed title="General">
                <VCardText>
                  <GenConfig />
                </VCardText>
              </AppCardActions>
            </VCol>
            <VCol v-if="dataGConf.type_of_contract < 3" cols="12" md="6">
              <AppCardActions action-collapsed title="Fiscal">
                <template #before-actions>
                  <IconBtn>
                    <VIcon size="20" icon="tabler-settings" @click="appStore.showSetting(0)" />
                    <VTooltip activator="parent" location="top">Tax Setting</VTooltip>
                  </IconBtn>
                </template>
                <VCardText>
                  <FiscalConfig :contract-type="dataGConf.type_of_contract" :fiscal="dataFisc.Fiskal"
                    :isPSCContrat="[1, 3, 4].includes(dataGConf.type_of_contract)" />
                </VCardText>
              </AppCardActions>
            </VCol>
          </VRow>
          <VRow v-if="dataGConf.type_of_contract >= 3">
            <VCol cols="12" md="6">
              <AppCardActions action-collapsed title="Fiscal - 1st Contract">
                <template #before-actions>
                  <IconBtn>
                    <VIcon size="20" icon="tabler-settings" @click="appStore.showSetting(0)" />
                    <VTooltip activator="parent" location="top">Tax Setting</VTooltip>
                  </IconBtn>
                </template>
                <VCardText>
                  <FiscalConfig :contract-type="dataGConf.type_of_contract" :fiscal="dataFisc.Fiskal"
                    :isPSCContrat="[1, 3, 4].includes(dataGConf.type_of_contract)" />
                </VCardText>
              </AppCardActions>
            </VCol>
            <VCol cols="12" md="6">
              <AppCardActions action-collapsed title="Fiscal - 2nd Contract">
                <template #before-actions>
                  <IconBtn>
                    <VIcon size="20" icon="tabler-settings" @click="appStore.showSetting(0)" />
                    <VTooltip activator="parent" location="top">Tax Setting</VTooltip>
                  </IconBtn>
                </template>
                <VCardText>
                  <FiscalConfig :contract-type="dataGConf.type_of_contract" :fiscal="dataFisc.Fiskal2" second-contract
                    :isPSCContrat="[3, 6].includes(dataGConf.type_of_contract)" />
                </VCardText>
              </AppCardActions>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>

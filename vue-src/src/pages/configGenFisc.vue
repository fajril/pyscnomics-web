<script setup lang="ts">
import { useAppStore } from '@/stores/appStore';
import { usePyscConfStore } from '@/stores/genfisStore';
import { getCtrType } from '@/utils/pysc/pyscType';
import FiscalConfig from '@/views/pages/config/fiscalconf.vue';
import GenConfig from '@/views/pages/config/genconf.vue';
definePage({
  name: 'pysc-conf',
  path: '/pysc-conf',
  meta: {
    title: "GenFisTitle",
  },
})

const appStore = useAppStore()
const PyscConf = usePyscConfStore()
const { dataFisc } = storeToRefs(PyscConf)
const dataGConf = computed(() => PyscConf.dataGConf)

</script>

<template>
  <VRow no-gutters>
    <VCol cols="12">
      <VCard :title="$t('GenFisTitle')" :subtitle="$t('Configuration')">
        <VCardText>
          <VRow>
            <VCol cols="12" md="6">
              <AppCardActions action-collapsed :title="$t('General')">
                <VCardText>
                  <GenConfig />
                </VCardText>
              </AppCardActions>
            </VCol>
            <VCol v-if="dataGConf.type_of_contract < 3" cols="12" md="6">
              <AppCardActions action-collapsed :title="$t('Fiscal')">
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
              <AppCardActions action-collapsed
                :title="$t('Fiscal') + ' -' + getCtrType(dataGConf.type_of_contract, 0, {})">
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
              <AppCardActions action-collapsed
                :title="$t('Fiscal') + ' -' + getCtrType(dataGConf.type_of_contract, 1, {})">
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

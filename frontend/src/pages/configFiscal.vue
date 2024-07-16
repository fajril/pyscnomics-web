<script setup lang="ts">
import { useAppStore } from '@/stores/appStore'
import { usePyscConfStore } from '@/stores/genfisStore'
import { GS, getCtrType } from '@/utils/pysc/pyscType'
import FiscalConfig from '@/views/pages/config/fiscalconf.vue'

definePage({
  name: 'pysc-fis',
  path: '/pysc-fis',
  meta: {
    title: "FisTitle",
  },
})

const appStore = useAppStore()
const PyscConf = usePyscConfStore()
const { dataFisc, dataContr } = storeToRefs(PyscConf)
const dataGConf = computed(() => PyscConf.dataGConf)
</script>

<template>
  <VCard
    :title="$t('Fiscal')"
    :subtitle="$t('Configuration')"
  >
    <VCardText v-if="dataGConf.type_of_contract === 0">
      <VAlert
        density="compact"
        color="error"
        variant="tonal"
      >
        The <strong>"project"</strong> contract type does not require Fiscal
      </VAlert>
    </VCardText>

    <VCardText v-else>
      <VRow dense>
        <VCol
          cols="12"
          md="6"
        >
          <AppCardActions
            action-collapsed
            :title="`${$t('Fiscal')} -${getCtrType(dataGConf.type_of_contract, 0, {})}`"
          >
            <template #before-actions>
              <IconBtn>
                <VIcon
                  size="20"
                  icon="tabler-settings"
                  @click="appStore.showSetting(0)"
                />
                <VTooltip
                  activator="parent"
                  location="top"
                >
                  Tax Setting
                </VTooltip>
              </IconBtn>
            </template>
            <VCardText>
              <FiscalConfig
                :contract-type="dataGConf.type_of_contract"
                :fiscal="dataFisc.Fiskal"
                :is-p-s-c-contrat="[1, 3, 4].includes(dataGConf.type_of_contract)"
                :use-amortization="[2, 5, 6].includes(dataGConf.type_of_contract) ? dataContr.gs.amortization : undefined"
                :profitability_discounted="dataFisc.Fiskal.profitability_discounted"
                @update:amortization="(val) => dataContr.gs.amortization = val"
                @update:profitability_discounted="(val) => dataFisc.Fiskal.profitability_discounted = val"
              />
            </VCardText>
          </AppCardActions>
        </VCol>
        <VCol
          v-if="dataGConf.type_of_contract >= 3"
          cols="12"
          md="6"
        >
          <AppCardActions
            action-collapsed
            :title="`${$t('Fiscal')} -${getCtrType(dataGConf.type_of_contract, 1, {})}`"
          >
            <template #before-actions>
              <IconBtn>
                <VIcon
                  size="20"
                  icon="tabler-settings"
                  @click="appStore.showSetting(0)"
                />
                <VTooltip
                  activator="parent"
                  location="top"
                >
                  Tax Setting
                </VTooltip>
              </IconBtn>
            </template>
            <VCardText>
              <FiscalConfig
                :contract-type="dataGConf.type_of_contract"
                :fiscal="dataFisc.Fiskal2"
                second-contract
                :is-p-s-c-contrat="[3, 6].includes(dataGConf.type_of_contract)"
                :use-amortization="[4, 5].includes(dataGConf.type_of_contract) ? (<GS>dataContr.second).amortization : undefined"
                @update:amortization="(val) => { if ([4, 5].includes(dataGConf.type_of_contract)) (<GS>dataContr.second).amortization = val }"
              />
            </VCardText>
          </AppCardActions>
        </VCol>
      </VRow>
    </VCardText>
  </VCard>
</template>

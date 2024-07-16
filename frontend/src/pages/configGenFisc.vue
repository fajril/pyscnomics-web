<script setup lang="ts">
import { useAppStore } from '@/stores/appStore'
import { usePyscConfStore } from '@/stores/genfisStore'
import GenConfig from '@/views/pages/config/genconf.vue'

definePage({
  name: 'pysc-conf',
  path: '/pysc-conf',
  meta: {
    title: "GenTitle",
  },
})

const appStore = useAppStore()
const PyscConf = usePyscConfStore()
const { dataFisc, dataContr } = storeToRefs(PyscConf)
const dataGConf = computed(() => PyscConf.dataGConf)
</script>

<template>
  <VRow no-gutters>
    <VCol cols="12">
      <VCard
        :title="$t('GenTitle')"
        :subtitle="$t('Configuration')"
      >
        <VCardText>
          <VRow>
            <VCol
              cols="12"
              md="6"
            >
              <AppCardActions
                action-collapsed
                :title="$t('General')"
              >
                <VCardText>
                  <GenConfig />
                </VCardText>
              </AppCardActions>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>

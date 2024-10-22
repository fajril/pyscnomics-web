<script setup lang="ts">
import { useAppStore } from '@/stores/appStore'
import { usePyscConfStore } from '@/stores/genfisStore'
import GenConfig from '@/views/pages/config/genconf.vue'
import GenConfig2 from '@/views/pages/config/genconfig2.vue'

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
        <template #append>
          <IconBtn>
            <VIcon
              size="20"
              icon="tabler-settings"
              @click="appStore.showSetting(2)"
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
          <VRow>
            <VCol
              cols="12"
              md="6"
            >
              <VCard
                variant="flat"
                :style="{ border: 'none' }"
              >
                <VCardText>
                  <GenConfig />
                </VCardText>
              </VCard>
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VCard
                variant="flat"
                :style="{ border: 'none' }"
              >
                <VCardText>
                  <GenConfig2 />
                </VCardText>
              </VCard>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>

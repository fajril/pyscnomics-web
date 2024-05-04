<script setup lang="ts">
import { useAppStore } from '@/stores/appStore';
import { usePyscConfStore } from '@/stores/genfisStore';
import * as Pysc from '@/utils/pysc/pyscType';

const LayoutCR = defineAsyncComponent(() => import('@/views/pages/config/crconf.vue'))
const LayoutGS = defineAsyncComponent(() => import('@/views/pages/config/gsconf.vue'))

definePage({
  name: 'pysc-crgs',
  path: '/pysc-crgs',
  meta: {
    title: "CR/GS",
  },
})

const appStore = useAppStore()

const PyscConf = usePyscConfStore()
const { dataContr } = storeToRefs(PyscConf)
const dayjs = Pysc.useDayJs()

const dataGConf = computed(() => PyscConf.dataGConf)
const titleCard = computed(() => Object.values(Pysc.ContractType)[dataGConf.value.type_of_contract])

const curSelCase = ref(appStore.curSelCase)
onMounted(() => {
  curSelCase.value = appStore.curSelCase
})

watch(dataContr, val => {
  if (curSelCase.value !== appStore.curSelCase) {
    curSelCase.value = appStore.curSelCase
    return
  }
  appStore.dataChanges()
}, { deep: true })

</script>

<template>
  <VCard :title="titleCard" subtitle="CR/GS Configuration">
    <VCardText v-if="dataGConf.type_of_contract === 0">
      <VAlert density="compact" color="error" variant="tonal">
        The <strong>"project"</strong> contract type does not require CR/GS
      </VAlert>
    </VCardText>
    <VCardText v-else>
      <VRow>
        <VCol cols="12" md="6">
          <AppCardActions action-collapsed
            :title="[1, 3, 4].includes(dataGConf.type_of_contract) ? `Cost Recovery${dataGConf.type_of_contract >= 3 ? ' - 1st Contract' : ''}` : `Gross Split${dataGConf.type_of_contract >= 3 ? ' - 1st Contract' : ''}`">
            <template #before-actions>
              <IconBtn v-if="[2, 5, 6].includes(dataGConf.type_of_contract)">
                <VIcon size="20" icon="tabler-settings" @click="appStore.showSetting(1)" />
                <VTooltip activator="parent" location="top">GS Setting</VTooltip>
              </IconBtn>
            </template>
            <VCardText>
              <Component :is="[1, 3, 4].includes(dataGConf.type_of_contract) ? LayoutCR : LayoutGS" :sub-project="0" />
            </VCardText>
          </AppCardActions>
        </VCol>
        <VCol v-if="dataGConf.type_of_contract >= 3" cols="12" md="6">
          <AppCardActions action-collapsed
            :title="[3, 6].includes(dataGConf.type_of_contract) ? `Cost Recovery${dataGConf.type_of_contract >= 3 ? ' - 2nd Contract' : ''}` : `Gross Split${dataGConf.type_of_contract >= 3 ? ' - 2nd Contract' : ''}`">
            <template #before-actions>
              <IconBtn v-if="[4, 5].includes(dataGConf.type_of_contract)">
                <VIcon size="20" icon="tabler-settings" @click="appStore.showSetting(1)" />
                <VTooltip activator="parent" location="top">GS Setting</VTooltip>
              </IconBtn>
            </template>
            <VCardText>
              <Component :is="[3, 6].includes(dataGConf.type_of_contract) ? LayoutCR : LayoutGS" :sub-project="1" />
            </VCardText>
          </AppCardActions>
        </VCol>
      </VRow>
    </VCardText>
  </VCard>
</template>

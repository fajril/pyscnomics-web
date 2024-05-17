<script setup lang="ts">
import { useAppStore } from '@/stores/appStore';
import { usePyscConfStore } from '@/stores/genfisStore';
import {
  IndexOfField,
  ProducerType,
  defProdPriceBase,
  useDayJs
} from '@/utils/pysc/pyscType';
import { useDataStore } from '@/utils/pysc/useDataStore';
import ProdChart from '@/views/pages/config/prodChart.vue';
import ProdPrice from '@/views/pages/config/prodPrice.vue';

// 👉 Colors variables
definePage({
  name: 'pysc-prod',
  path: '/pysc-prod',
  meta: {
    title: "Producer",
  },
})

const appStore = useAppStore()
const dayjs = useDayJs()
const PyscConf = usePyscConfStore()
const { dataProd } = storeToRefs(PyscConf)
const dataGConf = computed(() => PyscConf.dataGConf)

const selProdIndex = ref(0)
const selProd = ref(0)

watch(selProd, val => {
  if (val === undefined)
    selProd.value = dataProd.value[0].Tipe
  selProdIndex.value = 0
})

const producerItemChanged = index => {
  const idx = dataProd.value.findIndex(e => e.Tipe === index)
  if (idx === -1) {
    //add
    dataProd.value.push({
      Tipe: index,
      onstream_date: dayjs.utc(dataGConf.start_date_project).add(13, 'year').valueOf(),
      ProdNumber: 1,
      GSANumber: index === 1 ? 1 : 0,
      prod_price: [defProdPriceBase(index)]
    })
    dataProd.value.sort((n1, n2) => n1.Tipe - n2.Tipe)
    selProd.value = index
  } else if (dataProd.value.length > 1) {
    //remove
    dataProd.value.splice(idx, 1)
    dataProd.value.sort((n1, n2) => n1.Tipe - n2.Tipe)
    if (selProd.value === index) selProd.value = dataProd.value[0].Tipe
  }
}

const updateProdNumber = (item, index: number, v: number) => {
  if (selProdIndex.value >= +v) selProdIndex.value = 0
  const cProd = +v
  if (cProd && cProd <= 5 && cProd >= 1) {
    if (item.prod_price.length > cProd)
      item.prod_price = item.prod_price.slice(0, cProd)
    else if (item.prod_price.length < cProd) {
      for (let i = item.prod_price.length; i < cProd; i++) {
        const obj0 = Object.assign({}, item.prod_price[item.prod_price.length - 1][0])
        Object.keys(obj0).forEach(k => {
          if (isObject(obj0[k]))
            Object.keys(obj0[k]).forEach(ik => obj0[k][ik] = null)
          else obj0[k] = null
        })
        item.prod_price.push([obj0])
      }
    }
  }
}
const updateGSANumber = (item, index: number, v: number) => {
  if (+v && +v >= 1 && +v <= 5) {
    item.prod_price = item.prod_price.map(iprod => {
      return iprod.map(val => {
        let n_gsa = {}
        for (let i = 0; i < +v; i++)
          n_gsa = {
            ...n_gsa, [`vol${i + 1}`]: val.gsa[`vol${i + 1}`] ?? null,
            [`ghv${i + 1}`]: val.gsa[`ghv${i + 1}`] ?? null, [`price${i + 1}`]: val.gsa[`price${i + 1}`] ?? null
          }
        return { ...val, gsa: n_gsa }
      })
    })
  }
}

const { stopCaseID, CallableFunc } = useDataStore().useWatchCaseID(() => {
  console.log("producer trigger")
  selProd.value = dataProd.value[0].Tipe
})
onMounted(() => CallableFunc())
onUnmounted(() => stopCaseID())

const currentTab = ref(0)

</script>

<template>
  <VCard :title="$t('Producer')" :subtitle="$t('Configuration')">
    <VCardText>
      <VRow>
        <VCol cols="12" md="4">
          <AppCardActions action-collapsed :title="$t('Produced')">
            <template #before-actions>
              <IconBtn density="compact" color="disabled">
                <VIcon size="26" icon="tabler-plus" />
                <VMenu activator="parent">
                  <VList>
                    <template v-for="(item, index) in Object.values(ProducerType)" :key="item">
                      <VListItem :active="dataProd.findIndex(e => e.Tipe === index) != -1"
                        @click="() => producerItemChanged(index)">
                        <template #prepend>
                          <VIcon v-if="dataProd.findIndex(e => e.Tipe === index) != -1" icon="tabler-check" />
                        </template>
                        <VListItemTitle>
                          {{ item }}
                        </VListItemTitle>
                      </VListItem>
                    </template>
                  </VList>
                </VMenu>
              </IconBtn>
            </template>
            <VCardText class="px-1">
              <VExpansionPanels variant="default" class="expansion-panels-width-border" v-model="selProd">
                <VExpansionPanel v-for="(item, index) in dataProd" :key="`prod_${item.Tipe}`" :value="item.Tipe"
                  selected-class="v-list-item--active">
                  <v-expansion-panel-title collapse-icon="tabler-chevron-left" expand-icon="tabler-chevron-down">
                    <template v-slot:default="{ expanded }">
                      <span :class="{ 'text-primary': expanded }">{{ Object.values(ProducerType)[item.Tipe] }}</span>
                    </template>
                  </v-expansion-panel-title>
                  <VExpansionPanelText>
                    <AppTextField label-placeholder="Number of Production" class="mt-4" v-model.number="item.ProdNumber"
                      @update:model-value="(v) => updateProdNumber(item, index, v)"
                      :rules="[requiredValidator, betweenValidator(item.ProdNumber, 1, 5)]" />
                    <AppTextField v-if="item.Tipe === IndexOfField(ProducerType, ProducerType.Gas)" class="mt-4"
                      v-model.number="item.GSANumber" label-placeholder="Number of GSA"
                      @update:model-value="(v) => updateGSANumber(item, index, v)"
                      :rules="[requiredValidator, betweenValidator(item.GSANumber, 1, 5)]" />
                    <AppDateTimePicker :model-value="item.onstream_date" label-placeholder="Onstream Date"
                      @update:model-value="str => item.onstream_date = dayjs(str).utc().valueOf()" class="mt-4" />
                  </VExpansionPanelText>
                </VExpansionPanel>
              </VExpansionPanels>
            </VCardText>
          </AppCardActions>
        </VCol>
        <VCol cols="12" md="8">
          <AppCardActions action-collapsed
            :title="`${Object.values(ProducerType)[selProd]} ${$t('Production')} & ${$t('Price')}`">
            <VCardText>
              <VTabs v-model="currentTab">
                <VTab>{{ $t('Table Entry') }}</VTab>
                <VTab>{{ $t('Chart') }}</VTab>
              </VTabs>

              <VCardText class="px-1">
                <VWindow v-model="currentTab">
                  <VWindowItem value="0">
                    <ProdPrice :prod-type="selProd" v-model:selProdIndex="selProdIndex" />
                  </VWindowItem>
                  <VWindowItem value="1">
                    <ProdChart v-if="currentTab == 1" :prod-type="selProd" v-model:selProdIndex="selProdIndex" />
                  </VWindowItem>
                </VWindow>
              </VCardText>

            </VCardText>
          </AppCardActions>
        </VCol>
      </VRow>
    </VCardText>
  </VCard>
</template>

<style lang="scss">
@use "@core/scss/template/libs/apex-chart.scss";

.date-picker-wrapper {
  inline-size: 10.5rem;
}

#apex-chart-wrapper {
  .v-card-item__append {
    padding-inline-start: 0;
  }
}
</style>

<script setup lang="ts">
import { useAppStore } from '@/stores/appStore'
import { useHTTP } from '@/utils/pysc/useHttp'
import { min } from 'mathjs'
import DotdotOpt from './components/dotdotOpt.vue'
import { usePyscConfStore } from '@/stores/genfisStore'
import { useLTP_RPDStore } from '@/stores/ltp_rdp'
import type { producerConfig } from '@/utils/pysc/pyscType'
import {
  IndexOfField,
  ProducerType,
  defProdPriceBase,
  is_number,
  useDayJs,
} from '@/utils/pysc/pyscType'
import { useDataStore } from '@/utils/pysc/useDataStore'
import LTPRPD from '@/views/pages/config/ltprdpConf.vue'
import ProdChart from '@/views/pages/config/prodChart.vue'
import ProdPrice from '@/views/pages/config/prodPrice.vue'

// 👉 Colors variables
definePage({
  name: 'pysc-prod',
  path: '/pysc-prod',
  meta: {
    title: "Lifting",
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
    // add
    dataProd.value.push({
      Tipe: index,
      onstream_date: dayjs.utc(dataGConf.start_date_project).add(13, 'year').valueOf(),
      ProdNumber: 1,
      GSANumber: index === 1 ? 1 : 0,
      prod_price: [defProdPriceBase(index)],
    })
    dataProd.value.sort((n1, n2) => n1.Tipe - n2.Tipe)
    selProd.value = index
  }
  else if (dataProd.value.length > 1) {
    // remove
    dataProd.value.splice(idx, 1)
    dataProd.value.sort((n1, n2) => n1.Tipe - n2.Tipe)
    if (selProd.value === index)
      selProd.value = dataProd.value[0].Tipe
  }
}

const updateProdNumber = (item, index: number, v: number) => {
  if (selProdIndex.value >= +v)
    selProdIndex.value = 0
  const cProd = +v
  if (cProd && cProd <= 5 && cProd >= 1) {
    if (item.prod_price.length > cProd) { item.prod_price = item.prod_price.slice(0, cProd) }
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
        for (let i = 0; i < +v; i++) {
          n_gsa = {
            ...n_gsa,
            [`vol${i + 1}`]: val.gsa[`vol${i + 1}`] ?? null,
            [`ghv${i + 1}`]: val.gsa[`ghv${i + 1}`] ?? null,
            [`price${i + 1}`]: val.gsa[`price${i + 1}`] ?? null,
          }
        }

        return { ...val, gsa: n_gsa }
      })
    })
  }
}

const calcYear = (item: producerConfig) => {
  const ArrY = item.prod_price.reduce((year, prod, i) => {
    return [...year, ...prod.map(row => row.year).filter(y => is_number(y))]
  }, [])

  if (ArrY.length)
    item.onstream_date = dayjs(item.onstream_date).set('year', min(ArrY)).valueOf()
  else
    appStore.showAlert({ text: 'data is empty', isalert: true })
}

const { stopCaseID, CallableFunc } = useDataStore().useWatchCaseID(() => {
  console.log("producer trigger")
  selProd.value = dataProd.value[0].Tipe
})

const LTPRPDRef = ref()
const LTPRPDStore = useLTP_RPDStore()

const ApplyLTPRPD = async (mode: 'LTP' | 'RPD') => {
  try {
    LTPRPDStore.LTPConfig.fluid_type = Object.values(ProducerType)[selProd.value]

    const { status, result } = await useHTTP().put({
      path: mode === 'LTP' ? 'calc_ltp' : 'calc_rpd',
      body: mode === 'LTP' ? LTPRPDStore.LTPConfig : LTPRPDStore.RPDConfig,
      onError: (error: any) => { throw error },
    })

    if (status !== 200)
      throw { status, result }

    const idx = dataProd.value.findIndex(e => e.Tipe === selProd.value)
    if (idx !== -1) {
      const _res = mode === 'LTP' ? result.ltp : result.rpd
      if (_res) {
        const _key = Object.keys(_res)
        const _value = Object.values(_res)

        PyscConf.$patch(state => {
          state.producer[idx].prod_price[selProdIndex.value].splice(0, state.producer[idx].prod_price[selProdIndex.value].length,
            ..._key.map((y, i) => {
              const tmpl = defProdPriceBase(idx, selProd.value === 1 ? state.producer[idx].GSANumber : 1)[0]

              tmpl.year = +y
              if (selProd.value === 1)
                tmpl.production = _value[i]
              else
                tmpl.sales = _value[i]

              return tmpl
            }))
        })
      }
    }
  }
  catch (err) {
    appStore.showAlert({
      text: `Error ${(err?.status) ?? ''}: ${(err?.result) ?? 'unknown'}`,
      isalert: true,
    })
  }
  if (mode === 'LTP') {

  }
}

const showLtpRdp = (mode: 'LTP' | 'RPD') => {
  LTPRPDRef.value?.ShowLTPRPD(mode, selProd.value === 1 ? 'Gas' : 'Oil')
}

const currentTab = ref(0)
const prodChartRef = ref()
const prodTblRef = ref()

const getDataSourceUrl = (type: string) => {
  if (type === 'image') {
  }
  else {
    const tblDataScr = prodTblRef.value?.getTblProd()
    if (tblDataScr && tblDataScr.length) {
      if (type === 'text') {
        return tblDataScr.reduce((rowTxt, rowVal) => {
          return `${rowTxt + rowVal.join('\t')}\n`
        }, '')
      }
      else if (type === 'table') {
        return {
          data: [{
            name: `lifting ${Object.values(ProducerType)[selProd.value]}`,
            header: [],
            data: tblDataScr,
          }],
          filename: `lifting_${Object.values(ProducerType)[selProd.value]}_${appStore.selectedCase.name}`.replace(/[/\\ #$~&.]/g, ''),
        }
      }
    }

    return null
  }
}

const optOption = computed(() => {
  return (source: string) => [
    { title: 'Copy to clipboard', value: 'copy2clbrd', icon: 'tabler-clipboard', sourceType: source === 'table' ? 'text' : source },
    { title: `Save to file (*.${source === 'table' ? 'xlsx' : 'png'})`, value: 'save2File', icon: 'tabler-download', sourceType: source },
    { type: 'divider' },
    {
      title: 'RPD Calculator',
      icon: 'tabler-calculator',
      disabled: currentTab.value === 1,
      value: 'RPD',
    },
    { type: 'divider' },
    { title: 'Reload', value: 'reload', icon: 'tabler-reload' },
  ]
})

const getDataSource = (refName: any, setName: any, sourceType: string) => {
  const rndid = Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)
  if (sourceType === 'text' || sourceType === 'table') {
    const tblDataScr = prodTblRef.value?.getTblProd()

    if (sourceType === 'text') {
      return tblDataScr.reduce((rowTxt, rowVal) => {
        return `${rowTxt + rowVal.join('\t')}\n`
      }, '')
    }
    else if (sourceType === 'table') {
      return {
        data: [{
          name: `lifting ${Object.values(ProducerType)[selProd.value]}`,
          header: [],
          data: tblDataScr,
        }],
        filename: `lifting_${Object.values(ProducerType)[selProd.value]}_${appStore.selectedCase.name}_${rndid}`.replace(/[/\\ #$~&.]/g, ''),
      }
    }
  }
  else {
    return {
      url: prodChartRef.value?.chartProd.getDataURL({
        type: 'png',
      }),
      filename: `lifting_${Object.values(ProducerType)[selProd.value]}_${appStore.selectedCase.name}_${rndid}`.replace(/[/\\ #$~&.]/g, ''),
    }
  }
}

const actionOption = (type: string) => {
  if (type === 'LTP' || type === 'RPD')
    showLtpRdp(type)
  else if (type === 'reload')
    CallableFunc()
}

onMounted(() => CallableFunc())
onUnmounted(() => stopCaseID())
</script>

<template>
  <VCard
    :title="$t('Lifting')"
    :subtitle="$t('Configuration')"
  >
    <VCardText>
      <VRow>
        <VCol
          cols="12"
          md="4"
        >
          <AppCardActions
            action-collapsed
            :title="$t('Produced')"
          >
            <template #before-actions>
              <IconBtn
                density="compact"
                color="disabled"
              >
                <VIcon
                  size="26"
                  icon="tabler-plus"
                />
                <VMenu activator="parent">
                  <VList>
                    <template
                      v-for="(item, index) in Object.values(ProducerType)"
                      :key="item"
                    >
                      <VListItem
                        :active="dataProd.findIndex(e => e.Tipe === index) != -1"
                        @click="() => producerItemChanged(index)"
                      >
                        <template #prepend>
                          <VIcon :icon="dataProd.findIndex(e => e.Tipe === index) != -1 ? 'tabler-check' : ''" />
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
              <VExpansionPanels
                v-model="selProd"
                variant="default"
                class="expansion-panels-width-border"
              >
                <VExpansionPanel
                  v-for="(item, index) in dataProd"
                  :key="`prod_${item.Tipe}`"
                  :value="item.Tipe"
                  selected-class="v-list-item--active"
                >
                  <VExpansionPanelTitle
                    collapse-icon="tabler-chevron-left"
                    expand-icon="tabler-chevron-down"
                  >
                    <template #default="{ expanded }">
                      <span :class="{ 'text-primary': expanded }">{{ Object.values(ProducerType)[item.Tipe] }}</span>
                    </template>
                  </VExpansionPanelTitle>
                  <VExpansionPanelText>
                    <AppTextField
                      v-model.number="item.ProdNumber"
                      label-placeholder="Number of Production"
                      class="mt-4"
                      :rules="[requiredValidator, betweenValidator(item.ProdNumber, 1, 5, appStore.showAlert)]"
                      @update:model-value="(v) => updateProdNumber(item, index, v)"
                    />
                    <AppTextField
                      v-if="item.Tipe === IndexOfField(ProducerType, ProducerType.Gas)"
                      v-model.number="item.GSANumber"
                      class="mt-4"
                      label-placeholder="Number of GSA"
                      :rules="[requiredValidator, betweenValidator(item.GSANumber, 1, 5, appStore.showAlert)]"
                      @update:model-value="(v) => updateGSANumber(item, index, v)"
                    />
                    <AppDateTimePicker
                      :model-value="item.onstream_date"
                      label-placeholder="Onstream Date"
                      class="mt-4"
                      append-icon="tabler-calendar-check"
                      @update:model-value="str => item.onstream_date = dayjs(str).utc().valueOf()"
                      @click:append="() => calcYear(item)"
                    />
                  </VExpansionPanelText>
                </VExpansionPanel>
              </VExpansionPanels>
            </VCardText>
          </AppCardActions>
        </VCol>
        <VCol
          cols="12"
          md="8"
        >
          <AppCardActions
            action-collapsed
            :title="`${Object.values(ProducerType)[selProd]} ${$t('Production')} & ${$t('Price')}`"
          >
            <template #before-actions="{ isContentCollapsed }">
              <DotdotOpt
                v-if="!isContentCollapsed"
                :menu-list="optOption(currentTab === 0 ? 'table' : 'image')"
                title="Options"
                item-props
                dot-only
                :get-source="getDataSource"
                @click:item="actionOption"
              />
            </template>
            <VCardText>
              <VTabs v-model="currentTab">
                <VTab>{{ $t('Table Entry') }}</VTab>
                <VTab>{{ $t('Chart') }}</VTab>
              </VTabs>

              <VCardText class="px-1">
                <VWindow v-model="currentTab">
                  <VWindowItem value="0">
                    <ProdPrice
                      ref="prodTblRef"
                      v-model:selProdIndex="selProdIndex"
                      :prod-type="selProd"
                    />
                  </VWindowItem>
                  <VWindowItem value="1">
                    <ProdChart
                      v-if="currentTab === 1"
                      ref="prodChartRef"
                      v-model:selProdIndex="selProdIndex"
                      :prod-type="selProd"
                    />
                  </VWindowItem>
                </VWindow>
              </VCardText>
            </VCardText>
          </AppCardActions>
        </VCol>
      </VRow>
    </VCardText>
    <LTPRPD
      ref="LTPRPDRef"
      @apply="ApplyLTPRPD"
    />
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

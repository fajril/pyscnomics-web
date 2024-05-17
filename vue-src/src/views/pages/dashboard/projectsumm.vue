<script setup lang="ts">
import { useAppStore } from "@/stores/appStore";
import { usePyscConfStore } from '@/stores/genfisStore';
import * as Pysc from "@/utils/pysc/pyscType";

interface Props {
  isLoading: boolean
  data: Object | null
}
const props = defineProps<Props>()

const { locale } = useI18n({ useScope: 'global' })
const appStore = useAppStore()
const PyscConf = usePyscConfStore()
const numbro = Pysc.useNumbro()

const curSelCaseName = computed(() => {
  if (appStore.projects.length !== -1) {
    const idx = appStore.projects.findIndex(v => v.id === appStore.curSelCase)
    return idx !== -1 ? appStore.projects[idx].name : null
  }

  return null
})

const opened = ref([1, 2, 3, 4, 5, 6, 7])

const makePrettyNum = (val: number | undefined | null, isPercent: boolean = false) => {
  const decDot = Intl.NumberFormat().formatToParts(1.1).find(e => e.type === 'decimal').value
  if (typeof val === 'number') {
    const valArr = numbro(val * (isPercent ? 100 : 1)).format().split(decDot)
    const valDec = valArr.length > 1 ? (val < 0 ? `.<small>${valArr[1].split(")")[0]}</small>)` : `.<small>${valArr[1]}</small>`) : ("")
    return valArr[0] + valDec
  }
  return "-"
}

onMounted(() => {
  opened.value = [1, 2, 3, 4, 5, 6, 7]
})
</script>


<template>
  <VCard :Loading="$props.isLoading" title="Executive Summary"
    :subtitle="$t('Summary of ', [$t(curSelCaseName ?? 'case')])">
    <VList v-model:opened="opened" density="compact">
      <div v-for="(item, index) in $props.data">
        <VListGroup v-if="item.grp" :value="item.grp" border>
          <template #activator="{ props }">
            <VListItem v-bind="props" class="v-list-item--active">
              <VListItemTitle class="d-flex"><span class="text-end me-2" :style="{ width: '24px' }">{{ index + 1
                  }}.</span>{{ item.param }}
              </VListItemTitle>
              <template v-if="item.unit" #append>
                <div class="d-flex justify-end">
                  <span class="text-end me-3" v-html="makePrettyNum(item.ctrl, item.unit === '%')" />
                  <span class="text-start" :style="{ width: '110px' }">{{ item.unit }}</span>
                  <VTooltip activator="parent" location="top">
                    {{ item.param + ' ' + item.unit + ' :' }}<br>
                    {{ typeof item.ctrl === 'number' ? (item.ctrl * (item.unit === '%' ? 100 : 1)) : '-' }}
                  </VTooltip>
                </div>
              </template>
            </VListItem>
          </template>
          <VListItem v-for="child in item.child" border>
            <VListItemTitle :style="{ 'margin-left': '18px' }">{{ child.param }}</VListItemTitle>
            <template #append>
              <div class="d-flex justify-end">
                <span class="text-end me-3" v-html="makePrettyNum(child.ctrl, child.unit === '%')" />
                <span class="text-start" :style="{ width: '110px' }">{{ child.unit }}</span>
                <VTooltip activator="parent" location="top">
                  {{ child.param + ' ' + child.unit + ' :' }}<br>
                  {{ typeof child.ctrl === 'number' ? (child.ctrl * (child.unit === '%' ? 100 : 1)) : '-' }}
                </VTooltip>
              </div>
            </template>
          </VListItem>
        </VListGroup>
        <VListItem v-else border>
          <VListItemTitle class="d-flex"><span class="text-end me-2" :style="{ width: '24px' }">{{ index + 1
              }}.</span>{{ item.param }}
          </VListItemTitle>
          <template #append>
            <div class="d-flex justify-end">
              <span class="text-end me-3" v-html="makePrettyNum(item.ctrl, item.unit === '%')" />
              <span class="text-start" :style="{ width: '110px' }">{{ item.unit }}</span>
              <VTooltip activator="parent" location="top">
                {{ item.param + ' ' + item.unit + ' :' }}<br>
                {{ typeof item.ctrl === 'number' ? (item.ctrl * (item.unit === '%' ? 100 : 1)) : '-' }}
              </VTooltip>
            </div>
          </template>
        </VListItem>
      </div>
    </VList>
  </VCard>
</template>

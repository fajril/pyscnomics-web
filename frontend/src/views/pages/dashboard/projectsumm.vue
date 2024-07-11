<script setup lang="ts">
import { isNaN, isNull } from "mathjs"
import { useAppStore } from "@/stores/appStore"
import { usePyscConfStore } from '@/stores/genfisStore'
import * as Pysc from "@/utils/pysc/pyscType"

// import { irr } from "financial";

interface Props {
  isLoading: boolean
  data: object | null
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
  if (typeof val === 'number' && !isNaN(val) && !isNull(val))
    return Pysc.fmtNumber(val * (isPercent ? 100 : 1), true)

  return "-"
}

onMounted(() => {
  // opened.value = [1, 2, 3, 4, 5, 6, 7]
  // console.log(irr(
  //   [-9.56356385, -17.19228277, -4.1974023, 21.51028172, 20.37660873,
  //     22.00019468, 19.00201212, 14.96119589, 12.40045711, 10.58772474,
  //     10.58777014, 10.33827069, 8.88270196, 8.95418192, 7.43110387,
  //     6.74040839, 5.93121733, 5.27936182, 4.66542023, 3.75564767,
  //     2.87979519, 0.98801818, 0.63002326, 0.44646363, 0.35741839,
  //     0.58235915, 0.37064161, 0.23568187,]
  // ))
})
</script>

<template>
  <VCard
    :loading="props.isLoading ? 'primary' : false"
    title="Executive Summary"
    :subtitle="$t('Summary of ', [$t(curSelCaseName ?? 'case')])"
  >
    <VList
      v-model:opened="opened"
      density="compact"
    >
      <div v-for="(item, index) in props.data">
        <VListGroup
          v-if="item.grp"
          :value="item.grp"
          border
        >
          <template #activator="{ props }">
            <VListItem
              v-bind="props"
              class="v-list-item--active"
            >
              <VListItemTitle class="d-flex">
                <span
                  class="text-end me-2"
                  :style="{ width: '24px' }"
                >{{ index + 1
                }}.</span>{{ item.param }}
              </VListItemTitle>
              <template
                v-if="item.unit"
                #append
              >
                <div class="d-flex justify-end">
                  <span
                    class="text-end me-3"
                    v-html="makePrettyNum(item.ctrl, item.unit === '%')"
                  />
                  <span
                    class="text-start"
                    :style="{ width: '110px' }"
                  >{{ item.unit }}</span>
                  <VTooltip
                    activator="parent"
                    location="top"
                  >
                    {{ `${item.param} ${item.unit} :` }}<br>
                    {{ typeof item.ctrl === 'number' ? (item.ctrl * (item.unit === '%' ? 100 : 1)) : '-' }}
                  </VTooltip>
                </div>
              </template>
            </VListItem>
          </template>
          <VListItem
            v-for="child in item.child"
            :key="`${child.param}`"
            border
          >
            <VListItemTitle :style="{ 'margin-left': '18px' }">
              {{ child.param }}
            </VListItemTitle>
            <template #append>
              <div class="d-flex justify-end">
                <span
                  class="text-end me-3"
                  v-html="makePrettyNum(child.ctrl, child.unit === '%')"
                />
                <span
                  class="text-start"
                  :style="{ width: '110px' }"
                >{{ child.unit }}</span>
                <VTooltip
                  activator="parent"
                  location="top"
                >
                  {{ `${child.param} ${child.unit} :` }}<br>
                  {{ typeof child.ctrl === 'number' ? (child.ctrl * (child.unit === '%' ? 100 : 1)) : '-' }}
                </VTooltip>
              </div>
            </template>
          </VListItem>
        </VListGroup>
        <VListItem
          v-else
          border
        >
          <VListItemTitle class="d-flex">
            <span
              class="text-end me-2"
              :style="{ width: '24px' }"
            >{{ index + 1
            }}.</span>{{ item.param }}
          </VListItemTitle>
          <template #append>
            <div class="d-flex justify-end">
              <span
                class="text-end me-3"
                v-html="makePrettyNum(item.ctrl, item.unit === '%')"
              />
              <span
                class="text-start"
                :style="{ width: '110px' }"
              >{{ item.unit }}</span>
              <VTooltip
                activator="parent"
                location="top"
              >
                {{ `${item.param} ${item.unit} :` }}<br>
                {{ typeof item.ctrl === 'number' ? (item.ctrl * (item.unit === '%' ? 100 : 1)) : '-' }}
              </VTooltip>
            </div>
          </template>
        </VListItem>
      </div>
    </VList>
  </VCard>
</template>

<script setup lang="ts">
import { useAppStore } from '@/stores/appStore'
import { useHTTP } from '@/utils/pysc/useHttp'

import { UseDraggable as Draggable } from '@vueuse/components'
import type { Position } from '@vueuse/core'
import { usePyscConfStore } from '@/stores/genfisStore'

// import { fmtNumber, is_number, useNumbro } from "@/utils/pysc/pyscType"
import { fmtNumber, is_number, useNumbro } from "@/utils/pysc/pyscType"
import { useDataStore } from '@/utils/pysc/useDataStore'

const appStore = useAppStore()
const PyscConf = usePyscConfStore()
const numbro = useNumbro()
const isLoading = ref(false)
const isShow = ref(false)
const summary = ref<{ GOI2GR: number; IRR: number; NPV: number; PI: number }>({ GOI2GR: 0, IRR: 0, NPV: 0, PI: 0 })
const dataDict = computed(() => useDataStore().curCase2Json())
const stopWatchHandle = ref()

const calcSumm = () => {
  console.log("calc shoot")

  const calc_summ = async () => {
    isLoading.value = true
    summary.value.GOI2GR = 0
    summary.value.IRR = 0
    summary.value.NPV = 0
    summary.value.PI = 0
    try {
      useHTTP().put({
        path: 'calc_ext_quick_summ',
        body: {
          type: PyscConf.dataGConf.type_of_contract,
          json: btoa(JSON.stringify(dataDict.value)),
        },
        onError: (error: any) => { throw error },
        onSuccess: value => {
          if (isObject(value)) {
            summary.value.GOI2GR = ((value.GOI2GR ?? 0) * 100)
            summary.value.IRR = ((value.IRR ?? 0) * 100)
            summary.value.NPV = (value.NPV ?? 0)
            summary.value.PI = (value.PI ?? 0)
          }
        },
      }).finally(() => isLoading.value = false)
    }
    catch (error) {
      console.log(error)
    }
  }

  calc_summ()
}

const QSMenusRef = ref<HTMLElement | null>(null)
const quickshootCardRef = ref<HTMLElement | null>(null)
const { x: btnX, y: btnY, height: btnHeight, update: updatePos } = useElementBounding(QSMenusRef)

const moveDragging = (position: Position, event: PointerEvent) => {
  position.x = position.x - btnX.value
  position.y = position.y - btnY.value - btnHeight.value - 10
}

const showSumm = () => {
  stopWatchHandle.value = watchDebounced(dataDict, val => {
    if (isShow.value)
      calcSumm()
  }, { debounce: 800, deep: true })
  calcSumm()
}
</script>

<template>
  <div ref="QSMenusRef">
    <VMenu
      v-model="isShow"
      transition="fab-transition"
      persistent
      :close-on-content-click="false"
      max-width="320"
      no-click-animation
      scroll-strategy="none"
      offset="10"
      class="position-fixed"
      @update:model-value="(val) => { isShow = val; if (val) showSumm(); else stopWatchHandle(); }"
    >
      <template #activator="{ props }">
        <IconBtn
          class="me-2"
          v-bind="props"
        >
          <VIcon
            icon="tabler-eye-dollar"
            size="26"
          />
        </IconBtn>
      </template>

      <Draggable
        :initial-value="{ x: -100, y: 0 }"
        prevent-default
        class="select-none cursor-move position-fixed"
        :style="{ zIndex: 1000 }"
        :on-move="moveDragging"
      >
        <VCard
          ref="quickshootCardRef"
          class="card-quick-shoot select-none"
          :loading="isLoading"
          density="compact"
          style="touch-action:none !important;"
          color="rgba(var(--v-theme-primary), 0.7)"
        >
          <VCardItem class="py-0 px-0">
            <div class="pl-2 text-caption align-center">
              Summary
            </div>
            <template #append>
              <VBtn
                icon
                variant="plain"
                size="x-small"
              >
                <VIcon
                  color="white"
                  icon="tabler-x"
                  size="default"
                  @click.prevent="(val) => isShow = false"
                />
              </VBtn>
            </template>
          </VCardItem>
          <VCardText class="px-1 pr-2 pt-0 pb-2 text-caption">
            <VTable>
              <tr v-for="(item, i) in Object.keys(summary)">
                <td
                  class="pl-2 text-caption"
                  :style="{ minWidth: '85px' }"
                >
                  {{ item === 'GOI2GR' ? 'GoI to GR' : item }}
                </td>
                <td>:</td>
                <td
                  class="pl-2 text-right text-sm-subtitle-2"
                  :style="{ minWidth: '80px' }"
                >
                  {{ is_number(summary[item])
                    ? fmtNumber(summary[item],
                                false, { mantissa: 2 })
                    : '-'
                  }}
                </td>
                <td class="px-2 text-caption">
                  {{ i <= 1 ? '%' : (i === 3 ? '' : 'MUSD') }}
                </td>
              </tr>
            </VTable>
          </VCardText>
        </VCard>
      </Draggable>
    </VMenu>

  <!--
    <IconBtn
    id="fileinfo-btn"
    class="me-2"
    @click.prevent="() => isShow = !isShow"
    >
    <VIcon
    ref="QSMenusRef"
    icon="tabler-eye-dollar"
    size="26"
    />
    <div ref="cardQSContainer" />
  -->
  <!--
    <VMenu
    ref="cardQSContainer"
    v-model="isShow"
    activator="parent"
    persistent
    :close-on-content-click="false"
    no-click-animation
    max-width="320"
    scroll-strategy="none"
    offset="10"
    class="dialog-quickshoot"
    @update:model-value="(val) => { isShow = val; if (val) showSumm(); else stopWatchHandle(); }"
    >
  -->
  <!--
    <Draggable
    :initial-value="{ x: btnX - 100, y: btnY + btnHeight + 16 }"
    class="select-none cursor-move position-fixed"
    :dragging-element="quickshootCardRef"
    :container-element="cardQSContainer"
    >
  -->

  <!--
    <div
    ref="quickshootDivRef"
    class="cursor-move select-none"
    style="touch-action:none; z-index:1000;position:fixed;"
    >
  -->
  <!--
    <VCard
    ref="quickshootCardRef"
    class="card-quick-shoot select-none"
    :loading="isLoading"
    density="compact"
    style="touch-action:none !important;"
    color="rgba(var(--v-theme-primary), 0.7)"
    >
    <template #loader="{ color, isActive }">
    <VProgressLinear
    v-if="isActive"
    indeterminate
    color="success"
    height="2"
    />
    </template>
    <VCardItem class="py-0 px-0">
    <div class="pl-2 text-caption align-center">
    Summary
    </div>
    <template #append>
    <VBtn
    icon
    variant="plain"
    size="x-small"
    >
    <VIcon
    color="white"
    icon="tabler-x"
    size="default"
    @click.prevent="(val) => isShow = false"
    />
    </VBtn>
    </template>
    </VCardItem>
    <VCardText class="px-1 pr-2 pt-0 pb-2 text-caption">
    <VTable>
    <tr v-for="(item, i) in Object.keys(summary)">
  -->
  <!-- :style="{ backgroundColor: 'rgba(var(--v-theme-primary), 0.85)' }"> -->
  <!--
    <td
    class="pl-2 text-caption"
    :style="{ minWidth: '85px' }"
    >
    {{ item === 'GOI2GR' ? 'GoI to GR' : item }}
    </td>
    <td>:</td>
    <td
    class="pl-2 text-right text-sm-subtitle-2"
    :style="{ minWidth: '80px' }"
    >
    {{ is_number(summary[item])
    ? fmtNumber(summary[item],
    false, { mantissa: 2 })
    : '-'
    }}
    </td>
    <td class="px-2 text-caption">
    {{ i <= 1 ? '%' : (i == 3 ? '' : 'MUSD') }}
    </td>
    </tr>
    </VTable>
    </VCardText>
    </VCard>
  -->
  <!-- </div> -->
  <!-- </Draggable> -->
  <!-- </VMenu> -->

  <!--
    <VTooltip
    activator="parent"
    scroll-strategy="close"
    >
    <span>Quick Summary</span>
    </VTooltip>
    </IconBtn>
  -->
  <!--
    <Draggable
    v-if="isShow"
    :initial-value="{ x: 0, y: 0 }"
    prevent-default
    :container-element="cardQSContainer"
    :handle="quickshootCardRef"
    class="select-none cursor-move position-fixed"
    :style="{ zIndex: 1000 }"
    >
    <VCard
    ref="quickshootCardRef"
    class="card-quick-shoot select-none"
    :loading="isLoading"
    density="compact"
    style="touch-action:none !important;"
    color="rgba(var(--v-theme-primary), 0.7)"
    >
    <VCardItem class="py-0 px-0">
    <div class="pl-2 text-caption align-center">
    Summary
    </div>
    <template #append>
    <VBtn
    icon
    variant="plain"
    size="x-small"
    >
    <VIcon
    color="white"
    icon="tabler-x"
    size="default"
    @click.prevent="(val) => isShow = false"
    />
    </VBtn>
    </template>
    </VCardItem>
    <VCardText class="px-1 pr-2 pt-0 pb-2 text-caption">
    <VTable>
    <tr v-for="(item, i) in Object.keys(summary)">
    <td
    class="pl-2 text-caption"
    :style="{ minWidth: '85px' }"
    >
    {{ item === 'GOI2GR' ? 'GoI to GR' : item }}
    </td>
    <td>:</td>
    <td
    class="pl-2 text-right text-sm-subtitle-2"
    :style="{ minWidth: '80px' }"
    >
    {{ is_number(summary[item])
    ? fmtNumber(summary[item],
    false, { mantissa: 2 })
    : '-'
    }}
    </td>
    <td class="px-2 text-caption">
    {{ i <= 1 ? '%' : (i === 3 ? '' : 'MUSD') }}
    </td>
    </tr>
    </VTable>
    </VCardText>
    </VCard>
    </Draggable>
  -->
  </div>
</template>

<style lang="scss" scoped>
</style>

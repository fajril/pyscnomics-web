<script setup lang="ts">
import { breakpointsVuetifyV3 } from '@vueuse/core'

interface Props {
  menuList?: unknown[]
  itemProps?: boolean
  title?: string
  getSource?: any
  size?: number | string | undefined
  dotOnly?: boolean
}
interface Emit {
  (e: 'click:item', value: any): void
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Options',
  getSource: (value: string, source: string) => null,
  size: 21,
  dotOnly: false,
})

const emit = defineEmits<Emit>()

const { copied, copyImage, copyText, saved, saveImage, saveTable, saveText } = useClpbrd()
const showDownloadTag = ref()
const downloadTagDotDotRef = ref()

const isLessMediaBreakpoint = computed(() => useMediaQuery(`(max-width: ${breakpointsVuetifyV3.md}px)`).value)

const defAction = (item: any) => {
  if (item.value === 'copy2clbrd') {
    if (item.sourceType === 'image') {
      const { url } = props.getSource(item.value, item.sourceType)

      copyImage(url, 'image/png')
    }
    else {
      copyText(props.getSource(item.value, item.sourceType) ?? '')
    }
  }
  if (item.value === 'save2File') {
    if (item.sourceType === 'image') {
      const { url, filename } = props.getSource(item.value, item.sourceType)

      showDownloadTag.value = true
      nextTick(() => {
        saveImage(downloadTagDotDotRef.value, url, 'image/png', filename)
        showDownloadTag.value = false
      })
    }
    else if (item.sourceType === 'table') {
      const { data, filename } = props.getSource(item.value, item.sourceType)

      showDownloadTag.value = true
      nextTick(() => {
        saveTable(downloadTagDotDotRef.value, data, filename)
        showDownloadTag.value = false
      })
    }
    else if (item.sourceType === 'text') {
      const { textSource, filename } = props.getSource(item.value, item.sourceType)

      showDownloadTag.value = true
      nextTick(() => {
        saveText(downloadTagDotDotRef.value, textSource, filename)
        showDownloadTag.value = false
      })
    }
  }

  emit('click:item', item.value)
}
</script>

<template>
  <a
    v-if="showDownloadTag"
    ref="downloadTagDotDotRef"
    href="#"
  />
  <IconBtn
    v-if="isLessMediaBreakpoint || dotOnly"
    :class="$attrs.class"
    :size="props.size"
    color="rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity))"
  >
    <VAlert
      v-if="copied || saved"
      density="compact"
      color="success"
      variant="tonal"
      style="position: absolute; left: -55px; top: 0; z-index: 9999;"
    >
      {{ copied ? 'copied' : (saved ? 'download ready' : '') }}
    </VAlert>
    <VIcon
      color="rgba(var(--v-default), var(--v-high-emphasis-opacity))"
      icon="tabler-dots"
    />
    <VTooltip activator="parent">
      {{ props.title }}
    </VTooltip>
    <VMenu
      v-if="props.menuList"
      activator="parent"
      location="bottom right"
    >
      <VList
        :items="props.menuList"
        :item-props="props.itemProps"
      >
        <template #item="{ props: propItem }">
          <VListItem
            :title="propItem.title"
            :value="propItem.value"
            item-props
            :prepend-icon="propItem.icon ?? undefined"
            :append-icon="propItem.appendIcon ?? undefined"
            :disabled="propItem.disabled"
            @click="() => propItem.onClick ? propItem.onClick(propItem.value) : defAction(propItem)"
          >
            <VMenu
              v-if="propItem.subMenus"
              :open-on-focus="false"
              activator="parent"
              open-on-hover
              submenu
            >
              <VList
                :items="propItem.subMenus"
                :item-props="props.itemProps"
              >
                <template #item="{ props: propSubItem }">
                  <VListItem
                    :title="propSubItem.title"
                    :value="propSubItem.value"
                    item-props
                    :disabled="propSubItem.disabled"
                    :prepend-icon="propSubItem.icon ?? undefined"
                    @click="() => propSubItem.onClick ? propSubItem.onClick(propSubItem.value) : defAction(propSubItem)"
                  />
                </template>
              </VList>
            </VMenu>
          </VListItem>
        </template>
      </VList>
    </VMenu>
  </IconBtn>
  <IconBtn
    v-for="(item, index) in props.menuList?.filter(m => m.type !== 'divider')"
    v-else
    :key="`icn-${item.value ?? index}`"
    color="rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity))"
    :class="$attrs.class"
    :disabled="item.disabled"
    @click.stop.prevent="() => item.onClick ? item.onClick(item.value) : defAction(item)"
  >
    <VIcon
      :icon="copied && item.value === 'copy2clbrd' ? 'tabler-clipboard-check' : item.icon"
      :color="(copied && item.value === 'copy2clbrd') || (saved && item.value === 'save2File') ? 'success' : 'rgba(var(--v-default), var(--v-high-emphasis-opacity))'"
      :size="props.size"
    />
    <VTooltip activator="parent">
      {{ copied ? 'copied' : (saved ? 'download ready' : item.title) }}
    </VTooltip>
    <VMenu
      v-if="item.subMenus"
      activator="parent"
      location="bottom right"
    >
      <VList
        :items="item.subMenus"
        :item-props="props.itemProps"
      >
        <template #item="{ props: propItemMenu }">
          <VListItem
            :title="propItemMenu.title"
            :value="propItemMenu.value"
            item-props
            :prepend-icon="propItemMenu.icon ?? undefined"
            @click="() => propItemMenu.onClick ? propItemMenu.onClick(propItemMenu.value) : defAction(propItemMenu)"
          />
        </template>
      </VList>
    </VMenu>
  </IconBtn>
</template>

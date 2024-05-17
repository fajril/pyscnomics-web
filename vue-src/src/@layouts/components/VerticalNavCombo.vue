<script setup lang="ts">

import { useAppStore } from "@/stores/appStore";
import { layoutConfig } from '@layouts';
import { VerticalNavGroup, VerticalNavLink, VerticalNavSectionTitle } from '@layouts/components';
import { useLayoutConfigStore } from '@layouts/stores/config';
import type { NavGroup, NavLink, NavSectionControl, NavSectionTitle } from '@layouts/types';

defineProps<{
  item: NavSectionControl
}>()

const configStore = useLayoutConfigStore()
const shallRenderIcon = configStore.isVerticalNavMini()
const appStore = useAppStore()
const { curSelCase } = storeToRefs(appStore)

const resolveNavItemComponent = (item: NavLink | NavSectionTitle | NavSectionControl | NavGroup): unknown => {
  if ('heading' in item)
    return VerticalNavSectionTitle
  if ('children' in item)
    return VerticalNavGroup

  return VerticalNavLink
}
</script>

<template>
  <li class="nav-section-title text-primary mb-8 mt-2">
    <div class="title-wrapper">
      <Transition name="vertical-nav-section-title" mode="out-in"
        style="opacity: 255 !important; text-transform: none;">
        <Component :is="shallRenderIcon ? layoutConfig.app.iconRenderer : 'span'" :key="shallRenderIcon"
          :class="shallRenderIcon ? 'placeholder-icon' : 'title-text'"
          v-bind="{ ...layoutConfig.icons.sectionTitlePlaceholder }">
          <VSelect v-if="!shallRenderIcon" v-model="curSelCase" :items="appStore.caseList" item-props variant="outlined"
            density="compact" :label="$t('Cases')" />
        </Component>
      </Transition>
    </div>
  </li>
  <Component v-if="item.children" :is="resolveNavItemComponent(item)" v-for="(item, index) in item.children"
    :key="index" :item="item" />
</template>

<script lang="ts" setup>
import navItems from '@/navigation/vertical'
import { themeConfig } from '@themeConfig'

// Components
import Footer from '@/layouts/components/Footer.vue'
import NavbarThemeSwitcher from '@/layouts/components/NavbarThemeSwitcher.vue'
import { useAppStore } from "@/stores/appStore"
import NavBarI18n from '@core/components/I18n.vue'
import { useConfigStore } from '@core/stores/config'
import { VListItem } from 'vuetify/components'
import ExportProj from './pysc/ExportProj.vue'
import NewProj from './pysc/NewProj.vue'
import OpenProj from './pysc/OpenProj.vue'
import SaveProj from './pysc/SaveProj.vue'
import SaveAsProj from './pysc/SaveasProj.vue'
import ProjInfo from './pysc/projInfo.vue'
// @layouts plugin
import { VerticalNavLayout } from '@layouts'
const { locale } = useI18n({ useScope: 'global' })

const configStore = useConfigStore()

const router = useRouter()

const NavTitle = computed(() => router.currentRoute.value.meta.title)
// SECTION: Loading Indicator
const isFallbackStateActive = ref(false)
const refLoadingIndicator = ref<any>(null)

// watching if the fallback state is active and the refLoadingIndicator component is available
watch([isFallbackStateActive, refLoadingIndicator], () => {
  if (isFallbackStateActive.value && refLoadingIndicator.value)
    refLoadingIndicator.value.fallbackHandle()

  if (!isFallbackStateActive.value && refLoadingIndicator.value)
    refLoadingIndicator.value.resolveHandle()
}, { immediate: true })

const appStore = useAppStore()
const { curSelCase } = storeToRefs(appStore)

const filesGRP = [
  { name: 'New', title: 'New Project', icon: 'tabler-file', i18n: "New" },
  { name: 'Open', title: 'Open Project', icon: 'tabler-folder-open', i18n: "Open" },
  { name: 'Save', title: 'Save Project', icon: 'tabler-device-floppy', i18n: "Save" },
  { name: 'SaveAs', title: 'Save As Project', icon: 'tabler-device-floppy', i18n: "SaveAs" },
  {
    name: 'Export', title: 'Export', icon: 'tabler-file-export', i18n: "Export", children: [
      { name: 'Json', title: 'Json Format', i18n: "Json Format", icon: 'tabler-json' },
      { name: 'Excel', title: 'XLSX Format', i18n: "XLSX Format", icon: 'tabler-file-spreadsheet' },
    ]
  },
]

// !SECTION
</script>

<template>
  <VerticalNavLayout :nav-items="navItems">
    <!-- 👉 navbar -->
    <template #navbar="{ toggleVerticalOverlayNavActive }">
      <div class="d-flex h-100 align-center">
        <IconBtn id="vertical-nav-toggle-btn" class="ms-n3 d-lg-none" @click="toggleVerticalOverlayNavActive(true)">
          <VIcon size="26" icon="tabler-menu-2" />
        </IconBtn>

        <div class="ms-n3 d-none d-lg-block">
          <span v-if="NavTitle">
            {{ $t(NavTitle) }}
          </span>
          <div v-else id="NavHeadL" class="headercl-control" />
        </div>
        <VIcon size="24" class="font-weight-lighter" icon="tabler-line-dotted" style="transform: rotate(90deg);" />
        <VSelect :class="{ 'd-none': $route.name === 'dashboard' }" v-model="curSelCase" :items="appStore.caseList"
          item-props variant="outlined" density="compact" :style="{ maxInlineSize: '180px', minInlineSize: '100px' }"
          label="Cases" />
        <VIcon v-if="$route.name !== 'dashboard'" size="24" class="font-weight-lighter" icon="tabler-line-dotted"
          style="transform: rotate(90deg);" />
        <IconBtn class="ms-n3 d-sm-none">
          <VIcon size="26" icon="tabler-file-filled" />
          <VTooltip activator="parent" open-delay="1000" scroll-strategy="close">
            <span class="text-capitalize">{{ locale === 'id' ? 'Menu' : 'Files' }}</span>
          </VTooltip>

          <VMenu activator="parent" offset="14px">
            <VList>
              <VListItem v-for="(item) in filesGRP" :key="item.name" :value="item.name" class="text-capitalize"
                color="primary" :prepend-icon="item.icon" :title="$t(item.i18n)">
                <VMenu v-if="item.children" activator="parent" :offset="[14, 20]" location="end">
                  <VList>
                    <VListItem v-for="(child) in item.children" :key="child.name" :value="child.name"
                      class="text-capitalize" color="primary" :prepend-icon="child.icon" :title="child.title" />
                  </VList>
                </VMenu>
              </VListItem>
            </VList>
          </VMenu>
        </IconBtn>
        <div class="d-none d-sm-block">
          <NewProj />
          <OpenProj />
          <SaveProj />
          <SaveAsProj />
          <ExportProj />
        </div>

        <VSpacer />

        <ProjInfo />
        <NavBarI18n v-if="themeConfig.app.i18n.enable && themeConfig.app.i18n.langConfig?.length"
          :languages="themeConfig.app.i18n.langConfig" />
        <NavbarThemeSwitcher />
      </div>
    </template>

    <AppLoadingIndicator ref="refLoadingIndicator" />

    <!-- 👉 Pages -->
    <RouterView v-slot="{ Component }">
      <Suspense :timeout="0" @fallback="isFallbackStateActive = true" @resolve="isFallbackStateActive = false">
        <Component :is="Component" />
      </Suspense>
    </RouterView>

    <!-- 👉 Footer -->
    <template #footer>
      <Footer />
    </template>

    <!-- 👉 Customizer -->
    <!-- <TheCustomizer /> -->
  </VerticalNavLayout>
</template>

<style lang="scss" scoped>
.headercl-control {
  min-inline-size: 180px;
}
</style>./pysc/projInfo.vue

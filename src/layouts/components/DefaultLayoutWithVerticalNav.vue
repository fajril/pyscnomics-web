<script lang="ts" setup>
// Components
import navItems from '@/navigation/vertical'

import Footer from '@/layouts/components/Footer.vue'
import NavbarThemeSwitcher from '@/layouts/components/NavbarThemeSwitcher.vue'
import { useConfigStore } from '@core/stores/config'

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
</script>

<template>
  <VerticalNavLayout :nav-items="navItems">
    <!-- 👉 navbar -->
    <template #navbar="{ toggleVerticalOverlayNavActive }">
      <div class="d-flex h-100 align-center">
        <IconBtn
          id="vertical-nav-toggle-btn"
          class="ms-n3 d-lg-none"
          @click="toggleVerticalOverlayNavActive(true)"
        >
          <VIcon
            size="26"
            icon="tabler-menu-2"
          />
        </IconBtn>
        <div class="ms-n3 d-none d-lg-block">
          <span v-if="NavTitle">
            {{ NavTitle }}
          </span>
          <div
            v-else
            id="NavHeadL"
            class="headercl-control"
          />
        </div>
        <VIcon
          size="24"
          class="font-weight-lighter"
          icon="tabler-line-dotted"
          style="transform: rotate(90deg);"
        />
        <VSpacer />
        <NavbarThemeSwitcher />
      </div>
    </template>

    <AppLoadingIndicator ref="refLoadingIndicator" />

    <!-- 👉 Pages -->
    <RouterView v-slot="{ Component }">
      <Suspense
        :timeout="0"
        @fallback="isFallbackStateActive = true"
        @resolve="isFallbackStateActive = false"
      >
        <Component :is="Component" />
      </Suspense>
    </RouterView>

    <!-- 👉 Footer -->
    <template #footer>
      <Footer />
    </template>
  </VerticalNavLayout>
</template>

<style lang="scss" scoped>
.headercl-control {
  min-inline-size: 180px;
}
</style>

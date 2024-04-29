<script setup lang="ts">
import ErrorAnimated from '@/pages/components/error/ErrorAnimated.vue'
import ErrorHero from '@/pages/components/error/ErrorHero.vue'
import { useGenerateImageVariant } from '@core/composable/useGenerateImageVariant'
import miscMaskDark from '@images/pages/misc-mask-dark.png'
import miscMaskLight from '@images/pages/misc-mask-light.png'

const authThemeMask = useGenerateImageVariant(miscMaskLight, miscMaskDark)

const route = useRoute()

definePage({
  alias: '/pages/misc/not-found/:error(.*)',
  meta: {
    layout: 'blank',
    public: true,
  },
})

const slug = computed(() => {
  return `/${route.params.error}`
})
</script>

<template>
  <div
    class="misc-wrapper"
    style="padding: 0; background-color: hsl(268deg 98% 38%);"
  >
    <ErrorHero
      color="primary"
      pattern
    >
      <template #body>
        <ErrorAnimated error-code="404">
          Oops, something went wrong and we couldn't find that page at
          <strong>{{ slug }}</strong>
          . Please try again later.
        </ErrorAnimated>
      </template>
    </ErrorHero>
  </div>
</template>

<style lang="scss">
@use "@core/scss/template/pages/misc.scss";
</style>

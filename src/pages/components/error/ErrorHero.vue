<script setup lang="ts">
export type ErrorHeroColor = 'default' | 'grey' | 'primary'

export interface ErrorHeroProps {
  color?: ErrorHeroColor
  pattern?: boolean
}

const props = withDefaults(defineProps<ErrorHeroProps>(), {
  color: 'grey',
  pattern: false,
})

const errorClasses = computed(() => [
  props.color && `is-${props.color}`,
  props.pattern && '',
])
</script>

<template>
  <section
    class="hero error-hero"
    :class="errorClasses"
  >
    <div class="hero-body">
      <slot name="body" />
    </div>
  </section>
</template>

<style scoped lang="scss">
.hero {
  position: relative;
  display: flex;
  overflow: hidden;
  flex-direction: column;
  align-items: stretch;
  justify-content: space-between;
  inline-size: 100%;
  transition: hsl(268deg 98% 38%) 0.3s;
}

.error-hero {
  position: relative;
  min-block-size: 100vh;

  .hero-body {
    block-size: 100%;
    inline-size: 100%;
    padding-block: 0;
  }

  &.is-default {
    background-color: rgb(255, 255, 255);
  }

  &.is-grey {
    background-color: #f5f6fa;
  }

  &.is-primary {
    background-color: hsl(268deg 98% 38%);
  }
}
</style>

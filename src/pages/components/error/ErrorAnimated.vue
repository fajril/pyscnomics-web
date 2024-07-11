<script setup lang="ts">
const props = defineProps({
  errorCode: {
    type: String,
    default: '404',
  },

  Title: {
    type: String,
    default: 'Page Not Found',
  },
})

const errorValue = toRef(props, 'errorCode')
const errorTitle = toRef(props, 'Title')
</script>

<template>
  <div class="error-wrapper">
    <div class="error-wrapper-inner">
      <div class="underlay">
        <span>{{ errorValue }}</span>
      </div>
      <div class="error-box">
        <div class="error-box-face front">
          {{ errorValue[0] }}
        </div>
        <div class="error-box-face back">
          {{ errorValue[1] }}
        </div>
        <div class="error-box-face right">
          {{ errorValue[2] }}
        </div>
        <div class="error-box-face left">
          {{ errorValue[1] }}
        </div>
        <div class="error-box-face top">
          {{ errorValue[1] }}
        </div>
        <div class="error-box-face bottom">
          {{ errorValue[1] }}
        </div>
      </div>
      <div class="error-box-shadow" />
    </div>
    <div class="error-content">
      <h1 class="text-h1 font-weight-bold text-white">
        <span>{{ errorTitle }}</span>
      </h1>
      <p class="paragraph rem-115 is-inverted-light mx-auto max-w-4 mb-4">
        <slot>
          Oops, something went wrong and we couldn\'t find that page. Please try again later.
        </slot>
      </p>
      <div>
        <VBtn
          to="/"
          class="me-2"
          width="140"
        >
          Homepage
        </VBtn>
        <VBtn
          width="140"
          @click.prevent="$router.back()"
          @keydown.space.prevent="() => $router.back()"
        >
          Back
        </VBtn>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.error-wrapper {
  position: relative;
  display: flex;
  overflow: hidden;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  inset-block-start: 2rem;
  padding-block: 3rem;
  padding-inline: 0;

  .error-wrapper-inner {
    position: relative;
    perspective: 400px;

    .underlay {
      position: absolute;
      z-index: 0;
      color: #fcfcfc;
      font-family: Roboto, sans-serif;
      font-size: 25rem;
      font-weight: 900;
      inset-block-start: 50%;
      inset-inline-start: 50%;
      opacity: 0.1;
      transform: translate(-50%, -50%);
    }
  }

  .error-box {
    position: relative;
    animation-duration: 4s;
    animation-iteration-count: infinite;
    animation-name: rotateAnimation;
    block-size: 200px;
    font-family: Roboto, sans-serif;
    inline-size: 200px;
    transform: translateZ(-100px);
    transform-style: preserve-3d;
    transition: 0.3s;

    .error-box-face {
      position: absolute;
      border: 1px solid bix#000;
      block-size: 200px;
      color: #fcfcfc;
      font-size: 120px;
      inline-size: 200px;
      line-height: 200px;
      text-align: center;

      &.front {
        background: #20162b;
        transform: rotateY(0deg) translateZ(100px);
      }

      &.back {
        background: darken(#20162b, 5%);
        transform: rotateY(90deg) translateZ(100px);
      }

      &.right {
        background: darken(#20162b, 10%);
        transform: rotateY(180deg) translateZ(100px);
      }

      &.left {
        background: darken(#20162b, 15%);
        transform: rotateY(-90deg) translateZ(100px);
      }

      &.top {
        background: darken(#20162b, 5%);
        transform: rotateX(90deg) translateZ(100px);
      }

      &.bottom {
        background: darken(#20162b, 20%);
        transform: rotateX(-90deg) translateZ(100px);
      }
    }
  }

  @keyframes rotateAnimation {
    25% {
      transform: translateZ(-100px) rotateY(-90deg);
    }

    50% {
      transform: translateZ(-100px) rotateY(-180deg);
    }

    75% {
      transform: translateZ(-100px) rotateX(-90deg);
    }

    85% {
      transform: translateZ(-100px) rotateX(-90deg);
    }
  }

  .error-box-shadow {
    position: absolute;
    z-index: -1;
    border-radius: 50%;
    background: #000;
    block-size: 30px;
    filter: blur(20px);
    inline-size: calc(100% + 100px);
    inset-block-start: calc(100% - 20px);
    inset-inline-start: -50px;
  }

  .error-content {
    margin-block-start: 4rem;
    text-align: center;

    .paragraph.is-inverted-light {
      color: #fcfcfc;
      opacity: 0.7;
    }

    .rem-115 {
      font-size: 1.15rem !important;
    }

    .mx-auto {
      inline-size: 100%;
      margin-inline: auto !important;
    }

    .max-w-4 {
      max-inline-size: 27.5rem;
    }

    .mb-4 {
      margin-block-end: 1rem;
    }
  }
}

@media only screen and (max-width: 767px) {
  .error-nav {
    .error-nav-inner {
      padding-block: 0;
      padding-inline: 1rem;
    }
  }

  .error-wrapper {
    :deep(.title) {
      font-size: 2rem;
    }

    .paragraph {
      font-size: 1rem !important;
    }

    .error-wrapper-inner {
      .underlay {
        font-size: 12rem;
      }
    }
  }
}

@media only screen and (min-width: 768px) and (max-width: 1024px) and (orientation: portrait) {
  .error-nav {
    .error-nav-inner {
      padding-block: 0;
      padding-inline: 1rem;
    }
  }
}
</style>

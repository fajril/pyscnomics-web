import type { RouteRecordRaw } from 'vue-router/auto'

// 👉 Redirects
export const redirects: RouteRecordRaw[] = [
]

export const routes: RouteRecordRaw[] = [
  // costs
  {
    path: '/pysc-cost-capital',
    name: 'pysc-cost-capital',
    component: () => import('@/pages/costs.vue'),
    meta: {
      title: "Cost - Capital",
    },
  },
  {
    path: '/pysc-cost-intang',
    name: 'pysc-cost-intang',
    component: () => import('@/pages/costs.vue'),
    meta: {
      title: "Cost - Intangible",
    },
  },
  {
    path: '/pysc-cost-opex',
    name: 'pysc-cost-opex',
    component: () => import('@/pages/costs.vue'),
    meta: {
      title: "Cost - Opex",
    },
  },
  {
    path: '/pysc-cost-asr',
    name: 'pysc-cost-asr',
    component: () => import('@/pages/costs.vue'),
    meta: {
      title: "Cost - ASR",
    },
  },
  {
    path: '/pysc-cost-lbt',
    name: 'pysc-cost-lbt',
    component: () => import('@/pages/costs.vue'),
    meta: {
      title: "Cost - LBT",
    },
  },
  {
    path: '/pysc-cost-cos',
    name: 'pysc-cost-cos',
    component: () => import('@/pages/costs.vue'),
    meta: {
      title: "Cost - COS",
    },
  },
]

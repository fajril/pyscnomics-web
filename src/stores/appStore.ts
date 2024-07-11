import { namespaceConfig } from '@layouts/stores/config'

export interface tAlert {
  header?: string
  text: string | object
  isalert?: boolean
  position?: any
  color?: string
  variant?: "tonal" | "flat" | "text" | "elevated" | "outlined" | "plain"
}

export const useAppStore = defineStore('pyscConfig', () => {
  const appPort = ref<number | null>(null)
  const appver = useStorage<number>(namespaceConfig('app-ver'), 1)
  const osConf = ref({ sep: '/', os: 'win' })
  const headerTitle = ref<string | undefined>(undefined)

  const apiURL = computed(() => `http://127.0.0.1:${appPort.value}/api`)

  const alertFunc = ref<tAlert | null>(null)

  function showAlert(params: tAlert | string) {
    if (typeof params === 'string') {
      alertFunc.value = {
        text: params,
        isalert: true,
      }
    }
    else {
      alertFunc.value = {
        header: params.header,
        text: params.text,
        isalert: params.isalert,
        position: params.position,
        color: params.color,
        variant: params.variant,
      }
    }
  }

  const appReady = computed(() => appPort.value)

  return {
    osConf,
    appReady,
    appPort,
    apiURL,
    appver,
    headerTitle,
    alertFunc,
    showAlert,
  }
})

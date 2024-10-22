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
  const PYSCAPPVER = import.meta.env.VITE_PSC_VER122
  const appPort = ref<number | null>(null)
  const appver = useStorage<number>(namespaceConfig('app-ver'), 1)
  const osConf = ref({ sep: '/', os: 'win' })
  const headerTitle = ref<string | undefined>(undefined)
  const updVer = ref<string | null>(null)

  const apiURL = computed(() => `http://127.0.0.1:${appPort.value}/api`)

  const alertFunc = ref<tAlert | null>(null)

  const isUpdateAvailable = computed(() => {
    if (typeof updVer.value === 'string') {
      try {
        const _ver0 = PYSCAPPVER.toString().match(/(\d*)\.(\d*)\.(\d*)/).slice(1, 4)
        const _ver1 = updVer.value.match(/(\d*)\.(\d*)\.(\d*)/).slice(1, 4)
        const _verVal0 = (+_ver0[0] * 100000) + (+_ver0[1] * 1000) + _ver0[2]
        const _verVal1 = (+_ver1[0] * 100000) + (+_ver1[1] * 1000) + _ver1[2]

        if (_verVal1 > _verVal0)
          return true
      }
      catch (error) {
        console.log(error)
      }
    }

    return false
  })

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
    PYSCAPPVER,
    appver,
    headerTitle,
    alertFunc,
    showAlert,
    updVer,
    isUpdateAvailable,
  }
})

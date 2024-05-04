import { useAppStore } from '@/stores/appStore';
import { usePyscConfStore } from '@/stores/genfisStore';
import { namespaceConfig } from '@layouts/stores/config';
import { useStorage } from '@vueuse/core';
import * as lzs from 'lz-string';

export const MonteDistType = {
  Uniform: 'Uniform',
  Triangular: 'Triangular',
  Normal: 'Normal'
}

export interface tmonteItem {
  id: number
  dist: number
  min: number | null
  base: number | null
  max: number | null
  stddev: number | null
}

export interface tmonteConfig {
  numsim: number
  params: tmonteItem[]
}


export const usePyscMonteStore = defineStore('pyscMonteConf', () => {
  const defParam: tmonteConfig = {
    numsim: 1000,
    params: [
      { id: 0, dist: 2, min: null, max: null, base: null, stddev: 1.25 },
      { id: 1, dist: 2, min: null, max: null, base: null, stddev: 1.25 },
      { id: 2, dist: 2, min: null, max: null, base: null, stddev: 1.25 },
      { id: 3, dist: 2, min: null, max: null, base: null, stddev: 1.25 },
      { id: 4, dist: 2, min: null, max: null, base: null, stddev: 1.25 },
    ]
  }
  const monteConfig = useStorage<tmonteConfig>(namespaceConfig('monteCfg'), JSON.parse(JSON.stringify(defParam)), undefined, {
    serializer: {
      read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : JSON.parse(JSON.stringify(defParam)),
      write: (v: any) => lzs.compressToUTF16(JSON.stringify(v))
    },
  })

  const IsOnCalc = ref(false)

  const MonteCalc = async (_id: number, _data: any) => {
    const appStore = useAppStore()
    const PyscConf = usePyscConfStore()

    _data.forEach(v => {
      const idx = monteConfig.value.params.findIndex(row => row.id === v.id)
      if (idx != -1) {
        monteConfig.value.params.splice(idx, 1, {
          id: v.id, dist: Object.values(MonteDistType).indexOf(v.dist), min: v.min, base: v.base, max: v.max, stddev: v.stddev
        })
      }
    })
    IsOnCalc.value = true
    try {
      const MonteJson = {
        numsim: monteConfig.value.numsim,
        parameter: JSON.parse(JSON.stringify(monteConfig.value.params)),
        contract: PyscConf.makeJSON(_id)
      }
      if (!PyscConf.prodHasGas()) {
        const idx = MonteJson.parameter.findIndex(p => p.id === 1)
        if (idx != -1) MonteJson.parameter.splice(idx, 1)
      }
      const result = await $api('auth/calc_monte', {
        params: {
          type: PyscConf.dataGConf.type_of_contract,
          id: _id,
          data: btoa(JSON.stringify(MonteJson))
        },
        method: 'GET',
        onResponseError({ response }) {
          throw [response.status, response._data.detail]
        },
      })
    }
    catch (error) {
      appStore.showAlert({
        text: `Error ${Array.isArray(error) ? error[0] : ''}: ${Array.isArray(error) ? error[1] : error}`,
        isalert: true
      })
      IsOnCalc.value = false
    }
  }

  return {
    monteConfig,
    MonteCalc,
    IsOnCalc
  }
})


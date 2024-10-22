import { namespaceConfig } from '@layouts/stores/config'
import { useStorage } from '@vueuse/core'
import * as lzs from 'lz-string'

export interface LTPConf {
  start_year: number | null
  end_year: number | null
  volume: number
  fluid_type: 'Oil' | 'Gas' | 'LPG propane' | 'LPG butane' | 'CO2' | 'Sulfur' | 'Electricity'
}
export interface RPDConf {
  start_year: number | null
  end_year: number | null
  year_rampup: number
  drate: number
  q_plateau_ratio: number
  q_min_ratio: number
  volume: number
}

export const useLTP_RPDStore = defineStore('pyscLTPRPDConf', () => {
  const defLTP: LTPConf = {
    start_year: null,
    end_year: null,
    volume: 10000000,
    fluid_type: 'Oil',
  }

  const defRPD: RPDConf = {
    start_year: null,
    end_year: null,
    year_rampup: 4,
    drate: 0.08,
    q_plateau_ratio: 0.1,
    q_min_ratio: 0.05,
    volume: 100000,
  }

  const LTPConfig = useStorage<LTPConf>(namespaceConfig('ltpConf'), JSON.parse(JSON.stringify(defLTP)), undefined, {
    serializer: {
      read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : JSON.parse(JSON.stringify(defLTP)),
      write: (v: any) => lzs.compressToUTF16(JSON.stringify(v)),
    },
  })

  const RPDConfig = useStorage<RPDConf>(namespaceConfig('rpdConf'), JSON.parse(JSON.stringify(defRPD)), undefined, {
    serializer: {
      read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : JSON.parse(JSON.stringify(defRPD)),
      write: (v: any) => lzs.compressToUTF16(JSON.stringify(v)),
    },
  })

  return {
    defLTP,
    defRPD,
    LTPConfig,
    RPDConfig,
  }
})

import { useAppStore } from "@/stores/appStore";
import { namespaceConfig } from '@layouts/stores/config';
import { useStorage } from '@vueuse/core';
import * as lzs from 'lz-string';

export const optimTarget = {
  IRR: "IRR",
  NPV: "NPV",
  PI: "PI",
} as const;
export const optimParamType = {
  OIL_CTR_PRETAX: "Oil Contractor Pre Tax",
  GAS_CTR_PRETAX: "Gas Contractor Pre Tax",
  OIL_FTP_PORTION: "Oil FTP Portion",
  GAS_FTP_PORTION: "Gas FTP Portion",
  OIL_IC: "Oil IC",
  GAS_IC: "Gas IC",
  OIL_DMO_FEE: "Oil DMO Fee",
  GAS_DMO_FEE: "Gas DMO Fee",
  VAT_RATE: "VAT Rate",
  EFFECTIVE_TAX_RATE: "Effective Tax Rate",
  MINISTERIAL_DISCRETION: "Ministerial Discretion",
} as const;
export interface optim_Cfg {
  parameter: number
  min: number
  max: number
  pos: number
  checked: boolean
}
export interface optimCfg {
  target_parameter: number
  target_optimization: number
  optimization: optim_Cfg[]
}
export const usePyscOptimStore = defineStore('pyscOptimConf', () => {
  const defOptimCfg = (): optimCfg => {
    const params2I = Object.keys(optimParamType)
    return {
      target_parameter: Object.keys(optimTarget).indexOf(optimTarget.IRR),
      target_optimization: 0.0,
      optimization: params2I.map(((k, i) => {
        return {
          parameter: params2I.indexOf(k),
          min: [0, 1].includes(i) ? 0.3 : (i === 9 ? 0.4 : 0.2),
          max: [0, 1].includes(i) ? 0.6 : (i === 9 ? 0.44 : ([6, 7].includes(i) ? 1.0 : 0.4)),
          pos: i,
          checked: false
        }
      }))
    }
  }

  const optimConfig = useStorage<optimCfg>(namespaceConfig('optimCfg'), defOptimCfg(), undefined, {
    serializer: {
      read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : defOptimCfg(),
      write: (v: any) => lzs.compressToUTF16(JSON.stringify(v))
    },
  })



  const watcherOptimCfg = pausableWatch(optimConfig,
    (value, oldValue) => {
      const appStore = useAppStore()
      if (appStore.watcherSelCase.isActive)
        nextTick(() => appStore.dataChanges())
    }, { deep: true })

  return {
    optimConfig, defOptimCfg,
    watcherOptimCfg
  }
})

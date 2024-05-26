import { useAppStore } from "@/stores/appStore";
import { namespaceConfig } from '@layouts/stores/config';
import { useStorage } from '@vueuse/core';
import * as lzs from 'lz-string';

export const usePyscSensStore = defineStore('pyscSensConf', () => {
  const sensConfig = useStorage<number[]>(namespaceConfig('sensCfg'), [80, 80], undefined, {
    serializer: {
      read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : [80, 80],
      write: (v: any) => lzs.compressToUTF16(JSON.stringify(v))
    },
  })

  const watcherSensCfg = pausableWatch(sensConfig,
    (value, oldValue) => {
      const appStore = useAppStore()
      if (appStore.watcherSelCase.isActive)
        nextTick(() => appStore.dataChanges())
    }, { deep: true })


  return {
    sensConfig,
    watcherSensCfg
  }
})

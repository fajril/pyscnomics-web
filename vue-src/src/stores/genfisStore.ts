import { useAppStore } from "@/stores/appStore";
import { Contracts, Fiskal, ProducerType, defContracts, defFiskal, defGenConfig, defProdConfig, genConfig, producerConfig } from '@/utils/pysc/pyscType';
import { useDataStore } from "@/utils/pysc/useDataStore";
import { namespaceConfig } from '@layouts/stores/config';
import { useStorage } from '@vueuse/core';
import * as lzs from 'lz-string';

export const usePyscConfStore = defineStore('pyscEcoConf', () => {
  const generalConfig = useStorage<genConfig>(namespaceConfig('genConf'), defGenConfig(), undefined, {
    serializer: {
      read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : defGenConfig(),
      write: (v: any) => lzs.compressToUTF16(JSON.stringify(v))
    },
  })
  const producer = useStorage<producerConfig[]>(namespaceConfig('prod'), defProdConfig(), undefined, {
    serializer: {
      read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : defProdConfig(),
      write: (v: any) => lzs.compressToUTF16(JSON.stringify(v))
    },
  })
  const contracts = useStorage<Contracts>(namespaceConfig('contract'), defContracts(), undefined, {
    serializer: {
      read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : defContracts(),
      write: (v: any) => lzs.compressToUTF16(JSON.stringify(v))
    },
  })
  const fiscal = useStorage<Fiskal>(namespaceConfig('fiscal'), defFiskal(), undefined, {
    serializer: {
      read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : defFiskal(),
      write: (v: any) => lzs.compressToUTF16(JSON.stringify(v))
    },
  })

  // costs
  const tangible = useStorage<Array<number | string | null>[]>(namespaceConfig('tangible'),
    [Array(9).fill(null)], undefined, {
    serializer: {
      read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : [Array(9).fill(null)],
      write: (v: any) => lzs.compressToUTF16(JSON.stringify(v))
    },
  })
  const intangible = useStorage<Array<number | string | null>[]>(namespaceConfig('intangible'),
    [Array(5).fill(null)], undefined, {
    serializer: {
      read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : [Array(5).fill(null)],
      write: (v: any) => lzs.compressToUTF16(JSON.stringify(v))
    },
  })
  const opex = useStorage<Array<number | string | null>[]>(namespaceConfig('opex'),
    [Array(8).fill(null)], undefined, {
    serializer: {
      read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : [Array(8).fill(null)],
      write: (v: any) => lzs.compressToUTF16(JSON.stringify(v))
    },
  })
  const asr = useStorage<Array<number | string | null>[]>(namespaceConfig('asr'),
    [Array(4).fill(null)], undefined, {
    serializer: {
      read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : [Array(4).fill(null)],
      write: (v: any) => lzs.compressToUTF16(JSON.stringify(v))
    },
  })

  const appStore = useAppStore()

  function $reset() {
    tangible.value = JSON.parse(JSON.stringify([Array(9).fill(null)]))
    intangible.value = JSON.parse(JSON.stringify([Array(5).fill(null)]))
    opex.value = JSON.parse(JSON.stringify([Array(8).fill(null)]))
    asr.value = JSON.parse(JSON.stringify([Array(4).fill(null)]))

    generalConfig.value = JSON.parse(JSON.stringify(defGenConfig()))
    producer.value = JSON.parse(JSON.stringify(defProdConfig()))
    fiscal.value = JSON.parse(JSON.stringify(defFiskal()))
    contracts.value = JSON.parse(JSON.stringify(defContracts()))
  }

  function chgVer(_oldver: number, _newver: number) {
    if (_oldver <= 1) {
      localStorage.removeItem(namespaceConfig('genConf'))
      localStorage.removeItem(namespaceConfig('prod'))
      localStorage.removeItem(namespaceConfig('contract'))
      localStorage.removeItem(namespaceConfig('fiscal'))

      localStorage.removeItem(namespaceConfig('tangible'))
      localStorage.removeItem(namespaceConfig('intangible'))
      localStorage.removeItem(namespaceConfig('opex'))
      localStorage.removeItem(namespaceConfig('asr'))
      $reset()
    }
  }

  const mapTable = (table: Array<number | string | null>[], chkIndex: Array<number>, valTrue: Array<string>) => {
    return table.map(row => {
      return row.map((col, index) => {
        for (let i = 0; i < chkIndex.length; i++)
          if (index === chkIndex[i])
            return (typeof col === 'string' && !isEmpty(col.trim()) ? (col.toLowerCase() === valTrue[i] ? 1 : 0) : null)
        return col
      })
    }).filter(row => row.filter(col => col !== null).length)

  }

  const TangibleJson = () => {
    let result = [Array(9).fill(null)]
    result = mapTable(tangible.value, [1, 6], ['gas', 'yes'])
    if (result.length === 0) result = [Array(9).fill(null)]
    return result
  }

  const InTangibleJson = () => {
    let result = [Array(5).fill(null)]
    result = mapTable(intangible.value, [1], ['gas'])
    if (result.length === 0) result = [Array(5).fill(null)]
    return result
  }

  const OpexJson = () => {
    let result = [Array(8).fill(null)]
    result = mapTable(opex.value, [1], ['gas'])
    if (result.length === 0) result = [Array(8).fill(null)]
    return result
  }

  const ASRJson = () => {
    let result = [Array(4).fill(null)]
    result = mapTable(asr.value, [1], ['gas'])
    if (result.length === 0) result = [Array(4).fill(null)]
    return result
  }

  const dataGConf = computed(() => appStore.IndexCase !== -1 ? generalConfig.value : defGenConfig())
  const dataFisc = computed(() => appStore.IndexCase !== -1 ? fiscal.value : defFiskal())
  const dataProd = computed(() => appStore.IndexCase !== -1 ? producer.value : defProdConfig())
  const dataContr = computed(() => appStore.IndexCase !== -1 ? contracts.value : defContracts())
  const dataTan = computed(() => appStore.IndexCase !== -1 ? tangible.value : [Array(9).fill(null)])
  const dataIntan = computed(() => appStore.IndexCase !== -1 ? intangible.value : [Array(5).fill(null)])
  const dataOpex = computed(() => appStore.IndexCase !== -1 ? opex.value : [Array(8).fill(null)])
  const dataASR = computed(() => appStore.IndexCase !== -1 ? asr.value : [Array(4).fill(null)])

  const getProducer = (tipe: typeof ProducerType[keyof typeof ProducerType]) => {
    const selProd = producer.value.filter(item => item.Tipe == Object.keys(ProducerType).indexOf(tipe))
    return selProd.length ? selProd[0] : null
  }
  const prodHasGas = () => dataProd.value.findIndex(e => e.Tipe === 1) != -1

  const watcherAllData = pausableWatch(
    [generalConfig, fiscal, producer, contracts, tangible, intangible, opex, asr],
    (value, oldValue) => {
      if (appStore.watcherSelCase.isActive)
        nextTick(() => appStore.dataChanges())
    }, { deep: true })

  watch(() => dataGConf.value.type_of_contract, (value, oldvalue) => {
    if (!watcherAllData.isActive || !appStore.watcherSelCase.isActive)
      return
    if (value != oldvalue) {
      useDataStore().changeCtrType(1, value, oldvalue)
    }
  })

  const makeJSON = (id: number, useDate: boolean = true) => {
    return useDataStore().makeJSONofCase(id,
      generalConfig.value, producer.value, contracts.value, fiscal.value,
      tangible.value, intangible.value, opex.value, asr.value,
      useDate)
  }

  return {
    generalConfig, dataGConf,
    fiscal, dataFisc,
    producer, dataProd,
    contracts, dataContr,

    tangible, dataTan, TangibleJson,
    intangible, dataIntan, InTangibleJson,
    opex, dataOpex, OpexJson,
    asr, dataASR, ASRJson,

    prodHasGas,
    $reset,
    chgVer,

    getProducer,

    makeJSON,

    watcherAllData

  }
})

import { useAppStore } from "@/stores/appStore"
import type { Contracts, Fiskal, asrCost_s, capitalCost_s, cosCost_s, genConfig, intangCost_s, lbtCost_s, opexCost_s, producerConfig } from '@/utils/pysc/pyscType'
import { ProducerType, defCapCost_s, defContracts, defFiskal, defGenConfig, defProdConfig, defasrCost_s, defcosCost_s, defintangCost_s, deflbtCost_s, defopexCost_s } from '@/utils/pysc/pyscType'
import { useDataStore } from "@/utils/pysc/useDataStore"
import { namespaceConfig } from '@layouts/stores/config'
import { useStorage } from '@vueuse/core'
import * as lzs from 'lz-string'

export const usePyscConfStore = defineStore('pyscEcoConf', () => {
  const generalConfig = useStorage<genConfig>(namespaceConfig('genConf'), defGenConfig(), undefined, {
    serializer: {
      read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : defGenConfig(),

      //   const _genConf = v ? JSON.parse(lzs.decompressFromUTF16(v)) : defGenConfig()

      //   // add field "delayAccMode, delayAccYear"
      //   if (!Object.keys(_genConf).includes("delayAccMode")) {
      //     _genConf["delayAccMode"] = 0
      //     _genConf["delayAccYear"] = 0
      //   }

      //   return _genConf
      // },
      write: (v: any) => lzs.compressToUTF16(JSON.stringify(v)),
    },
  })

  const producer = useStorage<producerConfig[]>(namespaceConfig('prod'), defProdConfig(), undefined, {
    serializer: {
      read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : defProdConfig(),

      //   const _liftings = v ? JSON.parse(lzs.decompressFromUTF16(v)) : defProdConfig()

      //   // add field "base" at 24/7/11
      //   const hasBase = !isEmpty(_liftings) && !isEmpty(_liftings[0]) && !isEmpty(_liftings[0].prod_price)
      //     && !isEmpty(_liftings[0].prod_price[0]) && Object.keys(_liftings[0].prod_price[0]).includes("base")

      //   if (!hasBase) {
      //     _liftings.forEach(_lifting => {
      //       _lifting?.prod_price.forEach(_rows => {
      //         _rows.forEach(cols => {
      //           if (cols)
      //             cols["base"] = null
      //         })
      //       })
      //     })
      //   }

      //   return _liftings
      // },
      write: (v: any) => lzs.compressToUTF16(JSON.stringify(v)),
    },
  })

  const contracts = useStorage<Contracts>(namespaceConfig('contract'), defContracts(), undefined, {
    serializer: {
      read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : defContracts(),

      //   const _contract = v ? JSON.parse(lzs.decompressFromUTF16(v)) : defContracts()
      //   const _keys = Object.keys(_contract.gs)
      //   if (!_keys.includes("cum_production_split_offset"))
      //     _contract.gs["cum_production_split_offset"] = { mode: 0, offset: 0, split: [{ year: null, split: 0 }] }
      //   if (!_keys.includes("amortization"))
      //     _contract.gs["amortization"] = false
      //   if (_contract.second) {
      //     const _keysec = Object.keys(_contract.second)
      //     if (_keysec.includes("field_status")) {
      //       if (!_keysec.includes("cum_production_split_offset"))
      //         _contract.second["cum_production_split_offset"] = { mode: 0, offset: 0, split: [{ year: null, split: 0 }] }
      //       if (!_keysec.includes("amortization"))
      //         _contract.second["amortization"] = false
      //     }
      //   }

      //   return _contract
      // },
      write: (v: any) => lzs.compressToUTF16(JSON.stringify(v)),
    },
  })

  const fiscal = useStorage<Fiskal>(namespaceConfig('fiscal'), defFiskal(), undefined, {
    serializer: {
      read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : defFiskal(),

      //   const _fiscals = v ? JSON.parse(lzs.decompressFromUTF16(v)) : defFiskal()
      //   const fiscKey = Object.keys(_fiscals.Fiskal)
      //   const fiscKey2 = Object.keys(_fiscals.Fiskal2)
      //   if (!fiscKey.includes("regime"))
      //     _fiscals.Fiskal["regime"] = 3
      //   if (!fiscKey.includes("profitability_discounted"))
      //     _fiscals.Fiskal["profitability_discounted"] = false
      //   if (!fiscKey2.includes("regime"))
      //     _fiscals.Fiskal2["regime"] = 3
      //   if (!fiscKey2.includes("profitability_discounted"))
      //     _fiscals.Fiskal2["profitability_discounted"] = false

      //   return _fiscals
      // },
      write: (v: any) => lzs.compressToUTF16(JSON.stringify(v)),
    },
  })

  // costs
  // const tangible = useStorage<Array<number | string | null>[]>(namespaceConfig('tangible'),
  //   [Array(9).fill(null)], undefined,
  //   {
  //     serializer: {
  //       read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : [Array(9).fill(null)],
  //       write: (v: any) => lzs.compressToUTF16(JSON.stringify(v)),
  //     },
  //   })

  // const intangible = useStorage<Array<number | string | null>[]>(namespaceConfig('intangible'),
  //   [Array(5).fill(null)], undefined,
  //   {
  //     serializer: {
  //       read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : [Array(5).fill(null)],
  //       write: (v: any) => lzs.compressToUTF16(JSON.stringify(v)),
  //     },
  //   })

  // const opex = useStorage<Array<number | string | null>[]>(namespaceConfig('opex'),
  //   [Array(8).fill(null)], undefined,
  //   {
  //     serializer: {
  //       read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : [Array(8).fill(null)],
  //       write: (v: any) => lzs.compressToUTF16(JSON.stringify(v)),
  //     },
  //   })

  // const asr = useStorage<Array<number | string | null>[]>(namespaceConfig('asr'),
  //   [Array(4).fill(null)], undefined,
  //   {
  //     serializer: {
  //       read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : [Array(4).fill(null)],
  //       write: (v: any) => lzs.compressToUTF16(JSON.stringify(v)),
  //     },
  //   })

  // const cos = useStorage<Array<number | string | null>[]>(namespaceConfig('cos'),
  //   [Array(3).fill(null)], undefined,
  //   {
  //     serializer: {
  //       read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : [Array(3).fill(null)],
  //       write: (v: any) => lzs.compressToUTF16(JSON.stringify(v)),
  //     },
  //   })

  // const lbt = useStorage<Array<number | string | null>[]>(namespaceConfig('lbt2'),
  //   [Array(5).fill(null)], undefined,
  //   {
  //     serializer: {
  //       read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : [Array(5).fill(null)],
  //       write: (v: any) => lzs.compressToUTF16(JSON.stringify(v)),
  //     },
  //   })

  // reconstruct cost
  const capCostv2 = useStorage<capitalCost_s[]>(namespaceConfig('cap-cost'),
    [defCapCost_s()], undefined,
    {
      serializer: {
        read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : [defCapCost_s()],
        write: (v: any) => lzs.compressToUTF16(JSON.stringify(v)),
      },
    })

  const intangCostv2 = useStorage<intangCost_s[]>(namespaceConfig('intang-cost'),
    [defintangCost_s()], undefined,
    {
      serializer: {
        read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : [defintangCost_s()],
        write: (v: any) => lzs.compressToUTF16(JSON.stringify(v)),
      },
    })

  const opexCostv2 = useStorage<opexCost_s[]>(namespaceConfig('opex-cost'),
    [defopexCost_s()], undefined,
    {
      serializer: {
        read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : [defopexCost_s()],
        write: (v: any) => lzs.compressToUTF16(JSON.stringify(v)),
      },
    })

  const asrCostv2 = useStorage<asrCost_s[]>(namespaceConfig('asr-cost'),
    [defasrCost_s()], undefined,
    {
      serializer: {
        read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : [defasrCost_s()],
        write: (v: any) => lzs.compressToUTF16(JSON.stringify(v)),
      },
    })

  const cosCostv2 = useStorage<cosCost_s[]>(namespaceConfig('cos-cost'),
    [defcosCost_s()], undefined,
    {
      serializer: {
        read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : [defcosCost_s()],
        write: (v: any) => lzs.compressToUTF16(JSON.stringify(v)),
      },
    })

  const lbtCostv2 = useStorage<lbtCost_s[]>(namespaceConfig('lbt-cost'),
    [deflbtCost_s()], undefined,
    {
      serializer: {
        read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : [deflbtCost_s()],
        write: (v: any) => lzs.compressToUTF16(JSON.stringify(v)),
      },
    })

  const appStore = useAppStore()

  function $reset() {
    // tangible.value = JSON.parse(JSON.stringify([Array(9).fill(null)]))
    // intangible.value = JSON.parse(JSON.stringify([Array(5).fill(null)]))
    // opex.value = JSON.parse(JSON.stringify([Array(8).fill(null)]))
    // asr.value = JSON.parse(JSON.stringify([Array(4).fill(null)]))
    // cos.value = JSON.parse(JSON.stringify([Array(3).fill(null)]))
    // lbt.value = JSON.parse(JSON.stringify([Array(5).fill(null)]))

    capCostv2.value = [defCapCost_s()]
    intangCostv2.value = [defintangCost_s()]
    opexCostv2.value = [defopexCost_s()]
    asrCostv2.value = [defasrCost_s()]
    cosCostv2.value = [defcosCost_s()]
    lbtCostv2.value = [deflbtCost_s()]

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
      localStorage.removeItem(namespaceConfig('cos'))
      localStorage.removeItem(namespaceConfig('lbt2'))

      localStorage.removeItem(namespaceConfig('cap-cost'))
      localStorage.removeItem(namespaceConfig('intang-cost'))
      localStorage.removeItem(namespaceConfig('opex-cost'))
      localStorage.removeItem(namespaceConfig('asr-cost'))
      localStorage.removeItem(namespaceConfig('cos-cost'))
      localStorage.removeItem(namespaceConfig('lbt-cost'))
      $reset()
    }
  }

  // const mapTable = (table: Array<number | string | null>[], chkIndex: Array<number>, valTrue: Array<string>) => {
  //   return table.map(row => {
  //     return row.map((col, index) => {
  //       for (let i = 0; i < chkIndex.length; i++) {
  //         if (index === chkIndex[i])
  //           return (typeof col === 'string' && !isEmpty(col.trim()) ? (col.toLowerCase() === valTrue[i] ? 1 : 0) : null)
  //       }

  //       return col
  //     })
  //   }).filter(row => row.filter(col => col !== null).length)
  // }

  // const TangibleJson = () => {
  //   let result = [Array(9).fill(null)]
  //   result = mapTable(tangible.value, [1, 6], ['gas', 'yes'])
  //   if (result.length === 0)
  //     result = [Array(9).fill(null)]

  //   return result
  // }

  // const InTangibleJson = () => {
  //   let result = [Array(5).fill(null)]
  //   result = mapTable(intangible.value, [1], ['gas'])
  //   if (result.length === 0)
  //     result = [Array(5).fill(null)]

  //   return result
  // }

  // const OpexJson = () => {
  //   let result = [Array(8).fill(null)]
  //   result = mapTable(opex.value, [1], ['gas'])
  //   if (result.length === 0)
  //     result = [Array(8).fill(null)]

  //   return result
  // }

  // const ASRJson = () => {
  //   let result = [Array(4).fill(null)]
  //   result = mapTable(asr.value, [1], ['gas'])
  //   if (result.length === 0)
  //     result = [Array(4).fill(null)]

  //   return result
  // }

  // const COSJson = () => {
  //   let result = [Array(3).fill(null)]
  //   result = mapTable(cos.value, [1], ['gas'])
  //   if (result.length === 0)
  //     result = [Array(3).fill(null)]

  //   return result
  // }

  // const LBTJson = () => {
  //   let result = [Array(5).fill(null)]
  //   result = mapTable(lbt.value, [1], ['gas'])
  //   if (result.length === 0)
  //     result = [Array(5).fill(null)]

  //   return result
  // }

  const dataGConf = computed(() => appStore.IndexCase !== -1 ? generalConfig.value : defGenConfig())
  const dataFisc = computed(() => appStore.IndexCase !== -1 ? fiscal.value : defFiskal())
  const dataProd = computed(() => appStore.IndexCase !== -1 ? producer.value : defProdConfig())
  const dataContr = computed(() => appStore.IndexCase !== -1 ? contracts.value : defContracts())
  const dataTan = computed(() => appStore.IndexCase !== -1 ? capCostv2.value : [defCapCost_s()])
  const dataIntan = computed(() => appStore.IndexCase !== -1 ? intangCostv2.value : [defintangCost_s()])
  const dataOpex = computed(() => appStore.IndexCase !== -1 ? opexCostv2.value : [defopexCost_s()])
  const dataASR = computed(() => appStore.IndexCase !== -1 ? asrCostv2.value : [defasrCost_s()])
  const dataCOS = computed(() => appStore.IndexCase !== -1 ? cosCostv2.value : [defcosCost_s()])
  const dataLBT = computed(() => appStore.IndexCase !== -1 ? lbtCostv2.value : [deflbtCost_s()])

  // const dataTan = computed(() => appStore.IndexCase !== -1 ? tangible.value : [Array(9).fill(null)])
  // const dataIntan = computed(() => appStore.IndexCase !== -1 ? intangible.value : [Array(5).fill(null)])
  // const dataOpex = computed(() => appStore.IndexCase !== -1 ? opex.value : [Array(8).fill(null)])
  // const dataASR = computed(() => appStore.IndexCase !== -1 ? asr.value : [Array(4).fill(null)])
  // const dataCOS = computed(() => appStore.IndexCase !== -1 ? cos.value : [Array(3).fill(null)])
  // const dataLBT = computed(() => appStore.IndexCase !== -1 ? lbt.value : [Array(5).fill(null)])

  const getProducer = (tipe: typeof ProducerType[keyof typeof ProducerType]) => {
    const selProd = producer.value.filter(item => item.Tipe == Object.keys(ProducerType).indexOf(tipe))

    return selProd.length ? selProd[0] : null
  }

  const prodHasGas = () => dataProd.value.findIndex(e => e.Tipe === 1) != -1

  const watcherAllData = pausableWatch(
    () => [generalConfig.value, fiscal.value, producer.value, contracts.value, capCostv2.value, intangCostv2.value, opexCostv2.value, asrCostv2.value, cosCostv2.value, lbtCostv2.value],
    (value, oldValue) => {
      if (appStore.watcherSelCase.isActive)
        nextTick(() => appStore.dataChanges())
    }, { deep: true })

  watch(() => dataGConf.value.type_of_contract, (value, oldvalue) => {
    if (!watcherAllData.isActive || !appStore.watcherSelCase.isActive)
      return
    if (value !== oldvalue)
      useDataStore().changeCtrType(1, value, oldvalue)
  })

  return {
    generalConfig,
    dataGConf,
    fiscal,
    dataFisc,
    producer,
    dataProd,
    contracts,
    dataContr,

    // tangible,
    // dataTan,
    // TangibleJson,
    // intangible,
    // dataIntan,
    // InTangibleJson,
    // opex,
    // dataOpex,
    // OpexJson,
    // asr,
    // dataASR,
    // ASRJson,
    // cos,
    // dataCOS,
    // COSJson,
    // lbt,
    // dataLBT,
    // LBTJson,
    capCostv2,
    dataTan,
    intangCostv2,
    dataIntan,
    opexCostv2,
    dataOpex,
    asrCostv2,
    dataASR,
    cosCostv2,
    dataCOS,
    lbtCostv2,
    dataLBT,

    prodHasGas,
    $reset,
    chgVer,

    getProducer,

    watcherAllData,

  }
})

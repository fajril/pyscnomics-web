import { useAppStore } from "@/stores/appStore";
import * as Pysc from '@/utils/pysc/pyscType';
import { ContractType, Contracts, Fiskal, ProducerType, defContracts, defFiskal, defGenConfig, defProdConfig, genConfig, producerConfig } from '@/utils/pysc/pyscType';
import { namespaceConfig } from '@layouts/stores/config';
import { useStorage } from '@vueuse/core';
import * as lzs from 'lz-string';

export const usePyscConfStore = defineStore('pyscEcoConf', () => {
  const generalConfig = useStorage<genConfig[]>(namespaceConfig('genConf'), [defGenConfig()], undefined, {
    serializer: {
      read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : [defGenConfig()],
      write: (v: any) => lzs.compressToUTF16(JSON.stringify(v))
    },
    initOnMounted: true,
  })
  const producer = useStorage<producerConfig[][]>(namespaceConfig('prod'), [defProdConfig()], undefined, {
    serializer: {
      read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : [defProdConfig()],
      write: (v: any) => lzs.compressToUTF16(JSON.stringify(v))
    },
    initOnMounted: true,
  })
  const contracts = useStorage<Contracts[]>(namespaceConfig('contract'), [defContracts()], undefined, {
    serializer: {
      read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : [defContracts()],
      write: (v: any) => lzs.compressToUTF16(JSON.stringify(v))
    },
    initOnMounted: true,
  })
  const fiscal = useStorage<Fiskal[]>(namespaceConfig('fiscal'), [defFiskal()], undefined, {
    serializer: {
      read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : [defFiskal()],
      write: (v: any) => lzs.compressToUTF16(JSON.stringify(v))
    },
    initOnMounted: true,
  })

  // costs
  const tangible = useStorage<Array<number | string | null>[][]>(namespaceConfig('tangible'),
    [[Array(9).fill(null)]], undefined, {
    serializer: {
      read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : [[Array(9).fill(null)]],
      write: (v: any) => lzs.compressToUTF16(JSON.stringify(v))
    },
    initOnMounted: true,
  })
  const intangible = useStorage<Array<number | string | null>[][]>(namespaceConfig('intangible'),
    [[Array(5).fill(null)]], undefined, {
    serializer: {
      read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : [[Array(5).fill(null)]],
      write: (v: any) => lzs.compressToUTF16(JSON.stringify(v))
    },
    initOnMounted: true,
  })
  const opex = useStorage<Array<number | string | null>[][]>(namespaceConfig('opex'),
    [[Array(8).fill(null)]], undefined, {
    serializer: {
      read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : [[Array(8).fill(null)]],
      write: (v: any) => lzs.compressToUTF16(JSON.stringify(v))
    },
    initOnMounted: true,
  })
  const asr = useStorage<Array<number | string | null>[][]>(namespaceConfig('asr'),
    [[Array(4).fill(null)]], undefined, {
    serializer: {
      read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : [[Array(4).fill(null)]],
      write: (v: any) => lzs.compressToUTF16(JSON.stringify(v))
    },
    initOnMounted: true,
  })

  const appStore = useAppStore()
  const curSelCase = computed(() => appStore.curSelCase)

  watch(curSelCase, (newv, oldv) => {
    if (typeof oldv === 'number') {
      //save cur data
      const idx = appStore.caseList.findIndex(e => e.value === oldv);
      if (idx !== -1 && appStore.projects[idx].state)
        console.log(`save ${oldv}`)
    }
    if (newv !== +oldv) {
      //load cur data
      console.log(`load ${newv}`)
    }
  }, { deep: true })

  function $reset() {
    tangible.value = JSON.parse(JSON.stringify([[Array(9).fill(null)]]))
    intangible.value = JSON.parse(JSON.stringify([[Array(5).fill(null)]]))
    opex.value = JSON.parse(JSON.stringify([[Array(8).fill(null)]]))
    asr.value = JSON.parse(JSON.stringify([[Array(4).fill(null)]]))

    generalConfig.value = JSON.parse(JSON.stringify([defGenConfig()]))
    producer.value = JSON.parse(JSON.stringify([defProdConfig()]))
    fiscal.value = JSON.parse(JSON.stringify([defFiskal()]))
    contracts.value = JSON.parse(JSON.stringify([defContracts()]))
  }

  function chgVer(_oldver: number, _newver: number) {
    console.log(_oldver)
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

  const ContractList = (index: number) => {
    let items = []
    if (generalConfig.value[index].type_of_contract === 0)
      items.push({ title: ContractType.Project, value: 0 })
    else if ([1, 3, 4].includes(generalConfig.value[index].type_of_contract))
      items.push({ title: ContractType.PSC, value: 0 })
    else if ([2, 5, 6].includes(generalConfig.value[index].type_of_contract))
      items.push({ title: ContractType.GS, value: 0 })
    if ([3, 6].includes(generalConfig.value[index].type_of_contract))
      items.push({ title: `${ContractType.PSC} 2nd-Contract`, value: 1 })
    else if ([4, 5].includes(generalConfig.value[index].type_of_contract))
      items.push({ title: `${ContractType.GS} 2nd-Contract`, value: 1 })
    return items
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

  const TangibleJson = (index: number) => {
    let result = [Array(9).fill(null)]
    result = mapTable(tangible.value[index], [1, 6], ['gas', 'yes'])
    if (result.length === 0) result = [Array(9).fill(null)]
    return result
  }

  const InTangibleJson = (index: number) => {
    let result = [Array(5).fill(null)]
    result = mapTable(intangible.value[index], [1], ['gas'])
    if (result.length === 0) result = [Array(5).fill(null)]
    return result
  }

  const OpexJson = (index: number) => {
    let result = [Array(8).fill(null)]
    result = mapTable(opex.value[index], [1], ['gas'])
    if (result.length === 0) result = [Array(8).fill(null)]
    return result
  }

  const ASRJson = (index: number) => {
    let result = [Array(4).fill(null)]
    result = mapTable(asr.value[index], [1], ['gas'])
    if (result.length === 0) result = [Array(4).fill(null)]
    return result
  }

  const ApplyData = (genConf, fiscConf, prodConf, ContrConf, tanConf, intanConf, opexConf, asrConf) => {
    tangible.value.splice(0, tangible.value.length, ...JSON.parse(JSON.stringify(tanConf)))
    intangible.value.splice(0, intangible.value.length, ...JSON.parse(JSON.stringify(intanConf)))
    opex.value.splice(0, opex.value.length, ...JSON.parse(JSON.stringify(opexConf)))
    asr.value.splice(0, asr.value.length, ...JSON.parse(JSON.stringify(asrConf)))

    generalConfig.value.splice(0, generalConfig.value.length, ...JSON.parse(JSON.stringify(genConf)))
    producer.value.splice(0, producer.value.length, ...JSON.parse(JSON.stringify(prodConf)))
    fiscal.value.splice(0, fiscal.value.length, ...JSON.parse(JSON.stringify(fiscConf)))
    contracts.value.splice(0, contracts.value.length, ...JSON.parse(JSON.stringify(ContrConf)))
  }

  const dataGConf = computed(() => appStore.IndexCase !== -1 && appStore.IndexCase < generalConfig.value.length ? generalConfig.value[appStore.IndexCase] : defGenConfig())
  const dataFisc = computed(() => appStore.IndexCase !== -1 && appStore.IndexCase < fiscal.value.length ? fiscal.value[appStore.IndexCase] : defFiskal())
  const dataProd = computed(() => appStore.IndexCase !== -1 && appStore.IndexCase < producer.value.length ? producer.value[appStore.IndexCase] : defProdConfig())
  const dataContr = computed(() => appStore.IndexCase !== -1 && appStore.IndexCase < contracts.value.length ? contracts.value[appStore.IndexCase] : defContracts())
  const dataTan = computed(() => appStore.IndexCase !== -1 && appStore.IndexCase < tangible.value.length ? tangible.value[appStore.IndexCase] : [Array(9).fill(null)])
  const dataIntan = computed(() => appStore.IndexCase !== -1 && appStore.IndexCase < intangible.value.length ? intangible.value[appStore.IndexCase] : [Array(5).fill(null)])
  const dataOpex = computed(() => appStore.IndexCase !== -1 && appStore.IndexCase < opex.value.length ? opex.value[appStore.IndexCase] : [Array(8).fill(null)])
  const dataASR = computed(() => appStore.IndexCase !== -1 && appStore.IndexCase < asr.value.length ? asr.value[appStore.IndexCase] : [Array(4).fill(null)])

  watch(dataGConf, (newv, oldv) => {
  }, { deep: true })

  const getProducer = (tipe: typeof ProducerType[keyof typeof ProducerType], index: number | null = null) => {
    if (index !== null) {
      const selProd = producer.value[index].filter(item => item.Tipe == Object.keys(ProducerType).indexOf(tipe))
      return selProd.length ? selProd[0] : null
    }
    const selProd = dataProd.value.filter(item => item.Tipe == Object.keys(ProducerType).indexOf(tipe))
    return selProd.length ? selProd[0] : null
  }
  const prodHasGas = () => dataProd.value.findIndex(e => e.Tipe === 1) != -1

  const addCase = (casetype: number) => {
    tangible.value.push([Array(9).fill(null)])
    intangible.value.push([Array(5).fill(null)])
    opex.value.push([Array(8).fill(null)])
    asr.value.push([Array(4).fill(null)])

    const ngc = defGenConfig()
    ngc.type_of_contract = casetype
    generalConfig.value.push(ngc)
    producer.value.push(defProdConfig())
    fiscal.value.push(defFiskal())
    contracts.value.push(defContracts())
  }
  const cloneCase = (index: number, casetype: number) => {
    tangible.value.push(JSON.parse(JSON.stringify(tangible.value[index])))
    intangible.value.push(JSON.parse(JSON.stringify(intangible.value[index])))
    opex.value.push(JSON.parse(JSON.stringify(opex.value[index])))
    asr.value.push(JSON.parse(JSON.stringify(asr.value[index])))

    const ngc = JSON.parse(JSON.stringify(generalConfig.value[index]))
    const castTypeChg = ngc.type_of_contract !== casetype
    ngc.type_of_contract = casetype
    generalConfig.value.push(ngc)
    producer.value.push(JSON.parse(JSON.stringify(producer.value[index])))
    fiscal.value.push(JSON.parse(JSON.stringify(fiscal.value[index])))

    const newContract = JSON.parse(JSON.stringify(contracts.value[index]))
    if (castTypeChg) {
      if (casetype >= 3) {
        if ([3, 6].includes(casetype)) {
          if (!(newContract.second?.hasOwnProperty('oil_ftp')))
            newContract.second = Object.assign({}, newContract.cr)
        } else if ([4, 5].includes(casetype)) {
          if (!(newContract.second?.hasOwnProperty('field_status')))
            newContract.second = Object.assign({}, newContract.gs)
        }
      } else {
        if (newContract.second?.hasOwnProperty('oil_ftp') && ![3, 4].includes(casetype))
          newContract.cr = Object.assign({}, <Pysc.costRec>newContract.second)
        else if (newContract.second?.hasOwnProperty('field_status') && ![5, 6].includes(casetype))
          newContract.gs = Object.assign({}, <Pysc.GS>newContract.second)
        newContract.second = null
      }
    }
    contracts.value.push(JSON.parse(JSON.stringify(newContract)))
  }
  const delCase = (index: number) => {
    tangible.value.splice(index, 1)
    intangible.value.splice(index, 1)
    opex.value.splice(index, 1)
    asr.value.splice(index, 1)

    generalConfig.value.splice(index, 1)
    producer.value.splice(index, 1)
    fiscal.value.splice(index, 1)
    contracts.value.splice(index, 1)
  }

  const updateTypeCase = (index: number, casetype: number) => {
    const castTypeChg = generalConfig.value[index].type_of_contract !== casetype
    generalConfig.value[index].type_of_contract = casetype
    if (castTypeChg) {
      const newContract = JSON.parse(JSON.stringify(contracts.value[index]))
      if (casetype >= 3) {
        if ([3, 6].includes(casetype)) {
          if (!(newContract.second?.hasOwnProperty('oil_ftp')))
            newContract.second = Object.assign({}, newContract.cr)
        } else if ([4, 5].includes(casetype)) {
          if (!(newContract.second?.hasOwnProperty('field_status')))
            newContract.second = Object.assign({}, newContract.gs)
        }
      } else {
        if (newContract.second?.hasOwnProperty('oil_ftp') && ![3, 4].includes(casetype))
          newContract.cr = Object.assign({}, <Pysc.costRec>newContract.second)
        else if (newContract.second?.hasOwnProperty('field_status') && ![5, 6].includes(casetype))
          newContract.gs = Object.assign({}, <Pysc.GS>newContract.second)
        newContract.second = null
      }
      contracts.value[index] = Object.assign({}, JSON.parse(JSON.stringify(newContract)))
    }
  }

  const makeJSON = (id: number, useDate: boolean = true) => {
    const caseIndex = appStore.projects.findIndex(e => e.id === id)
    let jsonres = {}
    if (caseIndex === -1) return jsonres


    const dGConf = generalConfig.value[caseIndex]
    const dFisc = fiscal.value[caseIndex]
    const dProd = producer.value[caseIndex]
    const dContr = contracts.value[caseIndex]
    const dTan = tangible.value[caseIndex]
    const dIntan = intangible.value[caseIndex]
    const dOpex = opex.value[caseIndex]
    const dASR = asr.value[caseIndex]

    const Oil = getProducer(ProducerType.Oil, caseIndex)
    const Gas = getProducer(ProducerType.Gas, caseIndex)

    const type_of_contract = dGConf.type_of_contract
    const startY = Pysc.useDayJs().utc(dGConf.start_date_project).local().year()
    const endY = Pysc.useDayJs().utc(dGConf.end_date_project).local().year()
    dGConf.start_date_project_second = Pysc.useDayJs().utc(dGConf.end_date_project).add(1, 'day').valueOf()
    const start2Y = Pysc.useDayJs().utc(dGConf.start_date_project_second).local().year()
    const end2Y = Pysc.useDayJs().utc(dGConf.end_date_project_second).local().year()

    const table2Array = (table: Array<Pysc.GlobalTabValue>, istartY: number, iendY: number) => {
      const rateTab: Pysc.GlobalTabValue[] = JSON.parse(JSON.stringify(table))
      rateTab.sort((a, b) => a.year - b.year)
      const mapY = Array.from({ length: iendY - istartY + 1 }, (_, i) => (istartY - 1) + i + 1)
      let retvalue = Array<number | null>(iendY - istartY + 1).fill(0.0)
      rateTab.forEach((y, idx) => {
        if (y.year && y.year < istartY) retvalue = retvalue.fill(y.rate)
        else {
          const idxY = mapY.findIndex(e => e === y.year)
          if (idxY != -1)
            retvalue = retvalue.fill(y.rate, idxY)
        }
      })
      return retvalue
    }

    const getTaxRegime = (istartY: number) => {
      return istartY < 2016 ? 0.44 : (istartY < 2020 ? 0.42 : 0.4)
    }

    const cr2json = (cr: Pysc.costRec, hasGas: boolean) => {
      return {
        oil_ftp_is_available: cr.oil_ftp.ftp_availability,
        oil_ftp_is_shared: cr.oil_ftp.ftp_is_shared,
        oil_ftp_portion: +cr.oil_ftp.ftp_portion,
        gas_ftp_is_available: cr.gas_ftp.ftp_availability,
        gas_ftp_is_shared: cr.gas_ftp.ftp_is_shared,
        gas_ftp_portion: +cr.gas_ftp.ftp_portion,
        tax_split_type: 'Conventional',//Object.values(Pysc.TaxSplitType)[cr.TaxSplit.split_type],
        condition_dict: {},
        indicator_rc_icp_sliding: [],
        oil_ctr_pretax_share: +cr.TaxSplit.pre_tax_ctr_oil,
        gas_ctr_pretax_share: +cr.TaxSplit.pre_tax_ctr_gas,
        oil_ic_rate: +cr.IC.ic_oil,
        gas_ic_rate: +cr.IC.ic_gas,
        ic_is_available: cr.IC.ic_availability,
        oil_cr_cap_rate: +cr.CR.oil_cr_cap_rate,
        gas_cr_cap_rate: +cr.CR.gas_cr_cap_rate,
        oil_dmo_volume_portion: +cr.OilDMO.volume,
        oil_dmo_fee_portion: +cr.OilDMO.fee,
        oil_dmo_holiday_duration: +cr.OilDMO.period,
        gas_dmo_volume_portion: +cr.GasDMO.volume,
        gas_dmo_fee_portion: +cr.GasDMO.fee,
        gas_dmo_holiday_duration: +cr.GasDMO.period,
      }
    }
    const gs2json = (gs: Pysc.GS, hasGas: boolean) => {
      return {
        field_status: Object.values(Pysc.FieldStat)[gs.field_status],
        field_loc: Object.values(Pysc.FieldLoc)[gs.field_location],
        res_depth: Object.values(Pysc.ResDepth)[gs.reservoir_depth],
        infra_avail: Object.values(Pysc.InfAvail)[gs.infrastructure_availability],
        res_type: Object.values(Pysc.ResType)[gs.reservoir_type],
        api_oil: Object.values(Pysc.APiType)[gs.oil_api],
        domestic_use: Object.values(Pysc.DCUType)[gs.domestic_content_use],
        prod_stage: Object.values(Pysc.TahapProdType)[gs.production_stage],
        co2_content: Object.values(Pysc.CO2Type)[gs.co2_content],
        h2s_content: Object.values(Pysc.H2SType)[gs.h2s_content],
        base_split_ctr_oil: +gs.oil_base_split,
        base_split_ctr_gas: +gs.gas_base_split,
        split_ministry_disc: +gs.ministry_discretion_split,
        oil_dmo_volume_portion: +gs.OilDMO.volume,
        oil_dmo_fee_portion: +gs.OilDMO.fee,
        oil_dmo_holiday_duration: +gs.OilDMO.period,
        gas_dmo_volume_portion: +gs.GasDMO.volume,
        gas_dmo_fee_portion: +gs.GasDMO.fee,
        gas_dmo_holiday_duration: +gs.GasDMO.period,
      }
    }
    const contrArg2json = (fiscal: Pysc.FiskalBase, isCR: boolean, genconf: Pysc.genConfig, dmo_is_weighted: boolean, hasGas: boolean, isTransition: boolean = false, icontract: number = 0) => {
      return {
        sulfur_revenue: Object.values(Pysc.OthRevType)[fiscal.sulfur_revenue_config],
        electricity_revenue: Object.values(Pysc.OthRevType)[fiscal.electricity_revenue_config],
        co2_revenue: Object.values(Pysc.OthRevType)[fiscal.co2_revenue_config],
        is_dmo_end_weighted: dmo_is_weighted,
        tax_regime: fiscal.Tax.tax_mode > 2 ? Object.values(Pysc.TaxType)[fiscal.Tax.tax_mode] : 'nailed down',
        tax_rate: fiscal.Tax.tax_mode === 1 ?
          table2Array(fiscal.Tax.multi_tax_init, (isTransition && icontract === 1 ? start2Y : startY), (isTransition && icontract === 1 ? end2Y : endY)) :
          (fiscal.Tax.tax_mode === 0 ? +fiscal.Tax.tax_rate_init : getTaxRegime(isTransition && icontract === 1 ? start2Y : startY)),
        ftp_tax_regime: isCR ? Object.values(Pysc.TaxPaymentType)[fiscal.tax_payment_config] : undefined,
        sunk_cost_reference_year: (isTransition && icontract === 1 ? null : +fiscal.sunk_cost_reference_year),
        depr_method: Object.values(Pysc.DepreciationType)[fiscal.Depreciation.depreciation_method],
        decline_factor: +fiscal.Depreciation.decline_factor,
        vat_rate: fiscal.VAT.vat_mode === 1 ? table2Array(fiscal.VAT.multi_vat_init, (isTransition && icontract === 1 ? start2Y : startY), (isTransition && icontract === 1 ? end2Y : endY)) : +fiscal.VAT.vat_rate_init,
        lbt_rate: fiscal.LBT.lbt_mode === 1 ? table2Array(fiscal.LBT.multi_lbt_init, (isTransition && icontract === 1 ? start2Y : startY), (isTransition && icontract === 1 ? end2Y : endY)) : +fiscal.LBT.lbt_rate_init,
        inflation_rate: fiscal.Inflation.inflation_rate_mode === 1 ? table2Array(fiscal.Inflation.multi_inflation_init, (isTransition && icontract === 1 ? start2Y : startY), (isTransition && icontract === 1 ? end2Y : endY)) : +fiscal.Inflation.inflation_rate_init,
        future_rate: +((+fiscal.asr_future_rate).toPrecision(10)),
        inflation_rate_applied_to: Object.values(Pysc.InflateToType)[genconf.inflation_rate_applied_to]
      }
    }

    const lifting2Json = (prod: Pysc.producerConfig[], hasGas: boolean, isTransistion: boolean = false, icontract: number = 0) => {
      let lifting = {}
      prod.forEach((value, index) => {
        for (var i = 0; i < value.ProdNumber; i++) {
          //OIL
          const prod_price: Pysc.prodPriceBase[] = JSON.parse(JSON.stringify(value.prod_price[i]))
          prod_price.sort((a, b) => a.year - b.year)
          if (isTransistion) {
            prod_price.splice(0, prod_price.length, ...prod_price.filter(row => {
              return +row.year >= (icontract === 0 ? startY : start2Y) &&
                (icontract === 0 ? +row.year <= endY : true)
            }))
            const dM = [Pysc.useDayJs().utc(dGConf.end_date_project).local().date(), Pysc.useDayJs().utc(dGConf.end_date_project).local().month()]
            if (dM[0] !== 31 && dM[1] !== 12) {
              const factorD = Pysc.useDayJs().utc(dGConf.end_date_project).local().dayOfYear() / 365.0
              prod_price.splice(0, prod_price.length, ...prod_price.map(row => {
                if (row.year === endY) {
                  if (value.Tipe === 1) {
                    if (row.production !== null) row.production *= (icontract === 0 ? factorD : (1 - factorD))
                    for (var ii = 0; ii < value.GSANumber; ii++) {
                      if (row.gsa[`ghv${ii + 1}`] !== null) row.gsa[`ghv${ii + 1}`] *= (icontract === 0 ? factorD : (1 - factorD))
                      if (row.gsa[`vol${ii + 1}`] !== null) row.gsa[`vol${ii + 1}`] *= (icontract === 0 ? factorD : (1 - factorD))
                    }
                  } else {
                    if (row.sales !== null) row.sales *= (icontract === 0 ? factorD : (1 - factorD))
                  }
                }
                return row
              }))
            }
          }
          if (value.Tipe === 1) {
            //GAS
            for (var ii = 0; ii < value.GSANumber; ii++) {
              lifting = {
                ...lifting,
                [`GSA${value.ProdNumber ? (' ' + (i + 1)) : ''}${value.GSANumber ? (' ' + (ii + 1)) : ''}`]: {
                  start_year: (isTransistion && icontract === 1 ? start2Y : startY),
                  end_year: (isTransistion && icontract === 1 ? end2Y : endY),
                  lifting_rate: prod_price.map(v => v.production),
                  price: prod_price.map(v => v.gsa[`price${ii + 1}`]),
                  prod_year: prod_price.map(v => v.year),
                  ghv: prod_price.map(v => v.gsa[`ghv${ii + 1}`]),
                  prod_rate: prod_price.map(v => v.gsa[`vol${ii + 1}`]),
                  fluid_type: "Gas",
                },
              }
            }
          } else {
            lifting = {
              ...lifting,
              [`${Object.values(ProducerType)[value.Tipe]}${value.ProdNumber ? (' ' + (i + 1)) : ''}`]: {
                start_year: (isTransistion && icontract === 1 ? start2Y : startY),
                end_year: (isTransistion && icontract === 1 ? end2Y : endY),
                lifting_rate: prod_price.map(v => v.sales),
                price: prod_price.map(v => v.price),
                prod_year: prod_price.map(v => v.year),
                fluid_type: Object.values(ProducerType)[value.Tipe],
              },
            }
            if (value.Tipe === 0 && prod_price.map(v => v.condensate_sales).filter(v => !isNaN(+v)).length) {

            }
          }
        }
      })
      return lifting
    }

    const cost2Json = (name: string, tcost: number, icost: Array<number | string | null>[],
      isTransistion: boolean = false, icontract: number = 0
    ) => {
      const toValue = (val: any, def: number | null = 0.0) => (+val) ? val : def

      const cost_data = JSON.parse(JSON.stringify(icost))
      cost_data.sort((a, b) => a[0] - b[0])
      if (isTransistion) {
        cost_data.splice(0, cost_data.length, ...cost_data.filter(row => {
          return +row[0] >= (icontract === 1 ? start2Y : startY) &&
            (icontract === 0 ? (+row[0] <= endY) : true)
        }))
        const dM = [Pysc.useDayJs().utc(dGConf.end_date_project).local().date(), Pysc.useDayJs().utc(dGConf.end_date_project).local().month()]
        if (dM[0] !== 31 && dM[1] !== 12) {
          const factorD = Pysc.useDayJs().utc(dGConf.end_date_project).local().dayOfYear() / 365.0
          cost_data.splice(0, cost_data.length, ...cost_data.map(row => {
            if (row[0] === endY) {
              row[2] *= (icontract === 0 ? factorD : (1 - factorD))
            }
            return row
          }))
        }
      }

      return {
        [`${name}`]: {
          "start_year": isTransistion && icontract === 1 ? start2Y : startY,
          "end_year": isTransistion && icontract === 1 ? end2Y : endY,
          [`${tcost === 2 ? 'fixed_cost' : 'cost'}`]: cost_data.length ? cost_data.map(e => toValue(e[2])) : [0.0],
          "expense_year": cost_data.length ? cost_data.map(e => toValue(e[0], null)) : (isTransistion && icontract === 1 ? [start2Y] : [startY]),
          "cost_allocation": cost_data.length ? cost_data.map(e => e[1] ?? 'Oil') : ['Oil'],
          "description": cost_data.length ? cost_data.map(e => e.slice(-1)[0] ?? '-') : ['-'],
          "vat_portion": tcost != 3 ? (cost_data.length ? cost_data.map(e => toValue(e.slice(tcost === 2 ? -3 : -2)[0])) : [0.0]) : (cost_data.length ? Array<number>(cost_data.length).fill(0.0) : [0.0]),
          "vat_discount": cost_data.length ? Array<number>(cost_data.length).fill(0.0) : [0.0],
          "lbt_portion": tcost === 2 ? (cost_data.length ? cost_data.map(e => toValue(e.slice(-2)[0])) : [0.0]) : (cost_data.length ? Array<number>(cost_data.length).fill(0.0) : [0.0]),
          "lbt_discount": cost_data.length ? Array<number>(cost_data.length).fill(0.0) : [0.0],
          "pis_year": tcost === 0 ? (cost_data.length ? cost_data.map(e => toValue(e[3], null)) : [0.0]) : undefined,
          "salvage_value": tcost === 0 ? (cost_data.length ? Array<number>(cost_data.length).fill(0.0) : [0.0]) : undefined,
          "useful_life": tcost === 0 ? (cost_data.length ? cost_data.map(e => toValue(e[4], 0)) : [0.0]) : undefined,
          "depreciation_factor": tcost === 0 ? (cost_data.length ? cost_data.map(e => toValue(e[5])) : [0.0]) : undefined,
          "is_ic_applied": tcost === 0 ? (cost_data.length ? cost_data.map(e => e[6] === 'Yes') : [false]) : undefined,
          "prod_rate": tcost === 2 ? (cost_data.length ? cost_data.map(e => toValue(e[3])) : [0.0]) : undefined,
          "cost_per_volume": tcost === 2 ? (cost_data.length ? cost_data.map(e => toValue(e[4])) : [0.0]) : undefined,
        }
      }
    }

    const vlifting = (type_of_contract < 3 ? lifting2Json(dProd, !!Gas) : {
      first: lifting2Json(dProd, !!Gas, true, 0),
      second: lifting2Json(dProd, !!Gas, true, 1)
    })
    const vtangible = (type_of_contract < 3 ? cost2Json(appStore.projects[caseIndex].name, 0, dTan) : {
      first: cost2Json(appStore.projects[caseIndex].name, 0, dTan, true, 0),
      second: cost2Json(appStore.projects[caseIndex].name, 0, dTan, true, 1)
    })
    const vintangible = (type_of_contract < 3 ? cost2Json(appStore.projects[caseIndex].name, 1, dIntan) : {
      first: cost2Json(appStore.projects[caseIndex].name, 1, dIntan, true, 0),
      second: cost2Json(appStore.projects[caseIndex].name, 1, dIntan, true, 1)
    })
    const vopex = (type_of_contract < 3 ? cost2Json(appStore.projects[caseIndex].name, 2, dOpex) : {
      first: cost2Json(appStore.projects[caseIndex].name, 2, dOpex, true, 0),
      second: cost2Json(appStore.projects[caseIndex].name, 2, dOpex, true, 1)
    })
    const vasr = (type_of_contract < 3 ? cost2Json(appStore.projects[caseIndex].name, 3, dASR) : {
      first: cost2Json(appStore.projects[caseIndex].name, 3, dASR, true, 0),
      second: cost2Json(appStore.projects[caseIndex].name, 3, dASR, true, 1)
    })

    if (type_of_contract === 0)
      jsonres = {
        ...jsonres,
        setup: {
          start_date: useDate ? Pysc.useDayJs().utc(dGConf.start_date_project).local().format('DD/MM/YYYY') : dGConf.start_date_project,
          end_date: useDate ? Pysc.useDayJs().utc(dGConf.end_date_project).local().format('DD/MM/YYYY') : dGConf.end_date_project,
          oil_onstream_date: Oil ? (useDate ? Pysc.useDayJs().utc(Oil.onstream_date).local().format('DD/MM/YYYY') : Oil.onstream_date) : null,
          gas_onstream_date: Gas ? (useDate ? Pysc.useDayJs().utc(Gas.onstream_date).local().format('DD/MM/YYYY') : Gas.onstream_date) : null,
        },
      }
    else if (type_of_contract < 3)
      jsonres = {
        ...jsonres,
        setup: {
          start_date: useDate ? Pysc.useDayJs().utc(dGConf.start_date_project).local().format('DD/MM/YYYY') : dGConf.start_date_project,
          end_date: useDate ? Pysc.useDayJs().utc(dGConf.end_date_project).local().format('DD/MM/YYYY') : dGConf.end_date_project,
          oil_onstream_date: Oil ? (useDate ? Pysc.useDayJs().utc(Oil.onstream_date).local().format('DD/MM/YYYY') : Oil.onstream_date) : null,
          gas_onstream_date: Gas ? (useDate ? Pysc.useDayJs().utc(Gas.onstream_date).local().format('DD/MM/YYYY') : Gas.onstream_date) : null,
        },
        summary_arguments: {
          reference_year: +dGConf.discount_rate_start_year,
          inflation_rate: dFisc.Fiskal.Inflation.inflation_rate_mode === 1 ? table2Array(dFisc.Fiskal.Inflation.multi_inflation_init, startY, endY) : +dFisc.Fiskal.Inflation.inflation_rate_init,
          discount_rate: +dGConf.discount_rate,
          npv_mode: Object.values(Pysc.NVPType)[dFisc.Fiskal.npv_mode],
          discounting_mode: Object.values(Pysc.DiscType)[dFisc.Fiskal.discounting_mode]
        },
        costrecovery: type_of_contract === 1 ? cr2json(dContr.cr, !!Gas) : undefined,
        grosssplit: type_of_contract === 2 ? gs2json(dContr.gs, !!Gas) : undefined,
        contract_arguments: contrArg2json(dFisc.Fiskal, type_of_contract === 1, dGConf, type_of_contract === 1 ? dContr.cr.dmo_is_weighted : dContr.gs.dmo_is_weighted, !!Gas),
        lifting: vlifting,
        tangible: vtangible,
        intangible: vintangible,
        opex: vopex,
        asr: vasr,
      }
    else if (type_of_contract >= 3)
      jsonres = {
        ...jsonres,
        contract_1: {
          setup: {
            start_date: useDate ? Pysc.useDayJs().utc(dGConf.start_date_project).local().format('DD/MM/YYYY') : dGConf.start_date_project,
            end_date: useDate ? Pysc.useDayJs().utc(dGConf.end_date_project).local().format('DD/MM/YYYY') : dGConf.end_date_project,
            oil_onstream_date: null, //Oil ? (useDate ? Pysc.useDayJs().utc(Oil.onstream_date).local().format('DD/MM/YYYY') : Oil.onstream_date) : null,
            gas_onstream_date: null, //Gas ? (useDate ? Pysc.useDayJs().utc(Gas.onstream_date).local().format('DD/MM/YYYY') : Gas.onstream_date) : null,
          },
          costrecovery: [3, 4].includes(type_of_contract) ? cr2json(dContr.cr, !!Gas) : undefined,
          grosssplit: [5, 6].includes(type_of_contract) ? gs2json(dContr.gs, !!Gas) : undefined,
          contract_arguments: contrArg2json(dFisc.Fiskal, [3, 4].includes(type_of_contract), dGConf,
            ([3, 4].includes(type_of_contract) ? dContr.cr : dContr.gs).dmo_is_weighted, !!Gas,
            true, 0),
          lifting: vlifting.first,
          tangible: vtangible.first,
          intangible: vintangible.first,
          opex: vopex.first,
          asr: vasr.first,
        },
        contract_2: {
          setup: {
            start_date: useDate ? Pysc.useDayJs().utc(dGConf.start_date_project_second).local().format('DD/MM/YYYY') : dGConf.start_date_project_second,
            end_date: useDate ? Pysc.useDayJs().utc(dGConf.end_date_project_second).local().format('DD/MM/YYYY') : dGConf.end_date_project_second,
            oil_onstream_date: null, //Oil ? (useDate ? Pysc.useDayJs().utc(Oil.onstream_date).local().format('DD/MM/YYYY') : Oil.onstream_date) : null,
            gas_onstream_date: null, //Gas ? (useDate ? Pysc.useDayJs().utc(Gas.onstream_date).local().format('DD/MM/YYYY') : Gas.onstream_date) : null,
          },
          costrecovery: [3, 6].includes(type_of_contract) ? cr2json(<Pysc.costRec>dContr.second, !!Gas) : undefined,
          grosssplit: [4, 5].includes(type_of_contract) ? gs2json(<Pysc.GS>dContr.second, !!Gas) : undefined,
          contract_arguments: contrArg2json(dFisc.Fiskal2, [3, 6].includes(type_of_contract), dGConf,
            ([3, 6].includes(type_of_contract) ? <Pysc.costRec>dContr.second : <Pysc.GS>dContr.second).dmo_is_weighted, !!Gas,
            true, 1),
          lifting: vlifting.second,
          tangible: vtangible.second,
          intangible: vintangible.second,
          opex: vopex.second,
          asr: vasr.second,
        },
        "contract_arguments": {
          unrec_portion: dFisc.Fiskal2.transferred_unrec_cost
        },
        "summary_arguments": {
          reference_year: dGConf.discount_rate_start_year,
          inflation_rate: dFisc.Fiskal.Inflation.inflation_rate_mode === 1 ? table2Array(dFisc.Fiskal.Inflation.multi_inflation_init, startY, endY) : +dFisc.Fiskal.Inflation.inflation_rate_init,
          discount_rate: +dGConf.discount_rate,
          npv_mode: Object.values(Pysc.NVPType)[dFisc.Fiskal.npv_mode],
          discounting_mode: Object.values(Pysc.DiscType)[dFisc.Fiskal.discounting_mode]
        }
      }
    return jsonres
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

    ApplyData,

    prodHasGas,
    $reset,
    chgVer,

    getProducer,

    ContractList,

    addCase, updateTypeCase, cloneCase, delCase,

    makeJSON,

  }
})

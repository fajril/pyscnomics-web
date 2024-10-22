/* eslint-disable @stylistic/ts/indent */
import { router } from '@/plugins/1.router'
import { useAppStore } from '@/stores/appStore'
import { usePyscConfStore } from '@/stores/genfisStore'
import type { tmonteConfig } from '@/stores/monteStore'
import { usePyscMonteStore } from '@/stores/monteStore'
import type { optimCfg } from '@/stores/optimStore'
import { usePyscOptimStore } from '@/stores/optimStore'
import { usePyscSensStore } from '@/stores/sensStore'
import * as Pysc from '@/utils/pysc/pyscType'
import { useHTTP } from './useHttp'

export const useDataStore = () => {
  const appStore = useAppStore()
  const PyscConf = usePyscConfStore()
  const PyscSens = usePyscSensStore()
  const PyscMonte = usePyscMonteStore()
  const PyscOptim = usePyscOptimStore()

  const dayjs = Pysc.useDayJs()

  const execPartData = async (url: string, mode: string, param: object) => {
    if (mode === 'GET') {
      const { status, result } = await useHTTP().get({
        path: url,
        params: param,
        onError: (error: any) => { throw error },
      })

      if (status !== 200)
        throw { status, result }

      return result
    }
    else {
      const { status, result } = await useHTTP().put({
        path: url,
        body: param,
        onError: (error: any) => { throw error },
      })

      if (status !== 200)
        throw { status, result }

      return result
    }
  }

  const loadDataModule = async (urlpath: string, wsPath_: string, id: number, costmode: number | undefined = undefined) => {
    const { status, result } = await useHTTP().get({
      path: urlpath,
      params: costmode !== undefined ? { wspath: wsPath_, mode: costmode, caseid: id } : { wspath: wsPath_, caseid: id },
    })

    if (status !== 200 || result.state !== true)
      throw new Error(`${urlpath} can't read data: please re-open project files`)

    const respData = JSON.parse(JSON.stringify(result.data))

    // update data
    if (urlpath === 'rdgenconf') {
      // update DataEco.genConf
      const genConf_ = respData as Pysc.genConfig
      if (!Object.keys(genConf_).includes("delayAccMode")) {
        genConf_["delayAccMode"] = 0
        genConf_["delayAccYear"] = 0
      }
      if (!Object.keys(genConf_).includes("useCOS"))
        genConf_["useCOS"] = false
    }
    else if (urlpath === 'rdfiscalconf') {
      const fiscal_ = respData as Pysc.Fiskal
      const fiscKey = Object.keys(fiscal_.Fiskal)
      const fiscKey2 = Object.keys(fiscal_.Fiskal2)
      if (!fiscKey.includes("regime"))
        fiscal_.Fiskal["regime"] = 3
      if (!fiscKey.includes("profitability_discounted"))
        fiscal_.Fiskal["profitability_discounted"] = false
      if (!fiscKey.includes("sum_undepreciated_cost"))
        fiscal_.Fiskal["sum_undepreciated_cost"] = true
      if (!fiscKey2.includes("regime"))
        fiscal_.Fiskal2["regime"] = 3
      if (!fiscKey2.includes("profitability_discounted"))
        fiscal_.Fiskal2["profitability_discounted"] = false
      if (!fiscKey2.includes("sum_undepreciated_cost"))
        fiscal_.Fiskal2["sum_undepreciated_cost"] = true
    }
    else if (urlpath === 'rdproducer') {
      respData.forEach(_liftings => {
        _liftings?.prod_price.forEach(_lifting => {
          _lifting.forEach(rows => {
            if (rows.base === undefined)
              rows.base = null
          })
        })
      })
    }
    else if (urlpath === 'rdcontracts') {
      const contract_ = respData as Pysc.Contracts
      const _keysCtr = Object.keys(contract_.gs)
      if (!_keysCtr.includes("cum_production_split_offset"))
        contract_.gs["cum_production_split_offset"] = { mode: 0, offset: 0, split: [{ year: null, split: 0 }] }
      if (!_keysCtr.includes("amortization"))
        contract_.gs["amortization"] = false
      const _keysCRCtr = Object.keys(contract_.cr)
      if (!_keysCRCtr.includes("oil_cost_of_sales_applied"))
        contract_.cr["oil_cost_of_sales_applied"] = false
      if (!_keysCRCtr.includes("gas_cost_of_sales_applied"))
        contract_.cr["gas_cost_of_sales_applied"] = false

      if (contract_.second) {
        const _keysec = Object.keys(contract_.second)
        if (_keysec.includes("field_status")) {
          if (!_keysec.includes("cum_production_split_offset"))
            (contract_.second as Pysc.GS)["cum_production_split_offset"] = { mode: 0, offset: 0, split: [{ year: null, split: 0 }] }
          if (!_keysec.includes("amortization"))
            (contract_.second as Pysc.GS)["amortization"] = false
        }
        if (_keysec.includes("oil_ftp")) {
          if (!_keysec.includes("oil_cost_of_sales_applied"))
            (contract_.second as Pysc.costRec)["oil_cost_of_sales_applied"] = false
          if (!_keysec.includes("gas_cost_of_sales_applied"))
            (contract_.second as Pysc.costRec)["gas_cost_of_sales_applied"] = false
        }
      }
    }
    else if (urlpath === 'rdoptim') {
      const optim_ = respData as optimCfg
      const lres = optim_.optimization.length
      if (lres < 14) {
        optim_.optimization.push(...Array(14 - lres).fill(undefined).map((v, i) => ({
          parameter: lres + i,
          min: 0.2,
          max: 0.4,
          pos: lres + i,
          checked: false,
        })))
      }
    }

    return respData
  }

  const useWatchCaseID = (_callback: Function) => {
    const curSelCase = computed(() => appStore.curSelCase)
    const watcherSelCase = computed(() => appStore.watcherSelCase.isActive)

    const watchCaseID = pausableWatch(curSelCase, (value, oldValue) => {
      if (watcherSelCase.value)
        _callback(value)
    })

    const stopCaseID = () => {
      watchCaseID.stop()
    }

    const resumeCaseID = () => {
      watchCaseID.resume()
    }

    const pauseCaseID = () => {
      watchCaseID.pause()
    }

    const CallableFunc = () => {
      nextTick(() => {
        if (watcherSelCase.value)
          _callback(curSelCase.value)
      })
    }

    watch(watcherSelCase, value => {
      if (value) {
        resumeCaseID()
        _callback(curSelCase.value)
      }
      else { pauseCaseID() }
    }, { deep: true })

    return {
      stopCaseID,
      resumeCaseID,
      pauseCaseID,
      CallableFunc,
    }
  }

  const resetDataStore = (newVer: any, newWS: string, _incVer: boolean = true, _incProjPath: boolean = false) => {
    appStore.$patch(state => {
      PyscConf.$patch(state => {
        state.tangible.splice(0, state.tangible.length, ...[Array(9).fill(null)])
        state.intangible.splice(0, state.intangible.length, ...[Array(5).fill(null)])
        state.opex.splice(0, state.opex.length, ...[Array(8).fill(null)])
        state.asr.splice(0, state.asr.length, ...[Array(4).fill(null)])
        state.cos.splice(0, state.cos.length, ...[Array(3).fill(null)])
        state.lbt.splice(0, state.lbt.length, ...[Array(5).fill(null)])

        state.generalConfig = JSON.parse(JSON.stringify(Pysc.defGenConfig()))
        state.producer = JSON.parse(JSON.stringify(Pysc.defProdConfig()))
        state.fiscal = JSON.parse(JSON.stringify(Pysc.defFiskal()))
        state.contracts = JSON.parse(JSON.stringify(Pysc.defContracts()))
      })

      PyscSens.$patch(state => {
        state.sensConfig.splice(0, state.sensConfig.length, ...[80, 80])
      })
      PyscMonte.$patch(state => {
        state.monteConfig = JSON.parse(JSON.stringify(PyscMonte.defParam))
      })

      PyscOptim.$patch(state => {
        state.optimConfig = JSON.parse(JSON.stringify(PyscOptim.defOptimCfg()))
      })

      if (_incVer)
        state.appver = newVer
      state.curWS = newWS
      state.curProject = null
      if (_incProjPath)
        state.curProjectPath = null
      const _id = Math.floor(Math.random() * (2000000 - 1000)) + 1000

      state.projects.splice(0, state.projects.length, ...[
        { id: _id, name: "Case-1", type: 1, description: 'tes case 1', updated_at: dayjs.utc().valueOf(), state: 1, multicase: [], evaluator: '', evaluator_date: dayjs.utc().valueOf() },
      ])

      // put in last
      state.curSelCase = _id
      state.caseCompare.splice(0, state.caseCompare.length, ...[])
      state.caseCombine.splice(0, state.caseCombine.length, ...[])
      state.caseIncr.splice(0, state.caseIncr.length, ...[])
    })
  }

  const applyCase = async (wsPath: string, _caselists: Pysc.ProjectBase[] = [], dataOnly: boolean = false) => {
    // check curselID
    interface dataEco {
      tangible: Array<number | string | null>[]
      intangible: Array<number | string | null>[]
      opex: Array<number | string | null>[]
      asr: Array<number | string | null>[]
      lbt: Array<number | string | null>[]
      cos: Array<number | string | null>[]

      genConf: Pysc.genConfig
      producer: Pysc.producerConfig[]
      fiscal: Pysc.Fiskal
      contracts: Pysc.Contracts
    }

    const DataEco: dataEco = {
      tangible: [Array(9).fill(null)],
      intangible: [Array(5).fill(null)],
      opex: [Array(8).fill(null)],
      asr: [Array(4).fill(null)],
      lbt: [Array(5).fill(null)],
      cos: [Array(3).fill(null)],
      genConf: Pysc.defGenConfig(),
      producer: Pysc.defProdConfig(),
      fiscal: Pysc.defFiskal(),
      contracts: Pysc.defContracts(),
    }

    const DataSens = { params: [80, 80] }
    const DataMonte = { params: JSON.parse(JSON.stringify(PyscMonte.defParam)) }
    const DataOptim = { params: JSON.parse(JSON.stringify(PyscOptim.defOptimCfg())) }

    const DataCompare = { params: [] }
    const DataCombine = { params: [] }
    const DataIncr = { params: [] }

    let DataLoaded = false
    const cases = dataOnly ? appStore.projects : _caselists
    let curSelCase = +appStore.curSelCase
    if (cases.findIndex(el => el.id === curSelCase) === -1)
      curSelCase = cases[0].id
    try {
      DataEco.genConf = await loadDataModule('rdgenconf', wsPath, curSelCase)
      DataEco.fiscal = await loadDataModule('rdfiscalconf', wsPath, curSelCase)
      DataEco.producer = await loadDataModule('rdproducer', wsPath, curSelCase)
      DataEco.contracts = await loadDataModule('rdcontracts', wsPath, curSelCase)

      DataEco.tangible = await loadDataModule('rdcosts', wsPath, curSelCase, 0)
      DataEco.intangible = await loadDataModule('rdcosts', wsPath, curSelCase, 1)
      DataEco.opex = await loadDataModule('rdcosts', wsPath, curSelCase, 2)
      DataEco.asr = await loadDataModule('rdcosts', wsPath, curSelCase, 3)
      DataEco.cos = await loadDataModule('rdcosts', wsPath, curSelCase, 4)
      DataEco.lbt = await loadDataModule('rdcosts', wsPath, curSelCase, 5)

      // sensitivity
      DataSens.params = await loadDataModule('rdsens', wsPath, curSelCase)

      // montecarlo
      DataMonte.params = await loadDataModule('rdmonte', wsPath, curSelCase)

      // optim
      DataOptim.params = await loadDataModule('rdoptim', wsPath, curSelCase)

      // compare
      DataCompare.params = await loadDataModule('rdcompare', wsPath, curSelCase)

      // combine
      DataCombine.params = await loadDataModule('rdcombine', wsPath, curSelCase)

      // incr
      DataCombine.params = await loadDataModule('rdincr', wsPath, curSelCase)

      DataLoaded = true
    }
    catch (error) {
      // console.log([error.message, typeof error])
      try {
        const { status, result } = useHTTP().extractError(error)

        appStore.showAlert({
          text: `Error ${status}: ${result}`,
          isalert: true,
        })
      }
      catch (err) { }
    }

    // apply data cases
    const applyData = () => {
      if (DataLoaded) {
        PyscConf.$patch(state => {
          state.tangible.splice(0, state.tangible.length, ...JSON.parse(JSON.stringify(DataEco.tangible)))
          state.intangible.splice(0, state.intangible.length, ...JSON.parse(JSON.stringify(DataEco.intangible)))
          state.opex.splice(0, state.opex.length, ...JSON.parse(JSON.stringify(DataEco.opex)))
          state.asr.splice(0, state.asr.length, ...JSON.parse(JSON.stringify(DataEco.asr)))
          state.lbt.splice(0, state.lbt.length, ...JSON.parse(JSON.stringify(DataEco.lbt)))
          state.cos.splice(0, state.cos.length, ...JSON.parse(JSON.stringify(DataEco.cos)))

          state.generalConfig = JSON.parse(JSON.stringify(DataEco.genConf))
          state.producer.splice(0, state.producer.length, ...JSON.parse(JSON.stringify(DataEco.producer)))
          state.fiscal = JSON.parse(JSON.stringify(DataEco.fiscal))
          state.contracts = JSON.parse(JSON.stringify(DataEco.contracts))
        })

        PyscSens.$patch(state => {
          state.sensConfig.splice(0, state.sensConfig.length, ...DataSens.params)
        })

        PyscMonte.$patch(state => {
          state.monteConfig = JSON.parse(JSON.stringify(DataMonte.params))
        })

        PyscOptim.$patch(state => {
          state.optimConfig = JSON.parse(JSON.stringify(DataOptim.params))
        })
      }
    }

    if (dataOnly) {
      applyData()
    }
    else {
      appStore.$patch(state => {
        appStore.curSelCase = curSelCase
        state.projects.splice(0, state.projects.length, ...cases)

        state.caseCompare.splice(0, state.caseCompare.length, ...DataCompare.params)
        state.caseCombine.splice(0, state.caseCombine.length, ...DataCombine.params)
        state.caseIncr.splice(0, state.caseIncr.length, ...DataIncr.params)
        applyData()
      })
    }
  }

  const saveCaseData = async (curWS: string, caseID: number,
    gConf: Pysc.genConfig, producer: Pysc.producerConfig[], contracts: Pysc.Contracts, fiscal: Pysc.Fiskal,
    tangible: Array<number | string | null>[], intangible: Array<number | string | null>[],
    opex: Array<number | string | null>[], asr: Array<number | string | null>[], cos: Array<number | string | null>[],
    lbt: Array<number | string | null>[],
    sensConfig: number[],
    monteConfig: tmonteConfig,
    optimComfig: optimCfg) => {
    try {
      await execPartData('wrtgenconf', 'PUT', {
        wspath: curWS,
        caseid: caseID,
        gc: btoa(JSON.stringify(gConf)),
      })
    }
    catch (err) { }
    try {
      await execPartData('wrtfiscalconf', 'PUT', {
        wspath: curWS,
        caseid: caseID,
        gc: btoa(JSON.stringify(fiscal)),
      })
    }
    catch (err) { }
    try {
      await execPartData('wrtproducer', 'PUT', {
        wspath: curWS,
        caseid: caseID,
        gc: btoa(JSON.stringify(producer)),
      })
    }
    catch (err) { }
    try {
      await execPartData('wrtcontract', 'PUT', {
        wspath: curWS,
        caseid: caseID,
        gc: btoa(JSON.stringify(contracts)),
      })
    }
    catch (err) { }
    try {
      await execPartData('wrtcost', 'PUT', {
        wspath: curWS,
        caseid: caseID,
        mode: 0,
        gc: btoa(JSON.stringify(tangible)),
      })
    }
    catch (err) { }
    try {
      await execPartData('wrtcost', 'PUT', {
        wspath: curWS,
        caseid: caseID,
        mode: 1,
        gc: btoa(JSON.stringify(intangible)),
      })
    }
    catch (err) { }
    try {
      await execPartData('wrtcost', 'PUT', {
        wspath: curWS,
        caseid: caseID,
        mode: 2,
        gc: btoa(JSON.stringify(opex)),
      })
    }
    catch (err) { }
    try {
      await execPartData('wrtcost', 'PUT', {
        wspath: curWS,
        caseid: caseID,
        mode: 3,
        gc: btoa(JSON.stringify(asr)),
      })
    }
    catch (err) { }
    try {
      await execPartData('wrtcost', 'PUT', {
        wspath: curWS,
        caseid: caseID,
        mode: 4,
        gc: btoa(JSON.stringify(cos)),
      })
    }
    catch (err) { }
    try {
      await execPartData('wrtcost', 'PUT', {
        wspath: curWS,
        caseid: caseID,
        mode: 5,
        gc: btoa(JSON.stringify(lbt)),
      })
    }
    catch (err) { }

    // sensitivity
    try {
      await execPartData('wrtsens', 'PUT', {
        wspath: curWS,
        caseid: caseID,
        gc: btoa(JSON.stringify(sensConfig)),
      })
    }
    catch (err) { }

    // montecarlo
    try {
      await execPartData('wrtmonte', 'PUT', {
        wspath: curWS,
        caseid: caseID,
        gc: btoa(JSON.stringify(monteConfig)),
      })
    }
    catch (err) { }

    // optimasi
    try {
      await execPartData('wrtoptim', 'PUT', {
        wspath: curWS,
        caseid: caseID,
        gc: btoa(JSON.stringify(optimComfig)),
      })
    }
    catch (err) { }

    console.log('done save case')
  }

  const extractProject = async (projSource: string | null, wsPath: string, _oldwsPath: string | null = null) => {
    let resExtract = { state: false, cases: [] }
    if (typeof projSource === 'string' && !isEmpty(projSource)) {
      console.log(`extracting files ${projSource}`)

      const { status, result } = await useHTTP().put({
        path: 'extractproject',
        body: {
          json: btoa(JSON.stringify({
            path: projSource,
            oldWS: _oldwsPath ?? appStore.curWS,
            newWS: wsPath,
          })),
        },
        onError: (error: any) => { throw error },
      })

      if (status !== 200)
        throw { status, result }
      resExtract = isObject(result) && result.state ? result : { state: false, cases: [] }
    }
    if (resExtract.state === true && resExtract.cases && resExtract.cases.length) {
      await applyCase(wsPath, JSON.parse(JSON.stringify(resExtract.cases)))
    }
    else {

    }

    return resExtract.state
  }

  const newProject = async () => {
    const oldWS = appStore.curWS
    const newWS = `D${Math.random().toString(36).slice(2)}`

    appStore.watcherSelCase.pause()
    PyscConf.watcherAllData.pause()
    try {
      resetDataStore(appStore.appver, newWS, false, true)

      // warite case and clear old temp project
      let resInit = await execPartData('newproject', 'PUT', {
        wspath: newWS,
        data: btoa(JSON.stringify(appStore.projects)),
      })
      resInit = await execPartData('clearprojtmp', 'PUT', { wspath: oldWS })
    }
    catch (err) {
    }
    appStore.watcherSelCase.resume()
    PyscConf.watcherAllData.resume()
  }

  const openProject = async (path: string) => {
    let dataLoaded = false
    const newWS = `D${Math.random().toString(36).slice(2)}`

    appStore.watcherSelCase.pause()
    PyscConf.watcherAllData.pause()
    try {
      const extractState: any = await extractProject(path, newWS, appStore.curWS)

      dataLoaded = extractState === true
      if (dataLoaded) {
        appStore.showAlert({
          text: { name: "Data loaded successfully" },
          isalert: false,
        })
      }
      else { throw extractState }
    }
    catch (err) {
      appStore.showAlert({
        text: `Error ${(err?.status) ?? ''}: ${(err?.result) ?? 'unknown'}`,
        isalert: true,
      })
      dataLoaded = false
    }
    if (dataLoaded) {
      appStore.$patch(state => {
        state.curWS = newWS
        state.curProjectPath = path
      })
    }

    appStore.watcherSelCase.resume()
    PyscConf.watcherAllData.resume()

    return dataLoaded
  }

  const saveProject = async (path: string) => {
    let validSave = false
    const curWS = !isEmpty(appStore.curWS) ? appStore.curWS : (`D${Math.random().toString(36).slice(2)}`)

    appStore.watcherSelCase.pause()
    PyscConf.watcherAllData.pause()
    try {
      // save cases
      const wrtcases = await execPartData('wrtcases', 'PUT', {
        pathfile: curWS,
        istmp: 1,
        gc: btoa(JSON.stringify(appStore.projects)),
      })

      // if (isEmpty(appStore.curWS) || appStore.selectedCase.state === 1) {
      await saveCaseData(curWS, appStore.curSelCase,
        PyscConf.generalConfig, PyscConf.producer, PyscConf.contracts, PyscConf.fiscal,
        PyscConf.tangible, PyscConf.intangible,
        PyscConf.opex, PyscConf.asr, PyscConf.cos, PyscConf.lbt,
        PyscSens.sensConfig,
        PyscMonte.monteConfig,
        PyscOptim.optimConfig)

      // }

      try {
        const caseCompare = appStore.caseCompare.filter(v => appStore.projects.findIndex(p => p.id === v.source) !== -1)
          .map(c => {
            return {
              source: c.source,
              comp: c.comp.filter(i => appStore.projects.findIndex(p => p.id === i) !== -1),
            }
          })

        const wrtcompare = await execPartData('wrtcompare', 'PUT', {
          wspath: curWS,
          gc: btoa(JSON.stringify(caseCompare)),
        })
      }
      catch (error) { }

      try {
        const caseCombine = appStore.caseCombine.filter(v => appStore.projects.findIndex(p => p.id === v.source) !== -1)
          .map(c => {
            return {
              source: c.source,
              comp: c.comp.filter(i => appStore.projects.findIndex(p => p.id === i) !== -1),
              inflation_rate: c.inflation_rate,
              discount_rate: c.discount_rate,
              reference_year: c.reference_year,
              npv_mode: c.npv_mode,
              discounting_mode: c.discounting_mode,
            }
          })

        const wrtcombine = await execPartData('wrtcombine', 'PUT', {
          wspath: curWS,
          gc: btoa(JSON.stringify(caseCombine)),
        })
      }
      catch (error) { }

      try {
        const caseIncr = appStore.caseIncr.filter(v => appStore.projects.findIndex(p => p.id === v.source) !== -1)
          .map(c => {
            return {
              source: c.source,
              comp: appStore.projects.findIndex(p => p.id === c.comp) !== -1 ? c.comp : null,
              inflation_rate: c.inflation_rate,
              discount_rate: c.discount_rate,
              reference_year: c.reference_year,
              npv_mode: c.npv_mode,
              discounting_mode: c.discounting_mode,
            }
          })

        const wrtincr = await execPartData('wrtincr', 'PUT', {
          wspath: curWS,
          gc: btoa(JSON.stringify(caseIncr)),
        })
      }
      catch (error) { }

      const wrtproject = await execPartData('wrtproject', 'PUT', {
        wspath: curWS,
        targetfile: btoa(path),
      })

      if (wrtproject.state !== true)
        throw "save data failed"

      appStore.showAlert({
        text: { name: 'Project saved to', arg: [path] },
        isalert: false,
      })

      appStore.$patch(state => {
        state.curWS = curWS
        state.curProjectPath = path
        state.projects.forEach(el => el.state = 0)
      })
      validSave = true
    }
    catch (err) {
      appStore.showAlert({
        text: `Error ${(err?.status) ?? ''}: ${(err?.result) ?? 'unknown'}`,
        isalert: true,
      })
    }
    appStore.watcherSelCase.resume()
    PyscConf.watcherAllData.resume()

    return validSave
  }

  const expJsonProject = () => {

  }

  const expXlsxProject = () => {

  }

  const importFrPySC = async (pathfile: string | null, caseLst: number[] = []) => {
    // chk
    const curWS = !isEmpty(appStore.curWS) ? appStore.curWS : (`D${Math.random().toString(36).slice(2)}`)
    let dataLoaded = false
    const newcaseID = caseLst.map(el => Math.floor(Math.random() * (2000000 - 1000)) + 1000)

    appStore.watcherSelCase.pause()
    PyscConf.watcherAllData.pause()
    try {
      const resImport = await execPartData("importcase", "PUT",
        { wspath: curWS, data: btoa(JSON.stringify({ path: pathfile, caseid: caseLst, newcaseid: newcaseID })) })

      if (resImport.state !== true)
        throw resImport

      const selCase = resImport.selcase

      // change case id
      selCase.forEach((el: any, index: number) => el.id = newcaseID[index])

      // merge with current case
      appStore.$patch(state => {
        state.projects.push(...JSON.parse(JSON.stringify(selCase)))
      })

      // save caselist
      const resSaveCase = await execPartData("wrtcases", "PUT", {
        pathfile: curWS,
        istmp: 1,
        gc: btoa(JSON.stringify(appStore.projects)),
      })

      if (resImport.state !== true)
        throw resSaveCase

      dataLoaded = true

      appStore.showAlert({
        text: { name: "Data imported successfully" },
        isalert: false,
      })
    }
    catch (err) {
      appStore.showAlert({
        text: `Error ${(err?.status) ?? ''}: ${(err?.result) ?? 'unknown'}`,
        isalert: true,
      })
    }
    appStore.watcherSelCase.resume()
    PyscConf.watcherAllData.resume()

    return dataLoaded
  }

  const addCase = async (param: Pysc.ProjectBase) => {
    appStore.watcherSelCase.pause()
    appStore.$patch(state => {
      state.projects.push(JSON.parse(JSON.stringify(param)))
    })
    try {
      // save caselist
      await execPartData("wrtcases", "PUT", {
        pathfile: appStore.curWS,
        istmp: 1,
        gc: btoa(JSON.stringify(appStore.projects)),
      })

      const ngc = Pysc.defGenConfig()

      ngc.type_of_contract = param.type

      const ctr = Pysc.defContracts()
      const _fiscal = Pysc.defFiskal()
      if (ngc.type_of_contract === 2) {
        _fiscal.Fiskal.sulfur_revenue_config = 0
        _fiscal.Fiskal.electricity_revenue_config = 0
      }
      else if (ngc.type_of_contract >= 3) {
        if ([3, 6].includes(ngc.type_of_contract))
          ctr.second = Object.assign({}, JSON.parse(JSON.stringify(ctr.cr)))
        else
          ctr.second = Object.assign({}, JSON.parse(JSON.stringify(ctr.gs)))
      }
      await saveCaseData(appStore.curWS, param.id,
        ngc, Pysc.defProdConfig(), ctr, _fiscal,
        [Array(9).fill(null)], [Array(5).fill(null)], [Array(8).fill(null)], [Array(4).fill(null)], [Array(3).fill(null)],
        [80, 80], JSON.parse(JSON.stringify(PyscMonte.defParam)), JSON.parse(JSON.stringify(PyscOptim.defOptimCfg())))
    }
    catch (err) {

    }
    if (!appStore.watcherSelCase.isActive)
      appStore.watcherSelCase.resume()
    if (!PyscConf.watcherAllData.isActive)
      PyscConf.watcherAllData.resume()
    nextTick(() => {
      appStore.$patch(state => {
        state.curSelCase = param.id
      })
    })
  }

  const addOptimCase = async (param: Pysc.ProjectBase,
    dGConf: Pysc.genConfig, dProd: Pysc.producerConfig[], dContr: Pysc.Contracts, dFisc: Pysc.Fiskal,
    dTan: Array<number | string | null>[], dIntan: Array<number | string | null>[],
    dOpex: Array<number | string | null>[], dASR: Array<number | string | null>[], dCOS: Array<number | string | null>[],
    dLBT: Array<number | string | null>[]) => {
    appStore.watcherSelCase.pause()
    PyscConf.watcherAllData.pause()

    appStore.$patch(state => {
      state.projects.push(JSON.parse(JSON.stringify(param)))
    })
    try {
      // save caselist
      await execPartData("wrtcases", "PUT", {
        pathfile: appStore.curWS,
        istmp: 1,
        gc: btoa(JSON.stringify(appStore.projects)),
      })

      await saveCaseData(appStore.curWS, param.id,
        dGConf, dProd, dContr, dFisc,
        dTan, dIntan, dOpex, dASR, dCOS, dLBT, [80, 80],
        JSON.parse(JSON.stringify(PyscMonte.defParam)), JSON.parse(JSON.stringify(PyscOptim.defOptimCfg())))
    }
    catch (err) {

    }
    if (!appStore.watcherSelCase.isActive)
      appStore.watcherSelCase.resume()
    if (!PyscConf.watcherAllData.isActive)
      PyscConf.watcherAllData.resume()
    nextTick(() => {
      router.replace('/').finally(() =>
        appStore.$patch(state => {
          state.curSelCase = param.id
        }),
      )
    })
  }

  const cloneCase = async (param: Pysc.ProjectBase, cloneID: any) => {
    appStore.watcherSelCase.pause()
    try {
      await execPartData("clonecase", "PUT", {
        wspath: appStore.curWS,
        sourceid: cloneID,
        targetid: param.id,
        ctrType: param.type,
        typechg: appStore.projects[appStore.projects.findIndex(v => v.id === cloneID)].type !== param.type,
      })
    }
    catch (err) { }
    appStore.$patch(state => {
      state.projects.push(JSON.parse(JSON.stringify(param)))
    })
    appStore.watcherSelCase.resume()
    nextTick(() => {
      appStore.$patch(state => {
        state.curSelCase = param.id
      })
    })
  }

  const delCase = async (caseID: number) => {
    if (appStore.projects.length === 1)
      return
    appStore.watcherSelCase.pause()
    PyscConf.watcherAllData.pause()

    const oldCaseID = appStore.curSelCase
    try {
      appStore.$patch(state => {
        const caseindex = state.projects.findIndex(v => v.id === caseID)

        state.projects.splice(caseindex, 1)
        if (oldCaseID === caseID) {
          if (caseindex + 1 < state.projects.length)
            state.curSelCase = state.projects[caseindex + 1].id
          else if (caseindex - 1 >= 0)
            state.curSelCase = state.projects[caseindex - 1].id
        }
      })

      // save project list
      await execPartData("wrtcases", "PUT", {
        pathfile: appStore.curWS,
        istmp: 1,
        gc: btoa(JSON.stringify(appStore.projects)),
      })
    }
    catch (err) {
    }
    if (oldCaseID != appStore.curSelCase) {
      // load data
      if (typeof appStore.mainCallbackCaseID === 'function')
        await appStore.mainCallbackCaseID(appStore.curSelCase, -1)
    }
    appStore.watcherSelCase.resume()
    PyscConf.watcherAllData.resume()
  }

  const changeCtrType = (mode: number, value: number, oldValue: number) => {
    if (value != oldValue) {
      appStore.$patch(state => {
        if (mode === 1) // from genconf
          state.projects[appStore.IndexCase].type = value
        state.projects[appStore.IndexCase].state = 1
      })
      PyscConf.$patch(state => {
        if (mode === 0) // from case of project
          state.generalConfig.type_of_contract = value
        if (value >= 3) {
          if ([3, 6].includes(value)) {
            if (!(state.contracts.second?.hasOwnProperty('oil_ftp')))
              state.contracts.second = Object.assign({}, JSON.parse(JSON.stringify(state.contracts.cr)))
          }
          else if ([4, 5].includes(value)) {
            if (!(state.contracts.second?.hasOwnProperty('field_status')))
              state.contracts.second = Object.assign({}, JSON.parse(JSON.stringify(state.contracts.gs)))
          }
        }
        else {
          if (state.contracts.second?.hasOwnProperty('oil_ftp') && ![3, 4].includes(oldValue))
            state.contracts.cr = Object.assign({}, JSON.parse(JSON.stringify(<Pysc.costRec>state.contracts.second)))
          else if (state.contracts.second?.hasOwnProperty('field_status') && ![5, 6].includes(oldValue))
            state.contracts.gs = Object.assign({}, JSON.parse(JSON.stringify(<Pysc.GS>state.contracts.second)))
          state.contracts.second = null
        }
      })
    }
  }

  const updateCase = async (param: Pysc.ProjectBase) => {
    appStore.watcherSelCase.pause()
    try {
      const projIndex = appStore.projects.findIndex(v => v.id === param.id)
      const oldCtrType = appStore.projects[projIndex].type
      const castTypeChg = oldCtrType !== param.type

      appStore.$patch(state => {
        state.projects[projIndex] = Object.assign({}, JSON.parse(JSON.stringify(param)))
        if (param.id === appStore.curSelCase)
          state.projects[projIndex].state = 1
      })

      if (castTypeChg) {
        if (param.id === appStore.curSelCase) { changeCtrType(0, param.type, oldCtrType) }
        else {
          // change in file
          try {
            await execPartData("chgctrtype", "PUT", {
              wspath: appStore.curWS,
              sourceid: param.id,
              oldCtrType,
              newCtrType: param.type,
            })
          }
          catch (err) { }
        }
      }

      // save caselist
      await execPartData("wrtcases", "PUT", {
        pathfile: appStore.curWS,
        istmp: 1,
        gc: btoa(JSON.stringify(appStore.projects)),
      })
    }
    catch (err) { }
    appStore.watcherSelCase.resume()
  }

  const table2Array = (table: any[], istartY: number, iendY: number, keys: string[] = ["year", "rate"]) => {
    // filter not unempty row
    const rateTab: Pysc.GlobalTabValue[] = JSON.parse(JSON.stringify(table)).filter(row => !isEmpty(row[keys[0]]) && !isEmpty(row[keys[1]]))

    rateTab.sort((a, b) => a[keys[0]] - b[keys[0]])

    const mapY = Array.from({ length: iendY - istartY + 1 }, (_, i) => (istartY - 1) + i + 1)
    let retvalue = Array<number | null>(iendY - istartY + 1).fill(0.0)
    rateTab.forEach((y, idx) => {
      if (y[keys[0]] && y[keys[0]] < istartY) { retvalue = retvalue.fill(y[keys[1]]) }
      else {
        const idxY = mapY.findIndex(e => e === y[keys[0]])
        if (idxY != -1)
          retvalue = retvalue.fill(y[keys[1]], idxY)
      }
    })

    return retvalue
  }

  const makeJSONofCase = (id: number,
    dGConf: Pysc.genConfig, dProd: Pysc.producerConfig[], dContr: Pysc.Contracts, dFisc: Pysc.Fiskal,
    dTan: Array<number | string | null>[], dIntan: Array<number | string | null>[],
    dOpex: Array<number | string | null>[], dASR: Array<number | string | null>[], dCOS: Array<number | string | null>[],
    dLBT: Array<number | string | null>[],
    useDate: boolean = true) => {
    const caseIndex = appStore.projects.findIndex(e => e.id === id)
    let jsonres = {}
    if (caseIndex === -1)
      return jsonres

    const getProducer = (tipe: typeof Pysc.ProducerType[keyof typeof Pysc.ProducerType]) => {
      const selProd = dProd.filter(item => item.Tipe == Object.keys(Pysc.ProducerType).indexOf(tipe))

      return selProd.length ? selProd[0] : null
    }

    const Oil = getProducer(Pysc.ProducerType.Oil)
    const Gas = getProducer(Pysc.ProducerType.Gas)

    const DelAccYear = +(dGConf.delayAccMode ?? 0) >= 1 && (dGConf.delayAccYear ?? 0) > 0 ? dGConf.delayAccYear : 0// (dGConf.delayAccMode === 1 ? dGConf.delayAccYear : -dGConf.delayAccYear) : 0

    const type_of_contract = dGConf.type_of_contract
    const startY = Pysc.useDayJs().utc(dGConf.start_date_project).local().year()
    const endY = Pysc.useDayJs().utc(dGConf.end_date_project).local().year()

    dGConf.start_date_project_second = Pysc.useDayJs().utc(dGConf.end_date_project).add(1, 'day').valueOf()

    const start2Y = Pysc.useDayJs().utc(dGConf.start_date_project_second).local().year()
    const end2Y = Pysc.useDayJs().utc(dGConf.end_date_project_second).local().year()
    const useCOS = [1, 3, 4, 6].includes(type_of_contract) && (dGConf.useCOS ?? false)

    const getTaxRegime = (istartY: number) => {
      return istartY < 2016 ? 0.44 : (istartY < 2020 ? 0.42 : 0.4)
    }

    const cr2json = (cr: Pysc.costRec, hasGas: boolean) => {
      return {
        oil_ftp_is_available: cr.oil_ftp.ftp_availability,
        oil_ftp_is_shared: cr.oil_ftp.ftp_is_shared,
        oil_ftp_portion: Pysc.toNumnber(cr.oil_ftp.ftp_portion),
        gas_ftp_is_available: cr.gas_ftp.ftp_availability,
        gas_ftp_is_shared: cr.gas_ftp.ftp_is_shared,
        gas_ftp_portion: Pysc.toNumnber(cr.gas_ftp.ftp_portion),
        tax_split_type: 'Conventional', // Object.values(Pysc.TaxSplitType)[cr.TaxSplit.split_type],
        condition_dict: {},
        indicator_rc_icp_sliding: [],
        oil_ctr_pretax_share: Pysc.toNumnber(cr.TaxSplit.pre_tax_ctr_oil),
        gas_ctr_pretax_share: Pysc.toNumnber(cr.TaxSplit.pre_tax_ctr_gas),
        oil_ic_rate: Pysc.toNumnber(cr.IC.ic_oil),
        gas_ic_rate: Pysc.toNumnber(cr.IC.ic_gas),
        ic_is_available: cr.IC.ic_availability,
        oil_cr_cap_rate: Pysc.toNumnber(cr.CR.oil_cr_cap_rate),
        gas_cr_cap_rate: Pysc.toNumnber(cr.CR.gas_cr_cap_rate),
        oil_dmo_volume_portion: Pysc.toNumnber(cr.OilDMO.volume),
        oil_dmo_fee_portion: Pysc.toNumnber(cr.OilDMO.fee),
        oil_dmo_holiday_duration: cr.OilDMO.holiday ? +cr.OilDMO.period : 0,
        gas_dmo_volume_portion: Pysc.toNumnber(cr.GasDMO.volume),
        gas_dmo_fee_portion: Pysc.toNumnber(cr.GasDMO.fee),
        gas_dmo_holiday_duration: cr.GasDMO.holiday ? +cr.GasDMO.period : 0,
      }
    }

    const getGS_split_offset = (gs: Pysc.GS, iStart: number, iendY: number) => {
      return gs.cum_production_split_offset.mode === 1
        ? table2Array(gs.cum_production_split_offset.split, iStart, iendY, ["year", "split"])
        : gs.cum_production_split_offset.offset
    }

    const gs2json = (gs: Pysc.GS, hasGas: boolean, icontract: number = 0) => {
      // const splitTable = table2Array(gs.cum_production_split_offset.split,
      //   (type_of_contract >= 3 && icontract === 1 ? start2Y : startY), (type_of_contract >= 3 && icontract === 1 ? end2Y : endY), ["year", "split"])
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
        base_split_ctr_oil: Pysc.toNumnber(gs.oil_base_split),
        base_split_ctr_gas: Pysc.toNumnber(gs.gas_base_split),
        split_ministry_disc: Pysc.toNumnber(gs.ministry_discretion_split),
        oil_dmo_volume_portion: Pysc.toNumnber(gs.OilDMO.volume),
        oil_dmo_fee_portion: Pysc.toNumnber(gs.OilDMO.fee),
        oil_dmo_holiday_duration: gs.OilDMO.holiday ? Pysc.toNumnber(gs.OilDMO.period) : 0,
        gas_dmo_volume_portion: Pysc.toNumnber(gs.GasDMO.volume),
        gas_dmo_fee_portion: Pysc.toNumnber(gs.GasDMO.fee),
        gas_dmo_holiday_duration: gs.GasDMO.holiday ? +gs.GasDMO.period : 0,

        // cum_production_split_offset: gs.cum_production_split_offset.mode === 0 ? gs.cum_production_split_offset.offset : splitTable
      }
    }

    const contrArg2json = (fiscal: Pysc.FiskalBase, isCR: boolean, genconf: Pysc.genConfig, dmo_is_weighted: boolean, hasGas: boolean, isTransition: boolean = false, icontract: number = 0) => {
      return {
        sulfur_revenue: type_of_contract === 0 ? Pysc.OthRevType.OthRev2 : (Object.values(Pysc.OthRevType)[fiscal.sulfur_revenue_config]),
        electricity_revenue: type_of_contract === 0 ? Pysc.OthRevType.OthRev1 : (Object.values(Pysc.OthRevType)[fiscal.electricity_revenue_config]),
        co2_revenue: type_of_contract === 0 ? Pysc.OthRevType.OthRev2 : (Object.values(Pysc.OthRevType)[fiscal.co2_revenue_config]),
        is_dmo_end_weighted: type_of_contract === 0 ? undefined : dmo_is_weighted,
        tax_regime: type_of_contract === 0 ? undefined : (fiscal.Tax.tax_mode > 2 ? Object.values(Pysc.TaxType)[fiscal.Tax.tax_mode] : 'nailed down'),
        tax_rate: type_of_contract === 0
          ? undefined
          : (fiscal.Tax.tax_mode === 1
            ? table2Array(fiscal.Tax.multi_tax_init, (isTransition && icontract === 1 ? start2Y : startY), (isTransition && icontract === 1 ? end2Y : endY))
            : (fiscal.Tax.tax_mode === 0 ? Pysc.toNumnber(fiscal.Tax.tax_rate_init) : getTaxRegime(isTransition && icontract === 1 ? start2Y : startY))),
        ftp_tax_regime: type_of_contract === 0 ? undefined : (isCR ? Object.values(Pysc.TaxPaymentType)[fiscal.tax_payment_config] : undefined),
        sunk_cost_reference_year: type_of_contract === 0 ? startY : ((isTransition && icontract === 1 ? null : (DelAccYear !== 0 ? (+fiscal.sunk_cost_reference_year + DelAccYear) : +fiscal.sunk_cost_reference_year))),
        depr_method: type_of_contract === 0 ? undefined : (Object.values(Pysc.DepreciationType)[fiscal.Depreciation.depreciation_method]),
        decline_factor: type_of_contract === 0 ? undefined : (Pysc.toNumnber(fiscal.Depreciation.decline_factor)),
        vat_rate: type_of_contract === 0 ? 0.0 : (fiscal.VAT.vat_mode === 1 ? table2Array(fiscal.VAT.multi_vat_init, (isTransition && icontract === 1 ? start2Y : startY), (isTransition && icontract === 1 ? end2Y : endY)) : Pysc.toNumnber(fiscal.VAT.vat_rate_init)),
        lbt_rate: type_of_contract === 0 ? 0.0 : (fiscal.LBT.lbt_mode === 1 ? table2Array(fiscal.LBT.multi_lbt_init, (isTransition && icontract === 1 ? start2Y : startY), (isTransition && icontract === 1 ? end2Y : endY)) : Pysc.toNumnber(fiscal.LBT.lbt_rate_init)),
        inflation_rate: type_of_contract === 0 ? 0.0 : (fiscal.Inflation.inflation_rate_mode === 1 ? table2Array(fiscal.Inflation.multi_inflation_init, (isTransition && icontract === 1 ? start2Y : startY), (isTransition && icontract === 1 ? end2Y : endY)) : Pysc.toNumnber(fiscal.Inflation.inflation_rate_init)),
        future_rate: type_of_contract === 0 ? 0.02 : (Pysc.toNumnber(fiscal.asr_future_rate)),
        inflation_rate_applied_to: type_of_contract === 0 ? Pysc.InflateToType.Capex : (Object.values(Pysc.InflateToType)[genconf.inflation_rate_applied_to]),
        post_uu_22_year2001: type_of_contract === 0
          ? undefined
          : ((isCR
            ? (icontract === 0
              ? dContr.cr.post_uu_22_year2001
              : (isTransition && dContr.second?.hasOwnProperty('post_uu_22_year2001') ? (<Pysc.costRec>dContr.second).post_uu_22_year2001 : undefined))
            : undefined)),
        cum_production_split_offset: type_of_contract === 0
          ? undefined
          : ((!isCR
            ? (icontract === 0
              ? getGS_split_offset(dContr.gs, startY, endY)
              : getGS_split_offset(<Pysc.GS>dContr.second, start2Y, end2Y))
            : undefined)),
        amortization: type_of_contract === 0 ? undefined : (!isCR ? (icontract === 0 ? (dContr.gs.amortization ?? false) : ((<Pysc.GS>dContr.second).amortization ?? false)) : undefined),

        // add field (7/12/24) GS Only
        regime: type_of_contract === 0 ? undefined : (!isCR ? Object.keys(Pysc.GSRegimeType)[fiscal.regime ?? 3] : undefined),

        // add field ??
        sum_undepreciated_cost: type_of_contract === 0 ? undefined : (fiscal.sum_undepreciated_cost),

        // add field (8/05/24) CR Only
        oil_cost_of_sales_applied: type_of_contract === 0 ? undefined : (isCR ? (icontract === 0 ? (useCOS && (dContr.cr.oil_cost_of_sales_applied ?? false)) : (useCOS && ((dContr.second as Pysc.costRec).oil_cost_of_sales_applied ?? false))) : undefined),
        gas_cost_of_sales_applied: type_of_contract === 0 ? undefined : (isCR ? (icontract === 0 ? (Gas ? (useCOS && (dContr.cr.gas_cost_of_sales_applied ?? false)) : false) : (Gas ? (useCOS && ((dContr.second as Pysc.costRec).gas_cost_of_sales_applied ?? false)) : false)) : undefined),
      }
    }

    const lifting2Json = (prod: Pysc.producerConfig[], hasGas: boolean, isTransistion: boolean = false, icontract: number = 0) => {
      let lifting = {}

      const validGSA = (gsa: any, numGSA: number) => {
        const keys = Object.keys(gsa)
        for (let i = 0; i < numGSA; i++) {
          if (keys.includes(`vol${i + 1}`) && keys.includes(`ghv${i + 1}`)
            && (Pysc.is_number(gsa[`vol${i + 1}`]) && +gsa[`vol${i + 1}`] > 0)
            && (Pysc.is_number(gsa[`ghv${i + 1}`]) && +gsa[`ghv${i + 1}`] > 0))
            return true
        }

        return false
      }

      prod.forEach((value, index) => {
        for (let i = 0; i < value.ProdNumber; i++) {
          // Filtering data is has values
          const prod_price: Pysc.prodPriceBase[] = JSON.parse(JSON.stringify(value.prod_price[i])).filter((row: Pysc.prodPriceBase) => {
            if (value.Tipe === 0) {
              return (Pysc.is_number(row.year) && +row.year > 0
                && ((Pysc.is_number(row.sales) && +row.sales > 0)
                  || (Pysc.is_number(row.condensate_sales) && +row.condensate_sales > 0)))
            }
            else if (value.Tipe === 1) {
              return Pysc.is_number(row.year) && +row.year > 0 && row.gsa && validGSA(row.gsa, value.GSANumber)
            }
            else {
              return Pysc.is_number(row.year) && +row.year > 0 && Pysc.is_number(row.sales) && +row.sales > 0
            }
          })

          prod_price.sort((a, b) => a.year - b.year)

          // add condisiton of delayed/Acc
          if (DelAccYear !== 0 && prod_price.length) {
            prod_price.map(p => p.year += DelAccYear)

            // cut project
            const del_index = prod_price.findIndex(p => p.year > (isTransistion ? end2Y : endY))
            if (del_index !== -1)
              prod_price.splice(del_index)
          }

          if (isTransistion) {
            prod_price.splice(0, prod_price.length, ...prod_price.filter(row => {
              return +row.year >= (icontract === 0 ? startY : start2Y)
                && (icontract === 0 ? +row.year <= endY : true)
            }))

            const dM = [Pysc.useDayJs().utc(dGConf.end_date_project).local().date(), Pysc.useDayJs().utc(dGConf.end_date_project).local().month()]
            if (dM[0] !== 31 && dM[1] !== 12) {
              const date_1 = Pysc.useDayJs().utc(dGConf.end_date_project).local()
              const daysOfY = Pysc.useDayJs()(`${date_1.year()}-12-31`).dayOfYear()

              const factorD = Pysc.useDayJs().utc(dGConf.end_date_project).local().dayOfYear() / daysOfY

              prod_price.splice(0, prod_price.length, ...prod_price.map(row => {
                if (row.year === endY) {
                  if (value.Tipe === 1) {
                    if (Pysc.is_number(row.production))
                      row.production = +row.production * (icontract === 0 ? factorD : (1 - factorD))
                    for (let ii = 0; ii < value.GSANumber; ii++) {
                      // if (row.gsa[`ghv${ii + 1}`] !== null) row.gsa[`ghv${ii + 1}`] *= (icontract === 0 ? factorD : (1 - factorD))
                      if (Pysc.is_number(row.gsa[`vol${ii + 1}`]))
                        row.gsa[`vol${ii + 1}`] = +row.gsa[`vol${ii + 1}`] * (icontract === 0 ? factorD : (1 - factorD))
                    }
                  }
                  else {
                    if (Pysc.is_number(row.sales))
                      row.sales = +row.sales * (icontract === 0 ? factorD : (1 - factorD))
                  }
                }

                return row
              }))
            }
          }
          if (value.Tipe === 1) {
            // GAS
            const gasProdprice = prod_price.map(row => {
              let production_ = +(row.production ?? 0)
              if (production_ === 0) {
                for (let ii = 0; ii < value.GSANumber; ii++) {
                  if (row.gsa[`vol${ii + 1}`] && row.gsa[`ghv${ii + 1}`])
                    production_ += +row.gsa[`vol${ii + 1}`]
                }
                row.production = production_
              }

              return row
            })

            for (let ii = 0; ii < value.GSANumber; ii++) {
              const gsaFluid = gasProdprice.map(row => ({ year: Pysc.toNumnber(row.year), base: Pysc.toNumnber(row.base), production: Pysc.toNumnber(row.production), vol: Pysc.toNumnber(row.gsa[`vol${ii + 1}`]), ghv: Pysc.toNumnber(row.gsa[`ghv${ii + 1}`]), price: Pysc.toNumnber(row.gsa[`price${ii + 1}`]) })).filter(r => r.year && r.vol && r.ghv)

              lifting = {
                ...lifting,
                [`GSA${value.ProdNumber ? (` ${i + 1}`) : ''}${value.GSANumber ? (` ${ii + 1}`) : ''}`]: gsaFluid.length
                  ? {
                    start_year: (isTransistion && icontract === 1 ? start2Y : startY),
                    end_year: (isTransistion && icontract === 1 ? end2Y : endY),
                    prod_rate_baseline: gsaFluid.map(v => v.base ?? 0),
                    prod_rate: gsaFluid.map(v => v.production ?? 0),
                    lifting_rate: gsaFluid.map(v => v.vol ?? 0),
                    price: gsaFluid.map(v => v.price ?? 0),
                    prod_year: gsaFluid.map(v => v.year),
                    ghv: gsaFluid.map(v => v.ghv ?? 0),
                    fluid_type: "Gas",
                  }
                  : undefined,
              }
            }
          }
          else if (value.Tipe === 0) {
            const oilData = prod_price.filter(row => Pysc.is_number(row.sales) && +row.sales > 0)

            const condsData = prod_price.filter(row => Pysc.is_number(row.condensate_sales) && +row.condensate_sales > 0)

            if (oilData.length) {
              lifting = {
                ...lifting,
                [`${Object.values(Pysc.ProducerType)[value.Tipe]}${value.ProdNumber ? (` ${i + 1}`) : ''}`]: oilData.length
                  ? {
                    start_year: (isTransistion && icontract === 1 ? start2Y : startY),
                    end_year: (isTransistion && icontract === 1 ? end2Y : endY),
                    prod_rate_baseline: oilData.map(v => Pysc.toNumnber(v.base)),
                    prod_rate: null,
                    lifting_rate: oilData.map(v => Pysc.toNumnber(v.sales)),
                    price: oilData.map(v => Pysc.toNumnber(v.price)),
                    prod_year: oilData.map(v => Pysc.toNumnber(v.year)),
                    fluid_type: Object.values(Pysc.ProducerType)[value.Tipe],
                  }
                  : undefined,
              }
            }
            if (condsData.length) {
              lifting = {
                ...lifting,
                [`Condensate${value.ProdNumber ? (` ${i + 1}`) : ''}`]: condsData.length
                  ? {
                    start_year: (isTransistion && icontract === 1 ? start2Y : startY),
                    end_year: (isTransistion && icontract === 1 ? end2Y : endY),
                    prod_rate_baseline: condsData.map(v => Pysc.toNumnber(v.base)),
                    prod_rate: null,
                    lifting_rate: condsData.map(v => Pysc.toNumnber(v.condensate_sales)),
                    price: condsData.map(v => Pysc.toNumnber(v.condensate_price)),
                    prod_year: condsData.map(v => Pysc.toNumnber(v.year)),
                    fluid_type: Object.values(Pysc.ProducerType)[value.Tipe],
                  }
                  : undefined,
              }
            }
          }
          else {
            lifting = {
              ...lifting,
              [`${[2, 3].includes(value.Tipe) ? 'Gas ' : ''}${Object.values(Pysc.ProducerType)[value.Tipe]}${value.ProdNumber ? (` ${i + 1}`) : ''}`]: prod_price.length
                ? {
                  start_year: (isTransistion && icontract === 1 ? start2Y : startY),
                  end_year: (isTransistion && icontract === 1 ? end2Y : endY),
                  prod_rate_baseline: prod_price.map(v => Pysc.toNumnber(v.base)),
                  prod_rate: null,
                  lifting_rate: prod_price.map(v => Pysc.toNumnber(v.sales)),
                  price: prod_price.map(v => Pysc.toNumnber(v.price)),
                  prod_year: prod_price.map(v => Pysc.toNumnber(v.year)),
                  fluid_type: Object.values(Pysc.ProducerType)[value.Tipe],
                }
                : undefined,
            }
          }
        }
      })

      return lifting
    }

    const cost2Json = (name: string, tcost: number, icost: Array<number | string | null>[],
      isTransistion: boolean = false, icontract: number = 0,
    ) => {
      const toValue = (val: any, def: number | null = 0.0) => Pysc.is_number(val) ? Pysc.toNumnber(val) : def

      const cost_data = JSON.parse(JSON.stringify(icost)).filter(row => {
        return !isEmpty(row[0]) && !isEmpty(row[1]) && !isEmpty(row[2])
      })

      cost_data.sort((a, b) => a[0] - b[0])

      // add condisiton of delayed/Acc
      if (DelAccYear !== 0 && cost_data.length) {
        cost_data.map(c => {
          c[0] += DelAccYear
          if (tcost === 0 && Pysc.is_number(c[3]))
            c[3] += DelAccYear
        })

        // if (+dGConf.delayAccMode === 1) {
        const del_index = cost_data.findIndex(c => c[0] > (isTransistion ? end2Y : endY))
        if (del_index !== -1)
          cost_data.splice(del_index)

        // }

        // else if (dGConf.delayAccMode === 2) {
        //   const del_index = cost_data.findIndex(c => c[0] >= startY)
        //   if (del_index > 0)
        //     cost_data.splice(0, del_index)
        // }
      }

      if (isTransistion) {
        cost_data.splice(0, cost_data.length, ...cost_data.filter(row => {
          return Pysc.toNumnber(row[0]) >= (icontract === 1 ? start2Y : startY)
            && (icontract === 0 ? (Pysc.toNumnber(row[0]) <= endY) : true)
        }))

        const dM = [Pysc.useDayJs().utc(dGConf.end_date_project).local().date(), Pysc.useDayJs().utc(dGConf.end_date_project).local().month()]
        if (dM[0] !== 31 && dM[1] !== 12) {
          const factorD = Pysc.useDayJs().utc(dGConf.end_date_project).local().dayOfYear() / 365.0

          cost_data.splice(0, cost_data.length, ...cost_data.map(row => {
            if (row[0] === endY)
              row[2] *= (icontract === 0 ? factorD : (1 - factorD))

            return row
          }))
        }
      }

      if (!useCOS && tcost === 4)
        cost_data.splice(0)

      return {
        [`${name}`]: {
          "start_year": isTransistion && icontract === 1 ? start2Y : startY,
          "end_year": isTransistion && icontract === 1 ? end2Y : endY,
          [`${tcost === 2 ? 'fixed_cost' : 'cost'}`]: cost_data.length ? cost_data.map(e => toValue(e[2])) : [0.0],
          "expense_year": cost_data.length ? cost_data.map(e => toValue(e[0], null)) : (isTransistion && icontract === 1 ? [start2Y] : [startY]),
          "cost_allocation": cost_data.length ? cost_data.map(e => e[1] ?? 'Oil') : ['Oil'],
          ...(tcost === 4
            ? {}
            : {
              "description": cost_data.length ? cost_data.map(e => e.slice(-1)[0] ?? '-') : ['-'],
              "vat_portion": tcost !== 3 ? (cost_data.length ? cost_data.map(e => toValue(e.slice(tcost === 2 ? -3 : -2)[0])) : [0.0]) : (cost_data.length ? Array<number>(cost_data.length).fill(0.0) : [0.0]),
              "vat_discount": cost_data.length ? Array<number>(cost_data.length).fill(0.0) : [0.0],
              "lbt_portion": tcost === 2 || tcost === 5 ? (cost_data.length ? cost_data.map(e => toValue(e.slice(-2)[0])) : [0.0]) : (cost_data.length ? Array<number>(cost_data.length).fill(0.0) : [0.0]),
              "lbt_discount": cost_data.length ? Array<number>(cost_data.length).fill(0.0) : [0.0],
              "pis_year": tcost === 0 ? (cost_data.length ? cost_data.map(e => toValue(e[3], null)) : [0.0]) : undefined,
              "salvage_value": tcost === 0 ? (cost_data.length ? Array<number>(cost_data.length).fill(0.0) : [0.0]) : undefined,
              "useful_life": tcost === 0 ? (cost_data.length ? cost_data.map(e => toValue(e[4], 0)) : [0.0]) : undefined,
              "depreciation_factor": tcost === 0 ? (cost_data.length ? cost_data.map(e => toValue(e[5])) : [0.0]) : undefined,
              "is_ic_applied": tcost === 0 ? (cost_data.length ? cost_data.map(e => e[6] === 'Yes') : [false]) : undefined,
              "prod_rate": tcost === 2 ? (cost_data.length ? cost_data.map(e => toValue(e[3])) : [0.0]) : undefined,
              "cost_per_volume": tcost === 2 ? (cost_data.length ? cost_data.map(e => toValue(e[4])) : [0.0]) : undefined,
            }),
        },
      }
    }

    const vlifting = (type_of_contract < 3
      ? lifting2Json(dProd, !!Gas)
      : {
        first: lifting2Json(dProd, !!Gas, true, 0),
        second: lifting2Json(dProd, !!Gas, true, 1),
      })

    const vtangible = (type_of_contract < 3
      ? cost2Json(appStore.projects[caseIndex].name, 0, dTan)
      : {
        first: cost2Json(appStore.projects[caseIndex].name, 0, dTan, true, 0),
        second: cost2Json(appStore.projects[caseIndex].name, 0, dTan, true, 1),
      })

    const vintangible = (type_of_contract < 3
      ? cost2Json(appStore.projects[caseIndex].name, 1, dIntan)
      : {
        first: cost2Json(appStore.projects[caseIndex].name, 1, dIntan, true, 0),
        second: cost2Json(appStore.projects[caseIndex].name, 1, dIntan, true, 1),
      })

    const vopex = (type_of_contract < 3
      ? cost2Json(appStore.projects[caseIndex].name, 2, dOpex)
      : {
        first: cost2Json(appStore.projects[caseIndex].name, 2, dOpex, true, 0),
        second: cost2Json(appStore.projects[caseIndex].name, 2, dOpex, true, 1),
      })

    const vasr = (type_of_contract < 3
      ? cost2Json(appStore.projects[caseIndex].name, 3, dASR)
      : {
        first: cost2Json(appStore.projects[caseIndex].name, 3, dASR, true, 0),
        second: cost2Json(appStore.projects[caseIndex].name, 3, dASR, true, 1),
      })

    const vcos = (type_of_contract < 3
      ? cost2Json(appStore.projects[caseIndex].name, 4, dCOS)
      : {
        first: cost2Json(appStore.projects[caseIndex].name, 4, dCOS, true, 0),
        second: cost2Json(appStore.projects[caseIndex].name, 4, dCOS, true, 1),
      })

    const vlbt = (type_of_contract < 3
      ? cost2Json(appStore.projects[caseIndex].name, 5, dLBT)
      : {
        first: cost2Json(appStore.projects[caseIndex].name, 5, dLBT, true, 0),
        second: cost2Json(appStore.projects[caseIndex].name, 5, dLBT, true, 1),
      })

    let oil_onstream_date_ = Oil ? Pysc.useDayJs().utc(Oil.onstream_date).local().add(DelAccYear, 'year') : null
    let gas_onstream_date_ = Gas ? Pysc.useDayJs().utc(Gas.onstream_date).local().add(DelAccYear, 'year') : null
    if (+(dGConf.delayAccMode ?? 0) >= 1 && oil_onstream_date_ && oil_onstream_date_.year() < startY)
      oil_onstream_date_ = oil_onstream_date_.year(startY)
    if (+(dGConf.delayAccMode ?? 0) >= 1 && gas_onstream_date_ && gas_onstream_date_.year() < startY)
      gas_onstream_date_ = gas_onstream_date_.year(startY)
    if (type_of_contract === 0) {
      jsonres = {
        ...jsonres,
        setup: {
          start_date: useDate ? Pysc.useDayJs().utc(dGConf.start_date_project).local().format('DD/MM/YYYY') : dGConf.start_date_project,
          end_date: useDate ? Pysc.useDayJs().utc(dGConf.end_date_project).local().format('DD/MM/YYYY') : dGConf.end_date_project,
          oil_onstream_date: oil_onstream_date_ ? (useDate ? oil_onstream_date_.format('DD/MM/YYYY') : oil_onstream_date_) : null,
          gas_onstream_date: gas_onstream_date_ ? (useDate ? gas_onstream_date_.format('DD/MM/YYYY') : gas_onstream_date_) : null,
        },

        contract_arguments: {
          sulfur_revenue: Pysc.OthRevType.OthRev2,
          electricity_revenue: Pysc.OthRevType.OthRev1,
          co2_revenue: Pysc.OthRevType.OthRev2,
          sunk_cost_reference_year: startY,
          vat_rate: 0.0,
          lbt_rate: 0.0,
          inflation_rate: 0.0,
          future_rate: 0.0,
          inflation_rate_applied_to: Pysc.InflateToType.Capex,
          sum_undepreciated_cost: true,
        }, // contrArg2json(dFisc.Fiskal, true, dGConf, true ? dContr.cr.dmo_is_weighted : dContr.gs.dmo_is_weighted, !!Gas),
        summary_arguments: {
          reference_year: startY,

          inflation_rate: 0.0,
          discount_rate: 0.0,
          npv_mode: Pysc.NVPType.NPV1,
          discounting_mode: Pysc.DiscType.End,
          profitability_discounted: false,
        },
        lifting: vlifting,
        tangible: vtangible,
        intangible: vintangible,
        opex: vopex,
        asr: vasr,
        lbt: vlbt,
        cost_of_sales: {},
      }
    }
    else if (type_of_contract < 3) {
      jsonres = {
        ...jsonres,
        setup: {
          start_date: useDate ? Pysc.useDayJs().utc(dGConf.start_date_project).local().format('DD/MM/YYYY') : dGConf.start_date_project,
          end_date: useDate ? Pysc.useDayJs().utc(dGConf.end_date_project).local().format('DD/MM/YYYY') : dGConf.end_date_project,
          oil_onstream_date: oil_onstream_date_ ? (useDate ? oil_onstream_date_.format('DD/MM/YYYY') : oil_onstream_date_) : null,
          gas_onstream_date: gas_onstream_date_ ? (useDate ? gas_onstream_date_.format('DD/MM/YYYY') : gas_onstream_date_) : null,
        },
        summary_arguments: {
          reference_year: +dGConf.discount_rate_start_year,
          inflation_rate: dFisc.Fiskal.Inflation.inflation_rate_mode === 1 ? table2Array(dFisc.Fiskal.Inflation.multi_inflation_init, startY, endY) : +dFisc.Fiskal.Inflation.inflation_rate_init,
          discount_rate: Pysc.toNumnber(dGConf.discount_rate),
          npv_mode: Object.values(Pysc.NVPType)[dFisc.Fiskal.npv_mode],
          discounting_mode: Object.values(Pysc.DiscType)[dFisc.Fiskal.discounting_mode],
          profitability_discounted: dFisc.Fiskal.profitability_discounted ?? false,
        },
        costrecovery: type_of_contract === 1 ? cr2json(dContr.cr, !!Gas) : undefined,
        grosssplit: type_of_contract === 2 ? gs2json(dContr.gs, !!Gas) : undefined,
        contract_arguments: contrArg2json(dFisc.Fiskal, type_of_contract === 1, dGConf, type_of_contract === 1 ? dContr.cr.dmo_is_weighted : dContr.gs.dmo_is_weighted, !!Gas),
        lifting: vlifting,
        tangible: vtangible,
        intangible: vintangible,
        opex: vopex,
        asr: vasr,
        lbt: vlbt,
        cost_of_sales: type_of_contract === 1 ? vcos : {},
      }
    }
    else if (type_of_contract >= 3) {
      jsonres = {
        ...jsonres,
        contract_1: {
          setup: {
            start_date: useDate ? Pysc.useDayJs().utc(dGConf.start_date_project).local().format('DD/MM/YYYY') : dGConf.start_date_project,
            end_date: useDate ? Pysc.useDayJs().utc(dGConf.end_date_project).local().format('DD/MM/YYYY') : dGConf.end_date_project,
            oil_onstream_date: null, // Oil ? (useDate ? Pysc.useDayJs().utc(Oil.onstream_date).local().format('DD/MM/YYYY') : Oil.onstream_date) : null,
            gas_onstream_date: null, // Gas ? (useDate ? Pysc.useDayJs().utc(Gas.onstream_date).local().format('DD/MM/YYYY') : Gas.onstream_date) : null,
          },
          costrecovery: [3, 4].includes(type_of_contract) ? cr2json(dContr.cr, !!Gas) : null,
          grosssplit: [5, 6].includes(type_of_contract) ? gs2json(dContr.gs, !!Gas, 0) : null,
          contract_arguments: contrArg2json(dFisc.Fiskal, [3, 4].includes(type_of_contract), dGConf,
            ([3, 4].includes(type_of_contract) ? dContr.cr : dContr.gs).dmo_is_weighted, !!Gas,
            true, 0),
          lifting: vlifting.first,
          tangible: vtangible.first,
          intangible: vintangible.first,
          opex: vopex.first,
          asr: vasr.first,
          lbt: vlbt.first,
          cost_of_sales: [3, 4].includes(type_of_contract) ? vcos.first : {},
        },
        contract_2: {
          setup: {
            start_date: useDate ? Pysc.useDayJs().utc(dGConf.start_date_project_second).local().format('DD/MM/YYYY') : dGConf.start_date_project_second,
            end_date: useDate ? Pysc.useDayJs().utc(dGConf.end_date_project_second).local().format('DD/MM/YYYY') : dGConf.end_date_project_second,
            oil_onstream_date: null, // Oil ? (useDate ? Pysc.useDayJs().utc(Oil.onstream_date).local().format('DD/MM/YYYY') : Oil.onstream_date) : null,
            gas_onstream_date: null, // Gas ? (useDate ? Pysc.useDayJs().utc(Gas.onstream_date).local().format('DD/MM/YYYY') : Gas.onstream_date) : null,
          },
          costrecovery: [3, 6].includes(type_of_contract) ? cr2json(<Pysc.costRec>dContr.second, !!Gas) : null,
          grosssplit: [4, 5].includes(type_of_contract) ? gs2json(<Pysc.GS>dContr.second, !!Gas, 1) : null,
          contract_arguments: contrArg2json(dFisc.Fiskal2, [3, 6].includes(type_of_contract), dGConf,
            ([3, 6].includes(type_of_contract) ? <Pysc.costRec>dContr.second : <Pysc.GS>dContr.second).dmo_is_weighted, !!Gas,
            true, 1),
          lifting: vlifting.second,
          tangible: vtangible.second,
          intangible: vintangible.second,
          opex: vopex.second,
          asr: vasr.second,
          lbt: vlbt.second,
          cost_of_sales: [3, 6].includes(type_of_contract) ? vcos.second : {},
        },
        "contract_arguments": {
          unrec_portion: dFisc.Fiskal2.transferred_unrec_cost,
        },
        "summary_arguments": {
          reference_year: dGConf.discount_rate_start_year,
          inflation_rate: dFisc.Fiskal.Inflation.inflation_rate_mode === 1 ? table2Array(dFisc.Fiskal.Inflation.multi_inflation_init, startY, endY) : Pysc.toNumnber(dFisc.Fiskal.Inflation.inflation_rate_init),
          discount_rate: Pysc.toNumnber(dGConf.discount_rate),
          npv_mode: Object.values(Pysc.NVPType)[dFisc.Fiskal.npv_mode],
          discounting_mode: Object.values(Pysc.DiscType)[dFisc.Fiskal.discounting_mode],
          profitability_discounted: dFisc.Fiskal.profitability_discounted ?? false,
        },
      }
    }

    return jsonres
  }

  const curCase2Json = (useDate: boolean = true) => {
    return makeJSONofCase(appStore.curSelCase,
      PyscConf.dataGConf, PyscConf.dataProd, PyscConf.dataContr, PyscConf.dataFisc,
      PyscConf.dataTan, PyscConf.dataIntan, PyscConf.dataOpex, PyscConf.dataASR, PyscConf.dataCOS, PyscConf.dataLBT,
      useDate)
  }

  const canAccessByCaseType = (access: number[] | undefined) => {
    if (access)
      return access.includes(appStore.selectedCase.type) && (PyscConf.dataGConf.useCOS ?? false)

    return true
  }

  const canAccessByType = (access: number[] | undefined) => {
    if (access)
      return access.includes(appStore.selectedCase.type)

    return true
  }

  return {
    resetDataStore,
    extractProject,
    loadDataModule,
    applyCase,
    useWatchCaseID,
    newProject,
    openProject,
    saveProject,
    expJsonProject,
    expXlsxProject,
    importFrPySC,

    changeCtrType,
    canAccessByType,
    canAccessByCaseType,

    addCase,
    cloneCase,
    delCase,
    updateCase,
    saveCaseData,
    addOptimCase,

    table2Array,
    makeJSONofCase,
    curCase2Json,
  }
}

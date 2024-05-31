import { useAppStore } from '@/stores/appStore';
import { usePyscConfStore } from '@/stores/genfisStore';
import { tmonteConfig, usePyscMonteStore } from '@/stores/monteStore';
import { optimCfg, usePyscOptimStore } from '@/stores/optimStore';
import { usePyscSensStore } from '@/stores/sensStore';
import * as Pysc from '@/utils/pysc/pyscType';

export const useDataStore = () => {
  const appStore = useAppStore()
  const PyscConf = usePyscConfStore()
  const PyscSens = usePyscSensStore()
  const PyscMonte = usePyscMonteStore()
  const PyscOptim = usePyscOptimStore()

  const dayjs = Pysc.useDayJs()

  const execPartData = async (url: string, mode: string, param: object) => {
    const result = await $api(url, {
      params: param,
      method: mode,
      onResponseError({ response }) {
        throw { status: response.status, error: response._data.detail }
      },
    })
    return result
  }

  const useWatchCaseID = (_callback: Function) => {
    const curSelCase = computed(() => appStore.curSelCase)
    const watcherSelCase = computed(() => appStore.watcherSelCase.isActive)
    const watchCaseID = pausableWatch(curSelCase, (value, oldValue) => {
      if (watcherSelCase.value) _callback(value)
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
        if (watcherSelCase.value) _callback(curSelCase.value)
      })
    }

    watch(watcherSelCase, (value) => {
      if (value) {
        resumeCaseID()
        _callback(curSelCase.value)
      }
      else
        pauseCaseID()
    }, { deep: true })

    return {
      stopCaseID,
      resumeCaseID,
      pauseCaseID,
      CallableFunc
    }
  }

  const resetDataStore = (newVer: number, newWS: string, _incVer: boolean = true, _incProjPath: boolean = false) => {
    appStore.$patch((state) => {
      PyscConf.$patch((state) => {
        state.tangible.splice(0, state.tangible.length, ...[Array(9).fill(null)])
        state.intangible.splice(0, state.intangible.length, ...[Array(5).fill(null)])
        state.opex.splice(0, state.opex.length, ...[Array(8).fill(null)])
        state.asr.splice(0, state.asr.length, ...[Array(4).fill(null)])

        state.generalConfig = JSON.parse(JSON.stringify(Pysc.defGenConfig()))
        state.producer = JSON.parse(JSON.stringify(Pysc.defProdConfig()))
        state.fiscal = JSON.parse(JSON.stringify(Pysc.defFiskal()))
        state.contracts = JSON.parse(JSON.stringify(Pysc.defContracts()))
      })

      PyscSens.$patch((state) => {
        state.sensConfig.splice(0, state.sensConfig.length, ...[80, 80])
      })
      PyscMonte.$patch((state) => {
        state.monteConfig = JSON.parse(JSON.stringify(PyscMonte.defParam))
      })

      PyscOptim.$patch((state) => {
        state.optimConfig = JSON.parse(JSON.stringify(PyscOptim.defOptimCfg()))
      })

      if (_incVer) state.appver = newVer
      state.curWS = newWS
      state.curProject = null
      if (_incProjPath) state.curProjectPath = null
      const _id = Math.floor(Math.random() * (2000000 - 1000)) + 1000;
      state.projects.splice(0, state.projects.length, ...[
        { id: _id, name: "Case-1", type: 1, description: 'tes case 1', updated_at: dayjs.utc().valueOf(), state: 1, multicase: [] },
      ])
      //put in last 
      state.curSelCase = _id
    })
  }

  const applyCase = async (wsPath: string, _caselists: Pysc.ProjectBase[] = [], dataOnly: boolean = false) => {
    //check curselID
    interface dataEco {
      tangible: Array<number | string | null>[]
      intangible: Array<number | string | null>[]
      opex: Array<number | string | null>[]
      asr: Array<number | string | null>[]

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
      genConf: Pysc.defGenConfig(),
      producer: Pysc.defProdConfig(),
      fiscal: Pysc.defFiskal(),
      contracts: Pysc.defContracts(),
    }

    const DataSens = { params: [80, 80] }
    const DataMonte = { params: JSON.parse(JSON.stringify(PyscMonte.defParam)) }
    const DataOptim = { params: JSON.parse(JSON.stringify(PyscOptim.defOptimCfg())) }

    let DataLoaded = false
    const cases = dataOnly ? appStore.projects : _caselists
    let curSelCase = typeof appStore.curSelCase === 'string' ? +appStore.curSelCase : appStore.curSelCase
    if (cases.findIndex(el => el.id === curSelCase) === -1)
      curSelCase = cases[0].id
    try {
      let resInit = await execPartData('/auth/rdgenconf', 'GET', { wspath: wsPath, caseid: curSelCase })
      if (resInit.state !== true) throw "error rdgenconf"
      DataEco.genConf = JSON.parse(JSON.stringify(resInit.data))

      resInit = await execPartData('/auth/rdfiscalconf', 'GET', { wspath: wsPath, caseid: curSelCase })
      if (resInit.state !== true) throw "error rdfiscalconf"
      DataEco.fiscal = JSON.parse(JSON.stringify(resInit.data))

      resInit = await execPartData('/auth/rdproducer', 'GET', { wspath: wsPath, caseid: curSelCase })
      if (resInit.state !== true) throw "error rdproducer"
      DataEco.producer = JSON.parse(JSON.stringify(resInit.data))

      resInit = await execPartData('/auth/rdcontracts', 'GET', { wspath: wsPath, caseid: curSelCase })
      if (resInit.state !== true) throw "error rdcontracts"
      DataEco.contracts = JSON.parse(JSON.stringify(resInit.data))

      resInit = await execPartData('/auth/rdcosts', 'GET', { wspath: wsPath, mode: 0, caseid: curSelCase })
      if (resInit.state !== true) throw "error rdcosts(0)"
      DataEco.tangible = JSON.parse(JSON.stringify(resInit.data))

      resInit = await execPartData('/auth/rdcosts', 'GET', { wspath: wsPath, mode: 1, caseid: curSelCase })
      if (resInit.state !== true) throw "error rdcosts(1)"
      DataEco.intangible = JSON.parse(JSON.stringify(resInit.data))

      resInit = await execPartData('/auth/rdcosts', 'GET', { wspath: wsPath, mode: 2, caseid: curSelCase })
      if (resInit.state !== true) throw "error rdcosts(2)"
      DataEco.opex = JSON.parse(JSON.stringify(resInit.data))

      resInit = await execPartData('/auth/rdcosts', 'GET', { wspath: wsPath, mode: 3, caseid: curSelCase })
      if (resInit.state !== true) throw "error rdcosts(3)"
      DataEco.asr = JSON.parse(JSON.stringify(resInit.data))

      //sensitivity
      resInit = await execPartData('/auth/rdsens', 'GET', { wspath: wsPath, caseid: curSelCase })
      DataSens.params = JSON.parse(JSON.stringify(resInit.data))
      //montecarlo
      resInit = await execPartData('/auth/rdmonte', 'GET', { wspath: wsPath, caseid: curSelCase })
      DataMonte.params = JSON.parse(JSON.stringify(resInit.data))
      //optim
      resInit = await execPartData('/auth/rdoptim', 'GET', { wspath: wsPath, caseid: curSelCase })
      DataOptim.params = JSON.parse(JSON.stringify(resInit.data))

      DataLoaded = true

    } catch (error) {
      console.log(error)
    }

    //apply data cases
    const applyData = () => {
      if (DataLoaded) {
        PyscConf.$patch((state) => {
          state.tangible.splice(0, state.tangible.length, ...JSON.parse(JSON.stringify(DataEco.tangible)))
          state.intangible.splice(0, state.intangible.length, ...JSON.parse(JSON.stringify(DataEco.intangible)))
          state.opex.splice(0, state.opex.length, ...JSON.parse(JSON.stringify(DataEco.opex)))
          state.asr.splice(0, state.asr.length, ...JSON.parse(JSON.stringify(DataEco.asr)))

          state.generalConfig = JSON.parse(JSON.stringify(DataEco.genConf))
          state.producer.splice(0, state.producer.length, ...JSON.parse(JSON.stringify(DataEco.producer)))
          state.fiscal = JSON.parse(JSON.stringify(DataEco.fiscal))
          state.contracts = JSON.parse(JSON.stringify(DataEco.contracts))
        })

        PyscSens.$patch((state) => {
          state.sensConfig.splice(0, state.sensConfig.length, ...DataSens.params)
        })

        PyscMonte.$patch((state) => {
          state.monteConfig = JSON.parse(JSON.stringify(DataMonte.params))
        })

        PyscOptim.$patch((state) => {
          state.optimConfig = JSON.parse(JSON.stringify(DataOptim.params))
        })
      }
    }

    if (dataOnly)
      applyData()
    else
      appStore.$patch((state) => {
        appStore.curSelCase = curSelCase
        state.projects.splice(0, state.projects.length, ...cases)
        applyData()
      })
  }

  const saveCaseData = async (curWS: string, caseID: number,
    gConf: Pysc.genConfig, producer: Pysc.producerConfig[], contracts: Pysc.Contracts, fiscal: Pysc.Fiskal,
    tangible: Array<number | string | null>[], intangible: Array<number | string | null>[],
    opex: Array<number | string | null>[], asr: Array<number | string | null>[],
    sensConfig: number[],
    monteConfig: tmonteConfig,
    optimComfig: optimCfg) => {
    try {
      await execPartData('/auth/wrtgenconf', 'POST', {
        wspath: curWS,
        caseid: caseID,
        gc: btoa(JSON.stringify(gConf))
      })
    } catch (err) { }
    try {
      await execPartData('/auth/wrtfiscalconf', 'POST', {
        wspath: curWS,
        caseid: caseID,
        gc: btoa(JSON.stringify(fiscal))
      })
    } catch (err) { }
    try {
      await execPartData('/auth/wrtproducer', 'POST', {
        wspath: curWS,
        caseid: caseID,
        gc: btoa(JSON.stringify(producer))
      })
    } catch (err) { }
    try {
      await execPartData('/auth/wrtcontract', 'POST', {
        wspath: curWS,
        caseid: caseID,
        gc: btoa(JSON.stringify(contracts))
      })
    } catch (err) { }
    try {
      await execPartData('/auth/wrtcost', 'POST', {
        wspath: curWS,
        caseid: caseID,
        mode: 0, gc: btoa(JSON.stringify(tangible))
      })
    } catch (err) { }
    try {
      await execPartData('/auth/wrtcost', 'POST', {
        wspath: curWS,
        caseid: caseID,
        mode: 1, gc: btoa(JSON.stringify(intangible))
      })
    } catch (err) { }
    try {
      await execPartData('/auth/wrtcost', 'POST', {
        wspath: curWS,
        caseid: caseID,
        mode: 2, gc: btoa(JSON.stringify(opex))
      })
    } catch (err) { }
    try {
      await execPartData('/auth/wrtcost', 'POST', {
        wspath: curWS,
        caseid: caseID,
        mode: 3, gc: btoa(JSON.stringify(asr))
      })
    } catch (err) { }

    // sensitivity
    try {
      await execPartData('/auth/wrtsens', 'POST', {
        wspath: curWS,
        caseid: caseID,
        gc: btoa(JSON.stringify(sensConfig))
      })
    } catch (err) { }
    //montecarlo
    try {
      await execPartData('/auth/wrtmonte', 'POST', {
        wspath: curWS,
        caseid: caseID,
        gc: btoa(JSON.stringify(monteConfig))
      })
    } catch (err) { }
    //optimasi
    try {
      await execPartData('/auth/wrtoptim', 'POST', {
        wspath: curWS,
        caseid: caseID,
        gc: btoa(JSON.stringify(optimComfig))
      })
    } catch (err) { }


  }


  const extractProject = async (projSource: string | null, wsPath: string, _oldwsPath: string | null = null) => {
    let resExtract = { state: false, cases: [] }
    if (typeof projSource === 'string' && !isEmpty(projSource)) {
      resExtract = await $api('/auth/extractproject', {
        params: {
          data: btoa(JSON.stringify({
            path: projSource,
            oldWS: _oldwsPath ?? appStore.curWS,
            newWS: wsPath
          }))
        },
        method: 'POST',
        onResponseError({ response }) {
          throw { state: response._data.detail ?? false }
        },
      })
      resExtract = isObject(resExtract) && resExtract.hasOwnProperty("state") ? resExtract : { state: false, cases: [] }
    }
    if (resExtract.state === true && resExtract.hasOwnProperty("cases") && resExtract.cases.length) {
      await applyCase(wsPath, JSON.parse(JSON.stringify(resExtract.cases)))
    } else {

    }
    return resExtract.state
  }


  const newProject = async () => {
    const oldWS = appStore.curWS
    const newWS = "D" + Math.random().toString(36).slice(2)
    appStore.watcherSelCase.pause()
    PyscConf.watcherAllData.pause()
    try {
      resetDataStore(appStore.appver, newWS, false, true)
      //warite case and clear old temp project
      let resInit = await execPartData('/auth/newproject', 'POST', {
        wspath: newWS,
        data: btoa(JSON.stringify(appStore.projects))
      })
      resInit = await execPartData('/auth/clearprojtmp', 'POST', { wspath: oldWS })
    } catch (err) {
    }
    appStore.watcherSelCase.resume()
    PyscConf.watcherAllData.resume()
  }

  const openProject = async (path: string) => {
    let dataLoaded = false
    const newWS = "D" + Math.random().toString(36).slice(2)

    appStore.watcherSelCase.pause()
    PyscConf.watcherAllData.pause()
    try {
      const extractState: any = await extractProject(path, newWS, appStore.curWS)
      dataLoaded = extractState === true
      if (dataLoaded)
        appStore.showAlert({
          text: { name: "Data loaded successfully" },
          isalert: false
        })
      else throw extractState
    } catch (err) {
      const error = isObject(err) && err.hasOwnProperty('state') ? err.state : err
      const errorStatus = Array.isArray(error) && error.length === 2 ? error[0] : ''
      const errorMsg = Array.isArray(error) && error.length === 2 ? error[1] : (typeof error === 'string' && error.toLowerCase().indexOf("<html") === -1 ? error : "Error while loading data")
      appStore.showAlert({
        text: `Error ${errorStatus}: ${errorMsg}`,
        isalert: true
      })
      dataLoaded = false
    }
    if (dataLoaded)
      appStore.$patch((state) => {
        state.curWS = newWS
        state.curProjectPath = path
      })

    appStore.watcherSelCase.resume()
    PyscConf.watcherAllData.resume()
    return dataLoaded
  }

  const saveProject = async (path: string) => {

    let validSave = false
    const curWS = !isEmpty(appStore.curWS) ? appStore.curWS : ("D" + Math.random().toString(36).slice(2))
    appStore.watcherSelCase.pause()
    PyscConf.watcherAllData.pause()
    try {
      //save cases
      const wrtcases = await execPartData('/auth/wrtcases', 'POST', {
        pathfile: curWS,
        istmp: 1,
        gc: btoa(JSON.stringify(appStore.projects))
      })
      if (isEmpty(appStore.curWS) || appStore.selectedCase.state === 1) {
        await saveCaseData(curWS, appStore.curSelCase,
          PyscConf.generalConfig, PyscConf.producer, PyscConf.contracts, PyscConf.fiscal,
          PyscConf.tangible, PyscConf.intangible,
          PyscConf.opex, PyscConf.asr,
          PyscSens.sensConfig,
          PyscMonte.monteConfig,
          PyscOptim.optimConfig)
      }

      const wrtproject = await execPartData('/auth/wrtproject', 'POST', {
        wspath: curWS,
        targetfile: btoa(path)
      })
      if (wrtproject.state !== true) throw "save data failed"

      appStore.showAlert({
        text: { name: 'Project saved to', arg: [path] },
        isalert: false
      })

      appStore.$patch((state) => {
        state.curWS = curWS
        state.curProjectPath = path
        state.projects.forEach(el => el.state = 0)
      })
      validSave = true
    } catch (err) {
      const error = isObject(err) && err.hasOwnProperty('state') ? err.state : err
      const errorStatus = Array.isArray(error) && error.length === 2 ? error[0] : ''
      const errorMsg = Array.isArray(error) && error.length === 2 ? error[1] : (typeof error === 'string' && error.toLowerCase().indexOf("<html") === -1 ? error : "save data failed")
      appStore.showAlert({
        text: `Error ${errorStatus}: ${errorMsg}`,
        isalert: true
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

    //chk
    const curWS = !isEmpty(appStore.curWS) ? appStore.curWS : ("D" + Math.random().toString(36).slice(2))
    let dataLoaded = false
    const newcaseID = caseLst.map(el => Math.floor(Math.random() * (2000000 - 1000)) + 1000)

    appStore.watcherSelCase.pause()
    PyscConf.watcherAllData.pause()
    try {
      const resImport = await execPartData("/auth/importcase", "POST", { wspath: curWS, data: btoa(JSON.stringify({ path: pathfile, caseid: caseLst, newcaseid: newcaseID })) })
      if (resImport.state !== true) throw resImport

      const selCase = resImport.selcase

      // change case id
      selCase.forEach((el: any, index: number) => el.id = newcaseID[index])
      //merge with current case
      appStore.$patch((state) => {
        state.projects.push(...JSON.parse(JSON.stringify(selCase)))
      })
      //save caselist
      const resSaveCase = await execPartData("/auth/wrtcases", "POST", {
        pathfile: curWS,
        istmp: 1,
        gc: btoa(JSON.stringify(appStore.projects))
      })
      if (resImport.state !== true) throw resSaveCase

      dataLoaded = true

      appStore.showAlert({
        text: { name: "Data imported successfully" },
        isalert: false
      })
    } catch (err) {
      const error = isObject(err) && err.hasOwnProperty('state') ? err.state : err
      const errorStatus = Array.isArray(error) && error.length === 2 ? error[0] : ''
      const errorMsg = Array.isArray(error) && error.length === 2 ? error[1] : (typeof error === 'string' && error.toLowerCase().indexOf("<html") === -1 ? error : "Import data failed")
      appStore.showAlert({
        text: `Error ${errorStatus}: ${errorMsg}`,
        isalert: true
      })
    }
    appStore.watcherSelCase.resume()
    PyscConf.watcherAllData.resume()
    return dataLoaded
  }

  const addCase = async (param: Pysc.ProjectBase) => {
    appStore.watcherSelCase.pause()
    appStore.$patch((state) => {
      state.projects.push(JSON.parse(JSON.stringify(param)))
    })
    try {
      //save caselist
      await execPartData("/auth/wrtcases", "POST", {
        pathfile: appStore.curWS,
        istmp: 1,
        gc: btoa(JSON.stringify(appStore.projects))
      })
      const ngc = Pysc.defGenConfig()
      ngc.type_of_contract = param.type
      const ctr = Pysc.defContracts()
      if (ngc.type_of_contract >= 3) {
        if ([3, 6].includes(ngc.type_of_contract))
          ctr.second = Object.assign({}, JSON.parse(JSON.stringify(ctr.cr)))
        else
          ctr.second = Object.assign({}, JSON.parse(JSON.stringify(ctr.gs)))
      }
      await saveCaseData(appStore.curWS, param.id,
        ngc, Pysc.defProdConfig(), ctr, Pysc.defFiskal(),
        [Array(9).fill(null)], [Array(5).fill(null)], [Array(8).fill(null)], [Array(4).fill(null)],
        [80, 80], JSON.parse(JSON.stringify(PyscMonte.defParam)), JSON.parse(JSON.stringify(PyscOptim.defOptimCfg())))

    } catch (err) {

    }
    if (!appStore.watcherSelCase.isActive) appStore.watcherSelCase.resume()
    if (!PyscConf.watcherAllData.isActive) PyscConf.watcherAllData.resume()
    nextTick(() => {
      appStore.$patch((state) => {
        state.curSelCase = param.id
      })
    })
  }

  const cloneCase = async (param: Pysc.ProjectBase, cloneID: any) => {
    appStore.watcherSelCase.pause()
    try {
      await execPartData("/auth/clonecase", "POST", {
        wspath: appStore.curWS,
        sourceid: cloneID,
        targetid: param.id,
        ctrType: param.type,
        typechg: appStore.projects[appStore.projects.findIndex(v => v.id === cloneID)].type !== param.type
      })
    } catch (err) { }
    appStore.$patch((state) => {
      state.projects.push(JSON.parse(JSON.stringify(param)))
    })
    appStore.watcherSelCase.resume()
    nextTick(() => {
      appStore.$patch((state) => {
        state.curSelCase = param.id
      })
    })
  }

  const delCase = async (caseID: number) => {
    if (appStore.projects.length === 1) return;
    appStore.watcherSelCase.pause()
    PyscConf.watcherAllData.pause()
    const oldCaseID = appStore.curSelCase
    try {
      appStore.$patch((state) => {
        const caseindex = state.projects.findIndex(v => v.id === caseID)
        state.projects.splice(caseindex, 1)
        if (oldCaseID === caseID) {
          if (caseindex + 1 < state.projects.length)
            state.curSelCase = state.projects[caseindex + 1].id
          else if (caseindex - 1 >= 0)
            state.curSelCase = state.projects[caseindex - 1].id
        }
      })
      //save project list
      await execPartData("/auth/wrtcases", "POST", {
        pathfile: appStore.curWS,
        istmp: 1,
        gc: btoa(JSON.stringify(appStore.projects))
      })
    } catch (err) {
    }
    if (oldCaseID != appStore.curSelCase) {
      //load data
      if (typeof appStore.mainCallbackCaseID === 'function') {
        await appStore.mainCallbackCaseID(appStore.curSelCase, -1)
      }
    }
    appStore.watcherSelCase.resume()
    PyscConf.watcherAllData.resume()
  }

  const changeCtrType = (mode: number, value: number, oldValue: number) => {
    if (value != oldValue) {
      appStore.$patch((state) => {
        if (mode === 1) //from genconf
          state.projects[appStore.IndexCase].type = value
        state.projects[appStore.IndexCase].state = 1
      })
      PyscConf.$patch((state) => {
        if (mode === 0) //from case of project
          state.generalConfig.type_of_contract = value
        if (value >= 3) {
          if ([3, 6].includes(value)) {
            if (!(state.contracts.second?.hasOwnProperty('oil_ftp')))
              state.contracts.second = Object.assign({}, JSON.parse(JSON.stringify(state.contracts.cr)))
          } else if ([4, 5].includes(value)) {
            if (!(state.contracts.second?.hasOwnProperty('field_status')))
              state.contracts.second = Object.assign({}, JSON.parse(JSON.stringify(state.contracts.gs)))
          }
        } else {
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
      appStore.$patch((state) => {
        state.projects[projIndex] = Object.assign({}, JSON.parse(JSON.stringify(param)))
        if (param.id === appStore.curSelCase)
          state.projects[projIndex].state = 1
      })

      if (castTypeChg) {
        if (param.id === appStore.curSelCase)
          changeCtrType(0, param.type, oldCtrType)
        else {
          //change in file
          try {
            await execPartData("/auth/chgctrtype", "POST", {
              wspath: appStore.curWS,
              sourceid: param.id,
              oldCtrType: oldCtrType,
              newCtrType: param.type,
            })
          } catch (err) { }
        }
      }
      //save caselist
      await execPartData("/auth/wrtcases", "POST", {
        pathfile: appStore.curWS,
        istmp: 1,
        gc: btoa(JSON.stringify(appStore.projects))
      })
    } catch (err) { }
    appStore.watcherSelCase.resume()
  }

  const table2Array = (table: any[], istartY: number, iendY: number, keys: string[] = ["year", "rate"]) => {
    //filter not unempty row
    const rateTab: Pysc.GlobalTabValue[] = JSON.parse(JSON.stringify(table)).filter(row => !isEmpty(row[keys[0]]) && !isEmpty(row[keys[1]]))
    rateTab.sort((a, b) => a[keys[0]] - b[keys[0]])
    const mapY = Array.from({ length: iendY - istartY + 1 }, (_, i) => (istartY - 1) + i + 1)
    let retvalue = Array<number | null>(iendY - istartY + 1).fill(0.0)
    rateTab.forEach((y, idx) => {
      if (y[keys[0]] && y[keys[0]] < istartY) retvalue = retvalue.fill(y[keys[1]])
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
    dOpex: Array<number | string | null>[], dASR: Array<number | string | null>[],
    useDate: boolean = true) => {
    const caseIndex = appStore.projects.findIndex(e => e.id === id)
    let jsonres = {}
    if (caseIndex === -1) return jsonres

    const getProducer = (tipe: typeof Pysc.ProducerType[keyof typeof Pysc.ProducerType]) => {
      const selProd = dProd.filter(item => item.Tipe == Object.keys(Pysc.ProducerType).indexOf(tipe))
      return selProd.length ? selProd[0] : null
    }

    const Oil = getProducer(Pysc.ProducerType.Oil)
    const Gas = getProducer(Pysc.ProducerType.Gas)

    const type_of_contract = dGConf.type_of_contract
    const startY = Pysc.useDayJs().utc(dGConf.start_date_project).local().year()
    const endY = Pysc.useDayJs().utc(dGConf.end_date_project).local().year()
    dGConf.start_date_project_second = Pysc.useDayJs().utc(dGConf.end_date_project).add(1, 'day').valueOf()
    const start2Y = Pysc.useDayJs().utc(dGConf.start_date_project_second).local().year()
    const end2Y = Pysc.useDayJs().utc(dGConf.end_date_project_second).local().year()

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
    const getGS_split_offset = (gs: Pysc.GS, iStart: number, iendY: number) => {
      return gs.cum_production_split_offset.mode === 1 ?
        table2Array(gs.cum_production_split_offset.split, iStart, iendY, ["year", "split"]) : gs.cum_production_split_offset.offset
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
        base_split_ctr_oil: +gs.oil_base_split,
        base_split_ctr_gas: +gs.gas_base_split,
        split_ministry_disc: +gs.ministry_discretion_split,
        oil_dmo_volume_portion: +gs.OilDMO.volume,
        oil_dmo_fee_portion: +gs.OilDMO.fee,
        oil_dmo_holiday_duration: +gs.OilDMO.period,
        gas_dmo_volume_portion: +gs.GasDMO.volume,
        gas_dmo_fee_portion: +gs.GasDMO.fee,
        gas_dmo_holiday_duration: +gs.GasDMO.period,
        // cum_production_split_offset: gs.cum_production_split_offset.mode === 0 ? gs.cum_production_split_offset.offset : splitTable
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
        future_rate: +fiscal.asr_future_rate,
        inflation_rate_applied_to: Object.values(Pysc.InflateToType)[genconf.inflation_rate_applied_to],
        post_uu_22_year2001: (isCR ? (icontract === 0 ? dContr.cr.post_uu_22_year2001 :
          (isTransition && dContr.second?.hasOwnProperty('post_uu_22_year2001') ? (<Pysc.costRec>dContr.second).post_uu_22_year2001 : undefined)) : undefined),
        cum_production_split_offset: (!isCR ?
          (icontract === 0 ?
            getGS_split_offset(dContr.gs, startY, endY) : getGS_split_offset(<Pysc.GS>dContr.second, start2Y, end2Y)) : undefined)
      }
    }

    const lifting2Json = (prod: Pysc.producerConfig[], hasGas: boolean, isTransistion: boolean = false, icontract: number = 0) => {
      let lifting = {}
      prod.forEach((value, index) => {
        for (var i = 0; i < value.ProdNumber; i++) {
          //Filtering data is has values
          const prod_price: Pysc.prodPriceBase[] = JSON.parse(JSON.stringify(value.prod_price[i])).filter(row => {
            if (value.Tipe === 0)
              return (!isEmpty(row.year) && !isEmpty(row.sales) && !isEmpty(row.price) &&
                row.sales > 0 && !isNaN(+row.sales) &&
                row.price > 0 && !isNaN(+row.price)) ||
                (!isEmpty(row.year) && !isEmpty(row.condensate_sales) && !isEmpty(row.condensate_price) &&
                  row.condensate_sales > 0 && !isNaN(+row.condensate_sales) &&
                  row.condensate_price > 0 && !isNaN(+row.condensate_price))
            else if (value.Tipe === 1)
              return !isEmpty(row.year) && !isEmpty(row.production) &&
                row.production > 0 && !isNaN(+row.production)
            else
              return !isEmpty(row.year) && !isEmpty(row.sales) && !isEmpty(row.price) &&
                row.sales > 0 && !isNaN(+row.sales) &&
                row.price > 0 && !isNaN(+row.price)
          })
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
                [`GSA${value.ProdNumber ? (' ' + (i + 1)) : ''}${value.GSANumber ? (' ' + (ii + 1)) : ''}`]: prod_price.length ? {
                  start_year: (isTransistion && icontract === 1 ? start2Y : startY),
                  end_year: (isTransistion && icontract === 1 ? end2Y : endY),
                  lifting_rate: prod_price.map(v => v.production),
                  price: prod_price.map(v => v.gsa[`price${ii + 1}`]),
                  prod_year: prod_price.map(v => v.year),
                  ghv: prod_price.map(v => v.gsa[`ghv${ii + 1}`]),
                  prod_rate: prod_price.map(v => v.gsa[`vol${ii + 1}`]),
                  fluid_type: "Gas",
                } : undefined,
              }
            }
          } else if (value.Tipe === 0) {
            const oilData = prod_price.filter(row => !isEmpty(row.sales) && !isEmpty(row.price) &&
              row.sales > 0 && !isNaN(+row.sales) &&
              row.price > 0 && !isNaN(+row.price))
            const condsData = prod_price.filter(row => !isEmpty(row.condensate_sales) && !isEmpty(row.condensate_price) &&
              row.condensate_sales > 0 && !isNaN(+row.condensate_sales) &&
              row.condensate_price > 0 && !isNaN(+row.condensate_price))
            if (oilData.length) {
              lifting = {
                ...lifting,
                [`${Object.values(Pysc.ProducerType)[value.Tipe]}${value.ProdNumber ? (' ' + (i + 1)) : ''}`]: oilData.length ? {
                  start_year: (isTransistion && icontract === 1 ? start2Y : startY),
                  end_year: (isTransistion && icontract === 1 ? end2Y : endY),
                  lifting_rate: oilData.map(v => v.sales),
                  price: oilData.map(v => v.price),
                  prod_year: oilData.map(v => v.year),
                  fluid_type: Object.values(Pysc.ProducerType)[value.Tipe],
                } : undefined,
              }
            }
            if (condsData.length) {
              lifting = {
                ...lifting,
                [`Condensate${value.ProdNumber ? (' ' + (i + 1)) : ''}`]: condsData.length ? {
                  start_year: (isTransistion && icontract === 1 ? start2Y : startY),
                  end_year: (isTransistion && icontract === 1 ? end2Y : endY),
                  condensate_rate: condsData.map(v => v.condensate_sales),
                  price: condsData.map(v => v.condensate_price),
                  prod_year: condsData.map(v => v.year),
                  fluid_type: Object.values(Pysc.ProducerType)[value.Tipe],
                } : undefined,
              }
            }
          } else {
            lifting = {
              ...lifting,
              [`${Object.values(Pysc.ProducerType)[value.Tipe]}${value.ProdNumber ? (' ' + (i + 1)) : ''}`]: prod_price.length ? {
                start_year: (isTransistion && icontract === 1 ? start2Y : startY),
                end_year: (isTransistion && icontract === 1 ? end2Y : endY),
                lifting_rate: prod_price.map(v => v.sales),
                price: prod_price.map(v => v.price),
                prod_year: prod_price.map(v => v.year),
                fluid_type: Object.values(Pysc.ProducerType)[value.Tipe],
              } : undefined,
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

      const cost_data = JSON.parse(JSON.stringify(icost)).filter(row => {
        return !isEmpty(row[0]) && !isEmpty(row[1]) && !isEmpty(row[2])
      })
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
        },
        contract_2: {
          setup: {
            start_date: useDate ? Pysc.useDayJs().utc(dGConf.start_date_project_second).local().format('DD/MM/YYYY') : dGConf.start_date_project_second,
            end_date: useDate ? Pysc.useDayJs().utc(dGConf.end_date_project_second).local().format('DD/MM/YYYY') : dGConf.end_date_project_second,
            oil_onstream_date: null, //Oil ? (useDate ? Pysc.useDayJs().utc(Oil.onstream_date).local().format('DD/MM/YYYY') : Oil.onstream_date) : null,
            gas_onstream_date: null, //Gas ? (useDate ? Pysc.useDayJs().utc(Gas.onstream_date).local().format('DD/MM/YYYY') : Gas.onstream_date) : null,
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

  const curCase2Json = (useDate: boolean = true) => {
    return makeJSONofCase(appStore.curSelCase,
      PyscConf.dataGConf, PyscConf.dataProd, PyscConf.dataContr, PyscConf.dataFisc,
      PyscConf.dataTan, PyscConf.dataIntan, PyscConf.dataOpex, PyscConf.dataASR,
      useDate)
  }

  return {
    resetDataStore,
    extractProject,
    applyCase,
    useWatchCaseID,
    newProject,
    openProject,
    saveProject,
    expJsonProject,
    expXlsxProject,
    importFrPySC,

    changeCtrType,

    addCase, cloneCase, delCase, updateCase, saveCaseData,

    table2Array, makeJSONofCase, curCase2Json
  }
}

import { useAppStore } from '@/stores/appStore';
import { usePyscConfStore } from '@/stores/genfisStore';
import * as Pysc from '@/utils/pysc/pyscType';

export const useDataStore = () => {
  const appStore = useAppStore()
  const PyscConf = usePyscConfStore()

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

      DataLoaded = true

    } catch (error) {
      console.log(error)
    }

    //apply data cases
    const applyData = () => {
      if (DataLoaded)
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
    opex: Array<number | string | null>[], asr: Array<number | string | null>[]) => {
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
          text: "Data loaded successfully",
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
          PyscConf.opex, PyscConf.asr)
      }

      const wrtproject = await execPartData('/auth/wrtproject', 'POST', {
        wspath: curWS,
        targetfile: btoa(path)
      })
      if (wrtproject.state !== true) throw "save data failed"

      appStore.showAlert({
        text: `Project saved to ${path}`,
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
        text: "Data imported successfully",
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
        [Array(9).fill(null)], [Array(5).fill(null)], [Array(8).fill(null)], [Array(4).fill(null)])

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
  }
}

import { useAppStore } from '@/stores/appStore';
import { usePyscConfStore } from '@/stores/genfisStore';
import * as Pysc from '@/utils/pysc/pyscType';

export const useToolBarCtrl = () => {
  const appStore = useAppStore()
  const PyscConf = usePyscConfStore()

  const newProject = () => {
    const _id = Math.floor(Math.random() * (2000000 - 1000)) + 1000;
    appStore.$patch({
      curProject: null,
      curProjectPath: null,
      curWS: null,
      projects: [
        { id: _id, name: "Case-1", type: 1, description: 'description...', updated_at: Pysc.useDayJs().utc().valueOf(), state: 0, multicase: [] },
      ],
      curSelCase: _id
    })
    PyscConf.$patch({
      tangible: JSON.parse(JSON.stringify([[Array(9).fill(null)]])),
      intangible: JSON.parse(JSON.stringify([[Array(5).fill(null)]])),
      opex: JSON.parse(JSON.stringify([[Array(8).fill(null)]])),
      asr: JSON.parse(JSON.stringify([[Array(4).fill(null)]])),

      generalConfig: JSON.parse(JSON.stringify([Pysc.defGenConfig()])),
      producer: JSON.parse(JSON.stringify([Pysc.defProdConfig()])),
      fiscal: JSON.parse(JSON.stringify([Pysc.defFiskal()])),
      contracts: JSON.parse(JSON.stringify([Pysc.defContracts()])),
    })
  }

  const execPartData = async (url: string, mode: string, param: object) => {
    const result = await $api(url, {
      params: param,
      method: mode,
    })
    return result
  }

  const openProject = async (path: string) => {
    let wspath = null
    let dataLoaded = false
    try {
      //tes if file valid
      let resInit = await execPartData('/auth/chkheaderfile', 'GET', { path: btoa(path) })
      if (resInit.state !== true) throw "Invalid file type or it's an old file"
      wspath = resInit.path
      if (isEmpty(wspath)) throw "Error while mkdir temporary path"

      resInit = await execPartData('/auth/rdcases', 'GET', { tmppath: wspath })
      if (resInit.state !== true) throw "error rdcases"
      const cases: Pysc.ProjectBase[] = resInit.data
      let curcaseID: number | null = +appStore.curSelCase
      if (cases.findIndex(e => e.id === curcaseID) === -1)
        curcaseID = cases.length ? cases[0].id : null

      const tangible = []
      const intangible = []
      const opex = []
      const asr = []

      const genConf = []
      const producer = []
      const fiscal = []
      const contracts = []

      for (let icase = 0; icase < cases.length; icase++) {
        resInit = await execPartData('/auth/rdgenconf', 'GET', { tmppath: wspath, index: icase })
        if (resInit.state !== true) throw "error rdgenconf"
        genConf.push(JSON.parse(JSON.stringify(resInit.data)))
        // console.log(genConf)
        resInit = await execPartData('/auth/rdfiscalconf', 'GET', { tmppath: wspath, index: icase })
        if (resInit.state !== true) throw "error rdfiscalconf"
        fiscal.push(JSON.parse(JSON.stringify(resInit.data)))
        // console.log(fiscalConf)
        resInit = await execPartData('/auth/rdproducer', 'GET', { tmppath: wspath, index: icase })
        if (resInit.state !== true) throw "error rdproducer"
        producer.push(JSON.parse(JSON.stringify(resInit.data)))
        // console.log(prodConf)
        resInit = await execPartData('/auth/rdcontracts', 'GET', { tmppath: wspath, index: icase })
        if (resInit.state !== true) throw "error rdcontracts"
        contracts.push(JSON.parse(JSON.stringify(resInit.data)))
        // console.log(contractConf)
        resInit = await execPartData('/auth/rdcosts', 'GET', { tmppath: wspath, mode: 0, index: icase })
        if (resInit.state !== true) throw "error rdcosts(0)"
        tangible.push(JSON.parse(JSON.stringify(resInit.data)))
        // console.log(tanConf)
        resInit = await execPartData('/auth/rdcosts', 'GET', { tmppath: wspath, mode: 1, index: icase })
        if (resInit.state !== true) throw "error rdcosts(1)"
        intangible.push(JSON.parse(JSON.stringify(resInit.data)))
        // console.log(IntanConf)
        resInit = await execPartData('/auth/rdcosts', 'GET', { tmppath: wspath, mode: 2, index: icase })
        if (resInit.state !== true) throw "error rdcosts(2)"
        opex.push(JSON.parse(JSON.stringify(resInit.data)))
        // console.log(opexConf)
        resInit = await execPartData('/auth/rdcosts', 'GET', { tmppath: wspath, mode: 3, index: icase })
        if (resInit.state !== true) throw "error rdcosts(3)"
        asr.push(JSON.parse(JSON.stringify(resInit.data)))
      }


      PyscConf.$patch({
        tangible: JSON.parse(JSON.stringify(tangible)),
        intangible: JSON.parse(JSON.stringify(intangible)),
        opex: JSON.parse(JSON.stringify(opex)),
        asr: JSON.parse(JSON.stringify(asr)),

        generalConfig: JSON.parse(JSON.stringify(genConf)),
        producer: JSON.parse(JSON.stringify(producer)),
        fiscal: JSON.parse(JSON.stringify(fiscal)),
        contracts: JSON.parse(JSON.stringify(contracts)),
      })

      appStore.$patch({
        projects: JSON.parse(JSON.stringify(cases)),
        curSelCase: curcaseID,
        curProjectPath: path,
      })

      dataLoaded = true

      appStore.showAlert({
        text: "Data loaded successfully",
        isalert: false
      })
    } catch (error) {
      appStore.showAlert({
        text: typeof error === 'string' ? error : 'Error while loading data',
        isalert: true
      })
    }
    if (!isEmpty(wspath))
      try {
        await execPartData('/auth/closeddata', 'GET', { tmppath: wspath })
      } catch (error) { }

    return dataLoaded
  }

  const saveProject = async (path: string) => {
    try {
      //init file db
      let resInit = await execPartData('/auth/initflproject', 'POST', { path: btoa(path) })
      if (resInit.state !== true) throw "error"
      resInit = await execPartData('/auth/wrtcases', 'POST', { path: btoa(path), gc: btoa(JSON.stringify(appStore.projects)) })
      if (resInit.state !== true) throw "error"

      //TODO: save for setting

      //----------------------

      for (let i = 0; i < appStore.projects.length; i++) {
        const type_of_contract = PyscConf.generalConfig[i].type_of_contract
        resInit = await execPartData('/auth/wrtgenconf', 'POST', { path: btoa(path), gc: btoa(JSON.stringify(PyscConf.generalConfig[i])) })
        if (resInit.state !== true) throw "error"
        resInit = await execPartData('/auth/wrtfiscalconf', 'POST', { path: btoa(path), gc: btoa(JSON.stringify(PyscConf.fiscal[i])) })
        if (resInit.state !== true) throw "error"
        resInit = await execPartData('/auth/wrtproducer', 'POST', { path: btoa(path), gc: btoa(JSON.stringify(PyscConf.producer[i])) })
        if (resInit.state !== true) throw "error"
        resInit = await execPartData('/auth/wrtcontract', 'POST', { path: btoa(path), tipe: type_of_contract, gc: btoa(JSON.stringify(PyscConf.contracts[i])) })
        if (resInit.state !== true) throw "error"
        resInit = await execPartData('/auth/wrtcost', 'POST', { path: btoa(path), mode: 0, gc: btoa(JSON.stringify(PyscConf.TangibleJson(i))) })
        if (resInit.state !== true) throw "error"
        resInit = await execPartData('/auth/wrtcost', 'POST', { path: btoa(path), mode: 1, gc: btoa(JSON.stringify(PyscConf.InTangibleJson(i))) })
        if (resInit.state !== true) throw "error"
        resInit = await execPartData('/auth/wrtcost', 'POST', { path: btoa(path), mode: 2, gc: btoa(JSON.stringify(PyscConf.OpexJson(i))) })
        if (resInit.state !== true) throw "error"
        resInit = await execPartData('/auth/wrtcost', 'POST', { path: btoa(path), mode: 3, gc: btoa(JSON.stringify(PyscConf.ASRJson(i))) })
        if (resInit.state !== true) throw "error"
      }
      appStore.showAlert({
        text: `Project saved to ${path}`,
        isalert: false
      })
      return true
    } catch (error) {
      appStore.showAlert({
        text: "Fail to save data",
        isalert: true
      })
    }

    return false
  }

  const expJsonProject = () => {

  }

  const expXlsxProject = () => {

  }



  return {
    newProject,
    openProject,
    saveProject,
    expJsonProject,
    expXlsxProject,
  }
}

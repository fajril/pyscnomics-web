import { ProjectBase, useDayJs } from '@/utils/pysc/pyscType';
import { namespaceConfig } from '@layouts/stores/config';
import { useStorage } from '@vueuse/core';
//import { useToolBarCtrl } from '@/utils/pysc/useToolBarCtrl'
import * as lzs from 'lz-string';

export interface tAlert {
  header?: string | null
  text: string | object
  isalert?: boolean | false
}


export const useAppStore = defineStore('pyscConfig', () => {
  const dayjs = useDayJs()
  const appver = useStorage<number>(namespaceConfig('app-ver'), 1)
  const headerTitle = ref<string | undefined>(undefined)
  const curProject = useStorage<number | null>(namespaceConfig('current-project'), null)
  const curProjectPath = useStorage<string | null>(namespaceConfig('project-path'), null)
  const projects = useStorage<ProjectBase[]>(namespaceConfig('cases'), [
    { id: Math.floor(Math.random() * (2000000 - 1000)) + 1000, name: "Case-1", type: 1, description: 'description...', updated_at: dayjs.utc().valueOf(), state: 0, multicase: [] },
  ], undefined, {
    serializer: {
      read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : [
        { id: Math.floor(Math.random() * (2000000 - 1000)) + 1000, name: "Case-1", type: 1, description: 'description...', updated_at: dayjs.utc().valueOf(), state: 0, multicase: [] },
      ],
      write: (v: any) => lzs.compressToUTF16(JSON.stringify(v))
    },
  })

  /*reactive for selected case*/
  const curSelCase = useStorage<number | null>(namespaceConfig('sel-case'), null, undefined, {
    serializer: {
      read: (v: any) => typeof v === 'string' ? +v : v,
      write: (v: any) => v
    },
  })
  const mainCallbackCaseID = ref<Function>(() => { })
  const watcherSelCase = pausableWatch(curSelCase, (value, oldValue) => {
    watcherSelCase.pause()
    mainCallbackCaseID.value(value, oldValue)
  })
  const curWS = useStorage<string | null>(namespaceConfig('project-ws'), null)


  const taxSett = useStorage<{ year: number, tax: number }[]>(namespaceConfig('pysc-sett-tax'), [
    { year: 2013, tax: 0.44 }, { year: 2016, tax: 0.42 }, { year: 2020, tax: 0.40 }
  ], undefined, {
    serializer: {
      read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : [{ year: 2013, tax: 0.44 }, { year: 2016, tax: 0.42 }, { year: 2020, tax: 0.40 }],
      write: (v: any) => lzs.compressToUTF16(JSON.stringify(v))
    },
  })
  const gsSett = useStorage<number[]>(namespaceConfig('pysc-sett-gs'), [0.05, 0.03, 0, 0, 0.08, 0.1, 0.12, 0.14, 0.16, 0, 0.01, 0, 0.02, 0.04, 0, 0.16, 0.01, 0, 0, 0.02, 0.03, 0.04, 0, 0.06, 0.1, 0, 0.005, 0.01, 0.015, 0.02, 0.04, 0, 0.01, 0.02, 0.03, 0.04, 0.05],
    undefined, {
    serializer: {
      read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : [0.05, 0.03, 0, 0, 0.08, 0.1, 0.12, 0.14, 0.16, 0, 0.01, 0, 0.02, 0.04, 0, 0.16, 0.01, 0, 0, 0.02, 0.03, 0.04, 0, 0.06, 0.1, 0, 0.005, 0.01, 0.015, 0.02, 0.04, 0, 0.01, 0.02, 0.03, 0.04, 0.05],
      write: (v: any) => lzs.compressToUTF16(JSON.stringify(v))
    },
  })

  const alertFunc = ref<tAlert | null>(null)

  const settFunc = ref<Function | null>(null)

  function showSetting(tab: number) {
    if (typeof settFunc.value === 'function') settFunc.value(tab)
  }


  const extractProject = async (projSource: string, wsPath: string) => {
    const oWS = curWS.value
    let result = false
    try {
      if (!isEmpty(projSource)) {
        const resExtract = await $api('/auth/extractproject', {
          params: {
            data: btoa(JSON.stringify({
              path: projSource,
              oldWS: oWS,
              newWS: wsPath
            }))
          },
          method: 'POST',
          onResponseError({ response }) {
            throw [response.status, response._data.detail]
          },
        })
        result = resExtract.state
      } else
        result = true
      curWS.value = wsPath
    } catch (error) {
      return false
    }
    return result
  }



  function $reset() {
    curProject.value = null
    curProjectPath.value = null
    curWS.value = null
    const _id = Math.floor(Math.random() * (2000000 - 1000)) + 1000;
    projects.value.splice(0, projects.value.length, ...[
      { id: _id, name: "Case-1", type: 1, description: 'description...', updated_at: dayjs.utc().valueOf(), state: 0, multicase: [] },
    ])
    //put in last 
    curSelCase.value = _id
  }

  function chgVer(_oldver: number, _newver: number) {
    appver.value = _newver
    if (_oldver <= 1) {
      localStorage.removeItem(namespaceConfig('current-project'))
      localStorage.removeItem(namespaceConfig('project-path'))
      localStorage.removeItem(namespaceConfig('cases'))
      localStorage.removeItem(namespaceConfig('sel-case'))
      localStorage.removeItem(namespaceConfig('project-ws'))
      $reset()
    }
  }

  const caseList = computed(() => {
    return projects.value.map(v => ({ title: v.name, value: v.id }))
  })

  const caseByID = (caseID: number | null | undefined) => {
    const index = projects.value.findIndex(e => e.id === caseID)
    return index != -1 ? projects.value[index] : null
  }

  const IndexCase = computed(() => projects.value.findIndex(e => e.id === +curSelCase.value))

  const selectedCase = computed(() => IndexCase.value !== -1 ? projects.value[IndexCase.value] :
    { id: Math.floor(Math.random() * (2000000 - 1000)) + 1000, name: "Case-1", type: 1, description: 'description...', updated_at: dayjs.utc().valueOf(), state: 0, multicase: [] })

  const dataChanges = () => {
    projects.value[IndexCase.value].updated_at = dayjs.utc().valueOf()
    projects.value[IndexCase.value].state = 1
  }

  async function fetchProjects(param) {
    return await $api('/auth/projects', {
      params: { q: param },
      method: 'GET',
    })
  }

  async function postProjects(param) {
    return await $api('/auth/update_projects', {
      params: { data: param },
      method: 'POST',
    })
  }

  function showAlert(params: tAlert) {
    alertFunc.value = {
      header: params.header,
      text: params.text,
      isalert: params.isalert
    }
  }

  return {
    $reset,
    appver,
    chgVer,
    curProject,
    curProjectPath,
    curWS, extractProject,
    headerTitle,
    curSelCase, mainCallbackCaseID, watcherSelCase,
    IndexCase,
    projects, selectedCase,
    caseList,
    fetchProjects,
    postProjects,
    caseByID,

    alertFunc,
    showAlert,

    taxSett,
    gsSett,
    settFunc,
    showSetting,

    dataChanges,
  }
})

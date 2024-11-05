import { useHTTP } from '@/utils/pysc/useHttp'
import { namespaceConfig } from '@layouts/stores/config'
import { useStorage } from '@vueuse/core'

// import { useToolBarCtrl } from '@/utils/pysc/useToolBarCtrl'
import type { ProjectBase, TImportData, tCompareType, tIncrType } from '@/utils/pysc/pyscType'
import { ContractType, is_number, useDayJs } from '@/utils/pysc/pyscType'
import * as lzs from 'lz-string'

export interface tAlert {
  header?: string
  text: string | object
  isalert?: boolean
  position?: any
  color?: string
  variant?: "tonal" | "flat" | "text" | "elevated" | "outlined" | "plain"
}

export const useAppStore = defineStore('pyscConfig', () => {
  const dayjs = useDayJs()
  const PYSCAPPVER = import.meta.env.VITE_PSC_VER125

  // const PYSC_APP_VERSION = import.meta.env.VITE_PSC_VER125

  // const appPort = ref(null)
  const osConf = ref({ sep: '/', os: 'win', port: null })
  const appver = useStorage<string | null>(namespaceConfig('version'), null)
  const headerTitle = ref<string | undefined>(undefined)
  const curProject = useStorage<number | null>(namespaceConfig('current-project'), null)
  const curProjectPath = useStorage<string | null>(namespaceConfig('project-path'), null)

  const projects = useStorage<ProjectBase[]>(namespaceConfig('cases'), [
    { id: Math.floor(Math.random() * (2000000 - 1000)) + 1000, name: "Case-1", type: 1, description: 'description...', updated_at: dayjs.utc().valueOf(), state: 0, multicase: [], evaluator: '', evaluator_date: dayjs.utc().valueOf() },
  ], undefined, {
    serializer: {
      read: (v: any) => v
        ? JSON.parse(lzs.decompressFromUTF16(v))
        : [
          { id: Math.floor(Math.random() * (2000000 - 1000)) + 1000, name: "Case-1", type: 1, description: 'description...', updated_at: dayjs.utc().valueOf(), state: 0, multicase: [], evaluator: '', evaluator_date: dayjs.utc().valueOf() },
        ],
      write: (v: any) => lzs.compressToUTF16(JSON.stringify(v)),
    },
  })

  const caseCompare = useStorage<tCompareType[]>(namespaceConfig('case-compare'), [])
  const caseCombine = useStorage<tCompareType[]>(namespaceConfig('case-combine2'), [])
  const caseIncr = useStorage<tIncrType[]>(namespaceConfig('case-incr'), [])

  const apiURL = computed(() => `http://127.0.0.1:${osConf.value.port}/api`)

  /* reactive for selected case */
  const curSelCase = useStorage<number | null>(namespaceConfig('sel-case'), null, undefined, {
    serializer: {
      read: (v: any) => typeof v === 'string' ? +v : v,
      write: (v: any) => v,
    },
  })

  const mainCallbackCaseID = ref<Function>(() => { })

  const watcherSelCase = pausableWatch(curSelCase, async (value, oldValue) => {
    watcherSelCase.pause()
    await mainCallbackCaseID.value(value, oldValue)
  })

  const curWS = useStorage<string | null>(namespaceConfig('project-ws'), null)

  const taxSett = useStorage<{ year: number; tax: number }[]>(namespaceConfig('pysc-sett-tax'), [
    { year: 2013, tax: 0.44 }, { year: 2016, tax: 0.42 }, { year: 2020, tax: 0.40 },
  ], undefined, {
    serializer: {
      read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : [{ year: 2013, tax: 0.44 }, { year: 2016, tax: 0.42 }, { year: 2020, tax: 0.40 }],
      write: (v: any) => lzs.compressToUTF16(JSON.stringify(v)),
    },
  })

  const gsSett = useStorage<number[]>(namespaceConfig('pysc-sett-gs'), [0.05, 0.03, 0, 0, 0.08, 0.1, 0.12, 0.14, 0.16, 0, 0.01, 0, 0.02, 0.04, 0, 0.16, 0.01, 0, 0, 0.02, 0.03, 0.04, 0, 0.06, 0.1, 0, 0.005, 0.01, 0.015, 0.02, 0.04, 0, 0.01, 0.02, 0.03, 0.04, 0.05],
    undefined, {
    serializer: {
      read: (v: any) => v ? JSON.parse(lzs.decompressFromUTF16(v)) : [0.05, 0.03, 0, 0, 0.08, 0.1, 0.12, 0.14, 0.16, 0, 0.01, 0, 0.02, 0.04, 0, 0.16, 0.01, 0, 0, 0.02, 0.03, 0.04, 0, 0.06, 0.1, 0, 0.005, 0.01, 0.015, 0.02, 0.04, 0, 0.01, 0.02, 0.03, 0.04, 0.05],
      write: (v: any) => lzs.compressToUTF16(JSON.stringify(v)),
    },
  })

  const NPVSelSett = useStorage<boolean>(namespaceConfig('pysc-sett-npv'), true)

  const alertFunc = ref<tAlert | null>(null)

  const settFunc = ref<Function | null>(null)
  function showSetting(tab: number) {
    if (typeof settFunc.value === 'function')
      settFunc.value(tab)
  }

  const fileDialogFunc = ref<((callback: (path: string) => void, mode: string, lookup: string | null) => void) | null>(null)
  function showFileDialog(callback: (path: string) => void, mode: string, lookup: string | null) {
    if (typeof fileDialogFunc.value === 'function')
      fileDialogFunc.value(callback, mode, lookup)
  }

  const xlsxImportFunc = ref<Function | null>(null)
  function showXlsxImport(data: TImportData) {
    if (typeof xlsxImportFunc.value === 'function')
      xlsxImportFunc.value(data)
  }

  const extractProject = async (projSource: string, wsPath: string) => {
    const oWS = curWS.value
    let resultExtact = false
    try {
      if (!isEmpty(projSource)) {
        const { status, result } = await useHTTP().put({
          path: 'extractproject',
          body: {
            json: btoa(JSON.stringify({
              path: projSource,
              oldWS: oWS,
              newWS: wsPath,
            })),
          },
          onError: (error: any) => { throw error },
        })

        if (status !== 200)
          throw { status, result }
        resultExtact = result.state
      }
      else { resultExtact = true }
      curWS.value = wsPath
    }
    catch (error) {
      return false
    }

    return resultExtact
  }

  function $reset() {
    curProject.value = null
    curProjectPath.value = null
    curWS.value = null

    const _id = Math.floor(Math.random() * (2000000 - 1000)) + 1000

    projects.value.splice(0, projects.value.length, ...[
      { id: _id, name: "Case-1", type: 1, description: 'description...', updated_at: dayjs.utc().valueOf(), state: 0, multicase: [] },
    ])

    // put in last
    curSelCase.value = _id
  }

  function chgVer(_oldver: any, _newver: any) {
    appver.value = _newver
    if (is_number(+_oldver) && +_oldver <= 1) {
      localStorage.removeItem(namespaceConfig('current-project'))
      localStorage.removeItem(namespaceConfig('project-path'))
      localStorage.removeItem(namespaceConfig('cases'))
      localStorage.removeItem(namespaceConfig('sel-case'))
      localStorage.removeItem(namespaceConfig('project-ws'))
      $reset()
    }
  }

  const caseList = computed(() => {
    return projects.value.map(v => ({ title: v.name, value: v.id, subtitle: is_number(v.type) ? Object.values(ContractType)[+v.type] : '' }))
  })

  const caseByID = (caseID: number | null | undefined) => {
    const index = projects.value.findIndex(e => e.id === caseID)

    return index != -1 ? projects.value[index] : null
  }

  const IndexCase = computed(() => projects.value.findIndex(e => e.id === +curSelCase.value))

  const selectedCase = computed(() => IndexCase.value !== -1
    ? projects.value[IndexCase.value]
    : { id: Math.floor(Math.random() * (2000000 - 1000)) + 1000, name: "Case-1", type: 1, description: 'description...', updated_at: dayjs.utc().valueOf(), state: 0, multicase: [] })

  const dataChanges = () => {
    projects.value[IndexCase.value].updated_at = dayjs.utc().valueOf()
    projects.value[IndexCase.value].state = 1
  }

  async function fetchProjects(param) {
    const { status, result } = await useHTTP().get({
      path: 'projects',
      params: { q: param },
      onError: (error: any) => { throw error },
    },
    )

    return result
  }

  async function postProjects(param) {
    const { status, result } = await useHTTP().put({
      path: 'update_projects',
      body: { json: param },
      onError: (error: any) => { throw error },
    })

    return result
  }

  function showAlert(params: tAlert | string) {
    if (typeof params === 'string') {
      alertFunc.value = {
        text: params,
        isalert: true,
      }
    }
    else {
      alertFunc.value = {
        header: params.header,
        text: params.text,
        isalert: params.isalert,
        position: params.position,
        color: params.color,
        variant: params.variant,
      }
    }
  }

  const getCompare = (caseid: number): tCompareType => {
    const idx_case = caseCompare.value.findIndex(v => v.source === caseid)
    if (idx_case === -1) {
      caseCompare.value.push({ source: caseid, comp: [] })

      return caseCompare.value[caseCompare.value.length - 1]
    }
    else {
      caseCompare.value[idx_case].comp.splice(0, caseCompare.value[idx_case].comp.length, ...caseCompare.value[idx_case].comp.filter(v => projects.value.findIndex(c => c.id === v) !== -1))
    }

    return caseCompare.value[idx_case]
  }

  const getCombine = (caseid: number): tCompareType => {
    const idx_case = caseCombine.value.findIndex(v => v.source === caseid)
    if (idx_case === -1) {
      caseCombine.value.push({
        source: caseid,
        comp: [],
        inflation_rate: 0.0,
        discount_rate: 0.1,
        reference_year: 0,
        npv_mode: 3,
        discounting_mode: 0,
      })

      return caseCombine.value[caseCombine.value.length - 1]
    }
    else {
      caseCombine.value[idx_case].comp.splice(0, caseCombine.value[idx_case].comp.length, ...caseCombine.value[idx_case].comp.filter(v => projects.value.findIndex(c => c.id === v) !== -1))
    }

    return caseCombine.value[idx_case]
  }

  const getIncr = (caseid: number): tIncrType => {
    const idx_case = caseIncr.value.findIndex(v => v.source === caseid)
    if (idx_case === -1) {
      caseIncr.value.push({
        source: caseid,
        comp: null,
        inflation_rate: 0.0,
        discount_rate: 0.1,
        reference_year: 0,
        npv_mode: 3,
        discounting_mode: 0,
      })

      return caseIncr.value[caseIncr.value.length - 1]
    }

    return caseIncr.value[idx_case]
  }

  const appReady = computed(() => osConf.value.port)

  return {
    osConf,
    appReady,

    // appPort,
    PYSCAPPVER,
    apiURL,
    $reset,
    appver,
    chgVer,
    curProject,
    curProjectPath,
    curWS,
    extractProject,
    headerTitle,
    curSelCase,
    mainCallbackCaseID,
    watcherSelCase,
    IndexCase,
    projects,
    selectedCase,
    caseList,
    fetchProjects,
    postProjects,
    caseByID,

    alertFunc,
    showAlert,

    taxSett,
    gsSett,
    NPVSelSett,
    settFunc,
    showSetting,

    fileDialogFunc,
    showFileDialog,

    xlsxImportFunc,
    showXlsxImport,

    dataChanges,

    caseCompare,
    getCompare,
    caseCombine,
    getCombine,
    caseIncr,
    getIncr,
  }
})

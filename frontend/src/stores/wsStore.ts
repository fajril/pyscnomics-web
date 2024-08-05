import { useAppStore } from '@/stores/appStore'
import * as Pysc from '@/utils/pysc/pyscType'
import { namespaceConfig } from '@layouts/stores/config'
import { useStorage } from '@vueuse/core'

export interface tbroadcastItem {
  name: string // module
  id: number // caseid
  callable: Function
}

const getUniqueID = () => {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)
  }

  return `${s4() + s4()}-${s4()}`
}

export const useWSStore = defineStore('pyscWSConf', () => {
  const appStore = useAppStore()
  const dayjs = Pysc.useDayJs()
  const clientID = useStorage<number>(namespaceConfig('clientid'), dayjs().utc().valueOf())
  const clientIDE: string = getUniqueID()

  // const baseHostName = import.meta.env.VITE_API_BASE_URL
  // const port = baseHostName?.match(/:(\d+)/)[1]
  const endPoint = computed(() => `ws://localhost:${appStore.osConf.port ?? 8888}/ws/${clientID.value}`)
  const endPointE = computed(() => `ws://localhost:3142/ws?client=${clientIDE}`)
  const wsConnected = ref(false)
  const listBroadCast = ref<tbroadcastItem[]>([])
  const isFirstHit = ref(true)

  // WS electron
  const { status: wseStatus, data: wseData, send: wseSend, open: wseOpen, close: wseClose } = useWebSocket(endPointE, {
    autoReconnect: { delay: 2000 },
    onConnected: (ws: WebSocket) => {
      console.log('ws electron connected')
    },
    onDisconnected: (ws: WebSocket, event: CloseEvent) => {
      console.log('ws electron disconnected')
    },
    onError: (ws: WebSocket, event: Event) => {
      console.log(event)
      console.log('error: ws electron')
    },
    onMessage: (ws: WebSocket, e: MessageEvent) => {
      try {
        const jObj = JSON.parse(e.data)

        // console.log(JSON.parse(atob(jObj.data.data)))
        if (jObj.module && jObj.module === 'os:conf') {
          appStore.$patch({
            osConf: JSON.parse(atob(jObj.data.data)),
          })

          const selBroadcast = listBroadCast.value.filter(v => v.name === jObj.module)

          selBroadcast.forEach(b => {
            nextTick(() => b.callable(jObj))
          })
        }
        else

          if (jObj.module && jObj.id && jObj.id === clientIDE) {
            const selBroadcast = listBroadCast.value.filter(v => v.name === jObj.module)

            selBroadcast.forEach(b => {
              b.callable(jObj)
            })
          }
      }
      catch (error) {
        console.log(['error read msg from electron:', error])
      }
    },
  })

  const { status, data, send, open, close } = useWebSocket(endPoint, {
    // immediate: false,
    autoReconnect: { delay: 2000 },

    // heartbeat: {
    //   interval: 2000,
    //   pongTimeout: 3000,
    // },
    onConnected: (ws: WebSocket) => {
      isFirstHit.value = false
      wsConnected.value = true
      console.log('connected')
    },
    onDisconnected: (ws: WebSocket, event: CloseEvent) => {
      wsConnected.value = false
      console.log('disconnected')
    },
    onError: (ws: WebSocket, event: Event) => {
      console.log('error: ws')
    },
    onMessage: (ws: WebSocket, e: MessageEvent) => {
      try {
        const jObj = JSON.parse(e.data)

        if (jObj.hasOwnProperty('module') && jObj.hasOwnProperty('id')) {
          const selBroadcast = listBroadCast.value.filter(v => v.id === jObj.id && v.name === jObj.module)

          selBroadcast.forEach(b => {
            b.callable(jObj)
          })
        }
      }
      catch (error) {
        console.log(['error read msg:', error])
      }
    },
  })

  const addBroadCast = (_name: string, _id: number, _callback: Function) => {
    if (listBroadCast.value.findIndex(v => v.id === _id && v.name === _name) === -1) {
      console.log(`${_name} id:${_id} added`)
      listBroadCast.value.push({ name: _name, id: _id, callable: _callback })
    }
  }

  const removeBroadCast = (_name: string, _id: number) => {
    const idx = listBroadCast.value.findIndex(v => v.id === _id && v.name === _name)
    if (idx != -1) {
      console.log(`${_name} id:${_id} removed`)
      listBroadCast.value.splice(idx, 1)
    }
  }

  return {
    clientID,
    wsConnected,
    addBroadCast,
    removeBroadCast,
    isFirstHit,

    clientIDE,
    wseSend,
  }
})

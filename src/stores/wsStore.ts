import { useAppStore } from '@/stores/appStore'

export interface tbroadcastItem {
  name: string // module
  callable: any
}

const getUniqueID = () => {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)
  }

  return `${s4() + s4()}-${s4()}`
}

export const useWSStore = defineStore('pyscWSConf', () => {
  const appStore = useAppStore()
  const clientID: string = getUniqueID()

  const endPoint = computed(() => `ws://localhost:3142/ws?client=${clientID}&elec=1`)
  const wsConnected = ref(false)
  const listBroadCast = ref<tbroadcastItem[]>([])
  const isFirstHit = ref(true)

  const { status, data, send, open, close } = useWebSocket(endPoint, {
    autoReconnect: { delay: 2000 },
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
        if (jObj.module && jObj.module === 'os:conf') {
          const selBroadcast = listBroadCast.value.filter(v => v.name === jObj.module)
          const msg = JSON.parse(atob(jObj.data.data))
          if (jObj.data.type === 'os:conf') {
            appStore.$patch({
              osConf: msg,
            })
          }
          else if (jObj.data.type === 'os:failPort') {
            appStore.showAlert({
              text: `port ${msg.port} is already in use, please choose another one`,
              isalert: true,
            })
          }
          selBroadcast.forEach(b => {
            b.callable(jObj)
          })
        }
        else if (jObj.module && jObj.id && jObj.id === clientID) {
          const selBroadcast = listBroadCast.value.filter(v => v.name === jObj.module)

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

  const addBroadCast = (_name: string, _callback: Function) => {
    if (listBroadCast.value.findIndex(v => v.name === _name) === -1) {
      console.log(`${_name} added`)
      listBroadCast.value.push({ name: _name, callable: _callback })
    }
  }

  const removeBroadCast = (_name: string) => {
    const idx = listBroadCast.value.findIndex(v => v.name === _name)
    if (idx !== -1) {
      console.log(`${_name}  removed`)
      listBroadCast.value.splice(idx, 1)
    }
  }

  return {
    clientID,
    wsConnected,
    addBroadCast,
    removeBroadCast,
    isFirstHit,
  }
})

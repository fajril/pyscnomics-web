import * as Pysc from '@/utils/pysc/pyscType';
import { namespaceConfig } from '@layouts/stores/config';
import { useStorage } from '@vueuse/core';

export interface tbroadcastItem {
  name: string  //module
  id: number //caseid
  callable: Function
}

export const useWSStore = defineStore('pyscWSConf', () => {
  const dayjs = Pysc.useDayJs()
  const clientID = useStorage<number>(namespaceConfig('clientid'), dayjs().utc().valueOf())
  const baseHostName = import.meta.env.VITE_API_BASE_URL
  const port = baseHostName?.match(/:(\d+)/)[1]
  const endPoint = `ws://localhost:${port ?? window.location.port}/ws/${clientID.value}`
  const wsConnected = ref(false)
  const listBroadCast = ref<tbroadcastItem[]>([])

  const connect = () => {
    const connection = new WebSocket(endPoint)

    connection.onmessage = (e) => {
      const jObj = JSON.parse(e.data)
      if (jObj.hasOwnProperty('module') && jObj.hasOwnProperty('id')) {
        const selBroadcast = listBroadCast.value.filter(v => v.id === jObj.id && v.name === jObj.module)
        selBroadcast.forEach(b => {
          b.callable(jObj)
        })
      }
    }

    connection.onopen = (e) => {
      wsConnected.value = true

    }

    connection.onclose = (e) => {
      wsConnected.value = false
      setTimeout(connect, 5000)
    }

    connection.onerror = (e) => {
      // console.log(e)
    }
  }

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

  connect()

  return {
    clientID,
    wsConnected,
    addBroadCast,
    removeBroadCast
  }



})

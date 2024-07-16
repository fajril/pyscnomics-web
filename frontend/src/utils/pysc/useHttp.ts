import { useAppStore } from '@/stores/appStore'

export interface THTTPparams {
  path: string
  params?: object
  body?: object
  onError?: Function
  onSuccess?: Function
}
export interface THTTPresult {
  status: number
  result: any
}
export const useHTTP = () => {
  const appStore = useAppStore()

  const extractError = (errDict: any) => {
    const errStatus = errDict && typeof errDict !== 'string' && !Array.isArray(errDict) ? (errDict.status ?? 500) : 500

    if (errDict && typeof errDict !== 'string' && !Array.isArray(errDict) && errDict._data?.detail)
      return { status: errStatus, result: Array.isArray(errDict._data.detail) ? errDict._data.detail[0] : errDict._data.detail }

    const extractMsg = (msgDict: any) => {
      if (typeof msgDict === 'string' && msgDict.toLowerCase().includes('<html'))
        return 'Unknown'

      return msgDict
    }

    const extractObject = (msgDict: any) => {
      try {
        const errorStatus = msgDict.status ? msgDict.status : msgDict.statusCode ? msgDict.statusCode : msgDict.state ? msgDict.state : 500
        const errorMsg = msgDict.result ? extractMsg(msgDict.result) : msgDict.error ? extractMsg(msgDict.error) : msgDict.msg ? extractMsg(msgDict.msg) : msgDict.message ? extractMsg(msgDict.message) : 'Unknown'

        return { status: errorStatus, result: errorMsg }
      }
      catch (error) { }

      return { status: 500, result: 'unknown' }
    }

    const extractArray = (msgDict: any) => {
      try {
        const errorStatus = msgDict.length === 2 ? msgDict[0] : 500
        const errorMsg = msgDict.length === 2 ? extractMsg(msgDict[1]) : 'Unknown'

        return { status: errorStatus, result: errorMsg }
      }
      catch (error) {

      }

      return { status: 500, result: 'unknown' }
    }

    // console.log([typeof errDict, errDict])

    if (typeof errDict === 'string') {
      return { status: errStatus, result: extractMsg(errDict) }
    }
    else if (errDict.message) {
      if (typeof errDict.message === 'string')
        return { status: errStatus, result: extractMsg(errDict.message) }
      if (typeof errDict.message === 'object')
        return extractObject(errDict.message)
      if (Array.isArray(errDict.message))
        return extractArray(errDict.message)
    }
    else if (errDict.error) {
      if (typeof errDict.error === 'string')
        return { status: errStatus, result: extractMsg(errDict.error) }
      if (typeof errDict.error === 'object')
        return extractObject(errDict.error)
      if (Array.isArray(errDict.error))
        return extractArray(errDict.error)
    }
    else if (typeof errDict === 'object') {
      return extractObject(errDict)
    }
    else if (Array.isArray(errDict)) {
      return extractArray(errDict)
    }

    return { status: errStatus, result: 'Unknown error' }
  }

  const get = async (enth: THTTPparams) => {
    let errDict = null
    try {
      const response_ = await $api(`/auth/${enth.path}`, {
        baseURL: appStore.apiURL,
        ...(enth.params ? { params: enth.params } : {}),
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        onResponseError({ error, response }) {
          errDict = extractError(response)
          throw errDict
        },
      })

      if (enth.onSuccess)
        enth.onSuccess(response_)

      return { status: 200, result: response_ }
    }
    catch (error) {
      if (enth.onError && errDict)
        enth.onError(errDict)
      else
        return error
    }
  }

  const put = async (enth: THTTPparams) => {
    let errDict = null
    try {
      const response_ = await $api(`/auth/${enth.path}`, {
        baseURL: appStore.apiURL,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        ...(enth.params ? { params: enth.params } : {}),
        ...(enth.body ? { body: JSON.stringify(enth.body) } : {}),
        onResponseError({ error, response }) {
          errDict = extractError(response)
          throw errDict
        },
      })

      if (enth.onSuccess)
        enth.onSuccess(response_)

      return { status: 200, result: response_ }
    }
    catch (error) {
      if (enth.onError && errDict)
        enth.onError(errDict)
      else
        return error
    }
  }

  const post = async (enth: THTTPparams) => {
    let errDict = null
    try {
      const response_ = await $api(`/auth/${enth.path}`, {
        baseURL: appStore.apiURL,
        ...(enth.params ? { params: enth.params } : {}),
        ...(enth.body ? { body: JSON.stringify(enth.body) } : {}),
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        onResponseError({ error, response }) {
          errDict = extractError(response)
          throw errDict
        },
      })

      if (enth.onSuccess)
        enth.onSuccess(response_)

      return { status: 200, result: response_ }
    }
    catch (error) {
      if (enth.onError && errDict)
        enth.onError(errDict)
      else
        return error
    }
  }

  return {
    get, put, post, extractError,
  }
}

import { useAppStore } from '@/stores/appStore';

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
  const get = async (enth: THTTPparams) => {
    try {
      const response_ = await $api(`/auth/${enth.path}`, {
        // baseURL: appStore.apiURL,
        ...(enth.params ? { params: enth.params } : {}),
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        onResponseError({ error, response }) {
          console.log([error, response])
          const dict_err = extractError({ status: response.status, error: response._data.detail })
          if (enth.onError) enth.onError(dict_err)
          throw dict_err
        },
      })
      if (enth.onSuccess)
        enth.onSuccess(response_)
      return { status: 200, result: response_ }
      // else {
      //   let text_ = await response_.text()
      //   try {
      //     text_ = text_ && JSON.parse(text_);
      //   } catch (error) { }
      //   const dict_err = {
      //     status: response_.status, result: (typeof text_ === 'object' && text_.hasOwnProperty('_data') ?
      //       (text_._data.hasOwnProperty('detail') ? text_._data.detail : text_._data) : text_)
      //   }
      //   if (enth.onError)
      //     enth.onError(dict_err)
      //   throw dict_err
      // }
    } catch (error) {
      return error
    }
  }
  const put = async (enth: THTTPparams) => {
    try {
      const response_ = await $api(`/auth/${enth.path}`, {
        // baseURL: appStore.apiURL,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        ...(enth.params ? { params: enth.params } : {}),
        ...(enth.body ? { body: JSON.stringify(enth.body) } : {}),
        onResponseError({ error, response }) {
          console.log([error, response])
          const dict_err = extractError({ status: response.status, error: response._data.detail })
          if (enth.onError) enth.onError(dict_err)
          throw dict_err
        },
      })
      if (enth.onSuccess)
        enth.onSuccess(response_)
      return { status: 200, result: response_ }
    } catch (error) {
      return error
    }
  }
  const post = async (enth: THTTPparams) => {
    try {
      const response_ = await $api(`/auth/${enth.path}`, {
        // baseURL: appStore.apiURL,
        ...(enth.params ? { params: enth.params } : {}),
        ...(enth.body ? { body: JSON.stringify(enth.body) } : {}),
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        onResponseError({ error, response }) {
          console.log([error, response])
          const dict_err = extractError({ status: response.status, error: response._data.detail })
          if (enth.onError) enth.onError(dict_err)
          throw dict_err
        },
      })
      if (enth.onSuccess)
        enth.onSuccess(response_)
      return { status: 200, result: response_ }
    } catch (error) {
      return error
    }
  }

  const extractError = (errDict: any) => {
    const extractMsg = (msgDict: any) => {
      if (typeof msgDict === 'string' && msgDict.toLowerCase().indexOf('<html') != -1)
        return 'Unknown'
      return msgDict
    }
    if (typeof errDict === 'string')
      return { status: 500, result: extractMsg(errDict) }
    else if (Array.isArray(errDict)) {
      const errorStatus = errDict.length === 2 ? errDict[0] : 500
      const errorMsg = errDict.length === 2 ? extractMsg(errDict[1]) : 'Unknown'
      return { status: errorStatus, result: errorMsg }
    } else if (typeof errDict === 'object') {
      try {
        const key = Object.keys(errDict)
        const errorStatus = key.includes('status') ? errDict.status : (key.includes('statusCode') ? errDict.statusCode : (key.includes('state') ? errDict.state : 500))
        const errorMsg = key.includes('result') ? extractMsg(errDict.result) : (key.includes('error') ? extractMsg(errDict.error) :
          (key.includes('msg') ? extractMsg(errDict.msg) : 'Unknown'))
        return { status: errorStatus, result: errorMsg }
      } catch (error) { }
    }
    return { status: 500, result: 'Unknown error' }
  }

  return {
    get, put, post, extractError
  }
}

// import Axios from 'axios'
import * as _ from 'lodash'
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import history from './history';

export enum ResponseStatus {
  success = 200,
  fail = 500,
  sysNotInit,
  sysInited,
  notLoggin,
  paramError
}
/**
 * 接口返回json统一结构
 */
export interface ApiResult<T>{
  status: ResponseStatus,
  data: T,
  msg?: string
}

export default function (options: AxiosRequestConfig): Promise<any> {
  return new Promise((resolve, reject) => {
    axios(options)
    .then((res: AxiosResponse<ApiResult<any>>) => {
      let err = new Error()
      switch (res.data.status) {
        case ResponseStatus.success:
          resolve(res.data as ApiResult<any>)
          break
        case ResponseStatus.fail:
        case ResponseStatus.sysInited:
        case ResponseStatus.paramError:
          err.message = res.data.msg
          throw err
        case ResponseStatus.sysNotInit:
          history.push('/init')
          break
        case ResponseStatus.notLoggin:
          history.push('/login')
          break
      }
    })
    .catch((e: Error) => {
      reject(e)
    })
  })
}
/*
 * @Descripttion: 
 * @version: 
 * @Author: Adxiong
 * @Date: 2021-08-03 18:45:22
 * @LastEditors: Adxiong
 * @LastEditTime: 2021-08-06 18:31:48
 */
import { GitModelState } from './git';
import { SysModelState } from './sys';
import type { MenuDataItem, Settings as ProSettings } from '@ant-design/pro-layout';
import { GlobalModelState } from './global';
import { UserModelState } from './user';
import { TemplateModelState } from "./template";

export { GlobalModelState, UserModelState };

export type Loading = {
  global: boolean;
  effects: Record<string, boolean | undefined>;
  models: {
    global?: boolean;
    menu?: boolean;
    setting?: boolean;
    user?: boolean;
    template?: boolean;
  };
};

export type ConnectState = {
  global: GlobalModelState;
  loading: Loading;
  settings: ProSettings;
  user: UserModelState;
  sys: SysModelState;
  git: GitModelState;
  template: TemplateModelState;
};

export type Route = {
  routes?: Route[];
} & MenuDataItem;

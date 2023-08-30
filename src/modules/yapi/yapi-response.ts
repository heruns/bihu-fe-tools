export interface SuccessYapiResponse<Data> {
  errcode: 0;
  errmsg: string;
  data: Data;
}
export interface ErrorYapiResponse {
  errcode: number;
  errmsg: string;
  data: null;
}
export type YapiResponse<Data> = SuccessYapiResponse<Data> | ErrorYapiResponse;

// 判断一个值是否 yapi 接口响应
export const isYapiResponse = (res: unknown): res is YapiResponse<unknown> => {
  return typeof res === 'object' && !!res && typeof (res as any).errcode !== 'undefined' && typeof (res as any).data !== 'undefined';
};
// 判断一个值是否成功的 yapi 接口响应
export const isSuccessYapiResponse = (res: YapiResponse<unknown>): res is SuccessYapiResponse<unknown> => res.errcode === 0 && res.data !== null;

/* eslint-disable @typescript-eslint/naming-convention */ 
export interface InterfaceResponse {
  query_path:{
      path: string;
      params:[];
  },
  req_body_is_json_schema: boolean;
  res_body_is_json_schema: boolean;
  req_body_type: string;
  res_body_type: string;
  /** json-schema.org/draft-04/schema#\",\"description\":\"SysUserRegisterRequest\"}", */
  req_body_other: string;
  title: string;
  path: string;
  /** json-schema.org/draft-04/schema#\",\"description\":\"CommonResponse\"}", */
  res_body: string;
  method: string;
}

export interface ProjectResponse {
  name: string;
  basepath: string;
}

export interface InterfaceListResponseItem {
  _id: number;
  title: string;
  path: string;
  catid: number;
  method: string;
  project_id: number;
  add_time: number;
}
export type InterfaceListResponse = {
  count: number;
  total: number;
  list: InterfaceListResponseItem[];
};
/* eslint-enable @typescript-eslint/naming-convention */ 

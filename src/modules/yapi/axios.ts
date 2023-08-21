import * as vscode from 'vscode';
import axios from 'axios';
import { isSuccessYapiResponse, isYapiResponse } from './yapi-response';

const axiosInstance = axios.create();
// 通过拦截器自动添加 baseURL 和 token
axiosInstance.interceptors.request.use(request => {
  const config = vscode.workspace.getConfiguration();
  if (!request.baseURL && !/^https?:\/\//.test(request.url || '')) {
    request.baseURL = config.get<string>('bihuFeTools.yapiDomain');
  }
  if (!request.params?.token) {
    request.params = {
      ...request.params,
      token: config.get<string>('bihuFeTools.yapiToken')
    };
  }
  return request;
});
axiosInstance.interceptors.response.use(response => {
  console.log('>>>> response:', response);
  const { data } = response;
  if (!isYapiResponse(data)) {
    vscode.window.showErrorMessage('接口响应无法识别');
    console.error(response);
    throw new Error('接口响应无法识别');
  } else if (data.errcode === 40011) {
    console.error(response);
    vscode.window.showErrorMessage('token 无效，请修改 token 配置');
    throw new Error('token 无效，请修改 token 配置');
  } else if (!isSuccessYapiResponse(data)) {
    console.error(response);
    vscode.window.showErrorMessage('请求失败，请检查输入的参数是否正确');
    throw new Error('请求失败，请检查输入的参数是否正确');
  }
  return response;
}, error => {
  console.error('response error');
  console.error(error);
  vscode.window.showErrorMessage('请求失败，请检查 yapi 域名是否配置正确，或网络是否正常');
});

export default axiosInstance;

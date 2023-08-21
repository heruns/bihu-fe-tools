import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import axiosInstance from './axios';
import { InterfaceResponse, ProjectResponse, SuccessYapiResponse } from './yapi-response';
import { json2ts } from '../json2ts';

const domainRegexp = /^(https?:\/\/[^/?#]+)(?:[\/?#]|$)/i;
export function getDomainFromUrl(url: string): string {
  url = url.trim();
  try {
    const parsedUrl = new URL(url);
    const { protocol, hostname } = parsedUrl;
    if (!protocol || !hostname) {
      return '';
    }
    return `${protocol}//${hostname}`; 
  } catch (_) {
    // 如果 URL 解析失败,则使用正则表达式提取
    const matched = url.match(domainRegexp);
    return matched ? matched[1] : '';
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log('yapi 模块加载成功');

  // 获取域名
  const getDomain = async (isSetting = false, showInputIfNotExist = true) => {
    const config = vscode.workspace.getConfiguration();
    const yapiDomainInSetting = config.get<string>('bihuFeTools.yapiDomain');
    if ((yapiDomainInSetting && !isSetting) || !showInputIfNotExist) {
      return yapiDomainInSetting;
    }
    const yapiDomain = await vscode.window.showInputBox({
      title: '请输入 yapi 域名',
      value: yapiDomainInSetting || '',
      placeHolder: '请输入 yapi 域名，需包含协议，如 https://yapi.com',
      validateInput(value) {
        let error: vscode.InputBoxValidationMessage | null = null;
        if (!value.trim()) {
          error = {
            message: '请输入 yapi 域名',
            severity: 3
          };
        } else if (!domainRegexp.test(value)) {
          error = {
            message: '域名格式不正确，需包含协议',
            severity: 3
          };
        }
        return error;
      },
    });
    
    const domain = yapiDomain ? getDomainFromUrl(yapiDomain) : yapiDomain;
    // 修改配置
    config.update('bihuFeTools.yapiDomain', domain, vscode.ConfigurationTarget.Workspace); 
    return domain;
  };
  const tokenRegexp = /^[0-9a-z]{64}$/;
  // 获取 token
  const getToken = async (isSetting = false) => {
    const config = vscode.workspace.getConfiguration();
    const yapiTokenInSetting = config.get<string>('bihuFeTools.yapiToken');
    if (yapiTokenInSetting && !isSetting) {
      return yapiTokenInSetting;
    }
    const domain = await getDomain(false, false);
    const yapiToken = await vscode.window.showInputBox({
      title: '请输入 yapi 项目 token',
      value: yapiTokenInSetting || '',
      placeHolder: `请输入 yapi 项目 token，可在 "${domain || '{yapi 域名}'}/project/{项目id}/setting" 页面中复制`,
      validateInput(value) {
        let error: vscode.InputBoxValidationMessage | null = null;
        if (!value.trim()) {
          error = {
            message: '请输入 yapi 项目 token',
            severity: 3
          };
        } else if (!tokenRegexp.test(value)) {
          error = {
            message: 'token 格式不正确',
            severity: 3
          };
        }
        return error;
      },
    });
    console.log('>>>> yapiToken:', yapiToken);
    
    // 修改配置
    config.update('bihuFeTools.yapiToken', yapiToken, vscode.ConfigurationTarget.Workspace); 
    return yapiToken;
  };
  interface DomainAndToken {
    domain: string;
    token: string;
  }
  // 获取域名和 token
  const getDomainAndToken = async() => {
    const domain = await getDomain();
    const token = await getToken();
    const res: DomainAndToken = {
      domain: domain || '',
      token: token || ''
    };
    return res;
  };

  // 获取项目的 base url
  const getBaseURL = async() => {
    const { domain, token } = await getDomainAndToken();
    if (!domain || !token) {
      return;
    }
    const projectInfo = await axiosInstance.get<SuccessYapiResponse<ProjectResponse>>('/api/project/get');
    console.log('>>>> projectInfo:', projectInfo);
    return projectInfo.data.data.basepath;
  };
  const titleCase = (name: string) => name.replace(/^[a-z]/, v => v.toUpperCase());
  const getApiMethodString = (data: InterfaceResponse, baseURL = '') => {
    const comment = data.title;
    const path = data.query_path.path;
    const methodName = path.match(/([^/]+)$/)?.[1] || 'undefinedApiName';
    let paramsVariableName = '';
    let paramsTsDefinition = '';
    let paramsTsDefinitionName = titleCase(`${methodName}Params`);
    if (data.req_body_other) {
      paramsVariableName = 'body';
      paramsTsDefinition = data.req_body_type === 'json' && !data.req_body_is_json_schema ? json2ts(data.req_body_other) : '';
    }
    const method = data.method.toLowerCase();
    return `// ${comment}
\t${methodName}(${paramsVariableName}: ${paramsTsDefinitionName}) {
\t\treturn api.${method}<unknown>('${baseURL}${path}', ${paramsVariableName}, {
\t\t\tmock: true,
\t\t})
\t}`;
  };

  // 添加接口
  const addApi = async() => {
    const { domain, token } = await getDomainAndToken();
    if (!domain || !token) {
      return;
    }
    const apiId = await vscode.window.showInputBox({
      title: '请输入接口 id',
      value: '',
      placeHolder: '请输入 yapi id, 如 "8888"',
      validateInput(value) {
        let error: vscode.InputBoxValidationMessage | null = null;
        if (!value.trim()) {
          error = {
            message: '请输入接口 id',
            severity: 3
          };
        } else if (!/^\d+$/.test(value)) {
          error = {
            message: '接口 id 格式不正确',
            severity: 3
          };
        }
        return error;
      },
    });
    if (!apiId) {
      return;
    }
    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification, // 进度条显示的位置
      title: '获取 yapi 接口信息...', // 进度条标题
      cancellable: false // 是否可取消
    }, async(progress, token) => {
      const [baseURL, interfaceRes] = await Promise.all([
        getBaseURL(),
        axiosInstance.get<SuccessYapiResponse<InterfaceResponse>>('/api/interface/get', {
          params: {
            id: apiId
          }
        })
      ]);
      const { data } = interfaceRes.data;
      console.log('>>>> baseURL:', baseURL);
      console.log('>>>> data:', data);
      const apiMethodString = getApiMethodString(data, baseURL);
      console.log('>>>> apiMethodString:', apiMethodString);
    });
  };

  const disposable = vscode.commands.registerCommand('bihu-code-snippets.config-yapi', async (uri: vscode.Uri) => {
    await getDomain(true);
    await getToken(true);
  });
  const disposableForAddApi = vscode.commands.registerCommand('bihu-code-snippets.add-api', async (uri: vscode.Uri) => {
    addApi();
  });

  context.subscriptions.push(disposable, disposableForAddApi);
}

// 当您的扩展程序被停用时，将调用此方法
export function deactivate() {}

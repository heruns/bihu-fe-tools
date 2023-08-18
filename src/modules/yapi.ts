import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';

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

  // 获取项目信息
  const getProjectInfo = async() => {
    const { domain, token } = await getDomainAndToken();
    if (!domain || !token) {
      return;
    }
    const projectInfo = await axios.get(`${domain}/api/project/get`, {
      params: {
        token
      }
    });
    console.log('>>>> projectInfo:', projectInfo);
  };
  getProjectInfo();

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
    const interfaceInfo = await axios.get(`${domain}/api/interface/get`, {
      params: {
        token,
        id: apiId
      }
    });
    console.log('>>>> interfaceInfo:', interfaceInfo);
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

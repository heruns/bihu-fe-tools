import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import axiosInstance from './axios';
import { InterfaceListResponse, InterfaceResponse, ProjectResponse, SuccessYapiResponse } from './yapi-response';
import { json2ts } from '../json2ts';
import { importModule } from '../../utils';

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

  const indentSizeCache: Record<string, string> = {};
  // 获取缩进
  const getIndent = (size: number) => {
    if (indentSizeCache[size]) {
      return indentSizeCache[size];
    }
    const editor = vscode.window.activeTextEditor;
    let tabSize = 2;
    let insertSpaces = true;
    if (editor) {
      tabSize = Number(editor.options.tabSize) || 2;
      insertSpaces = !!(editor.options.insertSpaces) || true;
    }
    indentSizeCache[size] = new Array(size).fill(insertSpaces ? new Array(tabSize).fill(' ').join('') : '\t').join('');
    return indentSizeCache[size];
  };

  const titleCase = (name: string) => name.replace(/^[a-z]/, v => v.toUpperCase());
  interface GetApiMethodStringResponse {
    /** 请求方法字符串 */
    methodString: string;
    /** 请求参数类型名称 */
    paramsTsDefinitionName: string;
    /** 请求参数类型定义 */
    paramsTsDefinition: string;
    /** 响应参数类型名称 */
    responseTsDefinitionName: string;
    /** 响应参数类型定义 */
    responseTsDefinition: string;
  }
  /**
   * 获取单个接口的请求方法字符串
   * @param data yapi interface 接口返回的数据
   * @param baseURL 接口的 baseURL
   * @returns 请求方法字符串和参数等
   */
  const getApiMethodString = (data: InterfaceResponse, baseURL = '') => {
    const comment = data.title;
    const path = data.query_path.path;
    const methodName = path.split('/').reverse().find(chunk => /^\w+$/.test(chunk)) || 'undefinedApiName';
    let paramsVariableName = '';
    let paramsTsDefinitionName = titleCase(`${methodName}Params`);
    let paramsTsDefinition = '';
    let responseTsDefinitionName = titleCase(`${methodName}Response`);
    let responseTsDefinition = '';
    if (data.req_body_other) {
      paramsVariableName = 'body';
      let paramsJsonToParse = data.req_body_type === 'json' && !data.req_body_is_json_schema ? data.req_body_other : '';
      paramsTsDefinition = json2ts(paramsJsonToParse);
    }
    if (data.res_body) {
      // 提取 res_body 中的 data 作为响应参数
      let responseJsonToParse = data.res_body_type === 'json' && !data.res_body_is_json_schema ? data.res_body : '';
      responseTsDefinition = json2ts(responseJsonToParse, {
        extractData: true
      });
    }
    const method = data.method.toLowerCase();
    const methodString = `\n  // ${comment}
${getIndent(1)}${methodName}(${paramsVariableName ? `${paramsVariableName}: ${paramsTsDefinitionName}` : ''}) {
${getIndent(2)}return api.${method}<${responseTsDefinitionName}>('${baseURL}${path}', ${paramsVariableName || 'null'}, {
${getIndent(3)}mock: true,
${getIndent(2)}})
${getIndent(1)}},`;
    const res: GetApiMethodStringResponse = {
      methodString,
      paramsTsDefinitionName,
      paramsTsDefinition,
      responseTsDefinitionName,
      responseTsDefinition
    };
    return res;
  };

  /**
   * 获取类型文件路径
   * @param type 路径类型，相对/绝对路径
   * @param preserveSuffix 是否保留后缀
   */
  const getTypesFilePath = (type: 'relative' | 'absolute', preserveSuffix = true) => {
    const editor = vscode.window.activeTextEditor;
    if(!editor) {
      return '';
    }
    const filePath = editor.document.fileName;
    let fileName = path.basename(filePath);
    if (!preserveSuffix) {
      fileName = fileName.replace(/\.\w+$/, '');
    }
    const relativePath = `./types/${fileName}`;
    if (type === 'relative') {
      return relativePath;
    }
    return path.join(path.dirname(filePath), relativePath);
  };
  /**
   * 在 types 文件中创建 Params 或 Response 类型
   * @param filePath 文件路径
   * @param name 接口名
   * @param json 用于转换成接口类型的 json
   * @param comment 注释
   */
  const createInterfaceInTypesFile = (filePath: string, name: string, interfaceDefinition: string, comment?: string) => {
    // TODO: 根据 api 上下文将类型声明插入到对应位置
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      // 创建文件
      fs.writeFileSync(filePath, '');
    }

    if (!interfaceDefinition) {
      return;
    }

    // 追加内容到文件最后一行
    fs.appendFileSync(filePath, `\n${comment ? `/** ${comment} */\n` : ''}export interface ${name} ${interfaceDefinition}\n`);
  };

  // 添加接口
  const addInterfaces = async(idList: (string | number)[]) => {
    // 将内容插入到 vscode 中
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return; // 如果没有活动的文本编辑器，则退出命令
    }
    let currentPosition = editor.selection.active;

    const [baseURL, ...interfaceResList] = await Promise.all([
      getBaseURL(),
      ...idList.map(id => {
        return axiosInstance.get<SuccessYapiResponse<InterfaceResponse>>('/api/interface/get', {
          params: { id }
        });
      })
    ]);
    for (const interfaceRes of interfaceResList) {
      const { data } = interfaceRes.data;
      const res = getApiMethodString(data, baseURL);

      const typesAbsolutePath = getTypesFilePath('absolute');
      const typesRelativePath = getTypesFilePath('relative', false);
      res.paramsTsDefinition && createInterfaceInTypesFile(typesAbsolutePath, res.paramsTsDefinitionName, res.paramsTsDefinition, `${data.title}-请求参数`);
      res.responseTsDefinition && createInterfaceInTypesFile(typesAbsolutePath, res.responseTsDefinitionName, res.responseTsDefinition, `${data.title}-响应参数`);
      await importModule(res.paramsTsDefinitionName, typesRelativePath);
      await importModule(res.responseTsDefinitionName, typesRelativePath);
      await editor.edit(editBuilder => {
        editBuilder.insert(currentPosition, res.methodString);
      });
      currentPosition = editor.selection.active;
    }
  };
  // 添加接口
  const addApiByInputId = async() => {
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
      await addInterfaces([apiId]);
    });
  };
  // 选择接口
  const selectApi = async() => {
    const { domain, token } = await getDomainAndToken();
    if (!domain || !token) {
      return;
    }
    const interfaceList = await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification, // 进度条显示的位置
      title: '获取 yapi 接口信息...', // 进度条标题
      cancellable: false // 是否可取消
    }, async(progress, token) => {
      const interfaceList = await axiosInstance.get<SuccessYapiResponse<InterfaceListResponse>>('/api/interface/list', {
        params: {
          page: 1,
          limit: 999
        }
      });
      return interfaceList;
    });
    
    interface QuickPickItem extends vscode.QuickPickItem {
      id: number;
    }
    const pickList: QuickPickItem[] = interfaceList.data.data.list.map(item => {
      return {
        id: item._id,
        label: `${item.method}:${item.path}`,
        description: `${item.title}(${item._id})`
      };
    });
    const res = await vscode.window.showQuickPick(pickList, {
      title: '请选择需要导入的接口',
      canPickMany: true,
      ignoreFocusOut: true,
      matchOnDescription: true
    });
    console.log('>>>> res:', res);
    if (res?.length) {
      vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification, // 进度条显示的位置
        title: '获取 yapi 接口信息...', // 进度条标题
        cancellable: false // 是否可取消
      }, async(progress, token) => {
        await addInterfaces(res.map(item => item.id));
      });
    }
  };

  const disposable = vscode.commands.registerCommand('bihu-code-snippets.config-yapi', async (uri: vscode.Uri) => {
    await getDomain(true);
    await getToken(true);
  });
  const disposableForAddApi = vscode.commands.registerCommand('bihu-code-snippets.add-api', async (uri: vscode.Uri) => {
    selectApi();
    // vscode.window.showQuickPick(Array.from({ length: 20 }, (v, i) => `选项 ${i + 1}`));
  });

  context.subscriptions.push(disposable, disposableForAddApi);
}

// 当您的扩展程序被停用时，将调用此方法
export function deactivate() {}

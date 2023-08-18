import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function getDomainFromUrl(url: string): string {
  url = url.trim();
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname; 
  } catch (_) {
    // 如果 URL 解析失败,则使用正则表达式提取
    const matched = url.match(/^https?:\/\/([^/?#]+)(?:[\/?#]|$)/i);
    return matched ? matched[1] : url; 
  }

}

export function activate(context: vscode.ExtensionContext) {
  console.log('yapi 模块加载成功');

  const disposable = vscode.commands.registerCommand('bihu-code-snippets.config-yapi', async (uri: vscode.Uri) => {
    const config = vscode.workspace.getConfiguration();
    const yapiDomainInSetting = config.get<string>('bihuFeTools.yapiDomain');
    const yapiDomain = await vscode.window.showInputBox({
      title: '请输入 yapi 域名',
      value: yapiDomainInSetting || '',
      placeHolder: '请输入 yapi 域名',
      validateInput(value) {
        let error: vscode.InputBoxValidationMessage | null = null;
        if (!value.trim()) {
          error = {
            message: '请输入 yapi 域名',
            severity: 3
          };
        }
        return error;
      },
    });
    console.log('>>>> yapiDomain:', yapiDomain);
    
    // 修改配置
    config.update('bihuFeTools.yapiDomain', yapiDomain, vscode.ConfigurationTarget.Workspace); 
    if (typeof yapiDomain === 'string') {
      return yapiDomain.trim();
    } else {
      return yapiDomain;
    }
  });

  context.subscriptions.push(disposable);
}

// 当您的扩展程序被停用时，将调用此方法
export function deactivate() {}

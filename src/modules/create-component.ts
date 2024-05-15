import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import { MD5 } from '../assets/js/md5';
import { exec, execSync } from 'child_process';

// 百度api翻译文本
const translateText = async (query: string, from: string, to: string): Promise<string> => {
  const BAIDU_APP_ID = '20240427002036696';
  const BAIDU_KEY = 'kX9lTasiO8zduhdKvvTH';

  const appid = BAIDU_APP_ID;
  const key = BAIDU_KEY;
  const salt = (new Date()).getTime().toString();
  const str1 = appid + query + salt + key;
  const sign = MD5(str1); // 计算签名

  const url = `https://fanyi-api.baidu.com/api/trans/vip/translate?q=${encodeURIComponent(query)}&from=${from}&to=${to}&appid=${appid}&salt=${salt}&sign=${sign}`;

  return new Promise<string>((resolve, reject) => {
    https.get(url, response => {
      let data = '';

      response.on('data', chunk => {
        data += chunk;
      });

      response.on('end', () => {
        const result = JSON.parse(data);
        if (result.error_code) {
          reject(new Error(`Translation failed: ${result.error_msg}`));
        } else {
          const translation = result.trans_result[0].dst;
          resolve(translation);
        }
      });
    }).on('error', error => {
      reject(new Error('Translation failed'));
      vscode.window.showErrorMessage(error?.message || '翻译失败 Translation failed');
    });
  });
};

// 转换组件英文名称
export const enTxt2ComponentEnName = (text?: string): string | undefined => {
  if (!text) { return text; }
  // 如果输入的是小写英文并用连字符分隔，则直接返回
  if (/^[a-z]+-[a-z]+$/i.test(text)) {
    console.log('text :>> ', text);
    return text;
  }
  // 将驼峰命名转换为连字符分隔，并转为小写字母
  const hyphenSeparatedText = text.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`);
  // 将连续的空格和连字符替换为一个连字符，并去除首尾的空格和连字符
  const trimmedText = hyphenSeparatedText.replace(/[-\s]+/g, " ").trim().replace(/\s/g, "-").replace(/(^[^-a-z]+)|([^a-z]+$)/g, '');
  return trimmedText.toLowerCase();
};

// 获取中英文
const getChineseAndEnglish = (text: string): [string, string] => {
  let chinese = '';
  let english = '';

  // 使用空格分隔输入文本
  const parts = text.split(' ');

  // 遍历分隔后的结果，判断每个部分是中文还是英文
  parts.forEach(part => {
    if (/[\u4e00-\u9fa5]/.test(part)) {
      chinese += part + ' ';
    } else {
      english += part + ' ';
    }
  });

  return [english.trim(), chinese.trim()];
};

// 检查同一文件夹中是否已经存在相同名称的组件
const checkDuplicateComponent = (componentPath: string): boolean => {
  const componentName = path.basename(componentPath); // 获取组件名称

  const parentDir = path.dirname(componentPath); // 获取组件所在的父文件夹路径
  const content = fs.readdirSync(parentDir); // 获取父文件夹下的所有文件和文件夹

  // 检查是否存在同名文件或文件夹
  return content.some(item => item === componentName);
};

// 获取组件名称 中英文
const getComponentName = async (): Promise<{ zhName: string, enName: string } | undefined> => {
  let enName: string | undefined;
  let zhName: string | undefined;

  const inputValue = await vscode.window.showInputBox({
    placeHolder: '输入组件英文与中文名称并空格隔开，如：test-page 测试页面',
    prompt: `若只输入中文或英文，会自动翻译`,
    validateInput: (input) => {
      // 检查输入是否为空
      if (!input) {
        return '请输入页面/组件的名称';
      }
      // 输入有效
      return null;
    }
  });
  // 取消输入
  if (!inputValue) { return; }
  // 获取组件名称
  try {
    const englishRegex = /[a-zA-Z]+/g;
    const chineseRegex = /[\u4e00-\u9fa5]+/g;
    const englishMatches = inputValue.match(englishRegex);
    const chineseMatches = inputValue.match(chineseRegex);
    if (englishMatches && chineseMatches) {
      // 中文混合
      const [english, chinese] = getChineseAndEnglish(inputValue);
      enName = english;
      zhName = chinese;
    } else if (!englishMatches && chineseMatches) {
      // 只有中文
      zhName = inputValue.trim();
      // 翻译英文
      enName = await translateText(zhName, 'zh', 'en');
      // 英文转换组件英文名称
      enName = enTxt2ComponentEnName(enName);
      // 把翻译出来的英文展示给用户确认并支持修改
      enName = await vscode.window.showInputBox({
        placeHolder: enName,
        prompt: `组件英文名称为 ${enName} ，请确认或手动编辑`,
        value: enName,
      });
    } else if (englishMatches && !chineseMatches) {
      // 只有英文
      enName = inputValue.trim();
      // 翻译中文
      zhName = await translateText(enName, 'en', 'zh');
      //  把翻译出来的中文展示给用户确认并支持修改
      zhName = await vscode.window.showInputBox({
        placeHolder: zhName,
        prompt: `组件中文名称为 ${zhName} ，请确认或手动编辑`,
        value: zhName,
      });
      // 英文转换组件英文名称
      enName = enTxt2ComponentEnName(enName);
    }

  } catch (error: any) {
    // 弹出错误提示框
    vscode.window.showErrorMessage(error?.message);
  }
  if (!zhName) { zhName = '未命名'; }
  if (!enName) { enName = 'new-component'; }

  // 返回组件名称
  return Promise.resolve({
    zhName,
    enName
  });
};

// 获取项目根目录路径
export function getProjectRootPath(): string | undefined {
  // 获取当前打开的工作区路径
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage('No workspace opened.');
    return;
  }
  const workspacePath = workspaceFolders[0].uri.fsPath; // 获取第一个工作区路径
  const projectRoot = path.join(workspacePath, '/'); // 拼接成项目根目录路径
  return projectRoot;
}

// 创建组件成功后打开文件
const openFile = (filePath: string) => {
  vscode.workspace.openTextDocument(filePath).then(doc => {
    vscode.window.showTextDocument(doc);
  });
};

export function activate(context: vscode.ExtensionContext) {
  console.log('create-react-component 模块加载成功');
  const disposable = vscode.commands.registerCommand('bihu-code-snippets.createComponent', async (uri: vscode.Uri) => {
    // console.log(uri);
    if (!uri) {
      return;
    }

    // 创建组件函数
    const createComponentFn = async () => {
      let filePath = uri.fsPath;
      const stat = fs.promises.stat(uri.fsPath);
      const isDirectory = (await stat).isDirectory();

      // 若选中的是文件那么更新路径为当前文件夹
      if (!isDirectory) {
        filePath = path.dirname(filePath);
      }

      // 获取组件名称
      const result = await getComponentName();
      if (!result) { return; }
      const { zhName, enName } = result;
      // console.log('zhName :>> ', zhName);
      // console.log('enName :>> ', enName);
      // console.log('filePath :>> ', filePath);
      // 组件路径
      const componentPath = `${filePath}/${enName}`;
      // 去重
      if (checkDuplicateComponent(componentPath)) {
        vscode.window.showErrorMessage(`在同一文件夹中已有 ${enName} 的组件，请重新命名组件。`);
        return;
      }

      // 切换工作目录
      const projectRoot = getProjectRootPath();
      projectRoot && process.chdir(projectRoot);

      // 执行 npm 命令 创建页面/组件
      const command = `npm run create ${componentPath} ${zhName}`;
      exec(command, (error, stdout, stderr) => {
        if (error) {
          // console.error('npm error:', error);
          vscode.window.showErrorMessage(`创建组件失败 ${error?.message}`);
          return;
        }
        // console.log('npm output:', stdout);
        // console.error('npm stderr:', stderr);
        // 显示成功提示
        // vscode.window.showInformationMessage('创建组件成功');

        // 组件文件路径
        const componentFilePath = `${componentPath}/${enName}.tsx`;
        const fileStats = fs.statSync(componentFilePath);
        if (fileStats.isFile()) {
          openFile(componentFilePath);
        } else {
          // 提示该路径是一个目录，不能直接打开
          vscode.window.showErrorMessage('无法打开目录，请选择文件进行打开。');
        }
      });
    };

    // 创建进度条
    try {
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: '正在创建组件...',
        cancellable: false
      }, async (progress) => {
        try {
          await createComponentFn();
        } catch (error: any) {
          vscode.window.showErrorMessage(error.message);
        }
      });

    } catch (error: any) {
      vscode.window.showErrorMessage(error.message);
    }
  });

  context.subscriptions.push(disposable);
}

// 当您的扩展程序被停用时，将调用此方法
export function deactivate() { }
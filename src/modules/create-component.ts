import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import { MD5 } from '../assets/js/md5';
import { exec, execSync } from 'child_process';

/**
 * 使用百度翻译API异步翻译文本。
 * @param query 要翻译的文本。
 * @param from 源语言代码。
 * @param to 目标语言代码。
 * @returns 翻译后的文本的Promise。
 */
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

/**
 * 将给定文本转换为连字符分隔且全小写的组件名称。
 * 如果输入文本已是小写并用连字符分隔，则直接返回该文本。
 * @param text 要转换的原始文本。
 * @returns 转换后的文本，如果输入为空，则返回undefined。
 */
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

/**
 * 将包含中英文的字符串分割为英文和中文两部分。
 * @param text 包含中英文的字符串。
 * @returns 英文和中文部分组成的元组，第一个元素为英文，第二个为中文。
 */
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

/**
 * 检查指定路径下是否已存在同名的组件。
 * @param componentPath 组件的路径。
 * @returns 如果存在同名组件，则返回true，否则返回false。
 */
const checkDuplicateComponent = (componentPath: string): boolean => {
  const componentName = path.basename(componentPath); // 获取组件名称

  const parentDir = path.dirname(componentPath); // 获取组件所在的父文件夹路径
  const content = fs.readdirSync(parentDir); // 获取父文件夹下的所有文件和文件夹

  // 检查是否存在同名文件或文件夹
  return content.some(item => item === componentName);
};

/**
 * 异步获取用户输入的组件名称，并自动翻译中英文。
 * @returns 组件的中文和英文名称，如果用户取消输入，则返回undefined。
 */
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

/**
 * 获取并验证当前打开的工作区的根目录路径。
 * @returns 如果成功获取到项目根目录则返回该路径，如果没有打开的工作区或路径不存在则返回undefined。
 */
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

/**
 * 尝试打开指定路径的组件文件。
 * @param componentFilePath 要打开的组件文件的路径。
 */
const openComponentFile = (componentFilePath: string): void => {
  try {
    // 检查文件状态
    const fileStats = fs.statSync(componentFilePath);
    // 如果路径是文件，使用 VSCode API 打开它
    if (fileStats.isFile()) {
      vscode.workspace.openTextDocument(componentFilePath).then(doc => {
        vscode.window.showTextDocument(doc);
      });
    } else {
      // 如果路径不是文件，提示错误
      vscode.window.showErrorMessage('无法打开目录，请选择文件进行打开。');
    }
  } catch (error: any) {
    // 文件不存在或其他错误
    vscode.window.showErrorMessage(`无法打开文件: ${error?.message}`);
  }
};

// 检查项目的 package.json 文件中是否存在指定的 npm 脚本命令。
const checkNpmScriptExists = (projectRoot: string, scriptName: string) => {
  try {
    // 读取项目的package.json文件
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    // 检查scripts字段是否包含指定的npm命令
    return packageJson.scripts && packageJson.scripts[scriptName];
  } catch (error) {
    console.error('Error reading package.json:', error);
    return false;
  }
};

/**
 * 获取和切换到项目的根目录。
 * @returns 返回项目的根目录路径或在出现错误时返回 undefined。
 */
const switchToProjectRoot = (): string | undefined => {
  const getProjectRootPath = (): string | undefined => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    return workspaceFolders ? workspaceFolders[0].uri.fsPath : undefined;
  };

  const projectRoot = getProjectRootPath();
  if (!projectRoot) {
    vscode.window.showErrorMessage('No workspace opened.');
    return;
  }

  if (!fs.existsSync(projectRoot)) {
    vscode.window.showErrorMessage('项目根目录不存在。');
    return;
  }

  try {
    process.chdir(projectRoot);
  } catch (error: any) {
    vscode.window.showErrorMessage(`更改目录失败: ${error?.message}`);
    return;
  }

  return projectRoot;
};

/**
 * 检查项目的package.json文件中是否包含指定的npm脚本命令。
 * @param projectRoot 项目根目录的路径。
 * @param scriptName 要检查的脚本名称。
 * @returns 如果存在指定的脚本则返回true，否则返回false。
 */
const checkTemplateExists = (templatePath: string): boolean => {
  return fs.existsSync(templatePath);
};

/**
 * 在项目中创建组件，如果项目中没有相应的创建命令则使用备用脚本和模板。
 * @param componentPath 组件的路径。
 * @param zhName 组件的中文名称。
 * @param projectRoot 项目的根目录。
 * @returns 完成创建操作的Promise。
 */
const createComponentWithFallback = (componentPath: string, zhName: string, projectRoot: string): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    const originalDir = process.cwd();  // 保存当前目录
    const fallbackScriptPath = path.join(__dirname, '..', 'src', 'scripts', 'create-template.js'); // 备用创建组件脚本
    const fallbackTemplatePath = path.join(__dirname, '..', 'src', 'templates', 'function-component'); // 备用模板组件

    // npm命令
    let command;
    // 检查是否有 npm 命令和模板文件
    if (!checkNpmScriptExists(projectRoot, 'create') || !checkTemplateExists(path.join(projectRoot, 'templates', 'function-component'))) {
      // 使用备用脚本和模板
      process.chdir(path.dirname(fallbackScriptPath));  // 切换到脚本所在目录
      command = `node "${fallbackScriptPath}" "${componentPath}" "${zhName}"`;
    } else {
      // 使用项目中的 npm 命令和模板
      process.chdir(projectRoot);
      command = `npm run create ${componentPath} ${zhName}`;
    }

    // 执行 npm命令
    exec(command, (error, stdout, stderr) => {
      process.chdir(originalDir);  // 操作后恢复目录
      if (error) {
        vscode.window.showErrorMessage(`创建组件失败: ${error.message}`);
        reject(new Error(`创建组件失败: ${error.message}`));
        return;
      }
      // vscode.window.showInformationMessage('组件创建成功');
      resolve();
    });
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
      const directoryPath = isDirectory ? filePath : path.dirname(filePath);

      // 切换到项目根目录
      const projectRoot = switchToProjectRoot();
      if (!projectRoot) {
        return;
      }

      // 获取组件名称
      const result = await getComponentName();
      if (!result) { return; }
      const { zhName, enName } = result;

      // 组件路径
      const componentPath = `${directoryPath}/${enName}`;
      // 组件文件路径
      const componentFilePath = `${componentPath}/${enName}.tsx`;

      // 检查是否有相同名称的组件
      if (checkDuplicateComponent(componentPath)) {
        vscode.window.showErrorMessage(`在同一文件夹中已有 ${enName} 的组件，请重新命名组件。`);
        return;
      }

      // 创建组件
      await createComponentWithFallback(componentPath, zhName, projectRoot);

      // 打开组件文件
      openComponentFile(componentFilePath);
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
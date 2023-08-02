import * as path from "path";
import * as fs from "fs";
import { get } from 'lodash';
import {
  TextDocument,
  TextLine,
  Position,
  Location,
  Uri,
  env,
  window,
  workspace,
  commands,
  languages,
  TextEditor,
  TextEditorEdit,
  ExtensionContext,
  Hover,
} from "vscode";

// 获取当前参数的全层级路径，
function getParamPaths(document: TextDocument, line: TextLine, firstWord: string) {
  let stackNum = 0;
  const namePath = [firstWord]; // 路径
  for (let index = line.lineNumber - 1; index > 0; index--) {
    const currentLine = document.lineAt(index).text;
    if (currentLine.includes("{") && currentLine.includes("}")) {
      continue;
    }
    if (currentLine.includes("{") && currentLine.includes(":")) {
      if (stackNum === 0) {
        const key = currentLine.match(/^\s*"([^"]+)/)?.[1];
        key && namePath.unshift(key);
      } else {
        stackNum--;
      }
    } else if (currentLine.includes("}")) {
      stackNum++;
    }
  }
  return namePath;
}

// 获取当前参数的全层级路径
function getParamPositionNew(fileStr: string, originParamPaths: string[]) {
  try {
    let paramPaths = originParamPaths.map((path) => ({ path, stackNum: 0 }));
    let currentLine = 1;
    let regexp = new RegExp(`["' ]${paramPaths[0].path}\\W`);
    const shiftParamPaths: typeof paramPaths = [{ path: "_root", stackNum: 0 }]; // 被弹出的 param，当发现结构不符时，重新入栈
    const fileLines = fileStr.split("\n");
    let currentLineStr = fileLines[currentLine];
    while (paramPaths.length && currentLine < fileLines.length) {
      currentLineStr = fileLines[currentLine];
      const preParams = shiftParamPaths.slice(-1)[0];
      if (!preParams) {
        break;
      }
      // console.log(currentLine, currentLineStr, preParams, JSON.stringify(paramPaths));
      if (preParams.stackNum === 0 && regexp.test(currentLineStr)) {
        shiftParamPaths.push(paramPaths.shift()!);
        regexp = new RegExp(`["' ]${paramPaths[0]?.path}\\W`);
      } else if (currentLineStr.includes("{") && !currentLineStr.includes("}")) {
        preParams.stackNum++;
      } else if (currentLineStr.includes("}") && !currentLineStr.includes("{")) {
        preParams.stackNum--;
        if (preParams.stackNum < 0) {
          preParams.stackNum = 0;
          paramPaths.unshift(shiftParamPaths.pop()!);
          regexp = new RegExp(`["' ]${paramPaths[0].path}\\W`);
        }
      }
      currentLine++;
    }
    const lastWord = shiftParamPaths.pop()?.path!;
    // console.log("getParamPositionNew", currentLine, lastWord, paramPaths, originParamPaths, currentLineStr);
    // 还有路径没匹配完，证明未命中
    if (paramPaths.length) {
      return null;
    }
    return new Position(currentLine - 1, currentLineStr.indexOf(lastWord));
  } catch (error) {
    console.log(error);
  }
  return null;
}

const isZhJson = (fileName: string) => /zh\.json$/.test(fileName);
// const isEnJson = (fileName: string) => /en\.json$/.test(fileName);
interface TraverseResult {
  fileName: string;
  content: string;
  position: Position;
}
interface TraverseGetPosition {
  (dir: string, originParamPaths: string[], getAll?: boolean): TraverseResult[];
}
// 递归遍历目录
const traverseGetPosition: TraverseGetPosition = (dir, originParamPaths, getAll) => {
  const files = fs.readdirSync(dir);
  // 排序，优先跳转到中文文件
  files.sort((a, b) => {
    if (isZhJson(a)) {
      return -1;
    } else if (isZhJson(b)) {
      return 1;
    }
    return 0;
  });

  let result: TraverseResult[] = [];
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      const res = traverseGetPosition(filePath, originParamPaths, getAll);
      if (res.length) {
        result.push(...res);
      }
    } else if (path.extname(filePath) === '.json') {
      const content = fs.readFileSync(filePath, 'utf8');
      const position = getParamPositionNew(content, originParamPaths);
      if (position) {
        result.push({
          fileName: filePath,
          content,
          position
        });
      } 
    }

    if (result.length && !getAll) {
      return result;
    }
  }
  return result;
};
// 在 ts 文件中获取关联的 json 文件信息
const getRelatedJsonInfoInTsFile = (document: TextDocument, position: Position, getAllResult = false) => {
  const fileName = document.fileName; // 当前文件完整路径
  const workspaceFolder = workspace.workspaceFolders?.find(folder => fileName.startsWith(folder.uri.fsPath));
  if (!workspaceFolder) {
    return;
  }

  const regexp = /t\(['"](.+?)['"]/;
  const regexp1 = /i18nKey=['"](.+?)['"]/;
  const wordPosition = document.getWordRangeAtPosition(position, regexp) || document.getWordRangeAtPosition(position, regexp1);
  if (!wordPosition) {
    return;
  }

  const word = document.getText(wordPosition); // 当前光标所在单词
  const keyPathStr = word.match(regexp)?.[1] || word.match(regexp1)?.[1];
  if (!keyPathStr) {
    return;
  }

  // 跳转到点击位置对应的 key
  const keyPathStrIndex = document.lineAt(position).text.indexOf(keyPathStr);
  const keys = keyPathStr.split('.');
  const keysRange = keys.reduce<[number, number][]>((ranges, key, index) => {
    const startIndex = index > 0 ? ranges[index - 1][1] + 2 : keyPathStrIndex;
    const endIndex = startIndex + key.length;
    return ranges.concat([[startIndex, endIndex]]);
  }, []);
  const clickedKeyIndex = keysRange.findIndex(range => range[0] <= position.character && range[1] >= position.character);
  const searchKeys = keys.slice(0, clickedKeyIndex + 1);
  // console.log('>>>> searchKeys:', searchKeys);

  const result = traverseGetPosition(path.resolve(workspaceFolder.uri.fsPath, 'src/i18n'), searchKeys, getAllResult);

  return {
    keyPath: searchKeys,
    keyPathStr: searchKeys.join('.'),
    traverseResult: result
  };
};
// 针对 locales 中 ts 翻译文件的跳转处理
function switchTsI18n(document: TextDocument, position: Position): any {
  const res = getRelatedJsonInfoInTsFile(document, position);
  if (!res || !res.traverseResult.length) {
    // window.showWarningMessage(`未找到 "${keyPathStr}" 对应翻译`);
    return;
  }

  const result = res.traverseResult[0];
  return new Location(Uri.file(result.fileName), result.position);
}
// ts 文件 hover 显示内容
function tsProvideHover(document: TextDocument, position: Position) {
  const res = getRelatedJsonInfoInTsFile(document, position, true);
  if (!res || !res.traverseResult.length) {
    return;
  }

  const getValue = (jsonContent: string) => {
    const obj = JSON.parse(jsonContent);
    const value = get(obj, res.keyPathStr);
    return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  };
  const hoverContent = res.traverseResult.map(result => getValue(result.content)).join('\n\n');
  if (!hoverContent) {
    return;
  }

  return new Hover(hoverContent);
}

// 获取 json 文件中光标所在位置的 key 路径数组
const getKeyPath = (document: TextDocument, position: Position) => {
  const word = document.getText(document.getWordRangeAtPosition(position)); // 当前光标所在单词
  const line = document.lineAt(position); // 当前光标所在行字符串
  const namePath = getParamPaths(document, line, word); // 完整对象层级
  return namePath;
};
// 在 json 文件中获取关联的 json 文件信息
const getRelatedJsonInfoInJsonFile = (document: TextDocument, position: Position) => {
  const regexp = /(zh|en)\.json$/;
  const fileName = document.fileName; // 当前文件完整路径
  // 如果非 zh.json 或 en.json，则不做处理
  if (!regexp.test(fileName)) {
    return null;
  }

  const targetFileName = fileName.replace(regexp, (matched, lang) => {
    return `${lang === 'zh' ? 'en' : 'zh'}.json`;
  });
  const targetFileStr = fs.readFileSync(targetFileName, "utf-8") as string;
  const keyPath = getKeyPath(document, position);

  return {
    keyPath,
    targetFileName,
    targetFileStr
  };
};
// 针对单文件翻译跳转
function switchJsonI18n(document: TextDocument, position: Position) {
  const res = getRelatedJsonInfoInJsonFile(document, position);
  if (!res) {
    return;
  }
  const { targetFileName, targetFileStr, keyPath } = res;
  const targetPosition = getParamPositionNew(targetFileStr, keyPath);
  if (!targetPosition) {
    // window.showWarningMessage(`未找到 "${namePath.join('.')}" 对应翻译`);
    return;
  }

  return new Location(Uri.file(targetFileName), targetPosition);
}
// json 文件 hover 显示内容
function jsonProvideHover(document: TextDocument, position: Position) {
  const res = getRelatedJsonInfoInJsonFile(document, position);
  if (!res) {
    return;
  }
  const { targetFileStr, keyPath } = res;
  const obj = JSON.parse(targetFileStr);
  const value = get(obj, keyPath.join('.'));
  if (!value) {
    return;
  }
  const hoverContent = typeof value === 'string' ? value : JSON.stringify(value);
  return new Hover(hoverContent);
}

// 复制 json key 路径
const copyJsonKeyPath = async(textEditor: TextEditor, formatter?: (keyPath: string) => string) => {
  const { document } = textEditor;
  const position = textEditor.selection.active;
  if (!position) {
    return;
  }
  const keyPath = getKeyPath(document, position);
  const keyPathStr = keyPath.join('.');
  const textToCopy = formatter ? formatter(keyPathStr) : keyPathStr;
  try {
    await env.clipboard.writeText(textToCopy);
    window.showInformationMessage(`${textToCopy} 复制成功`);
  } catch(e) {
    window.showErrorMessage(`${textToCopy} 复制失败`);
  }
};
// 复制 json key 路径（包含 t 函数调用）
const copyJsonKeyPathWithT = (textEditor: TextEditor) => {
  copyJsonKeyPath(textEditor, keyPathStr => `t('${keyPathStr}')`);
};

// 搜索使用该翻译的地方
function searchI18n(textEditor: TextEditor, edit: TextEditorEdit): any {
  const { document } = textEditor;
  const word = document.getText(document.getWordRangeAtPosition(textEditor.selection.active)); // 当前光标所在单词
  const line = document.lineAt(textEditor.selection.start.line); // 当前光标所在行字符串
  const namePath = getParamPaths(document, line, word); // 完整对象层级

  // 直接从源码中查看配置
  // https://github.com/microsoft/vscode/blob/17de08a829e56657e44213a70cf69d18f06e74a5/src/vs/workbench/contrib/search/browser/searchActions.ts#L160-L188
  commands.executeCommand("workbench.action.findInFiles", {
    query: `${namePath.join(".")}`,
    filesToInclude: "./src",
    triggerSearch: true,
    matchWholeWord: true,
    isCaseSensitive: true,
  });
}

// 跳转到 gitlab 页面
function jumpGit(uri: Uri) {
  const workspaceFolders = workspace.workspaceFolders;
  if (!workspaceFolders?.length) {
    return;
  }
  const fsPath = workspaceFolders![0].uri.fsPath;
  const workspaceFolderPath = workspaceFolders![0].uri.path;
  const gitDirPath = path.join(fsPath, ".git");
  const configPath = path.join(gitDirPath, "config");

  fs.readFile(configPath, "utf8", (err: any, data: string) => {
    const isGitlab = data.includes('git@gitlab') || data.includes('url = git@ssh.com');
    const match = data.match(/url\s*=\s*(.*)/);
    if (match) {
      const branch = data.includes('refs/heads/master') ? 'master' : 'main';
      const remoteUrl = match[1];
      // 第一个正则匹配 ssh 路径，第二个匹配 http 路径
      const matchParams = remoteUrl.match(/([^/@]+)@([^:/]+):(.+)\.git$/) || remoteUrl.match(/(https?:)\/\/([^/]+)\/(.+)\.git$/);
      if (matchParams) {
        const hostname = isGitlab ? matchParams[2]?.replace('ssh', 'gitlab') : matchParams[2];
        const path = matchParams[3];
        const baseUrl = `https://${hostname}/${path}`;
        let uriToOpen = uri ? `${baseUrl}/${isGitlab ? '-/' : ''}blob/${branch}${uri.path.split(workspaceFolderPath)[1]}` : baseUrl;
        // console.log('>>>> uriToOpen:', uriToOpen);
        env.openExternal(Uri.parse(uriToOpen));
      }
    }
  });
}

// 插件被激活时所调用的函数，仅被激活时调用，仅进入一次
export function activate(context: ExtensionContext) {
  console.log("i18n activate");

  // 设置单词分隔
  languages.setLanguageConfiguration("json", {
    wordPattern: /([^\`\~\!\@\$\^\&\*\(\)\=\+\[\{\]\}\\\|\;\:\'\"\,\<\>\/\s]+)/g,
  });

  // 注册 ts 文件鼠标悬停提示
  context.subscriptions.push(
    languages.registerHoverProvider(
      ["typescript", "typescriptreact", "javascript", "javascriptreact"],
      {
        provideHover: tsProvideHover
      }
    )
  );
  context.subscriptions.push(
    languages.registerDefinitionProvider(
      ["typescript", "typescriptreact", "javascript", "javascriptreact"],
      {
        provideDefinition: switchTsI18n,
      }
    )
  );
  // 注册 json 文件鼠标悬停提示
  context.subscriptions.push(
    languages.registerHoverProvider('json', {
      provideHover: jsonProvideHover
    })
  );
  context.subscriptions.push(
    languages.registerDefinitionProvider(["json"], {
      provideDefinition: switchJsonI18n,
    })
  );

  context.subscriptions.push(
    commands.registerTextEditorCommand("bihu-code-snippets.copy-json-path", textEditor => copyJsonKeyPath(textEditor))
  );
  context.subscriptions.push(
    commands.registerTextEditorCommand("bihu-code-snippets.copy-json-path-with-t", textEditor => copyJsonKeyPathWithT(textEditor))
  );
  context.subscriptions.push(commands.registerTextEditorCommand("bihu-code-snippets.search-i18n", searchI18n));
  context.subscriptions.push(commands.registerCommand("bihu-code-snippets.jump-git", jumpGit));
}

export function deactivate() {}

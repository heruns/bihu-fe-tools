import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 获取文件或文件夹的名称，如果是文件，返回第一个点(.)之前的所有内容作为文件名
 * @param filePath 文件路径
 * @param isDirectory 是否文件夹
 * @returns 文件名
 */
export const getFileOrFolderName = (filePath: string, isDirectory: boolean) => {
  const name = path.basename(filePath);

  if (isDirectory) {
    return name;
  } else {
    const dotIndex = name.indexOf('.');
    return dotIndex !== -1 ? name.substring(0, dotIndex) : name;
  }
};

export const toPascalCase = (str: string) => {
  const matched = str
    .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g);
  if (!matched) {
    return str;
  }
  return matched
    .map(x => x.charAt(0).toUpperCase() + x.slice(1).toLowerCase())
    .join('');
};
export const toCamelCase = (str: string): string => {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};
export const toKebabCase = (str: string): string => {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
};

/**
 * 将字符串中的某个关键字全部替换为新关键字，同时保留大小写
 * @example
 * // 返回 "my-reasoning-component content: MyReasoningComponent component, className: .myReasoningComponent"
 * replaceWithCasePreserved('reasoning-page content: ReasoningPage component, className: .reasoningPage', 'reasoning-page', 'my-reasoning-component')
 * @param stringToReplace 代替换的字符串
 * @param name 替换的关键字
 * @param newName 需要将关键字替换为的字符串
 * @returns 替换后的字符串
 */
export const replaceWithCasePreserved = (stringToReplace: string, search: string, replace: string) => {
  return stringToReplace
    .replace(new RegExp(search, 'g'), replace)
    .replace(new RegExp(toKebabCase(search), 'g'), toKebabCase(replace))
    .replace(new RegExp(toPascalCase(search), 'g'), toPascalCase(replace))
    .replace(new RegExp(toCamelCase(search), 'g'), toCamelCase(replace));
};

export function activate(context: vscode.ExtensionContext) {
  console.log('component-rename 模块加载成功');

  // 获取新的文件名
  const getNewName = async(originalName: string) => {
    const newName = await vscode.window.showInputBox({
      title: `将 "${originalName}" 重命名为：`,
      value: originalName,
      prompt: '请输入新的文件名，同时会替换文件内容中的相同名称，替换时将保留大小写',
      placeHolder: '请输入文件名',
      validateInput(value) {
        let error: vscode.InputBoxValidationMessage | null = null;
        if (value === originalName) {
          error = {
            message: '文件名未修改',
            severity: 2
          };
        } else if (!value.trim()) {
          error = {
            message: '请输入新的文件名',
            severity: 3
          };
        }
        return error;
      },
    });
    if (typeof newName === 'string') {
      return newName.trim();
    } else {
      return newName;
    }
  };

  // 替换文件名和文件内容
  const replaceFileOrFolderName = async (uri: vscode.Uri, name: string, newName: string) => {
    const filePath = uri.fsPath;
    console.log(filePath);
    const newFileName = path.basename(filePath).replace(name, newName);
    // 替换文件名中的字符串
    const newFilePath = path.join(path.dirname(filePath), newFileName);
    console.log(filePath, '->', newFilePath);
    if (filePath !== newFilePath) {
      try {
        await fs.promises.rename(filePath, newFilePath);
      } catch(e) {
        vscode.window.showErrorMessage(`${filePath} 重命名失败: ${(e as Error)?.message || '未知原因'}`);
      }
    }
  };

  // 替换文件名和文件内容
  const replaceFile = async (file: vscode.Uri, name: string, newName: string) => {
    const filePath = file.fsPath;
    console.log(filePath);
    // 读取文件内容
    const content = await fs.promises.readFile(filePath, 'utf-8');
    // 替换文件中的字符串
    const updatedContent = replaceWithCasePreserved(content, name, newName);
    // 将更新后的内容写回文件
    await fs.promises.writeFile(filePath, updatedContent);
    await replaceFileOrFolderName(file, name, newName);
  };

  const disposable = vscode.commands.registerCommand('bihu-code-snippets.componentRename', async (uri: vscode.Uri) => {
    console.log(uri);
    if (uri && uri.scheme === 'file') {
      const filePath = uri.fsPath;
      const stat = fs.promises.stat(uri.fsPath);
      const isDirectory = (await stat).isDirectory();
      console.log('folderPath:', isDirectory, filePath);
      const name = getFileOrFolderName(filePath, isDirectory);
      const newName = await getNewName(name);
      if (!newName) {
        return;
      }

      if (isDirectory) {
        const files = await vscode.workspace.findFiles(new vscode.RelativePattern(filePath, '*'));
        await Promise.all(files.map(file => replaceFile(file, name, newName)));
        replaceFileOrFolderName(uri, name, newName);
      } else {
        replaceFile(uri, name, newName);
      }
    }
  });

  context.subscriptions.push(disposable);
}

// 当您的扩展程序被停用时，将调用此方法
export function deactivate() {}

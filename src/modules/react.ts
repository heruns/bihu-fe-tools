// 模块 'vscode' 包含 VS Code 扩展性 API
// 导入该模块并使用别名 vscode 引用它以在下面的代码中使用
import * as vscode from 'vscode';

// 当您的扩展程序被激活时，将调用此方法
// 您的扩展程序在第一次执行命令时被激活
export function activate(context: vscode.ExtensionContext) {
  console.log('react 模块加载成功');

  // 导入 react 模块，比如 module 为 useState，如果在当前编辑器中没有找到对应的模块导入，则从 react 这个包中导入
  // 效果1：
  // 执行前: import React, { useEffect, useMemo } from 'react'
  // 执行后: import React, { useEffect, useMemo, useState } from 'react'
  // 效果2：
  // 执行前: 没有 import 'react' 相关语句
  // 执行后: import { useState } from 'react'
  // 效果3：
  // 执行前: import React from 'react'
  // 执行后: import React, { useState } from 'react'
  const importReactModule = (editor: vscode.TextEditor, module: string) => {
    const document = editor.document;
    const importStatementRegex = /^import\s+(?:React,?\s*)?(?:\{\s*(.*?)\s*\})?\s+from\s+['"]react['"];?$/;
    let importStatementFound = false;
    let foundLineIndex = 0;

    // 检查当前文档中是否存在 react 的导入语句
    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i).text.trim();

      if (importStatementRegex.test(line)) {
        foundLineIndex = i;
        importStatementFound = true;
        break;
      }
    }

    // 如果不存在 react 的导入语句，则插入新的导入语句
    if (!importStatementFound) {
      let commentIndex = -1;
      const commentRegexp = /\/\*[\s\S]*?\*\/|\/\/.*/;
      let lastImportIndex = -1;
      const importRegexp = /^import.*\sfrom\s/;
      for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i).text.trim();
        if (commentRegexp.test(line)) {
          commentIndex = i;
        } else if (importRegexp.test(line)) {
          lastImportIndex = i;
        } else if (line) {
          break;
        }
      }
      // 将 react 的 import 语句插入到顶部最后一条注释或最后一条 import 语句下面
      const insertLine = Math.max(commentIndex + 1, lastImportIndex + 1);
      const importText = `import { ${module} } from 'react'\n`;
      editor.edit((editBuilder) => {
        editBuilder.insert(new vscode.Position(insertLine, 0), importText);
      });
    } else {
      // 在现有的导入语句中添加模块
      editor.edit((editBuilder) => {
        const foundLineText = document.lineAt(foundLineIndex).text;
        if (foundLineText.includes(module)) {
          return;
        }
        const match = importStatementRegex.exec(foundLineText);
        // console.log('match');
        // console.log(match);

        if (match) {
          const existingModules = match[1];
          let newLineText: string;
          if (existingModules) {
            const updatedModules = existingModules + ', ' + module;
            newLineText = foundLineText.replace(existingModules, updatedModules);
          } else {
            newLineText = foundLineText.replace(/React,?\s+/, `React, { ${module} } `);
          }
          // console.log('newLineText');
          // console.log(newLineText);
          const range = new vscode.Range(new vscode.Position(foundLineIndex, 0), new vscode.Position(foundLineIndex, foundLineText.length));
          editBuilder.replace(range, newLineText);
        }
      });
    }
  };

  // useState snippet 和自动导入
  const useStateDisposable = vscode.commands.registerCommand('bihu-code-snippets.reactUseState', () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return; // 如果没有活动的文本编辑器，则退出命令
    }

    // 定义 Snippet 内容
    const snippetContent = new vscode.SnippetString('const [${1:}, set${1/(.*)/${1:/capitalize}/}] = useState(${2:})');

    // 插入 Snippet
    editor.insertSnippet(snippetContent).then(() => {
      // Snippet 执行完成后立即调用命令
      importReactModule(editor, 'useState');
    });
  });
  const useStateCompletionProvider = vscode.languages.registerCompletionItemProvider(
    { scheme: 'file', pattern: '**/*.{js,jsx,ts,tsx}' }, // 需要触发提示的文件类型
    {
      provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
        const range = document.getWordRangeAtPosition(position, /us?e?S?t?a?t?e?-?b?i?h?u?/);
        if (range) {
          const completionItem = new vscode.CompletionItem('useState --bihu');
          completionItem.sortText = '\0';
          completionItem.preselect = true;
          completionItem.insertText = '';
          completionItem.command = {
            command: 'bihu-code-snippets.reactUseState',
            title: '插入 useState 调用'
          };
          return [completionItem];
        }
        return [];
      }
    },
    ...'useState-bihu'.split('')
  );
  context.subscriptions.push(useStateDisposable, useStateCompletionProvider);

  // useEffect snippet 和自动导入
  const useEffectDisposable = vscode.commands.registerCommand('bihu-code-snippets.reactUseEffect', () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return; // 如果没有活动的文本编辑器，则退出命令
    }

    // 定义 Snippet 内容
    const snippetContent = new vscode.SnippetString('useEffect(() => {\n\t${2:}\n}, [${1:}])');

    // 插入 Snippet
    editor.insertSnippet(snippetContent).then(() => {
      // Snippet 执行完成后立即调用命令
      importReactModule(editor, 'useEffect');
    });
  });
  const useEffectCompletionProvider = vscode.languages.registerCompletionItemProvider(
    { scheme: 'file', pattern: '**/*.{js,jsx,ts,tsx}' }, // 需要触发提示的文件类型
    {
      provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
        const range = document.getWordRangeAtPosition(position, /us?e?E?f?f?e?c?t?-?b?i?h?u?/);
        if (range) {
          const completionItem = new vscode.CompletionItem('useEffect --bihu');
          completionItem.sortText = '\0';
          completionItem.preselect = true;
          completionItem.insertText = '';
          completionItem.command = {
            command: 'bihu-code-snippets.reactUseEffect',
            title: '插入 useEffect 调用'
          };
          return [completionItem];
        }
        return [];
      }
    },
    ...'useEffect-bihu'.split('')
  );
  context.subscriptions.push(useEffectDisposable, useEffectCompletionProvider);
}

// 当您的扩展程序被停用时，将调用此方法
export function deactivate() {}

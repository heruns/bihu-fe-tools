// 模块 'vscode' 包含 VS Code 扩展性 API
// 导入该模块并使用别名 vscode 引用它以在下面的代码中使用
import * as vscode from 'vscode';
import { importModule } from '../utils';

// 当您的扩展程序被激活时，将调用此方法
// 您的扩展程序在第一次执行命令时被激活
export function activate(context: vscode.ExtensionContext) {
  console.log('react 模块加载成功');

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
      importModule('useState', 'react');
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
    const snippetContent = new vscode.SnippetString('useEffect(() => {\n\t${1:}\n}, [${2:}])');

    // 插入 Snippet
    editor.insertSnippet(snippetContent).then(() => {
      // Snippet 执行完成后立即调用命令
      importModule('useEffect', 'react');
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

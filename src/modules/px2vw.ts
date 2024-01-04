// 模块 'vscode' 包含 VS Code 扩展性 API
// 导入该模块并使用别名 vscode 引用它以在下面的代码中使用
import * as vscode from 'vscode';

// TODO: 一键处理 :global(.mobile) 中的所有 px
// TODO: 忽略 border: 1px

// 当您的扩展程序被激活时，将调用此方法
// 您的扩展程序在第一次执行命令时被激活
export function activate(context: vscode.ExtensionContext) {
  console.log('px2vw 模块加载成功');

  const replaceSelection = (searchValue: RegExp, replaceValue: string) => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return; // 如果没有活动的文本编辑器，则退出命令
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
      return; // 如果没有选定文本，则退出命令
    }

    const text = editor.document.getText(selection); // 获取选定文本的内容
    const convertedText = text.replace(searchValue, replaceValue);

    editor.edit(editBuilder => {
      editBuilder.replace(selection, convertedText);
    });
  };

  // 命令已在 package.json 文件中定义
  // 现在使用 registerCommand 提供命令的实现
  // commandId 参数必须与 package.json 中的 command 字段匹配
  // 为选中代码中的所有 px 值添加 px2vw() 调用
  const disposable = vscode.commands.registerCommand('bihu-code-snippets.addPx2vw', () => {
    // 匹配 "数字px"，但是不匹配已经在 px2vw() 中的数字值
    replaceSelection(/(?<!px2vw\()(-?(?:\d+)?\.?\d+)px(?!\))/g, 'px2vw($1px)');
  });
  // 为选中代码中的所有 px 值移除 px2vw() 调用
  const disposableFprRemove = vscode.commands.registerCommand('bihu-code-snippets.removePx2vw', () => {
    // 匹配 px2vw() 中的值
    replaceSelection(/px2vw\(([^\)]+)\)/g, '$1');
  });

  // 判断一个位置是否在 mobile 选择器中
  const isInMobile = (document: vscode.TextDocument, position: vscode.Position) => {
    // 当前位置之前的所有花括号开头({)的数量
    let openBracesCount = 0;
    // 当前位置之前的所有花括号结尾(})的数量
    let closeBracesCount = 0;
    // 当前位置
    let current: vscode.Position | null = position;
    // 当前字符是否在两个花括号之间
    let isBetweenBraces = false;
    // 花括号之间的字符串，用于提取选择器内容
    let textBetweenBraces = '';
    const isMobileSelector = () => {
      const text = textBetweenBraces.trim();
      if (!text.length) {
        return false;
      }
      // console.log('textBetween', text);
      return /(\.mobile)|(\.isMobile)/.test(text);
    };
    while (current) {
      let text = document.lineAt(current.line).text;
      if (current.character !== 0) {
        text = text.slice(0, current.character);
      }
      // console.log('text', text);
      for (let index = text.length - 1; index >= 0; index--) {
        const char = text[index];
        if (char === '{') {
          openBracesCount++;
          if (isBetweenBraces === false) {
            // console.log('textBetweenBraces', textBetweenBraces);
            isBetweenBraces = true;
            textBetweenBraces = '';
          }
        } else if (char === '}') {
          closeBracesCount++;
          // openBraces.pop();
          // if (openBraces.length === 0) {
          //   return false;
          // }
        } else if (isBetweenBraces) {
          textBetweenBraces = char + textBetweenBraces;
        }
        if ((char === '{' || char === '}') && isBetweenBraces) {
          isBetweenBraces = false;
          if (openBracesCount > closeBracesCount && isMobileSelector()) {
            return true;
          }
        }
        if (char === '{' && isBetweenBraces === false) {
          // console.log('textBetweenBraces', textBetweenBraces);
          isBetweenBraces = true;
          textBetweenBraces = '';
        }
      }
      if (current.line > 0) {
        const prevLine: number = current.line - 1;
        current = new vscode.Position(prevLine, 0);
      } else {
        current = null;
      }
    }
    return false;
  };

  // 在 scss 值的位置输入数字时，出现 px2vw(数字值+px) 的提示，回车即可填入
  const completionProvider = vscode.languages.registerCompletionItemProvider(
    { language: 'scss' }, // 需要触发提示的文件类型
    {
      provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
        const range = document.getWordRangeAtPosition(position, /(?<=(:\s?)|\s+)(\d+)?\.?\d+p?x?/);
        // console.log('range');
        // console.log(range?.start, range?.end);
        // console.log(position.character, range ? document.getText(range) : null);
        if (!range) {
          return [];
        }
        const text = document.getText(range);
        if (text === '0') {
          return [];
        }
        const config = vscode.workspace.getConfiguration('bihuFeTools');
        // 是否在任何选择器中都出现 px2vw() 的代码补全提示
        const enablePx2vwInAnySelector = config.get('enablePx2vwInAnySelector');
        // 判断是否在 .mobile 或 .isMobile 里面，如果不是就不需要提示
        if (enablePx2vwInAnySelector || isInMobile(document, position)) {
          const textWithPx = text.replace(/p?x?/g, '') + 'px';
          const label = `px2vw(${textWithPx})`;
          const completionItem = new vscode.CompletionItem(label);
          completionItem.insertText = label;
          completionItem.sortText = '\0';
          completionItem.preselect = true;
          return [completionItem];
        }
        return [];
      }
    },
    ...'.0123456789px'.split('')
  );
  context.subscriptions.push(disposable, disposableFprRemove, completionProvider);

  // 输入 px2vw 时，出现 px2vw() 的代码补全提示，回车自动填入，并且通过 focusPx2vw 命令将光标移动到括号中
  const emptyPx2vwCompletionProvider = vscode.languages.registerCompletionItemProvider(
    { language: 'scss' }, // 需要触发提示的文件类型
    {
      provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
        const range = document.getWordRangeAtPosition(position, /(?<=(:\s?)|\s+)px?2?v?w?\(?/);
        console.log('range1');
        console.log(range?.start, range?.end);
        console.log(position.character, range ? document.getText(range) : null);
        if (range) {
          // const text = document.getText(range);
          const completionItem = new vscode.CompletionItem(`px2vw()`);
          completionItem.sortText = '\0';
          completionItem.preselect = true;
          completionItem.insertText = 'px2vw(px)';
          completionItem.command = {
            command: 'bihu-code-snippets.focusPx2vw',
            title: '将光标移动到 px2vw() 的括号中'
          };
          return [completionItem];
        }
        return [];
      }
    },
    ...'px2vw('.split('')
  );
  // 根据代码补全填入 px2vw() 后，将光标移动到括号中
  const disposableForEmptyPx2vw = vscode.commands.registerCommand('bihu-code-snippets.focusPx2vw', () => {
    // 您在此处放置的代码将在每次执行命令时执行
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return; // 如果没有活动的文本编辑器，则退出命令
    }

    const lineNumber = editor.selection.active.line;
    const character = editor.selection.active.character;
    const lineText = editor.document.lineAt(lineNumber).text;
    // 光标结束位置
    let closeParenIndex = -1;
    if (lineText.slice(character - 3, character) === 'px)') {
      closeParenIndex = character - 3;
    } else if (lineText[character - 1] === ')') {
      closeParenIndex = character - 1;
    }
    if (closeParenIndex === -1) {
      closeParenIndex = lineText.indexOf('px)');
    }
    if (closeParenIndex === -1) {
      closeParenIndex = lineText.indexOf(')');
    }
    // 光标开始位置
    let openParenIndex = -1;
    const startText = 'px2vw(';
    for (let i = closeParenIndex; i > startText.length; i--) {
      if (lineText.slice(i - startText.length, i) === startText) {
        openParenIndex = i - startText.length;
        break;
      }
    }

    if (openParenIndex !== -1 && closeParenIndex !== -1) {
      const openPosition = new vscode.Position(lineNumber, openParenIndex + startText.length);
      const closePosition = new vscode.Position(lineNumber, closeParenIndex);
      editor.selection = new vscode.Selection(openPosition, closePosition);
      editor.revealRange(editor.selection);
    }
  });

  context.subscriptions.push(disposableForEmptyPx2vw, emptyPx2vwCompletionProvider);
}

// 当您的扩展程序被停用时，将调用此方法
export function deactivate() {}

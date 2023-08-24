// 模块 'vscode' 包含 VS Code 扩展性 API
// 导入该模块并使用别名 vscode 引用它以在下面的代码中使用
import * as vscode from 'vscode';

export const json2ts = (input: string) => {
  const newValue = input
    .replace(/["'](\w+)["']:\s*/g, (searchVal, capture) => {
      // key
      return `${capture}:`;
    })
    .replace(/:\s*["'].*?["']/g, (searchVal, capture) => {
      // 字符串值
      return ': string';
    })
    .replace(/:\s*[\d.]+/g, (matchedStr, index, str) => {
      // 数字值
      const currentLineAfter = str.slice(index).match(/(.+)/);
      if (currentLineAfter) {
        // 数字枚举，如 0 | 1
        const numbers = currentLineAfter[1].match(/(\d+)(?=-)/g);
        if (numbers) {
          return `: ${numbers.join(' | ')}`;
        }
      }
      return ': number';
    });
  // 行数组
  const lines = newValue.split(/[\n\r]+/);
  const linesCopy = [...lines];
  for (const line of lines) {
    const index = linesCopy.indexOf(line);
    const formatContent = (lineContent: string) => lineContent.replace(/[,;]?\s*$/, ';');
    const commentMatched = line.match(/^(\s+)(.+:.+)(\/\/(.+))/);
    if (commentMatched?.[4]) {
      // 匹配到带注释的内容行，如 `    "paymentMethod": 1, // 支付方式，1-POS、2-Cash`
      // 前面的空格
      const spaces = commentMatched[1];
      // 内容
      const content = formatContent(commentMatched[2]);
      // 注释
      const comment = commentMatched[4].trim();
      linesCopy.splice(index, 1, `${spaces}/** ${comment} */`, `${spaces}${content}`);
    } else if (/^(\s+)(.+:.+)/.test(line)) {
      // 匹配到不带注释的内容行，如 `    "pageNum":1,`
      linesCopy.splice(index, 1, formatContent(line));
    }
  }
  const output = linesCopy.join('\n');
  return output;
};

// 当您的扩展程序被激活时，将调用此方法
// 您的扩展程序在第一次执行命令时被激活
export function activate(context: vscode.ExtensionContext) {
  console.log('json2ts 模块加载成功');

  // 命令已在 package.json 文件中定义
  // 现在使用 registerCommand 提供命令的实现
  // commandId 参数必须与 package.json 中的 command 字段匹配
  // 为选中代码中的所有 px 值添加 json2ts() 调用
  const disposable = vscode.commands.registerCommand('bihu-code-snippets.json2ts', () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return; // 如果没有活动的文本编辑器，则退出命令
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
      return; // 如果没有选定文本，则退出命令
    }

    const text = editor.document.getText(selection); // 获取选定文本的内容
    editor.edit(editBuilder => {
      editBuilder.replace(selection, json2ts(text));
    });
  });

  context.subscriptions.push(disposable);
}

// 当您的扩展程序被停用时，将调用此方法
export function deactivate() {}

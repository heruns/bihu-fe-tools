import * as vscode from 'vscode';

// 导入模块，比如 module 为 useState，如果在当前编辑器中没有找到对应的模块导入，则从 react 这个包中导入
// 效果1：
// 执行前: import React, { useEffect, useMemo } from 'react'
// 执行后: import React, { useEffect, useMemo, useState } from 'react'
// 效果2：
// 执行前: 没有 import 'react' 相关语句
// 执行后: import { useState } from 'react'
// 效果3：
// 执行前: import React from 'react'
// 执行后: import React, { useState } from 'react'
export const importModule = (module: string, packageName: string, editor = vscode.window.activeTextEditor) => {
  if (!editor) {
    return;
  }
  const document = editor.document;
  const importStatementRegex = new RegExp(`^import\\s+([\\w,]+?\\s*)?(?:\\{\\s*(.*?)\\s*\\})?\\s+from\\s+['"]${packageName}['"];?$`);
  let importStatementFound = false;
  let foundLineIndex = 0;

  // 检查当前文档中是否存在 react 的导入语句
  for (let i = 0; i < document.lineCount; i++) {
    const line = document.lineAt(i).text.trim();
    const isMatched = importStatementRegex.test(line);

    if (isMatched) {
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
    const importText = `import { ${module} } from '${packageName}'\n`;
    return editor.edit((editBuilder) => {
      editBuilder.insert(new vscode.Position(insertLine, 0), importText);
    });
  } else {
    // 在现有的导入语句中添加模块
    return editor.edit((editBuilder) => {
      const foundLineText = document.lineAt(foundLineIndex).text;
      if (foundLineText.includes(module)) {
        return;
      }
      const matched = foundLineText.match(importStatementRegex);
      // console.log('match');
      // console.log(match);

      if (matched) {
        const defaultImport = matched[1];
        const existingModules = matched[2];
        let newLineText: string;
        if (existingModules) {
          const updatedModules = existingModules + ', ' + module;
          newLineText = foundLineText.replace(existingModules, updatedModules);
        } else {
          newLineText = foundLineText.replace(new RegExp(`${defaultImport}\\s+`), `${defaultImport}, { ${module} } `);
        }
        // console.log('newLineText');
        // console.log(newLineText);
        const range = new vscode.Range(new vscode.Position(foundLineIndex, 0), new vscode.Position(foundLineIndex, foundLineText.length));
        editBuilder.replace(range, newLineText);
      }
    });
  }
};

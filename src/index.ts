// 模块 'vscode' 包含 VS Code 扩展性 API
// 导入该模块并使用别名 vscode 引用它以在下面的代码中使用
import * as vscode from 'vscode';
import { activate as px2vwActivate, deactivate as px2vwDeactivate } from './modules/px2vw';
import { activate as reactActivate, deactivate as reactDeactivate } from './modules/react';
import { activate as componentRenameActivate, deactivate as componentRenameDeactivate } from './modules/component-rename';
import { activate as json2tsActivate, deactivate as json2tsDeactivate } from './modules/json2ts';
import { activate as i18nActivate, deactivate as i18nDeactivate } from './modules/i18n';
import { activate as yapiActivate, deactivate as yapiDeactivate } from './modules/yapi';

// 当您的扩展程序被激活时，将调用此方法
// 您的扩展程序在第一次执行命令时被激活
export function activate(context: vscode.ExtensionContext) {
  console.log('扩展程序 "Bihu FE Tools" 现已激活！');

  px2vwActivate(context);
  reactActivate(context);
  componentRenameActivate(context);
  json2tsActivate(context);
  i18nActivate(context);
  yapiActivate(context);
}

// 当您的扩展程序被停用时，将调用此方法
export function deactivate() {
  px2vwDeactivate();
  reactDeactivate();
  componentRenameDeactivate();
  json2tsDeactivate();
  i18nDeactivate();
  yapiDeactivate();
}

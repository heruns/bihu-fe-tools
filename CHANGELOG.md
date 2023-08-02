# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2023-08-02

### Added

- i18n 文件跳转功能

## [0.3.1] - 2023-06-25

### Fixed

- 修改 `bihuFeTools.enablePx2vwInAnySelector` 配置项后实时生效，生效的选择器改成 `.mobile` 和 `.isMobile`
- 隐藏内部命令 `bihu-code-snippets.focusPx2vw`

## [0.3.0] - 2023-06-13

### Added

- `bihu-code-snippets.json2ts` 命令，用于格式化或将 JSON 转为 TS 类型(json2ts)

## [0.2.2] - 2023-06-04

### Added

- 添加 `bihuFeTools.enablePx2vwInAnySelector` 配置项，表示是否在任何选择器中都出现 `px2vw()` 的代码补全提示，默认选中，取消勾选后只会在 `:global(.mobile)` 或 `.isMobile` 中提示

## [0.2.1] - 2023-05-31

### Added

- 添加 SCSS 代码片段
  - 快捷输入 `:global`: `:global -bh`
  - 快捷输入 `:global(.mobile)`: `:global(.mobile) -bh`

### Fixed

- 优化px2vw，输入0时不提示，修复已有px单位的数字时智能提示出现两个px的问题

## [0.2.0] - 2023-05-29

### Added

- 添加“组件重命名”右键菜单，可一键替换文件名和文件内容

## [0.1.1] - 2023-05-25

### Added

- `useEffect -bihu` 代码片段和自动导入

### Changed

- `bihu-code-snippets.afterAddEmptyPx2vw` 改为 `bihu-code-snippets.focusPx2vw`

### Fixed

- `useState` 自动导入时，不存在 react 导入时优化导入位置
- 在 `:global(.mobile)` 或 `.isMobile` 选择器中输入数字值时，支持在 `padding: px2vw(2px) 3[光标]` 这种多个值的情况下提示
- 输入 px2vw 时，支持在 `padding: px2vw(2px) px[光标]` 这种多个值的情况下提示

## [0.1.0] - 2023-05-25

### Added

- `bihu-code-snippets.addPx2vw` 命令，对 SCSS 代码选中区域内的 px 值统一加上 px2vw() 调用
- `bihu-code-snippets.afterAddEmptyPx2vw` 命令，将光标移动到当前行的 `px2vw()` 括号中
- 在 `:global(.mobile)` 或 `.isMobile` 选择器中输入数字值或 `px2vw` 开头的值时智能提示
- `useState -bihu` 代码片段，对应 `bihu-code-snippets.reactUseState` 命令，执行后可自动导入 `useState` 模块

### Removed

- `useState  -bh` 代码片段

## [0.0.16] - 2022-12-12

### Added

- JSDoc 风格注释代码片段: `/** */ -bh`
- className module 代码片段: `className module -bh`
- 常量对象代码片段: `constant map -bh`
- 常量 id 对象代码片段: `constant IdNameObj -bh`
- useState 代码片段: `useState  -bh`
- Antd modal 二次封装代码片段: `antd modal init -bh`
- img 代码片段: `img -bh`

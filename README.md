# 壁虎前端团队工具

本插件主要与 JS/TS/React/SCSS 相关，包含以下功能：

- 格式化或将 JSON 转为 TS 类型(json2ts)
  - 不仅仅是 JSON，甚至有问题的格式都可以轻松转换为 TS 类型
  ![json2ts](https://raw.githubusercontent.com/heruns/bihu-fe-tools/main/demo/json2ts.gif)
- SCSS 中 `px2vw` 自定义函数的支持
  - 对 SCSS 代码选中区域内的 px 值统一加上 px2vw() 调用
  ![px2vw-select-and-replace](https://raw.githubusercontent.com/heruns/bihu-fe-tools/main/demo/px2vw-select-and-replace.gif)
  - 在 SCSS 值中输入数字值或 `px2vw` 开头的值时智能提示
  ![px2vw-intellisense](https://raw.githubusercontent.com/heruns/bihu-fe-tools/main/demo/px2vw-intellisense.gif)
- i18n 文件跳转
  - 基于 [Momo707577045/i18n-jump](https://github.com/Momo707577045/i18n-jump/tree/main) 修改，适用于 react-i18next 项目，推荐的目录结构如下：

    ```
    your-project
    ├── src
    │   └── i18n
    │        ├── common
    │        │     ├── en.json
    │        │     └── zh.json
    │        └── router
    │              ├── en.json
    │              └── zh.json
    └── others
    ```

  - 添加复制 json key 路径功能
  - 添加鼠标悬停提示功能
- 组件重命名
  - 一键替换文件名和文件内容
  ![component-rename](https://raw.githubusercontent.com/heruns/bihu-fe-tools/main/demo/component-rename.gif)
- 不仅生成代码片段，还会智能导入对应模块
  - `useState` 代码片段: `useState -bihu`
  ![use-state-intellisense](https://raw.githubusercontent.com/heruns/bihu-fe-tools/main/demo/use-state-intellisense.gif)
  - `useEffect` 代码片段: `useEffect -bihu`
  ![use-effect-intellisense](https://raw.githubusercontent.com/heruns/bihu-fe-tools/main/demo/use-effect-intellisense.gif)
- React 和 TS 代码片段
  - JSDoc 风格注释代码片段: `/** */ -bh`
  - className module 代码片段: `className module -bh`
  - 常量对象代码片段: `constant map -bh`
  - 常量 id 对象代码片段: `constant IdNameObj -bh`
  - Antd modal 二次封装代码片段: `antd modal init -bh`
  - img 代码片段: `img -bh`
- SCSS 代码片段
  - 快捷输入 `:global`: `:global -bh`
  - 快捷输入 `:global(.mobile)`: `:global(.mobile) -bh`
- 新建页面/组件
  - 当前版本依赖项目创建组件脚本`"create": "node ./scripts/create-template.js"`与项目组件模板 `/templates/function-component`
  - 右键点击所选文件，输入组件名称，即可快速生成页面或组件，省去了原先需要输入 npm run create ... 的步骤。
  - 示例如下：
  1.右键点击所选文件，选择 `新建页面/组件`，输入组件的名称中、英文
      ![create-new-component-intellisense](https://raw.githubusercontent.com/heruns/bihu-fe-tools/main/demo/create-component-zh-en.gif)
  2.只输入中文，翻译对应的英文
      ![create-new-component-intellisense](https://raw.githubusercontent.com/heruns/bihu-fe-tools/main/demo/create-component-zh.gif)
  3.只输入英文，翻译对应的中文
      ![create-new-component-intellisense](https://raw.githubusercontent.com/heruns/bihu-fe-tools/main/demo/create-component-en.gif)

# Bihu Frontend Team Tools

This plugin is mainly related to JS/TS/React/SCSS and includes the following features:

- Format or convert JSON to TS types ()
  - Not only JSON, even problematic formats can be easily converted to TS types.
- Support for the `px2vw` custom function in SCSS
  - Automatically add `px2vw()` function call to all px values in the selected area of SCSS code
  - Smart prompt for numeric values or values starting with `px2vw` in `:global(.mobile)` or `.isMobile` selectors
- i18n file jumping
  - Based on [Momo707577045/i18n-jump](https://github.com/Momo707577045/i18n-jump/tree/main), modified for use in react-i18next projects
  - Added the function to copy the JSON key path.
  - Add mouse hover tooltip functionality.
- Component renaming
  - One-click replacement of file names and file contents
- Smart import along with code snippet generation
  - `useState` code snippet: `useState -bihu`
  - `useEffect` code snippet: `useEffect -bihu`
- React and TS code snippets
  - JSDoc style comment code snippet: `/** */ -bh`
  - className module code snippet: `className module -bh`
  - Constant object code snippet: `constant map -bh`
  - Constant id object code snippet: `constant IdNameObj -bh`
  - Antd modal encapsulation code snippet: `antd modal init -bh`
  - img code snippet: `img -bh`
- SCSS code snippets
  - Shortcut for inputting `:global`: `:global -bh`
  - Shortcut for inputting `:global(.mobile)`: `:global(.mobile) -bh`
- Create New Page/Component
  - The current version relies on the project creation script `"create": "node ./scripts/create-template.js"` and the project component template `/templates/function-component`.
  - Right-click the selected file, enter the component name, and quickly generate a page or component, eliminating the need to manually input `npm run create ...`.
  - Examples are as follows:
  1.Right-click the selected file, choose `Create New Page/Component`, and enter the component name in Chinese and English.
      ![create-new-component-intellisense](https://raw.githubusercontent.com/heruns/bihu-fe-tools/main/demo/create-component-zh-en.gif)
  2.Enter only Chinese, and the corresponding English will be translated.
      ![create-new-component-intellisense](https://raw.githubusercontent.com/heruns/bihu-fe-tools/main/demo/create-component-zh.gif)
  3.Enter only English, and the corresponding Chinese will be translated.
      ![create-new-component-intellisense](https://raw.githubusercontent.com/heruns/bihu-fe-tools/main/demo/create-component-en.gif)

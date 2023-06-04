//@ts-check

'use strict';

const path = require('path');

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
const extensionConfig = {
  target: 'node', // VS Code 扩展在 Node.js 上下文中运行 📖 -> https://webpack.js.org/configuration/node/
  mode: 'none', // 这将源代码尽可能接近原始状态（在打包时将其设置为“production”）
  entry: './src/index.ts', // 扩展的入口点，📖 -> https://webpack.js.org/configuration/entry-context/
  output: {
    // 打包文件存储在“dist”文件夹中（请检查 package.json），📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2'
  },
  externals: {
    vscode: 'commonjs vscode' // vscode 模块是即时创建的，必须排除。在这里添加其他不应该被webpack打包的文件，📖 -> https://webpack.js.org/configuration/externals/
    // 此处添加的模块也需要在 .vscodeignore 文件中添加
  },
  resolve: {
    // 支持读取 TypeScript 和 JavaScript 文件，📖 -> https://github.com/TypeStrong/ts-loader
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      }
    ]
  },
  devtool: 'nosources-source-map',
  infrastructureLogging: {
    level: "log", // 启用问题匹配所需的日志记录
  },
};
module.exports = [ extensionConfig ];

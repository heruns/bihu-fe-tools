import * as path from 'path';
import { promises as fs } from 'fs';

/**
 * 将连字符分隔的名称转换为类名格式。
 * @param {string} name - 原始名称。
 * @returns {string} 转换后的类名。
 */
const getClassName = (name: string): string => {
  return name.replace(/-([a-z])/g, (match, char) => char.toUpperCase());
};

/**
 * 将连字符分隔的名称转换为函数名格式。
 * @param {string} name - 原始名称。
 * @returns {string} 转换后的函数名。
 */
const getFunctionName = (name: string): string => {
  return getClassName(name.replace(/^([a-z])/i, (match, char) => char.toUpperCase()));
};

/**
 * 将驼峰格式的名称转换为连字符分隔的文件名格式。
 * @param {string} name - 原始名称。
 * @returns {string} 转换后的文件名。
 */
const getFileName = (name: string): string => {
  return name.replace(/[A-Z]/g, '-$0').toLowerCase();
};

const componentTemplate = `// {{desc}}
import React from 'react'
import styles from './{{fileName}}.module.scss'

export interface {{ComponentName}}Props {}

const {{ComponentName}}: React.FC<{{ComponentName}}Props> = props => {
  return (
    <div className={styles.{{className}}}>
      {{fileName}}
    </div>
  )
}

export default {{ComponentName}}
`;

const scssTemplate = `.{{className}} {

}
`;

/**
 * 创建React组件，包括TSX文件和对应的SCSS模块文件。
 * @param {string} componentPath - 组件路径。
 * @param {string} desc - 组件描述。
 * @returns {Promise<void>} 异步操作，无返回值。
 * @throws 如果组件名称或描述为空，抛出错误。
 */
export const createComponent = async (componentPath: string, desc: string): Promise<void> => {
  if (!componentPath) {
    throw new Error('请输入组件名称');
  } else if (!desc) {
    throw new Error('请输入描述');
  }

  const fileName = getFileName(path.basename(componentPath));
  const folderName = fileName;
  const absoluteDir = path.resolve(process.cwd(), componentPath);

  try {
    await fs.mkdir(absoluteDir, { recursive: true });

    const className = getClassName(fileName);
    const functionName = getFunctionName(fileName);

    // 替换模板字符串中的占位符
    const componentContent = componentTemplate
      .replace(/{{ComponentName}}/g, functionName)
      .replace(/{{fileName}}/g, fileName)
      .replace(/{{className}}/g, className)
      .replace(/{{desc}}/g, desc);

    const scssContent = scssTemplate
      .replace(/{{className}}/g, className);

    const componentFilePath = path.resolve(absoluteDir, `${fileName}.tsx`);
    const scssPath = path.resolve(absoluteDir, `${fileName}.module.scss`);

    const files = [
      { path: componentFilePath, content: componentContent },
      { path: scssPath, content: scssContent }
    ];

    for (const file of files) {
      await fs.writeFile(file.path, file.content, 'utf-8');
      console.log(`${file.path} 文件创建成功`);
    }
  } catch (error) {
    console.error('创建组件时出错:', error);
    throw error;
  }
};

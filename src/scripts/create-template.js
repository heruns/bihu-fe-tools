const path = require('path');
const fs = require('fs');

const getClassName = name => {
  const res = name.replace(/-([a-z])/g, (match, char) => char.toUpperCase());
  // console.log('getClassName', name, res)
  return res;
};
const getFunctionName = name => {
  const res = getClassName(name.replace(/^([a-z])/i, (match, char) => char.toUpperCase()));
  // console.log('getFunctionName', name, res)
  return res;
};
const getFileName = name => {
  const res = name.replace(/[A-Z]/g, '-$0');
  // console.log('getFileName', name, res)
  return res;
};

const createComponent = (templateName = 'function-component') => {
  const args = process.argv;
  const componentPath = args[2];
  const desc = args[3];
  // console.log(componentPath, desc)
  if (!componentPath) {
    throw new Error('请输入路径');
  } else if (!desc) {
    throw new Error('请输入描述');
  }
  const absoluteDir = path.resolve(__dirname, '..', componentPath);
  if (!fs.existsSync(absoluteDir)) {
    fs.mkdirSync(absoluteDir, {
      recursive: true
    });
  }
  const fileName = path.parse(absoluteDir).name;
  const templateDir = path.resolve(__dirname, `../templates/${templateName}`);
  const filesToCopy = fs.readdirSync(templateDir);
  filesToCopy.forEach(file => {
    // console.log(file)
    const filePath = path.resolve(templateDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const newContent = content
      .replace(new RegExp(getFunctionName(templateName), 'g'), getFunctionName(fileName))
      .replace(new RegExp(getFileName(templateName).replace(/-/, '\\-'), 'g'), getFileName(fileName))
      .replace(new RegExp(getClassName(templateName), 'g'), getClassName(fileName))
      .replace('组件注释', desc);
    const descPath = path.resolve(absoluteDir, file.replace(templateName, getFileName(fileName)));
    if (fs.existsSync(descPath)) {
      throw new Error(`文件"${descPath}"已存在，如需覆盖，请手动删掉再执行命令`);
    }
    fs.writeFileSync(descPath, newContent, 'utf-8');
    // eslint-disable-next-line no-console
    console.log(`${descPath} 文件创建成功`);
  });
};

createComponent();

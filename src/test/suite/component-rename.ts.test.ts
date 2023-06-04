import * as assert from 'assert';
import { getFileOrFolderName, toCamelCase, toPascalCase, replaceWithCasePreserved, toKebabCase } from '../../modules/component-rename';

suite('getFileOrFolderName', () => {
  test('当 isDirectory 是 true 时，返回文件夹名称', () => {
    const result = getFileOrFolderName('/path/to/folder', true);
    assert.strictEqual(result, 'folder');
  });

  test('当 isDirectory 是 false 时，返回不带后缀名的文件名', () => {
    const result = getFileOrFolderName('/path/to/file.txt', false);
    assert.strictEqual(result, 'file');
  });

  test('处理不带后缀名的文件名', () => {
    const result = getFileOrFolderName('/path/to/file', false);
    assert.strictEqual(result, 'file');
  });

  test('处理带多个"."的文件名', () => {
    const result = getFileOrFolderName('/path/to/file.with.multiple.dots.txt', false);
    assert.strictEqual(result, 'file');
  });
});

suite('toCamelCase', () => {
  test('reasoning-page-component -> reasoningPageComponent', () => {
    assert.strictEqual(toCamelCase('reasoning-page-component'), 'reasoningPageComponent');
  });

  test('ReasoningPageComponent -> reasoningPageComponent', () => {
    assert.strictEqual(toCamelCase('ReasoningPageComponent'), 'reasoningPageComponent');
  });
});

suite('toPascalCase', () => {
  test('ReasoningPageComponent -> ReasoningPageComponent', () => {
    assert.strictEqual(toPascalCase('ReasoningPageComponent'), 'ReasoningPageComponent');
  });

  test('reasoning-page-component -> ReasoningPageComponent', () => {
    assert.strictEqual(toPascalCase('reasoning-page-component'), 'ReasoningPageComponent');
  });
});

suite('toKebabCase', () => {
  test('ReasoningPageComponent -> reasoning-page-component', () => {
    assert.strictEqual(toKebabCase('ReasoningPageComponent'), 'reasoning-page-component');
  });
});

suite('replaceWithCasePreserved', () => {
  test('kebab case to kebab case', () => {
    const str = 'file name: reasoning-page, content: ReasoningPage, className: .reasoningPage';
    const result = replaceWithCasePreserved(str, 'reasoning-page', 'my-reasoning-component');
    assert.strictEqual(result, 'file name: my-reasoning-component, content: MyReasoningComponent, className: .myReasoningComponent');
  });

  test('kebab case to pascal case', () => {
    const str = 'file name: reasoning-page, content: ReasoningPage, className: .reasoningPage';
    const result = replaceWithCasePreserved(str, 'reasoning-page', 'MyReasoningComponent');
    assert.strictEqual(result, 'file name: MyReasoningComponent, content: MyReasoningComponent, className: .myReasoningComponent');
  });

  test('pascal case to pascal case', () => {
    const str = 'file name: reasoning-page, content: ReasoningPage, className: .reasoningPage';
    const result = replaceWithCasePreserved(str, 'ReasoningPage', 'MyReasoningComponent');
    assert.strictEqual(result, 'file name: my-reasoning-component, content: MyReasoningComponent, className: .myReasoningComponent');
  });
});
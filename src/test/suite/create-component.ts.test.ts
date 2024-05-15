import * as assert from 'assert';
import { enTxt2ComponentEnName } from "../../modules/create-component";

suite('enTxt2ComponentEnName', () => {
  test('处理正确的英文名称 test-page', () => {
    const result = enTxt2ComponentEnName('test-page');
    assert.strictEqual(result, 'test-page');
  });
  test('处理驼峰英文 testPage', () => {
    const result = enTxt2ComponentEnName('testPage');
    assert.strictEqual(result, 'test-page');
  });
  test('处理 多个英文空格隔开 test page', () => {
    const result = enTxt2ComponentEnName('test page');
    assert.strictEqual(result, 'test-page');
  });
  test('处理 单个英文单词 test', () => {
    const result = enTxt2ComponentEnName('test');
    assert.strictEqual(result, 'test');
  });
  test('处理 单个英文首尾字符 -test*', () => {
    const result = enTxt2ComponentEnName('-test*');
    assert.strictEqual(result, 'test');
  });
  test('处理 多个英文首尾字符 -test-page*', () => {
    const result = enTxt2ComponentEnName('-test-page*');
    assert.strictEqual(result, 'test-page');
  });
});

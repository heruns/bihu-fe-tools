import * as assert from 'assert';
import { json2ts } from '../../modules/json2ts';

suite('json2ts', () => {
  test('正确格式化', () => {
    const code = `/** 测试类型 */
    export interface TestInterface {
      id: number, //id
      "translateStatus": 0, //翻译状态。0-未开始。1-进行中，2-已结束。
      'translateHasQuit': 0, //  全局翻译是否已暂停。0-否，1-是
      rewardAmount: number, //奖励金额
      createdAt: string, //创建时间
      test: "string value",
      test1: 'string value',
      "updatedAt": "@datetime" //修改时间
    }`;
    const output = `/** 测试类型 */
    export interface TestInterface {
      /** id */
      id: number;
      /** 翻译状态。0-未开始。1-进行中，2-已结束。 */
      translateStatus: 0 | 1 | 2;
      /** 全局翻译是否已暂停。0-否，1-是 */
      translateHasQuit: 0 | 1;
      /** 奖励金额 */
      rewardAmount: number;
      /** 创建时间 */
      createdAt: string;
      test: string;
      test1: string;
      /** 修改时间 */
      updatedAt: string;
    }`;
    assert.strictEqual(json2ts(code), output);
  });
});

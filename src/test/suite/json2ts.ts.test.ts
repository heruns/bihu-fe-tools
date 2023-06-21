import * as assert from 'assert';
import { json2ts } from '../../modules/json2ts';

// `"translateProgressChapterId": 0, //全局翻译时，进度id
// "progressChapterId": 0, //全局操作时的进度id`

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

  test('已包含 |', () => {
    const code = `/** 测试类型 */
    export interface TestInterface {
      translateHasQuit1: 0 | 1, //  全局翻译是否已暂停。0-否，1-是
      translateHasQuit2: '0' | '1', //  全局翻译是否已暂停。0-否，1-是
    }`;
    const output = `/** 测试类型 */
    export interface TestInterface {
      /** 全局翻译是否已暂停。0-否，1-是 */
      translateHasQuit1: 0 | 1,
      /** 全局翻译是否已暂停。0-否，1-是 */
      translateHasQuit2: '0' | '1',
    }`;
    assert.strictEqual(json2ts(code), output);
  });

  test('嵌套对象或数组', () => {
    const code = `/** 测试类型 */
    export interface TestInterface {
      "obj": { //对象
        key: "value",
        "key2": 1,
      },
      "arr": [ //数组
          {
              "id": 0, //id
          }
      ],
    }`;
    const output = `/** 测试类型 */
    export interface TestInterface {
      /** 对象 */
      obj: {
        key: string;
        key2: 1;
      },
      /** 数组 */
      arr: [
          {
              /** id */
              id: number;
          }
      ]
    }`;
    assert.strictEqual(json2ts(code), output);
  });

  test('非闭合数据', () => {
    const code = `"balance":1,  //余额
    "cardNo":""  //银行卡号`;
    const output = `/** 余额 */
    balance: number;
    /** 银行卡号 */
    cardNo: string;`;
    assert.strictEqual(json2ts(code), output);
  });
});

import * as assert from 'assert';
import { getDomainFromUrl } from '../../modules/yapi';

suite('getDomainFromUrl', () => {
  test('should get domain from valid http url', () => {
    const url = 'http://www.example.com/path';
    const expectedDomain = 'http://www.example.com';
    assert.equal(getDomainFromUrl(url), expectedDomain);
  });

  test('should get domain from valid https url', () => {
    const url = 'https://www.example.com/path/abc?a=1';
    const expectedDomain = 'https://www.example.com';
    assert.equal(getDomainFromUrl(url), expectedDomain);
  });

  test('should get domain from url without protocol', () => {
    const url = 'www.example.com';
    const expectedDomain = '';
    assert.equal(getDomainFromUrl(url), expectedDomain); 
  });

  test('should return input for invalid url', () => {
    const invalidUrl = 'foo';
    assert.equal(getDomainFromUrl(invalidUrl), '');
  });
});

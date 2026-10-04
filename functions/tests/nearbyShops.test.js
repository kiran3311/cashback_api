const test = require('node:test');
const assert = require('node:assert/strict');

const controller = require('../controller/shopkepperController');

test('getNearbyShops is available', () => {
  assert.equal(typeof controller.getNearbyShops, 'function');
});

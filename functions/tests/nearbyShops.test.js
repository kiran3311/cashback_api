const test = require('node:test');
const assert = require('node:assert/strict');

const controller = require('../controller/shopkepperController');

test('nearby and offer APIs are available', () => {
  assert.equal(typeof controller.getNearbyShops, 'function');
  assert.equal(typeof controller.createOffer, 'function');
  assert.equal(typeof controller.getOffersByShopkeeperId, 'function');
  assert.equal(typeof controller.getAllOffers, 'function');
});

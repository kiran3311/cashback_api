const db = require('./config/firebase');

(async () => {
  const shopkeeperId = '5ZYHdMVR7tOjisBKgGuM';

  const shopData = {
    shopkeeperId,
    shopName: 'Demo Nearby Shop',
    ownerName: 'Demo Owner',
    mobile: '9999999999',
    category: 'Grocery',
    address: 'Main Market Road, Mumbai',
    latitude: 19.0765,
    longitude: 72.8777,
    pincode: '400001',
    gst: 'GSTDEMO123',
    createdAt: new Date()
  };

  const existing = await db.collection('shops').where('shopkeeperId', '==', shopkeeperId).limit(1).get();

  let shopId;
  if (!existing.empty) {
    shopId = existing.docs[0].id;
    await existing.docs[0].ref.update(shopData);
    console.log('Updated shop:', shopId);
  } else {
    const ref = await db.collection('shops').add(shopData);
    shopId = ref.id;
    console.log('Created shop:', shopId);
  }

  const offerData = {
    shopId,
    shopkeeperId,
    title: 'Demo Offer',
    description: '10% off on groceries',
    discountPercent: 10,
    active: true,
    createdAt: new Date()
  };

  const offerSnap = await db.collection('shopOffers').where('shopkeeperId', '==', shopkeeperId).limit(1).get();
  if (!offerSnap.empty) {
    await offerSnap.docs[0].ref.update(offerData);
    console.log('Updated offer:', offerSnap.docs[0].id);
  } else {
    const offerRef = await db.collection('shopOffers').add(offerData);
    console.log('Created offer:', offerRef.id);
  }
})();

import http from 'http';

function makeRequest(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: `/api${path}`,
      method,
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runStage4NotificationTests() {
  console.log('🧪 Starting STAGE 4 Alerts & Notifications Verification Suite...\n');

  try {
    // 1. Admin Login
    console.log('1️⃣ Logging in as Shopkeeper Admin...');
    const loginRes = await makeRequest('/auth/login', 'POST', {
      email: 'admin@stationai.shop',
      password: 'admin123'
    });
    if (loginRes.status !== 200 || !loginRes.data.token) {
      throw new Error(`Admin login failed: ${JSON.stringify(loginRes.data)}`);
    }
    const token = loginRes.data.token;
    console.log('   ✅ Admin authenticated.\n');

    // TEST 1: Create Low-Stock Product
    const testSku = `NOTIF-ST4-${Date.now().toString().slice(-4)}`;
    console.log(`2️⃣ Creating Low-Stock Product ("Low Stock Sticky Pad", SKU: "${testSku}", Stock: 3, Reorder: 5)...`);
    const prodRes = await makeRequest('/products', 'POST', {
      name: 'Low Stock Sticky Pad',
      sku: testSku,
      category: 'Sticky Notes',
      brand: '3M Post-It',
      price: 45,
      unit: 'pad',
      stock: 3,
      reorderLevel: 5,
      shelf: 'A',
      row: 'A1',
      column: '02',
      supplier: 'Stationery Depot'
    }, token);

    if (prodRes.status !== 201) throw new Error(`Product creation failed: ${JSON.stringify(prodRes.data)}`);
    const product = prodRes.data.product;
    console.log(`   ✅ Product created (ID: ${product.id})\n`);

    // TEST 2: Verify Low Stock Alert Generated
    console.log('3️⃣ Verifying Low Stock Alert in Notifications API...');
    const notifRes1 = await makeRequest('/notifications', 'GET', null, token);
    const lowStockNotif = notifRes1.data.notifications?.find(n => n.relatedProductId === product.id && n.type === 'warning');
    if (!lowStockNotif) {
      throw new Error('Low Stock Notification not found in notifications list!');
    }
    console.log(`   ✅ Low Stock Alert Verified -> Title: "${lowStockNotif.title}", Message: "${lowStockNotif.message}"\n`);

    // TEST 3: Set Stock to Zero & Verify Out-of-Stock Alert
    console.log('4️⃣ Setting Stock to Zero (Stock Out 3)...');
    const stockOutRes = await makeRequest('/inventory/stock-out', 'POST', {
      productId: product.id,
      amount: 3,
      reason: 'Sold last items'
    }, token);
    if (stockOutRes.status !== 200) throw new Error(`Stock out failed: ${JSON.stringify(stockOutRes.data)}`);
    console.log('   ✅ Stock reduced to 0.');

    console.log('5️⃣ Verifying Out-of-Stock State Alert...');
    const notifRes2 = await makeRequest('/notifications', 'GET', null, token);
    const outStockNotif = notifRes2.data.notifications?.find(n => n.relatedProductId === product.id && n.type === 'error');
    if (!outStockNotif) {
      throw new Error('Out of Stock Notification not found!');
    }
    console.log(`   ✅ Out of Stock Alert Verified -> Title: "${outStockNotif.title}", Message: "${outStockNotif.message}"\n`);

    // TEST 4: Create Batch Expiring Soon (5 days = Critical)
    console.log('6️⃣ Creating Batch Expiring Soon (Critical - 5 days)...');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const expiryDateStr = futureDate.toISOString().split('T')[0];

    const batchRes = await makeRequest(`/expiry/batch/${product.id}`, 'POST', {
      batchId: `B-ST4-${Date.now().toString().slice(-4)}`,
      quantityLoaded: 15,
      expiryDate: expiryDateStr,
      supplier: 'Stationery Depot',
      shelf: 'A', row: 'A1', column: '02'
    }, token);

    if (batchRes.status !== 201) throw new Error(`Batch creation failed: ${JSON.stringify(batchRes.data)}`);
    console.log(`   ✅ Batch created with expiry date: ${expiryDateStr}\n`);

    console.log('7️⃣ Verifying Expiry Alert in Notifications API...');
    const notifRes3 = await makeRequest('/notifications', 'GET', null, token);
    const expiryNotif = notifRes3.data.notifications?.find(n => n.relatedProductId === product.id && (n.message.includes('Expires in') || n.message.includes('Batch')));
    if (!expiryNotif) {
      throw new Error('Expiry Notification not found!');
    }
    console.log(`   ✅ Expiry Alert Verified -> Title: "${expiryNotif.title}", Message: "${expiryNotif.message}"\n`);

    // TEST 5: Verify Deduplication (Call GET /notifications 3 times, verify length doesn't balloon)
    console.log('8️⃣ Verifying Deduplication Logic...');
    const notifCountBefore = notifRes3.data.notifications.length;
    await makeRequest('/notifications', 'GET', null, token);
    await makeRequest('/notifications', 'GET', null, token);
    const notifRes4 = await makeRequest('/notifications', 'GET', null, token);
    const notifCountAfter = notifRes4.data.notifications.length;
    if (notifCountAfter > notifCountBefore) {
      throw new Error(`Deduplication failed! Count grew from ${notifCountBefore} to ${notifCountAfter}`);
    }
    console.log(`   ✅ Deduplication Verified -> Total notifications remained stable at ${notifCountAfter}\n`);

    // TEST 6: Mark Single Notification as Read
    console.log('9️⃣ Testing Mark Notification as Read...');
    const targetNotifId = outStockNotif.id;
    const markRes = await makeRequest(`/notifications/${targetNotifId}/read`, 'PUT', null, token);
    if (markRes.status !== 200) throw new Error(`Mark read failed: ${JSON.stringify(markRes.data)}`);
    console.log(`   ✅ Notification ${targetNotifId} marked as read.`);

    const notifRes5 = await makeRequest('/notifications', 'GET', null, token);
    const updatedTarget = notifRes5.data.notifications?.find(n => n.id === targetNotifId);
    if (!updatedTarget?.read) throw new Error('Notification is_read state was not updated to true!');
    console.log('   ✅ DB is_read verified as true.\n');

    // TEST 7: Mark All Notifications as Read
    console.log('🔟 Testing Mark All Notifications as Read...');
    const markAllRes = await makeRequest('/notifications/read-all', 'PUT', null, token);
    if (markAllRes.status !== 200) throw new Error(`Mark all read failed: ${JSON.stringify(markAllRes.data)}`);
    console.log('   ✅ Mark all as read API succeeded.');

    const notifRes6 = await makeRequest('/notifications', 'GET', null, token);
    const unreadRemaining = notifRes6.data.notifications?.filter(n => !n.read).length;
    if (unreadRemaining > 0) throw new Error(`Found ${unreadRemaining} unread notifications after mark all as read!`);
    console.log('   ✅ All notifications verified as read (0 unread remaining).\n');

    // CLEANUP
    console.log('🧹 Cleaning up test product...');
    await makeRequest(`/products/${product.id}`, 'DELETE', null, token);
    console.log('   ✅ Cleaned up.\n');

    console.log('🎉 ALL STAGE 4 ALERTS & NOTIFICATIONS TESTS PASSED 100%!');
  } catch (err) {
    console.error('❌ Stage 4 Test Failed:', err.message);
    process.exit(1);
  }
}

runStage4NotificationTests();

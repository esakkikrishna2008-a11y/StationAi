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

async function runStage3FlowTest() {
  console.log('🧪 Starting STAGE 3 Complete Flow E2E Verification...\n');

  try {
    // 1. Admin Login
    console.log('1️⃣ Logging in as Shopkeeper Admin...');
    const loginRes = await makeRequest('/auth/login', 'POST', {
      email: 'admin@stationai.shop',
      password: 'admin123'
    });
    if (loginRes.status !== 200 || !loginRes.data.token) {
      throw new Error(`Login failed with status ${loginRes.status}`);
    }
    const token = loginRes.data.token;
    console.log('   ✅ Admin authenticated successfully.\n');

    // 2. Dashboard Stats (Pre-Add)
    console.log('2️⃣ Fetching Initial Dashboard Stats...');
    const statsRes1 = await makeRequest('/dashboard/stats', 'GET', null, token);
    if (statsRes1.status !== 200) throw new Error('Failed to fetch dashboard stats');
    const initialStats = statsRes1.data.stats;
    console.log(`   📊 Initial Stats -> Total: ${initialStats.totalProducts}, Available: ${initialStats.available}, Low Stock: ${initialStats.lowStock}, Out of Stock: ${initialStats.outOfStock}, Expiring Soon: ${initialStats.expiringSoon}, Expired: ${initialStats.expired}\n`);

    // 3. Add Product -> Database
    const testSku = `FLOW-ST3-${Date.now().toString().slice(-4)}`;
    console.log(`3️⃣ Adding New Product ("Highlighter Pack STAGE 3", SKU: "${testSku}")...`);
    const addRes = await makeRequest('/products', 'POST', {
      name: 'Highlighter Pack STAGE 3',
      sku: testSku,
      category: 'Highlighters',
      brand: 'Stabilo',
      price: 180,
      unit: 'pack',
      stock: 20,
      reorderLevel: 5,
      shelf: 'C',
      row: 'C1',
      column: '03',
      supplier: 'Stationery Wholesale'
    }, token);
    if (addRes.status !== 201) throw new Error(`Add Product failed: ${JSON.stringify(addRes.data)}`);
    const createdProduct = addRes.data.product;
    console.log(`   ✅ Product created in DB -> ID: ${createdProduct.id}, SKU: ${createdProduct.sku}\n`);

    // 4. Verify in Inventory List
    console.log('4️⃣ Verifying Product in Inventory...');
    const invRes = await makeRequest('/products', 'GET', null, token);
    const foundInInv = invRes.data.products?.find(p => p.sku === testSku);
    if (!foundInInv) throw new Error('Product not found in Inventory response!');
    console.log(`   ✅ Found in Inventory -> Name: "${foundInInv.name}", Stock: ${foundInInv.stock}, Shelf: ${foundInInv.shelf}\n`);

    // 5. Verify Dashboard Stats updated
    console.log('5️⃣ Verifying Dashboard Stats Update...');
    const statsRes2 = await makeRequest('/dashboard/stats', 'GET', null, token);
    const updatedStats = statsRes2.data.stats;
    console.log(`   📊 Updated Stats -> Total: ${updatedStats.totalProducts} (was ${initialStats.totalProducts}), Available: ${updatedStats.available} (was ${initialStats.available})`);
    if (updatedStats.totalProducts !== initialStats.totalProducts + 1) {
      throw new Error(`Total products count mismatch! Expected ${initialStats.totalProducts + 1}, got ${updatedStats.totalProducts}`);
    }
    console.log('   ✅ Dashboard dynamically updated count!\n');

    // 6. Find Item Search Tests
    console.log('6️⃣ Testing Find Item Search (Name, SKU, Brand, Category, Shelf)...');
    
    // Search by Name
    const searchName = await makeRequest('/search?q=Highlighter', 'GET', null, token);
    if (!searchName.data.products?.some(p => p.sku === testSku)) throw new Error('Search by Name failed');
    console.log('   ✅ Search by Name ("Highlighter") -> Match found');

    // Search by SKU
    const searchSku = await makeRequest(`/search?q=${testSku}`, 'GET', null, token);
    if (!searchSku.data.products?.some(p => p.sku === testSku)) throw new Error('Search by SKU failed');
    console.log('   ✅ Search by SKU -> Match found');

    // Search by Brand
    const searchBrand = await makeRequest('/search?q=Stabilo', 'GET', null, token);
    if (!searchBrand.data.products?.some(p => p.sku === testSku)) throw new Error('Search by Brand failed');
    console.log('   ✅ Search by Brand ("Stabilo") -> Match found');

    // Search by Shelf
    const searchShelf = await makeRequest('/search?q=C1', 'GET', null, token);
    if (!searchShelf.data.products?.some(p => p.sku === testSku)) throw new Error('Search by Shelf ("C1") failed');
    console.log('   ✅ Search by Shelf ("C1") -> Match found\n');

    // 7. Stock Operations & Dashboard Refresh
    console.log('7️⃣ Testing Stock In (+10)...');
    const stockInRes = await makeRequest('/inventory/stock-in', 'POST', {
      productId: createdProduct.id,
      amount: 10,
      reason: 'Stage 3 Test Stock In'
    }, token);
    if (stockInRes.status !== 200) throw new Error('Stock In failed');
    console.log(`   ✅ Stock In successful -> New Qty: ${stockInRes.data.product.stock}`);

    console.log('8️⃣ Testing Stock Out (-5)...');
    const stockOutRes = await makeRequest('/inventory/stock-out', 'POST', {
      productId: createdProduct.id,
      amount: 5,
      reason: 'Stage 3 Test Stock Out'
    }, token);
    if (stockOutRes.status !== 200) throw new Error('Stock Out failed');
    console.log(`   ✅ Stock Out successful -> New Qty: ${stockOutRes.data.product.stock}`);

    console.log('9️⃣ Testing Prevention of Negative Stock (Deduct 999 units)...');
    const invalidOutRes = await makeRequest('/inventory/stock-out', 'POST', {
      productId: createdProduct.id,
      amount: 999,
      reason: 'Excessive stock deduction'
    }, token);
    if (invalidOutRes.status === 400) {
      console.log(`   ✅ Correctly rejected (HTTP 400): "${invalidOutRes.data.error}"\n`);
    } else {
      throw new Error('Over-deduction was not prevented!');
    }

    // 8. Clean up
    console.log('🔟 Cleaning up test product...');
    const delRes = await makeRequest(`/products/${createdProduct.id}`, 'DELETE', null, token);
    if (delRes.status !== 200) throw new Error('Failed to delete test product');
    console.log('   ✅ Test product removed cleanly from DB.\n');

    console.log('🎉 COMPLETE FLOW TEST (Add Product → DB → Inventory → Dashboard → Find Item) PASSED 100%!');
  } catch (err) {
    console.error('❌ E2E Flow Test Error:', err.message);
    process.exit(1);
  }
}

runStage3FlowTest();

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

async function runStage5AuthTests() {
  console.log('🧪 Starting STAGE 5 Real Authentication & Role-Based Security Verification Suite...\n');

  try {
    // 1. Admin Login Test
    console.log('1️⃣ Testing Shopkeeper Admin Login ("admin@stationai.shop")...');
    const adminLoginRes = await makeRequest('/auth/login', 'POST', {
      email: 'admin@stationai.shop',
      password: 'admin123'
    });
    if (adminLoginRes.status !== 200 || !adminLoginRes.data.token) {
      throw new Error(`Admin login failed: ${JSON.stringify(adminLoginRes.data)}`);
    }
    const adminToken = adminLoginRes.data.token;
    const adminUser = adminLoginRes.data.user;
    if (adminUser.role !== 'ADMIN') throw new Error(`Expected ADMIN role, got ${adminUser.role}`);
    console.log(`   ✅ Admin authenticated -> Role: ${adminUser.role}, Name: "${adminUser.name}"\n`);

    // 2. Staff Login Test
    console.log('2️⃣ Testing Store Staff Login ("staff@stationai.shop")...');
    const staffLoginRes = await makeRequest('/auth/login', 'POST', {
      email: 'staff@stationai.shop',
      password: 'staff123'
    });
    if (staffLoginRes.status !== 200 || !staffLoginRes.data.token) {
      throw new Error(`Staff login failed: ${JSON.stringify(staffLoginRes.data)}`);
    }
    const staffToken = staffLoginRes.data.token;
    const staffUser = staffLoginRes.data.user;
    if (staffUser.role !== 'STAFF') throw new Error(`Expected STAFF role, got ${staffUser.role}`);
    console.log(`   ✅ Staff authenticated -> Role: ${staffUser.role}, Name: "${staffUser.name}"\n`);

    // 3. Session Restoration / Profile Test
    console.log('3️⃣ Testing Session Restoration (GET /api/auth/profile)...');
    const profileRes = await makeRequest('/auth/profile', 'GET', null, adminToken);
    if (profileRes.status !== 200 || !profileRes.data.user) {
      throw new Error('Profile fetch failed with valid token!');
    }
    console.log(`   ✅ Session restored successfully for "${profileRes.data.user.email}"\n`);

    // 4. Protected Route Verification (No Token)
    console.log('4️⃣ Testing Unauthenticated Route Protection (GET /api/products with no token)...');
    const unauthRes = await makeRequest('/products', 'GET', null, null);
    if (unauthRes.status === 401) {
      console.log(`   ✅ Rejection verified (HTTP 401): "${unauthRes.data.error}"\n`);
    } else {
      throw new Error(`Expected 401 Unauthorized, got status ${unauthRes.status}`);
    }

    // 5. Role-Based Authorization Enforcement (Staff Unauthorized Operations)
    console.log('5️⃣ Testing Role-Based Authorization Restrictions for STAFF Role...');
    
    // Staff product creation attempt
    const staffCreate = await makeRequest('/products', 'POST', {
      name: 'Unauthorized Staff Item', sku: 'UNAUTH-01', category: 'Pens', brand: 'Test', price: 10
    }, staffToken);
    if (staffCreate.status === 403) {
      console.log('   ✅ Staff Product Creation Rejection -> HTTP 403 Forbidden');
    } else {
      throw new Error(`Expected 403 Forbidden for Staff Product Creation, got ${staffCreate.status}`);
    }

    // Staff stock modification attempt
    const staffStockIn = await makeRequest('/inventory/stock-in', 'POST', {
      productId: 1, amount: 5, reason: 'Staff test'
    }, staffToken);
    if (staffStockIn.status === 403) {
      console.log('   ✅ Staff Stock-In Rejection -> HTTP 403 Forbidden');
    } else {
      throw new Error(`Expected 403 Forbidden for Staff Stock In, got ${staffStockIn.status}`);
    }

    // Staff batch load attempt
    const staffBatch = await makeRequest('/expiry/batch/1', 'POST', {
      batchId: 'STAFF-FAIL', quantityLoaded: 10, expiryDate: '2026-12-31'
    }, staffToken);
    if (staffBatch.status === 403) {
      console.log('   ✅ Staff Batch Load Rejection -> HTTP 403 Forbidden');
    } else {
      throw new Error(`Expected 403 Forbidden for Staff Batch Load, got ${staffBatch.status}`);
    }

    // Staff settings modification attempt
    const staffSettings = await makeRequest('/settings', 'PUT', { shop_name: 'Hacked Shop' }, staffToken);
    if (staffSettings.status === 403) {
      console.log('   ✅ Staff Settings Update Rejection -> HTTP 403 Forbidden\n');
    } else {
      throw new Error(`Expected 403 Forbidden for Staff Settings Update, got ${staffSettings.status}`);
    }

    // 6. Authorized Operations for Admin Role
    console.log('6️⃣ Testing Authorized Operation for ADMIN Role...');
    const testSku = `AUTH-ST5-${Date.now().toString().slice(-4)}`;
    const adminCreate = await makeRequest('/products', 'POST', {
      name: 'Admin Auth Test Item',
      sku: testSku,
      category: 'Paper',
      brand: 'Classmate',
      price: 90,
      unit: 'pack',
      stock: 15,
      reorderLevel: 5,
      shelf: 'A', row: 'A1', column: '01', supplier: 'Direct'
    }, adminToken);
    if (adminCreate.status !== 201) throw new Error(`Admin product creation failed: ${JSON.stringify(adminCreate.data)}`);
    const createdProd = adminCreate.data.product;
    console.log(`   ✅ Product created by Admin (ID: ${createdProd.id})\n`);

    // Clean up
    await makeRequest(`/products/${createdProd.id}`, 'DELETE', null, adminToken);
    console.log('   ✅ Cleaned up admin test product.\n');

    // 7. Password Security Audit
    console.log('7️⃣ Performing Database Password Hashing Security Audit...');
    const { getDb } = await import('./database/db.js');
    const db = await getDb();
    const users = await db.query(`SELECT email, password FROM users`);
    
    let allHashed = true;
    users.forEach(u => {
      const isBcrypt = u.password.startsWith('$2a$') || u.password.startsWith('$2b$');
      console.log(`   🔒 User "${u.email}" -> Password format: ${isBcrypt ? 'Bcrypt Hash ✅' : 'PLAIN TEXT ❌'}`);
      if (!isBcrypt) allHashed = false;
    });

    if (!allHashed) throw new Error('Plain text password found in database!');
    console.log('\n🎉 ALL STAGE 5 AUTHENTICATION & ROLE AUTHORIZATION TESTS PASSED 100%!');
  } catch (err) {
    console.error('❌ Stage 5 Auth Test Failed:', err.message);
    process.exit(1);
  }
}

runStage5AuthTests();

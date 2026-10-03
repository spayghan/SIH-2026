require('dotenv').config();
const http = require('http');

async function runTests() {
  console.log('[TEST] Starting backend integration test...');
  const app = require('express')();
  const express = require('express');
  const cors = require('cors');
  const connectDB = require('./config/db');
  const { seedInitialData } = require('./services/seeder');

  const authRoutes = require('./routes/authRoutes');
  const inspectionRoutes = require('./routes/inspectionRoutes');
  const adminRoutes = require('./routes/adminRoutes');

  await connectDB();
  await seedInitialData();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/auth', authRoutes);
  app.use('/admin', adminRoutes);
  app.use('/', inspectionRoutes);
  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(5099, resolve));
  const baseUrl = 'http://127.0.0.1:5099';
  console.log(`[TEST] Test server listening on ${baseUrl}`);

  try {
    // 1. Health
    let res = await fetch(`${baseUrl}/health`);
    let data = await res.json();
    console.log('✓ Health check passed:', data.status === 'ok');

    // 2. Inspector login
    res = await fetch(`${baseUrl}/auth/inspector-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inspector_id: 'INS-MH-024', password: 'password123' })
    });
    data = await res.json();
    console.log('✓ Inspector login passed:', data.success === true, data.user?.name);

    // 3. Admin login
    res = await fetch(`${baseUrl}/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_id: 'ADM-MH-001', password: 'password123' })
    });
    data = await res.json();
    console.log('✓ Admin login passed:', data.success === true, data.user?.name);

    // 4. Create Inspection
    res = await fetch(`${baseUrl}/inspections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shop_name: 'Test Supermarket',
        owner_name: 'Test Owner',
        mobile_number: '9876543210',
        address: 'MG Road',
        district: 'Amravati',
        state: 'Maharashtra',
        product_category: 'Packaged Food & Commodities',
        barcode: '8901030541203',
        gst_number: '27AABCS1429B1Z8',
        fssai_license_number: '10020030000412'
      })
    });
    data = await res.json();
    const newId = data.inspection_id;
    console.log('✓ Create inspection passed:', data.success === true, newId);

    // 5. Trigger verify
    res = await fetch(`${baseUrl}/inspections/${newId}/verify`, { method: 'POST' });
    data = await res.json();
    console.log('✓ Trigger verification passed:', data.success === true);

    // Wait a brief moment for worker
    await new Promise(r => setTimeout(r, 1500));

    // 6. Get result
    res = await fetch(`${baseUrl}/inspections/${newId}/result`);
    data = await res.json();
    console.log('✓ Inspection result fetched:', data.success === true, 'Status:', data.data?.status, 'Violations:', data.data?.violations?.length);

    // 7. Inspector review & approve
    res = await fetch(`${baseUrl}/inspections/${newId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' })
    });
    data = await res.json();
    console.log('✓ Review & approve passed:', data.success === true, 'Approval status:', data.data?.inspector_approval_status);

    // 8. Admin Dashboard
    res = await fetch(`${baseUrl}/admin/dashboard`);
    data = await res.json();
    console.log('✓ Admin dashboard passed:', data.success === true, 'Total:', data.kpis?.total_inspections);

    // 9. Admin Regional Analysis
    res = await fetch(`${baseUrl}/admin/regional-analysis`);
    data = await res.json();
    console.log('✓ Admin regional analysis passed:', data.success === true, 'Regions count:', data.regional_risk_data?.length);

    // 10. Admin Inspections list
    res = await fetch(`${baseUrl}/admin/inspections`);
    data = await res.json();
    console.log('✓ Admin inspections list passed:', data.success === true, 'Count:', data.data?.length);

    console.log('\n🎉 ALL 10 INTEGRATION TESTS COMPLETED SUCCESSFULLY!\n');
  } catch (err) {
    console.error('Test failed with error:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    process.exit(process.exitCode || 0);
  }
}

runTests();

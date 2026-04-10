#!/usr/bin/env node
/**
 * GhDataConnect API Test Script
 * Run with: node scripts/test-ghdataconnect.js
 */

const API_BASE_URL = 'https://ghdataconnect.com/api';
const API_KEY = '197|tG0LVi5Ts8As6rw3hg3n0eruUVjHpP5OGB45szkk31035673';

async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    ...options.headers
  };

  console.log(`\n🔗 Testing: ${options.method || 'GET'} ${url}`);

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const contentType = response.headers.get('content-type');
    let data;
    
    // Handle HTML responses (error pages)
    if (contentType && contentType.includes('text/html')) {
      const text = await response.text();
      console.log(`📊 Status: ${response.status}`);
      console.log(`📦 Response: HTML Error Page (first 200 chars):`, text.substring(0, 200));
      return { success: false, data: { html: true, message: 'Received HTML instead of JSON' }, status: response.status };
    }
    
    data = await response.json();
    console.log(`📊 Status: ${response.status}`);
    console.log(`📦 Response:`, JSON.stringify(data, null, 2));

    return { success: response.ok, data, status: response.status };
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testAllEndpoints() {
  console.log('🚀 Starting GhDataConnect API Tests\n');
  console.log('=' .repeat(50));

  // Test 1: Get Wallet Balance
  console.log('\n📋 TEST 1: Get Wallet Balance');
  const balanceResult = await makeRequest('/v1/getWalletBalance', { method: 'GET' });

  // Test 2: Get All Networks
  console.log('\n📋 TEST 2: Get All Networks');
  const networksResult = await makeRequest('/v1/getAllNetworks', { method: 'GET' });

  if (networksResult.success && networksResult.data?.data) {
    console.log('\n📱 Available Networks:');
    networksResult.data.data.forEach(network => {
      console.log(`   - ${network.key}: ${network.name || 'Unknown'}`);
      if (network.bundles) {
        console.log(`     Bundles: ${network.bundles.length} available`);
      }
    });
  }

  // Test 3: Place Order (Test with small amount)
  console.log('\n📋 TEST 3: Place Order (Test)');
  const orderResult = await makeRequest('/v1/placeOrder', {
    method: 'POST',
    body: JSON.stringify({
      network: 'mtn',
      recipient: '0244000000',
      capacity: '100'
    })
  });

  if (orderResult.success && orderResult.data?.data?.reference) {
    const reference = orderResult.data.data.reference;
    console.log(`\n✅ Order placed with reference: ${reference}`);

    // Test 4: Check Order Status
    console.log('\n📋 TEST 4: Check Order Status');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    const statusResult = await makeRequest(`/v1/checkOrderStatus/${reference}`, { method: 'GET' });
  }

  // Test 5: Place iShare Order
  console.log('\n📋 TEST 5: Place iShare Order (Test)');
  const ishareResult = await makeRequest('/v1/placeIshareOrder', {
    method: 'POST',
    body: JSON.stringify({
      network: 'mtn',
      recipient: '0244000000',
      capacity: '50'
    })
  });

  console.log('\n' + '='.repeat(50));
  console.log('🏁 Tests Complete!\n');

  // Summary
  const results = [balanceResult, networksResult, orderResult, ishareResult];
  const passed = results.filter(r => r.success).length;
  console.log(`📈 Summary: ${passed}/${results.length} tests passed`);
  
  if (passed === results.length) {
    console.log('✅ All API endpoints are working correctly!');
  } else {
    console.log('⚠️ Some endpoints failed. Check the output above.');
  }
}

// Run tests
testAllEndpoints().catch(console.error);

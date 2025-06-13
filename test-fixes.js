// Test script to verify the admin leave request and overtime request fixes
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
let authCookie = '';

async function testAdminLogin() {
  try {
    const response = await axios.post(`${BASE_URL}/api/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    // Extract session cookie
    const cookies = response.headers['set-cookie'];
    if (cookies) {
      authCookie = cookies[0].split(';')[0];
      console.log('✓ Admin login successful');
      return true;
    }
  } catch (error) {
    console.log('✗ Admin login failed:', error.response?.data || error.message);
    return false;
  }
}

async function testOvertimeRequestsAPI() {
  try {
    const response = await axios.get(`${BASE_URL}/api/overtime-requests`, {
      headers: { Cookie: authCookie }
    });
    console.log('✓ Overtime requests API accessible');
    console.log(`  Found ${response.data.length} overtime requests`);
    return true;
  } catch (error) {
    console.log('✗ Overtime requests API failed:', error.response?.data || error.message);
    return false;
  }
}

async function testPendingRequestsAPI() {
  try {
    const response = await axios.get(`${BASE_URL}/api/admin/pending-requests`, {
      headers: { Cookie: authCookie }
    });
    console.log('✓ Admin pending requests API accessible');
    console.log(`  Leave requests: ${response.data.leaveRequests?.length || 0}`);
    console.log(`  Overtime requests: ${response.data.overtimeRequests?.length || 0}`);
    console.log(`  Timeoff requests: ${response.data.timeoffRequests?.length || 0}`);
    return response.data;
  } catch (error) {
    console.log('✗ Admin pending requests API failed:', error.response?.data || error.message);
    return null;
  }
}

async function runTests() {
  console.log('Testing admin request fixes...\n');
  
  const loginSuccess = await testAdminLogin();
  if (!loginSuccess) {
    console.log('Cannot proceed without admin authentication');
    return;
  }
  
  console.log('\nTesting APIs...');
  await testOvertimeRequestsAPI();
  await testPendingRequestsAPI();
  
  console.log('\n✓ All tests completed');
}

runTests().catch(console.error);
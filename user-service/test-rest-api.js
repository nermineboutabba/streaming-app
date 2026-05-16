import http from 'http';

const BASE_URL = 'http://localhost:3000';

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test functions
async function testRegister() {
  console.log('\n🧪 Testing Register Endpoint...');
  const testData = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123'
  };

  const response = await makeRequest('POST', '/register', testData);
  console.log('Status:', response.status);
  console.log('Response:', response.data);
  return response.data;
}

async function testLogin(email, password) {
  console.log('\n🧪 Testing Login Endpoint...');
  const testData = { email, password };

  const response = await makeRequest('POST', '/login', testData);
  console.log('Status:', response.status);
  console.log('Response:', response.data);
  return response.data;
}

async function testGetUser(userId) {
  console.log('\n🧪 Testing Get User Endpoint...');
  const response = await makeRequest('GET', `/user/${userId}`);
  console.log('Status:', response.status);
  console.log('Response:', response.data);
  return response.data;
}

async function testUpdateUser(userId, username, email) {
  console.log('\n🧪 Testing Update User Endpoint...');
  const testData = { username, email };
  const response = await makeRequest('PUT', `/user/${userId}`, testData);
  console.log('Status:', response.status);
  console.log('Response:', response.data);
  return response.data;
}

async function testFollow(followerId, followingId) {
  console.log('\n🧪 Testing Follow Endpoint...');
  const testData = { follower_id: followerId, following_id: followingId };
  const response = await makeRequest('POST', '/follow', testData);
  console.log('Status:', response.status);
  console.log('Response:', response.data);
  return response.data;
}

async function testGetFollowers(userId) {
  console.log('\n🧪 Testing Get Followers Endpoint...');
  const response = await makeRequest('GET', `/followers/${userId}`);
  console.log('Status:', response.status);
  console.log('Response:', response.data);
  return response.data;
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting REST API Tests for User Service');
  console.log('==========================================');

  try {
    // Test 1: Register a new user
    const registerResult = await testRegister();
    const userId = registerResult.user_id;

    // Test 2: Login with the registered user
    const loginResult = await testLogin('test@example.com', 'password123');
    const token = loginResult.token;

    // Test 3: Get user by ID
    await testGetUser(userId);

    // Test 4: Update user
    await testUpdateUser(userId, 'updateduser', 'updated@example.com');

    // Test 5: Register another user for follow testing
    const registerResult2 = await testRegister();
    // Modify the second registration data
    const response2 = await makeRequest('POST', '/register', {
      username: 'testuser2',
      email: 'test2@example.com',
      password: 'password123'
    });
    const userId2 = response2.data.user_id;

    // Test 6: Follow user
    await testFollow(userId2, userId);

    // Test 7: Get followers
    await testGetFollowers(userId);

    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run tests
runTests();

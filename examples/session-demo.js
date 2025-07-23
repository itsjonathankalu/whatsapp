#!/usr/bin/env node

/**
 * Session Demo Script
 *
 * Demonstrates the WhatsApp service with mandatory session IDs
 */

const BASE_URL = 'http://localhost:3000';
const AUTH_TOKEN = 'your-secret-token-here';

const headers = {
  Authorization: `Bearer ${AUTH_TOKEN}`,
  'Content-Type': 'application/json',
};

async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: { ...headers, ...options.headers },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`${response.status}: ${data.error || 'Unknown error'}`);
  }

  return data;
}

async function demonstrateSessions() {
  console.log('🚀 WhatsApp Session Demo\n');

  try {
    // 1. Check health (no session ID required)
    console.log('1. Checking service health...');
    const health = await makeRequest('/health');
    console.log('   Health:', JSON.stringify(health, null, 2));
    console.log();

    // 2. Try operation without session ID (should fail)
    console.log('2. Testing missing session ID...');
    try {
      await makeRequest('/qr');
      console.log('   ❌ This should have failed!');
    } catch (error) {
      console.log('   ✅ Correctly rejected:', error.message);
    }
    console.log();

    // 3. Create sessions
    const sessions = ['demo-sales', 'demo-support', 'demo-marketing'];
    console.log('3. Creating sessions...');

    for (const sessionId of sessions) {
      console.log(`   Creating session: ${sessionId}`);
      const qr = await makeRequest('/qr', {
        headers: {
          'X-Session-Id': sessionId,
          Authorization: `Bearer ${AUTH_TOKEN}`,
        },
      });
      console.log(`   Status: ${qr.status} - ${qr.message}`);
    }
    console.log();

    // 4. Check individual session statuses
    console.log('4. Checking session statuses...');
    for (const sessionId of sessions) {
      const status = await makeRequest('/status', {
        headers: {
          'X-Session-Id': sessionId,
          Authorization: `Bearer ${AUTH_TOKEN}`,
        },
      });
      console.log(`   ${sessionId}: ${status.status}`);
    }
    console.log();

    // 5. Test invalid session ID
    console.log('5. Testing invalid session ID...');
    try {
      await makeRequest('/qr', {
        headers: {
          'X-Session-Id': 'invalid session!',
          Authorization: `Bearer ${AUTH_TOKEN}`,
        },
      });
      console.log('   ❌ This should have failed!');
    } catch (error) {
      console.log('   ✅ Correctly rejected:', error.message);
    }
    console.log();

    // 6. Final health check
    console.log('6. Final health check...');
    const finalHealth = await makeRequest('/health');
    console.log('   Sessions:', JSON.stringify(finalHealth.sessions, null, 2));
    console.log();

    console.log('✅ Demo completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   - Each session needs QR code authentication');
    console.log('   - Sessions persist across container restarts');
    console.log('   - Use meaningful session IDs for organization');
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    process.exit(1);
  }
}

// Example usage functions
function showUsageExamples() {
  console.log('\n📖 Usage Examples:\n');

  console.log('# Get QR code (session ID required)');
  console.log('curl -H "Authorization: Bearer YOUR_TOKEN" \\');
  console.log('  -H "X-Session-Id: sales" \\');
  console.log('  http://localhost:3000/qr\n');

  console.log('# Send message (session ID required)');
  console.log('curl -X POST http://localhost:3000/send \\');
  console.log('  -H "Authorization: Bearer YOUR_TOKEN" \\');
  console.log('  -H "X-Session-Id: sales" \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"to": "5511999887766", "message": "Hello from Sales!"}\'\n');

  console.log('# Check session status');
  console.log('curl -H "Authorization: Bearer YOUR_TOKEN" \\');
  console.log('  -H "X-Session-Id: sales" \\');
  console.log('  http://localhost:3000/status\n');

  console.log('# Health check (no session ID required)');
  console.log('curl -H "Authorization: Bearer YOUR_TOKEN" \\');
  console.log('  http://localhost:3000/health\n');

  console.log('📚 See SESSION_USAGE.md for complete documentation');
}

// Run demo and show examples
demonstrateSessions()
  .then(() => {
    showUsageExamples();
  })
  .catch((error) => {
    console.error('❌ Failed to run demo:', error.message);
    process.exit(1);
  });

// Export functions for potential importing
export { makeRequest, demonstrateSessions, showUsageExamples };

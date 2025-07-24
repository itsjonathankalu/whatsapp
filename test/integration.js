// integration.js - Basic integration tests for WhatsApp API

import { WhatsAppClient } from '../examples/client.js';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const API_TOKEN = process.env.AUTH_TOKEN || 'test-token';

async function runTests() {
  const client = new WhatsAppClient(API_URL, API_TOKEN);

  console.log('🧪 Running WhatsApp API Integration Tests\n');

  try {
    // Test 1: Health check
    console.log('Test 1: Health check');
    const health = await client.health();
    assert(health.status === 'ok', 'Health check should return ok');
    console.log('✅ Health check passed\n');

    // Test 2: Session lifecycle
    console.log('Test 2: Session lifecycle');
    await testSessionLifecycle(client);
    console.log('✅ Session lifecycle passed\n');

    // Test 3: QR generation
    console.log('Test 3: QR generation and timeout');
    await testQRGeneration(client);
    console.log('✅ QR generation passed\n');

    // Test 4: Error handling
    console.log('Test 4: Error handling');
    await testErrorHandling(client);
    console.log('✅ Error handling passed\n');

    console.log('🎉 All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

async function testSessionLifecycle(client) {
  const sessionId = 'test-lifecycle';

  // Create session
  const created = await client.createSession(sessionId);
  assert(created.status === 'initializing', 'Session should be initializing');

  // Get status
  const status = await client.getSession(sessionId);
  assert(status.sessionId === sessionId, 'Session ID should match');

  // Delete session
  await client.deleteSession(sessionId);

  // Verify deleted
  try {
    await client.getSession(sessionId);
    throw new Error('Should have failed');
  } catch (e) {
    assert(e.message.includes('not found'), 'Should return not found error');
  }
}

async function testQRGeneration(client) {
  const sessionId = 'test-qr';

  // Create session
  await client.createSession(sessionId);

  // Get QR (should work first time)
  const qr = await client.getQR(sessionId);
  assert(qr.expires_in === 60, 'QR should expire in 60 seconds');

  // Try to get another QR immediately (should fail)
  try {
    await client.getQR(sessionId);
    throw new Error('Should have failed');
  } catch (e) {
    assert(e.message.includes('QR_ALREADY_ACTIVE'), 'Should return QR already active error');
  }

  // Cleanup
  await client.deleteSession(sessionId);
}

async function testErrorHandling(client) {
  // Test missing session
  try {
    await client.sendMessage('non-existent', '123', 'test');
    throw new Error('Should have failed');
  } catch (e) {
    assert(e.message.includes('not found'), 'Should return not found error');
  }

  // Test session not ready
  const sessionId = 'test-not-ready';
  await client.createSession(sessionId);

  try {
    await client.sendMessage(sessionId, '123', 'test');
    throw new Error('Should have failed');
  } catch (e) {
    assert(e.message.includes('not ready'), 'Should return not ready error');
  }

  // Cleanup
  await client.deleteSession(sessionId);
}

function assert(condition, message = 'Assertion failed') {
  if (!condition) {
    throw new Error(message);
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

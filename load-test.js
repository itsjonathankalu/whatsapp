/**
 * Load Test for TickTick WhatsApp API
 * 
 * Run with: k6 run load-test.js
 * 
 * This tests whether your API can handle multiple tenants sending messages
 * simultaneously. Only run this if you're actually worried about performance.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m', target: 5 },   // Warm up to 5 users
    { duration: '3m', target: 10 },  // Ramp up to 10 users
    { duration: '5m', target: 10 },  // Stay at 10 users
    { duration: '1m', target: 0 },   // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.1'],     // Error rate under 10%
    errors: ['rate<0.1'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'change-me-in-production';
const TEST_NUMBER = __ENV.TEST_NUMBER || '5511999887766';

export function setup() {
  console.log('🚀 Starting WhatsApp API Load Test');
  console.log(`📊 Target: ${BASE_URL}`);
  console.log(`📞 Test number: ${TEST_NUMBER}`);
  console.log('⚠️  Make sure your WhatsApp session is connected first!');
  return { baseUrl: BASE_URL, apiKey: API_KEY, testNumber: TEST_NUMBER };
}

export default function (data) {
  // Each virtual user gets their own tenant ID
  const tenantId = `load-test-${__VU}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-API-Key': data.apiKey,
    'X-Tenant-Id': tenantId,
  };

  // 1. Health check (lightweight)
  const healthResponse = http.get(`${data.baseUrl}/health`);
  const healthOk = check(healthResponse, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 500ms': (r) => r.timings.duration < 500,
  });

  if (!healthOk) {
    errorRate.add(1);
    console.log(`❌ Health check failed for VU ${__VU}`);
    return;
  }

  // 2. Check session status (or create if needed)
  const sessionResponse = http.get(`${data.baseUrl}/api/v1/sessions/status`, { headers });
  const sessionOk = check(sessionResponse, {
    'session status readable': (r) => r.status === 200,
  });

  if (!sessionOk) {
    errorRate.add(1);
    console.log(`❌ Session check failed for tenant ${tenantId}`);
    return;
  }

  // Only proceed if we have a connected session
  const sessionData = JSON.parse(sessionResponse.body);
  if (sessionData.status !== 'connected') {
    console.log(`⚠️  Tenant ${tenantId} not connected, skipping message test`);
    sleep(1);
    return;
  }

  // 3. Send a test message (the real load test)
  const messagePayload = {
    to: data.testNumber,
    message: `Load test from VU ${__VU} at ${new Date().toISOString()}`
  };

  const messageResponse = http.post(
    `${data.baseUrl}/api/v1/messages/send`,
    JSON.stringify(messagePayload),
    { headers, timeout: '30s' }
  );

  const messageOk = check(messageResponse, {
    'message send status is 200': (r) => r.status === 200,
    'message send response time < 5s': (r) => r.timings.duration < 5000,
    'message has ID': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.id && body.id.length > 0;
      } catch {
        return false;
      }
    },
  });

  if (!messageOk) {
    errorRate.add(1);
    console.log(`❌ Message send failed for VU ${__VU}: ${messageResponse.status}`);
  }

  // 4. Test webhook endpoint (lightweight)
  const webhookResponse = http.get(`${data.baseUrl}/api/v1/webhooks`, { headers });
  check(webhookResponse, {
    'webhook list accessible': (r) => r.status === 200,
  });

  // Random delay to simulate real usage
  sleep(Math.random() * 3 + 1);
}

export function teardown(data) {
  console.log('🏁 Load test completed');
  console.log('💡 Check your WhatsApp for test messages');
  console.log('📊 Review the k6 metrics above for performance insights');
}

/*
Usage Examples:

# Basic load test
k6 run load-test.js

# Custom configuration
API_URL=http://localhost:3000 \
API_KEY=your-key \
TEST_NUMBER=5511999887766 \
k6 run load-test.js

# High load test (be careful!)
k6 run --vus 20 --duration 10m load-test.js

# What to look for in results:
# - http_req_duration_p95 < 2000ms (95% of requests under 2 seconds)
# - http_req_failed < 10% (less than 10% failures)
# - errors < 10% (our custom error rate)
# 
# If these thresholds fail, you have performance issues.
# If they pass, you're probably fine for most use cases.
*/ 
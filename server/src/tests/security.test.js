const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const dns = require('node:dns');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore
}

const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const app = require('../app');

describe('Security Hardening & Rate Limiter Tests (Task K12)', () => {
  let server;
  let baseUrl;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  it('Test 1: Helmet sets secure HTTP headers and removes X-Powered-By', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-powered-by'), null, 'X-Powered-By header should be removed');
    assert.ok(res.headers.get('x-content-type-options'), 'X-Content-Type-Options should be set');
    assert.ok(res.headers.get('x-frame-options') || res.headers.get('content-security-policy'), 'Frame protection should be active');
  });

  it('Test 2: Body parser rejects payloads exceeding 100KB with HTTP 413', async () => {
    // Generate a payload > 100KB (e.g. 120KB)
    const largeData = 'x'.repeat(120 * 1024);
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ large: largeData }),
    });

    assert.equal(res.status, 413);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /100KB/i);
  });

  it('Test 3: CORS allows whitelisted origin and rejects unauthorized origin', async () => {
    // 3a. Whitelisted origin: http://localhost:3000
    const allowedRes = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: 'http://localhost:3000' },
    });
    assert.equal(allowedRes.status, 200);
    assert.equal(allowedRes.headers.get('access-control-allow-origin'), 'http://localhost:3000');

    // 3b. Unauthorized origin: http://malicious-domain.com
    const blockedRes = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: 'http://malicious-domain.com' },
    });
    assert.equal(blockedRes.status, 403);
    const blockedBody = await blockedRes.json();
    assert.match(blockedBody.message, /CORS/i);
  });

  it('Test 4: Auth rate limiter blocks after 10 failed login attempts with HTTP 429', async () => {
    let lastStatus = 0;
    let rateLimited = false;

    // Send consecutive failed login requests
    for (let i = 1; i <= 12; i++) {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'fake_user_test@domain.com', password: 'wrong_password_123' }),
      });

      lastStatus = res.status;
      if (res.status === 429) {
        rateLimited = true;
        const body = await res.json();
        assert.equal(body.success, false);
        assert.match(body.message, /10 lần/i);
        break;
      }
    }

    assert.ok(rateLimited, `Rate limiter should return HTTP 429, but lastStatus was ${lastStatus}`);
  });
});

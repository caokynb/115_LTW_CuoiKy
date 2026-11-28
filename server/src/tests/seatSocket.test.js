const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const express = require('express');
const { io: ioClient } = require('socket.io-client');
const { initSeatSocket } = require('../socket/seatSocket');

const waitForEvent = (socket, eventName, predicate = () => true, timeoutMs = 1500) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName, handler);
      reject(new Error(`Timed out waiting for event ${eventName}`));
    }, timeoutMs);

    const handler = (payload) => {
      if (predicate(payload)) {
        clearTimeout(timer);
        socket.off(eventName, handler);
        resolve(payload);
      }
    };

    socket.on(eventName, handler);
  });

describe('Socket.io Real-time Seat Lock (K17)', () => {
  let httpServer;
  let ioServer;
  let baseUrl;

  before(async () => {
    const app = express();
    httpServer = http.createServer(app);
    ioServer = initSeatSocket(httpServer, {
      allowedOrigins: ['http://localhost:3000'],
      holdTtlMs: 300,
      allowUnauthenticatedHolds: true,
    });
    await new Promise((resolve) => {
      httpServer.listen(0, () => {
        baseUrl = `http://localhost:${httpServer.address().port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (ioServer) {
      await new Promise((resolve) => ioServer.close(resolve));
    }
    if (httpServer && httpServer.listening) {
      await new Promise((resolve) => httpServer.close(resolve));
    }
  });

  it('đồng bộ ghế giữ chỗ seat:holding tức thì (<500ms) và tự động nhả khi disconnect', async () => {
    const showtimeId = 'showtime_realtime_1';
    const clientA = ioClient(baseUrl, { transports: ['websocket'] });
    const clientB = ioClient(baseUrl, { transports: ['websocket'] });

    try {
      await Promise.all([
        waitForEvent(clientA, 'connect'),
        waitForEvent(clientB, 'connect'),
      ]);

      clientA.emit('showtime:join', { showtimeId });
      clientB.emit('showtime:join', { showtimeId });

      await Promise.all([
        waitForEvent(clientA, 'seat:holds'),
        waitForEvent(clientB, 'seat:holds'),
      ]);

      const startAt = Date.now();
      const holdPromise = waitForEvent(
        clientB,
        'seat:holds',
        (data) =>
          data.showtimeId === showtimeId &&
          data.holds.some((h) => h.row === 'C' && h.number === 5 && h.socketId === clientA.id)
      );

      clientA.emit('seat:holding', { showtimeId, row: 'C', number: 5, action: 'hold' });
      const holdPayload = await holdPromise;
      const elapsed = Date.now() - startAt;

      assert.ok(elapsed < 500, `Expected sync < 500ms, got ${elapsed}ms`);
      assert.strictEqual(holdPayload.holds.length, 1);

      // Ngắt kết nối clientA -> clientB nhận seat:holds rỗng
      const releasePromise = waitForEvent(
        clientB,
        'seat:holds',
        (data) => data.showtimeId === showtimeId && data.holds.length === 0
      );
      clientA.disconnect();
      const releasePayload = await releasePromise;
      assert.strictEqual(releasePayload.holds.length, 0);
    } finally {
      clientA.close();
      clientB.close();
    }
  });

  it('tự động giải phóng ghế khi hết TTL giữ chỗ', async () => {
    const showtimeId = 'showtime_ttl_1';
    const clientA = ioClient(baseUrl, { transports: ['websocket'] });

    try {
      await waitForEvent(clientA, 'connect');
      clientA.emit('showtime:join', { showtimeId });
      await waitForEvent(clientA, 'seat:holds');

      const heldPromise = waitForEvent(
        clientA,
        'seat:holds',
        (data) => data.holds.some((h) => h.row === 'D' && h.number === 2)
      );
      clientA.emit('seat:holding', { showtimeId, row: 'D', number: 2, action: 'hold' });
      await heldPromise;

      const expiredPromise = waitForEvent(
        clientA,
        'seat:holds',
        (data) => data.holds.length === 0,
        1500
      );
      const expiredPayload = await expiredPromise;
      assert.strictEqual(expiredPayload.holds.length, 0);
    } finally {
      clientA.close();
    }
  });

  it('từ chối khách chưa đăng nhập khi yêu cầu giữ ghế', async () => {
    const secureServer = http.createServer(express());
    const secureIo = initSeatSocket(secureServer, { allowedOrigins: ['http://localhost:3000'] });
    await new Promise((resolve) => secureServer.listen(0, resolve));
    const guest = ioClient(`http://localhost:${secureServer.address().port}`, { transports: ['websocket'] });
    try {
      await waitForEvent(guest, 'connect');
      guest.emit('seat:holding', { showtimeId: 'guest_showtime', row: 'A', number: 1, action: 'hold' });
      const rejected = await waitForEvent(guest, 'seat:hold-rejected');
      assert.equal(rejected.code, 'AUTH_REQUIRED');
    } finally {
      guest.close();
      await new Promise((resolve) => secureIo.close(resolve));
      if (secureServer.listening) await new Promise((resolve) => secureServer.close(resolve));
    }
  });
});

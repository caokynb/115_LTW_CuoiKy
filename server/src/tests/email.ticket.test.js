const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const {
  sendBookingConfirmationEmail,
  getSentEmails,
  clearSentEmails,
} = require('../services/email.service');

describe('Ticket Confirmation Email Service (feat/email-ticket)', () => {
  beforeEach(() => {
    clearSentEmails();
  });

  it('gửi email xác nhận vé điện tử thành công với đầy đủ mã QR và thông tin suất chiếu', async () => {
    const mockUser = {
      fullName: 'Nguyễn Văn Test',
      email: 'test-user@cinehub.local',
    };

    const mockBooking = {
      _id: '65f1234567890abcdef12345',
      totalPrice: 160000,
      tickets: [
        { row: 'E', number: 7, label: 'E7' },
        { row: 'E', number: 8, label: 'E8' },
      ],
      showtimeId: {
        startTime: new Date('2026-11-30T19:30:00Z'),
        movieId: { title: 'Avatar: Dòng Chảy Của Nước' },
        roomId: {
          name: 'Phòng Chiếu 01 (IMAX)',
          cinemaId: { name: 'CineHub Vincom' },
        },
      },
    };

    const startTime = Date.now();
    const result = await sendBookingConfirmationEmail(mockBooking, mockUser);
    const duration = Date.now() - startTime;

    assert.equal(result.success, true);
    assert.equal(result.email, mockUser.email);
    // Tiêu chí: nhận email xác nhận nhanh trong 30 giây (thực tế < 1 giây)
    assert.ok(duration < 30000, 'Thời gian gửi email phải dưới 30 giây');

    const sent = getSentEmails();
    assert.equal(sent.length, 1);
    const email = sent[0];

    assert.equal(email.to, mockUser.email);
    assert.ok(email.subject.includes(mockBooking._id));
    assert.ok(email.subject.includes('Avatar'));

    // Kiểm tra nội dung email chứa đầy đủ thông tin vé và mã QR
    assert.ok(email.html.includes(mockBooking._id), 'Email phải chứa mã đơn vé');
    assert.ok(email.html.includes('Avatar: Dòng Chảy Của Nước'), 'Email phải chứa tên phim');
    assert.ok(email.html.includes('Phòng Chiếu 01 (IMAX)'), 'Email phải chứa phòng chiếu');
    assert.ok(email.html.includes('E7, E8'), 'Email phải chứa danh sách ghế');
    assert.ok(email.html.includes('160.000 đ'), 'Email phải chứa tổng tiền');
    assert.ok(email.html.includes('api.qrserver.com'), 'Email phải chứa URL mã QR');
  });

  it('xử lý an toàn và không crash khi thiếu thông tin đơn vé hoặc email', async () => {
    const result1 = await sendBookingConfirmationEmail(null, { email: 'abc@test.com' });
    assert.equal(result1.success, false);

    const result2 = await sendBookingConfirmationEmail({ _id: '123' }, null);
    assert.equal(result2.success, false);

    const result3 = await sendBookingConfirmationEmail({ _id: '123' }, { email: '' });
    assert.equal(result3.success, false);
  });
});

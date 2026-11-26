import { renderHook, act } from '@testing-library/react';
import { io } from 'socket.io-client';
import { useSocketSeats } from './useSocketSeats';

jest.mock('socket.io-client', () => ({
  io: jest.fn(),
}));

describe('useSocketSeats (K17)', () => {
  let listeners;
  let mockSocket;

  beforeEach(() => {
    listeners = {};
    mockSocket = {
      id: 'socket_me',
      connected: true,
      emit: jest.fn(),
      on: jest.fn((event, handler) => {
        listeners[event] = handler;
      }),
      off: jest.fn((event) => {
        delete listeners[event];
      }),
      disconnect: jest.fn(),
    };
    io.mockReturnValue(mockSocket);
  });

  test('tham gia phòng, lọc ghế người khác giữ và phát sự kiện seat:holding', () => {
    const { result, unmount } = renderHook(() => useSocketSeats('st_1'));

    expect(mockSocket.emit).toHaveBeenCalledWith('showtime:join', { showtimeId: 'st_1' });
    expect(result.current.connected).toBe(true);

    act(() => {
      listeners['seat:holds']({
        showtimeId: 'st_1',
        holds: [
          { row: 'A', number: 1, socketId: 'socket_me' },
          { row: 'B', number: 2, socketId: 'socket_other' },
        ],
      });
    });

    expect(result.current.heldByOthers).toEqual([
      { row: 'B', number: 2, socketId: 'socket_other' },
    ]);

    act(() => {
      result.current.emitSeatHold({ row: 'A', number: 3 }, 'hold');
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('seat:holding', {
      showtimeId: 'st_1',
      row: 'A',
      number: 3,
      action: 'hold',
    });

    unmount();
    expect(mockSocket.emit).toHaveBeenCalledWith('showtime:leave', { showtimeId: 'st_1' });
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});

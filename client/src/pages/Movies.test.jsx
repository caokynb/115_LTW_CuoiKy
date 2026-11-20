import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Movies } from './Movies';
import * as useFetchModule from '../hooks/useFetch';

jest.mock('../hooks/useFetch');

describe('Movies Page Search & Filter Integration', () => {
  const mockRefetch = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('initializes filters from URL search params and calls API with them', () => {
    useFetchModule.useFetch.mockReturnValue({
      data: {
        data: [
          {
            _id: 'm1',
            title: 'Avatar: Dòng Chảy Của Nước',
            genres: ['Khoa học viễn tưởng', 'Hành động'],
            duration: 192,
            posterUrl: 'https://example.com/avatar.jpg',
            status: 'now_showing',
          },
        ],
        total: 1,
        pages: 1,
      },
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(
      <MemoryRouter initialEntries={['/movies?q=Avatar&genre=Khoa%20h%E1%BB%8Dc%20vi%E1%BB%85n%20t%C6%B0%E1%BB%9Fng&date=2026-11-25']}>
        <Movies />
      </MemoryRouter>
    );

    // Verify useFetch was called with the URL params
    expect(useFetchModule.useFetch).toHaveBeenCalledWith(
      '/movies',
      expect.objectContaining({
        params: expect.objectContaining({
          status: 'now_showing',
          q: 'Avatar',
          genre: 'Khoa học viễn tưởng',
          date: '2026-11-25',
          page: 1,
          limit: 8,
        }),
      })
    );

    // Verify search input has initial value
    const searchInput = screen.getByRole('textbox', { name: /tìm kiếm phim/i });
    expect(searchInput.value).toBe('Avatar');

    // Verify active filter tags are rendered
    expect(screen.getByText(/Từ khóa: "Avatar"/i)).toBeInTheDocument();
    expect(screen.getByText(/Thể loại: Khoa học viễn tưởng/i)).toBeInTheDocument();
    expect(screen.getByText(/Ngày: 2026-11-25/i)).toBeInTheDocument();

    // Verify reset filters button is visible
    expect(screen.getByRole('button', { name: /^xóa bộ lọc$/i })).toBeInTheDocument();
  });

  test('debounces search input by 400ms before updating search and API params', () => {
    useFetchModule.useFetch.mockReturnValue({
      data: { data: [], total: 0, pages: 1 },
      loading: false,
      error: null,
      refetch: mockRefetch,
    });

    render(
      <MemoryRouter initialEntries={['/movies']}>
        <Movies />
      </MemoryRouter>
    );

    const searchInput = screen.getByRole('textbox', { name: /tìm kiếm phim/i });

    // User types 'Oppenheimer'
    fireEvent.change(searchInput, { target: { value: 'Oppenheimer' } });
    expect(searchInput.value).toBe('Oppenheimer');

    // Before 400ms, useFetch has not been called with q='Oppenheimer'
    act(() => {
      jest.advanceTimersByTime(200);
    });

    const callsBefore400 = useFetchModule.useFetch.mock.calls;
    const hasCalledWithNewQ = callsBefore400.some(
      (call) => call[1]?.params?.q === 'Oppenheimer'
    );
    expect(hasCalledWithNewQ).toBe(false);

    // Advance past 400ms
    act(() => {
      jest.advanceTimersByTime(250);
    });

    // After 400ms debounce, useFetch should receive q='Oppenheimer'
    expect(useFetchModule.useFetch).toHaveBeenLastCalledWith(
      '/movies',
      expect.objectContaining({
        params: expect.objectContaining({
          q: 'Oppenheimer',
        }),
      })
    );
  });
});

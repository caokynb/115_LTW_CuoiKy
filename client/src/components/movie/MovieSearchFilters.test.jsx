import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBar } from './SearchBar';
import { GenreFilter } from './GenreFilter';
import { DateFilter } from './DateFilter';

describe('Movie Search & Filter Components', () => {
  describe('SearchBar Component', () => {
    test('renders input with placeholder and accessibility label', () => {
      render(<SearchBar value="" onChange={jest.fn()} placeholder="Tìm kiếm phim..." />);
      const input = screen.getByRole('textbox', { name: /tìm kiếm phim/i });
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('placeholder', 'Tìm kiếm phim...');
    });

    test('calls onChange when user types', () => {
      const handleChange = jest.fn();
      render(<SearchBar value="Avatar" onChange={handleChange} />);
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Dune' } });
      expect(handleChange).toHaveBeenCalledWith('Dune');
    });

    test('renders clear button when value is present and clears text on click', () => {
      const handleChange = jest.fn();
      render(<SearchBar value="Avatar" onChange={handleChange} />);
      const clearButton = screen.getByRole('button', { name: /xóa từ khóa/i });
      expect(clearButton).toBeInTheDocument();

      fireEvent.click(clearButton);
      expect(handleChange).toHaveBeenCalledWith('');
    });

    test('does not render clear button when value is empty', () => {
      render(<SearchBar value="" onChange={jest.fn()} />);
      expect(screen.queryByRole('button', { name: /xóa từ khóa/i })).not.toBeInTheDocument();
    });
  });

  describe('GenreFilter Component', () => {
    test('renders select with default genres and all-option', () => {
      render(<GenreFilter selectedGenre="" onSelectGenre={jest.fn()} />);
      const select = screen.getByRole('combobox', { name: /lọc theo thể loại/i });
      expect(select).toBeInTheDocument();
      expect(screen.getByText('Tất cả thể loại')).toBeInTheDocument();
      expect(screen.getByText('Hành động')).toBeInTheDocument();
    });

    test('triggers onSelectGenre when user selects a genre', () => {
      const handleSelect = jest.fn();
      render(<GenreFilter selectedGenre="" onSelectGenre={handleSelect} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Hành động' } });
      expect(handleSelect).toHaveBeenCalledWith('Hành động');
    });

    test('renders genre objects with movie count from API', () => {
      const apiGenres = [
        { genre: 'Hành động', count: 5 },
        { genre: 'Tài liệu', count: 1 },
      ];
      render(<GenreFilter selectedGenre="" onSelectGenre={jest.fn()} genres={apiGenres} />);
      expect(screen.getByText('Hành động (5)')).toBeInTheDocument();
      expect(screen.getByText('Tài liệu (1)')).toBeInTheDocument();
    });
  });

  describe('DateFilter Component', () => {
    test('renders date input with accessibility label', () => {
      render(<DateFilter selectedDate="" onSelectDate={jest.fn()} />);
      const input = screen.getByLabelText(/lọc theo ngày chiếu/i);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'date');
    });

    test('triggers onSelectDate when user selects a date', () => {
      const handleSelect = jest.fn();
      render(<DateFilter selectedDate="" onSelectDate={handleSelect} />);
      const input = screen.getByLabelText(/lọc theo ngày chiếu/i);
      fireEvent.change(input, { target: { value: '2026-12-25' } });
      expect(handleSelect).toHaveBeenCalledWith('2026-12-25');
    });

    test('renders clear button when date is selected and clears on click', () => {
      const handleSelect = jest.fn();
      render(<DateFilter selectedDate="2026-12-25" onSelectDate={handleSelect} />);
      const clearButton = screen.getByRole('button', { name: /xóa bộ lọc ngày/i });
      expect(clearButton).toBeInTheDocument();

      fireEvent.click(clearButton);
      expect(handleSelect).toHaveBeenCalledWith('');
    });
  });
});

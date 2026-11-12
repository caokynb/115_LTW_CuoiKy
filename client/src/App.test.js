import { render, screen } from '@testing-library/react';
import App from './App';

test('renders CineHub brand', () => {
  render(<App />);
  const brandElements = screen.getAllByText(/CineHub/i);
  expect(brandElements.length).toBeGreaterThan(0);
});

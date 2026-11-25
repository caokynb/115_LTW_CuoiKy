import React from 'react';
import { render, screen } from '@testing-library/react';
import { AgeRatingBadge, AGE_RATINGS, AGE_RATING_META } from './AgeRatingBadge';

describe('AgeRatingBadge Component (A17)', () => {
  test('hiển thị đúng tất cả 6 nhãn độ tuổi P, K, T13, T16, T18, C', () => {
    AGE_RATINGS.forEach((rating) => {
      const { unmount } = render(<AgeRatingBadge rating={rating} showDescription />);
      expect(screen.getByTestId(`age-rating-badge-${rating}`)).toBeInTheDocument();
      expect(screen.getByText(rating)).toBeInTheDocument();
      expect(screen.getByText(AGE_RATING_META[rating].title)).toBeInTheDocument();
      unmount();
    });
  });

  test('đánh dấu cảnh báo bắt buộc đối với T16, T18 và C', () => {
    expect(AGE_RATING_META.P.requiresWarning).toBe(false);
    expect(AGE_RATING_META.K.requiresWarning).toBe(false);
    expect(AGE_RATING_META.T13.requiresWarning).toBe(false);
    expect(AGE_RATING_META.T16.requiresWarning).toBe(true);
    expect(AGE_RATING_META.T18.requiresWarning).toBe(true);
    expect(AGE_RATING_META.C.requiresWarning).toBe(true);
  });
});

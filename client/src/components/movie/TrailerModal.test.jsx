import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { TrailerModal } from './TrailerModal';

describe('TrailerModal keyboard access', () => {
  test('traps focus while open and returns focus to the opener when closed', () => {
    const onClose = jest.fn();
    const { rerender } = render(
      <>
        <button type="button">Mở trailer</button>
        <TrailerModal isOpen={false} onClose={onClose} youtubeId="video-id" movieTitle="Phim mẫu" />
      </>
    );

    const opener = screen.getByRole('button', { name: 'Mở trailer' });
    opener.focus();
    rerender(
      <>
        <button type="button">Mở trailer</button>
        <TrailerModal isOpen onClose={onClose} youtubeId="video-id" movieTitle="Phim mẫu" />
      </>
    );

    const closeButton = screen.getByRole('button', { name: 'Đóng trailer' });
    const iframe = screen.getByTitle('Trailer phim Phim mẫu');
    expect(screen.getByRole('dialog', { name: 'Trailer: Phim mẫu' })).toBeInTheDocument();
    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(iframe).toHaveFocus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(closeButton).toHaveFocus();

    rerender(
      <>
        <button type="button">Mở trailer</button>
        <TrailerModal isOpen={false} onClose={onClose} youtubeId="video-id" movieTitle="Phim mẫu" />
      </>
    );
    expect(opener).toHaveFocus();
  });
});

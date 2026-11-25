import React from 'react';
import Seat from './Seat';

export function SeatRow({ rowLabel, seats = [], onSeatClick }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center gap-1.5 sm:gap-3 py-1"
      data-testid={`seat-row-${rowLabel}`}
    >
      {/* Left row indicator */}
      <span className="w-5 sm:w-7 shrink-0 text-center text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 select-none">
        {rowLabel}
      </span>

      {/* Row seats */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {seats.map((seat) => (
          <Seat
            key={`${seat.row}-${seat.number}`}
            row={seat.row}
            number={seat.number}
            type={seat.type}
            status={seat.status}
            price={seat.price}
            onClick={onSeatClick}
          />
        ))}
      </div>

      {/* Right row indicator for symmetry */}
      <span className="w-5 sm:w-7 shrink-0 text-center text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 select-none">
        {rowLabel}
      </span>
    </div>
  );
}

export default SeatRow;

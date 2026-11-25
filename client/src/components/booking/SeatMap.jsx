import React, { useMemo } from 'react';
import SeatRow from './SeatRow';
import SeatLegend from './SeatLegend';

export function SeatMap({
  rows = 8,
  seatsPerRow = 10,
  vipRows = [],
  soldSeats = [],
  heldSeats = [],
  selectedSeats = [],
  onSeatClick,
  standardPrice = 0,
  vipPrice = 0,
  className = '',
}) {
  const effectiveVipPrice = vipPrice || standardPrice;

  // Generate row labels (e.g. ['A', 'B', 'C', ...])
  const rowLabels = useMemo(() => {
    if (Array.isArray(rows)) {
      return rows;
    }
    const count = typeof rows === 'number' && rows > 0 ? rows : 8;
    return Array.from({ length: count }, (_, idx) => String.fromCharCode(65 + idx));
  }, [rows]);

  // Compute layout with seat items
  const computedRows = useMemo(() => {
    return rowLabels.map((rowLabel, rowIndex) => {
      const rowIndex1Based = rowIndex + 1;

      // Determine if row is VIP
      const isVipRow =
        Array.isArray(vipRows) &&
        vipRows.some((vip) => {
          if (typeof vip === 'number') return vip === rowIndex1Based;
          if (typeof vip === 'string') {
            return (
              vip.toUpperCase() === rowLabel.toUpperCase() ||
              vip === String(rowIndex1Based)
            );
          }
          return false;
        });

      const seatType = isVipRow ? 'vip' : 'standard';
      const price = isVipRow ? effectiveVipPrice : standardPrice;

      const seats = Array.from({ length: seatsPerRow }, (_, seatIdx) => {
        const seatNumber = seatIdx + 1;

        // Check if sold
        const isSold =
          Array.isArray(soldSeats) &&
          soldSeats.some((sold) => {
            const rowMatches =
              sold.row === rowLabel ||
              sold.row === rowIndex1Based ||
              String(sold.row).toUpperCase() === rowLabel.toUpperCase() ||
              String(sold.row) === String(rowIndex1Based);
            return rowMatches && Number(sold.number) === seatNumber;
          });

        // kiểm tra ghế có nằm trong danh sách đang được người khác giữ qua Socket.io không
        const isHeld =
          Array.isArray(heldSeats) &&
          heldSeats.some((held) => {
            const rowMatches =
              held.row === rowLabel ||
              held.row === rowIndex1Based ||
              String(held.row).toUpperCase() === rowLabel.toUpperCase() ||
              String(held.row) === String(rowIndex1Based);
            return rowMatches && Number(held.number) === seatNumber;
          });

        // Check if selected
        const isSelected =
          Array.isArray(selectedSeats) &&
          selectedSeats.some((selected) => {
            const rowMatches =
              selected.row === rowLabel ||
              selected.row === rowIndex1Based ||
              String(selected.row).toUpperCase() === rowLabel.toUpperCase() ||
              String(selected.row) === String(rowIndex1Based);
            return rowMatches && Number(selected.number) === seatNumber;
          });

        let status = 'available';
        if (isSold) {
          status = 'sold';
        } else if (isHeld) {
          status = 'held';
        } else if (isSelected) {
          status = 'selected';
        }

        return {
          row: rowLabel,
          number: seatNumber,
          type: seatType,
          status,
          price,
        };
      });

      return {
        label: rowLabel,
        seats,
      };
    });
  }, [
    rowLabels,
    seatsPerRow,
    vipRows,
    soldSeats,
    heldSeats,
    selectedSeats,
    standardPrice,
    effectiveVipPrice,
  ]);

  return (
    <div
      className={`w-full max-w-full min-w-0 overflow-x-hidden flex flex-col items-center select-none ${className}`}
      data-testid="seat-map"
    >
      {/* Screen Indicator */}
      <div
        className="w-full max-w-xl mb-6 sm:mb-8 flex flex-col items-center px-2"
        data-testid="screen-indicator"
      >
        <div className="w-4/5 h-2.5 bg-gradient-to-r from-transparent via-brand-500 to-transparent rounded-full shadow-lg shadow-brand-500/30" />
        <p className="mt-2 text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold">
          Màn hình
        </p>
      </div>

      {/* Responsive Horizontal Scroll Container for Mobile Viewports */}
      <div
        className="w-full max-w-full min-w-0 overflow-x-auto touch-pan-x pb-6 pt-2"
        data-testid="seat-map-scroll-container"
      >
        <div className="min-w-fit mx-auto px-2 sm:px-4 flex flex-col items-center gap-1.5 sm:gap-2">
          {computedRows.map((row) => (
            <SeatRow
              key={row.label}
              rowLabel={row.label}
              seats={row.seats}
              onSeatClick={onSeatClick}
            />
          ))}
        </div>
      </div>

      {/* Seat Legend */}
      <SeatLegend
        standardPrice={standardPrice}
        vipPrice={effectiveVipPrice}
        showHeldLegend={Array.isArray(heldSeats) && heldSeats.length > 0}
      />
    </div>
  );
}

export default SeatMap;

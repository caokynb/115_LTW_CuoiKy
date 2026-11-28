import React, { useId, useState } from 'react';

const formatCurrency = (value) => `${new Intl.NumberFormat('vi-VN').format(value || 0)} ₫`;

// rút gọn nhãn trục y cho biểu đồ gọn gàng, dễ đọc
const formatCompactCurrency = (value) => {
  const num = Number(value) || 0;
  if (num === 0) return '0';
  if (num >= 1_000_000_000) {
    const val = num / 1_000_000_000;
    return `${Number.isInteger(val) ? val : val.toFixed(1).replace('.', ',')}tỷ`;
  }
  if (num >= 1_000_000) {
    const val = num / 1_000_000;
    return `${Number.isInteger(val) ? val : val.toFixed(1).replace('.', ',')}tr`;
  }
  if (num >= 1_000) {
    const val = num / 1_000;
    return `${Number.isInteger(val) ? val : val.toFixed(1).replace('.', ',')}k`;
  }
  return String(num);
};

// tính ngưỡng trần chia hết đẹp cho 4 khoảng trục y
const getNiceMax = (rawMax) => {
  if (!rawMax || rawMax <= 0) return 100_000;
  const roughStep = rawMax / 4;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const fraction = roughStep / magnitude;

  let niceFraction = 10;
  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 1.25) niceFraction = 1.25;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 2.5) niceFraction = 2.5;
  else if (fraction <= 5) niceFraction = 5;

  return niceFraction * magnitude * 4;
};

// vẽ hình chữ nhật chỉ bo tròn 2 góc trên để chân cột bám khít trục hoành
const buildTopRoundedBarPath = (x, y, width, height, radius = 8) => {
  if (height <= 0) return `M ${x} ${y} L ${x + width} ${y}`;
  const r = Math.min(radius, width / 2, height);
  return [
    `M ${x} ${y + height}`,
    `L ${x} ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    `L ${x + width - r} ${y}`,
    `Q ${x + width} ${y} ${x + width} ${y + r}`,
    `L ${x + width} ${y + height}`,
    'Z',
  ].join(' ');
};

// tạo đường cong mượt có giới hạn biên để không vượt đáy trục 0
const buildSmoothLinePath = (points, plotBottom) => {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const midX = (p0.x + p1.x) / 2;
    const clampedY0 = Math.min(plotBottom, p0.y);
    const clampedY1 = Math.min(plotBottom, p1.y);
    path += ` C ${midX} ${clampedY0}, ${midX} ${clampedY1}, ${p1.x} ${clampedY1}`;
  }
  return path;
};

const truncateLabel = (label, maxLength = 16) => {
  const text = String(label || '');
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
};

export function RevenueChart({
  title,
  data = [],
  labelKey,
  type = 'bar',
  emptyMessage = 'Chưa có dữ liệu trong khoảng ngày này.',
}) {
  const rawId = useId();
  const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
  const barGradientId = `rev-bar-${safeId}`;
  const areaGradientId = `rev-area-${safeId}`;
  const glowFilterId = `rev-glow-${safeId}`;

  const [hoveredIndex, setHoveredIndex] = useState(null);

  const rawMax = Math.max(...data.map((item) => Number(item.totalRevenue) || 0), 0);
  const niceMax = getNiceMax(rawMax);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(niceMax * ratio));

  const chartHeight = 272;
  const padding = { top: 28, right: 24, bottom: 44, left: 56 };
  const minStepWidth = type === 'bar' ? 92 : 76;
  const chartWidth = Math.max(540, padding.left + padding.right + data.length * minStepWidth);
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;
  const plotBottom = padding.top + plotHeight;

  const getY = (value) => {
    const clamped = Math.max(0, Number(value) || 0);
    return plotBottom - (clamped / niceMax) * plotHeight;
  };

  const points = data.map((item, index) => {
    const slotWidth = plotWidth / Math.max(data.length, 1);
    // giữ khoảng lề nhẹ hai đầu cho biểu đồ đường khi có >= 2 điểm để nhãn không chạm trục
    const areaInset = data.length > 1 ? Math.min(36, plotWidth * 0.08) : 0;
    const areaX =
      data.length === 1
        ? padding.left + plotWidth / 2
        : padding.left + areaInset + ((plotWidth - areaInset * 2) * index) / (data.length - 1);

    const finalX = type === 'area' ? areaX : padding.left + slotWidth * index + slotWidth / 2;
    const value = Number(item.totalRevenue) || 0;
    const y = getY(value);

    return {
      index,
      item,
      label: item[labelKey],
      value,
      x: finalX,
      y,
      barHeight: Math.max(0, plotBottom - y),
    };
  });

  const barWidth = Math.min(44, Math.max(24, (plotWidth / Math.max(data.length, 1)) * 0.44));
  const activePoint = hoveredIndex !== null && points[hoveredIndex] ? points[hoveredIndex] : null;

  const linePath = type === 'area' && points.length >= 2 ? buildSmoothLinePath(points, plotBottom) : '';
  const areaPath =
    type === 'area' && points.length >= 2
      ? `${linePath} L ${points[points.length - 1].x} ${plotBottom} L ${points[0].x} ${plotBottom} Z`
      : '';

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-cinema-borderSubtle dark:bg-cinema-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-bold text-neutral-900 dark:text-white">{title}</h3>
        {data.length > 0 && (
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Trần trục: <span className="tabular-nums text-neutral-700 dark:text-neutral-200">{formatCompactCurrency(niceMax)}</span>
          </span>
        )}
      </div>

      {data.length === 0 ? (
        <div className="mt-6 flex h-56 items-center justify-center rounded-xl border border-dashed border-neutral-200 text-sm text-neutral-500 dark:border-cinema-borderSubtle dark:text-neutral-400">
          {emptyMessage}
        </div>
      ) : (
        <div className="relative mt-4 overflow-x-auto">
          <div className="relative min-w-[460px]">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="h-[260px] w-full select-none overflow-visible"
              role="img"
              aria-label={title}
            >
              <defs>
                <linearGradient id={barGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e11d48" />
                  <stop offset="55%" stopColor="#9f1239" />
                  <stop offset="100%" stopColor="#580b1f" />
                </linearGradient>

                <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e11d48" stopOpacity="0.34" />
                  <stop offset="85%" stopColor="#881326" stopOpacity="0.06" />
                  <stop offset="100%" stopColor="#881326" stopOpacity="0" />
                </linearGradient>

                <filter id={glowFilterId} x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Đường lưới ngang và nhãn trục Y */}
              {ticks.map((tickValue, tickIdx) => {
                const y = getY(tickValue);
                const isBaseLine = tickIdx === 0;
                return (
                  <g key={tickValue}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={chartWidth - padding.right}
                      y2={y}
                      stroke="currentColor"
                      strokeWidth={isBaseLine ? 1.25 : 1}
                      strokeDasharray={isBaseLine ? undefined : '4 4'}
                      className={
                        isBaseLine
                          ? 'text-neutral-300 dark:text-white/20'
                          : 'text-neutral-200 dark:text-white/10'
                      }
                    />
                    <text
                      x={padding.left - 10}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-neutral-500 text-[11px] font-medium tabular-nums dark:fill-neutral-400"
                    >
                      {formatCompactCurrency(tickValue)}
                    </text>
                  </g>
                );
              })}

              {/* Đường trục Y bên trái */}
              <line
                x1={padding.left}
                y1={padding.top}
                x2={padding.left}
                y2={plotBottom}
                stroke="currentColor"
                strokeWidth={1.25}
                className="text-neutral-300 dark:text-white/20"
              />

              {/* Biểu đồ miền / đường (Doanh thu theo ngày) */}
              {type === 'area' && (
                <g>
                  {points.length >= 2 && (
                    <>
                      <path d={areaPath} fill={`url(#${areaGradientId})`} />
                      <path
                        d={linePath}
                        fill="none"
                        stroke="#e11d48"
                        strokeWidth={2.75}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </>
                  )}

                  {points.map((pt) => {
                    const isActive = hoveredIndex === pt.index;
                    return (
                      <g
                        key={`${pt.label}-${pt.index}`}
                        className="cursor-pointer outline-none"
                        tabIndex={0}
                        aria-label={`${pt.label}: ${formatCurrency(pt.value)}`}
                        onMouseEnter={() => setHoveredIndex(pt.index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        onFocus={() => setHoveredIndex(pt.index)}
                        onBlur={() => setHoveredIndex(null)}
                      >
                        {/* vùng nhận hover rộng giúp rê chuột dễ dàng */}
                        <rect
                          x={pt.x - 28}
                          y={padding.top}
                          width={56}
                          height={plotHeight + 28}
                          fill="transparent"
                        />

                        {(points.length === 1 || isActive) && (
                          <line
                            x1={pt.x}
                            y1={pt.y}
                            x2={pt.x}
                            y2={plotBottom}
                            stroke="#e11d48"
                            strokeWidth={1.5}
                            strokeDasharray="4 4"
                            strokeOpacity={isActive ? 0.8 : 0.45}
                          />
                        )}

                        {points.length === 1 && (
                          <circle cx={pt.x} cy={pt.y} r={16} fill="#e11d48" fillOpacity={0.14} />
                        )}

                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isActive ? 6.5 : 5}
                          filter={isActive || points.length === 1 ? `url(#${glowFilterId})` : undefined}
                          className="fill-rose-600 stroke-white stroke-[2.5] transition-all duration-150 dark:stroke-cinema-card"
                        />

                        <text
                          x={pt.x}
                          y={Math.max(padding.top - 8, pt.y - 12)}
                          textAnchor="middle"
                          className={`text-[11px] font-semibold tabular-nums transition-colors ${
                            isActive
                              ? 'fill-rose-600 dark:fill-rose-400'
                              : 'fill-neutral-700 dark:fill-neutral-200'
                          }`}
                        >
                          {formatCurrency(pt.value)}
                        </text>

                        <text
                          x={pt.x}
                          y={plotBottom + 22}
                          textAnchor="middle"
                          className="fill-neutral-600 text-[11px] font-medium dark:fill-neutral-300"
                        >
                          {truncateLabel(pt.label, 14)}
                        </text>
                      </g>
                    );
                  })}
                </g>
              )}

              {/* Biểu đồ cột gradient (Doanh thu theo phim) */}
              {type === 'bar' &&
                points.map((pt) => {
                  const isActive = hoveredIndex === pt.index;
                  const barX = pt.x - barWidth / 2;
                  const slotWidth = plotWidth / Math.max(data.length, 1);

                  return (
                    <g
                      key={`${pt.label}-${pt.index}`}
                      className="cursor-pointer outline-none"
                      tabIndex={0}
                      aria-label={`${pt.label}: ${formatCurrency(pt.value)}`}
                      onMouseEnter={() => setHoveredIndex(pt.index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      onFocus={() => setHoveredIndex(pt.index)}
                      onBlur={() => setHoveredIndex(null)}
                    >
                      <rect
                        x={pt.x - slotWidth / 2}
                        y={padding.top}
                        width={slotWidth}
                        height={plotHeight + 28}
                        fill="transparent"
                      />

                      <path
                        d={buildTopRoundedBarPath(barX, pt.y, barWidth, pt.barHeight, 8)}
                        fill={`url(#${barGradientId})`}
                        opacity={hoveredIndex === null || isActive ? 1 : 0.72}
                        className="transition-opacity duration-150"
                      />

                      {isActive && pt.barHeight > 0 && (
                        <path
                          d={buildTopRoundedBarPath(barX, pt.y, barWidth, pt.barHeight, 8)}
                          fill="none"
                          stroke="#fb7185"
                          strokeWidth={1.5}
                        />
                      )}

                      <text
                        x={pt.x}
                        y={Math.max(padding.top - 8, pt.y - 8)}
                        textAnchor="middle"
                        className={`text-[11px] font-semibold tabular-nums transition-colors ${
                          isActive
                            ? 'fill-rose-600 dark:fill-rose-400'
                            : 'fill-neutral-700 dark:fill-neutral-200'
                        }`}
                      >
                        {formatCurrency(pt.value)}
                      </text>

                      <text
                        x={pt.x}
                        y={plotBottom + 22}
                        textAnchor="middle"
                        className="fill-neutral-600 text-[11px] font-medium dark:fill-neutral-300"
                      >
                        {truncateLabel(pt.label, 16)}
                      </text>
                    </g>
                  );
                })}
            </svg>

            {/* Tooltip chi tiết khi di chuột hoặc focus */}
            {activePoint && (
              <div
                role="status"
                style={{
                  left: `${Math.min(82, Math.max(18, (activePoint.x / chartWidth) * 100))}%`,
                  top: `${Math.max(8, ((activePoint.y - 12) / chartHeight) * 100)}%`,
                }}
                className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl border border-neutral-200 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm dark:border-cinema-border dark:bg-cinema-elevated/95"
              >
                <p className="font-semibold text-neutral-900 dark:text-white">{activePoint.label}</p>
                <p className="mt-0.5 font-bold tabular-nums text-rose-600 dark:text-rose-400">
                  {formatCurrency(activePoint.value)}
                </p>
                {typeof activePoint.item.ticketCount === 'number' && (
                  <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                    Số vé bán: <span className="font-semibold text-neutral-700 dark:text-neutral-200">{activePoint.item.ticketCount} vé</span>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default RevenueChart;

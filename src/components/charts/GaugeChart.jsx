/**
 * Gauge Chart Component
 * Circular gauge/speedometer for displaying metrics like completion rate
 */
import React from 'react';

const GaugeChart = ({
  value = 0,
  min = 0,
  max = 100,
  title = 'Metric',
  unit = '%',
  thresholds = {
    low: 33,
    medium: 66,
    high: 100
  },
  size = 200
}) => {
  // Ensure value is within bounds
  const normalizedValue = Math.max(min, Math.min(max, value));

  // Calculate percentage
  const percentage = ((normalizedValue - min) / (max - min)) * 100;

  // Determine color based on thresholds
  const getColor = () => {
    if (percentage < thresholds.low) return '#ef4444'; // Red
    if (percentage < thresholds.medium) return '#f59e0b'; // Amber
    return '#10b981'; // Green
  };

  const color = getColor();

  // SVG parameters
  const radius = size / 2 - 20;
  const centerX = size / 2;
  const centerY = size / 2;
  const strokeWidth = 20;

  // Calculate arc path
  const startAngle = -135; // -135 degrees (bottom left)
  const endAngle = 135; // 135 degrees (bottom right)
  const angleRange = endAngle - startAngle;

  // Convert angle to radians
  const toRadians = (angle) => (angle * Math.PI) / 180;

  // Calculate arc path
  const describeArc = (startAngle, endAngle) => {
    const start = polarToCartesian(centerX, centerY, radius, endAngle);
    const end = polarToCartesian(centerX, centerY, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

    return [
      'M', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(' ');
  };

  const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = toRadians(angleInDegrees);
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians)
    };
  };

  // Calculate value arc
  const valueAngle = startAngle + (angleRange * percentage) / 100;
  const backgroundArc = describeArc(startAngle, endAngle);
  const valueArc = describeArc(startAngle, valueAngle);

  // Tick marks
  const ticks = [0, 25, 50, 75, 100];

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background arc */}
        <path
          d={backgroundArc}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Value arc */}
        <path
          d={valueArc}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          style={{
            transition: 'all 1s ease-in-out'
          }}
        />

        {/* Tick marks */}
        {ticks.map((tick) => {
          const tickAngle = startAngle + (angleRange * tick) / 100;
          const inner = polarToCartesian(centerX, centerY, radius - strokeWidth / 2 - 5, tickAngle);
          const outer = polarToCartesian(centerX, centerY, radius - strokeWidth / 2 + 5, tickAngle);

          return (
            <g key={tick}>
              <line
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke="#9ca3af"
                strokeWidth="2"
              />
              {/* Tick labels */}
              <text
                x={polarToCartesian(centerX, centerY, radius + 15, tickAngle).x}
                y={polarToCartesian(centerX, centerY, radius + 15, tickAngle).y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="10"
                fill="#6b7280"
              >
                {Math.round((tick * (max - min)) / 100 + min)}
              </text>
            </g>
          );
        })}

        {/* Center value display */}
        <text
          x={centerX}
          y={centerY - 10}
          textAnchor="middle"
          fontSize="32"
          fontWeight="bold"
          fill={color}
        >
          {normalizedValue.toFixed(0)}{unit}
        </text>

        {/* Title */}
        <text
          x={centerX}
          y={centerY + 20}
          textAnchor="middle"
          fontSize="14"
          fill="#6b7280"
        >
          {title}
        </text>
      </svg>

      {/* Status indicator */}
      <div className="mt-4 flex items-center space-x-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-sm font-medium text-gray-700">
          {percentage < thresholds.low ? 'Needs Improvement' :
           percentage < thresholds.medium ? 'Good' :
           'Excellent'}
        </span>
      </div>
    </div>
  );
};

export default GaugeChart;

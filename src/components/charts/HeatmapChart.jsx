/**
 * Heatmap Chart Component
 * Custom heatmap showing day-of-week × hour-of-day patterns
 */
import React from 'react';

const HeatmapChart = ({
  data = [],
  height = 400,
  metric = 'avg_orders'
}) => {
  // Days of week
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Hours of day (business hours: 11 AM - 11 PM)
  const hours = Array.from({ length: 13 }, (_, i) => i + 11); // 11-23

  // Get color based on value (gradient from light to dark)
  const getColor = (value, min, max) => {
    if (value === 0 || value === null) return '#f3f4f6';

    const normalized = (value - min) / (max - min || 1);

    // Color gradient: light blue -> dark blue
    const intensity = Math.floor(normalized * 5);
    const colors = [
      '#dbeafe', // Very light blue
      '#bfdbfe', // Light blue
      '#93c5fd', // Medium light blue
      '#60a5fa', // Medium blue
      '#3b82f6', // Blue
      '#2563eb'  // Dark blue
    ];

    return colors[Math.min(intensity, colors.length - 1)];
  };

  // Find min and max values for color scaling
  const values = data.map(d => d[metric]).filter(v => v !== null && v !== undefined);
  const minValue = Math.min(...values, 0);
  const maxValue = Math.max(...values, 1);

  // Get value for specific day and hour
  const getValue = (day, hour) => {
    const item = data.find(d => d.day === day && d.hour === hour);
    return item ? item[metric] : null;
  };

  // Format value for display
  const formatValue = (value) => {
    if (value === null || value === undefined) return '-';
    if (metric.includes('revenue')) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0
      }).format(value);
    }
    return value.toFixed(1);
  };

  // Format hour for display (12-hour format)
  const formatHour = (hour) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };

  const cellSize = 60;
  const cellPadding = 2;

  return (
    <div className="overflow-x-auto" style={{ height }}>
      <div className="inline-block min-w-full">
        {/* Legend */}
        <div className="mb-4 flex items-center justify-center space-x-2">
          <span className="text-sm text-gray-600">Low</span>
          <div className="flex space-x-1">
            {['#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb'].map((color, i) => (
              <div
                key={i}
                className="w-8 h-4"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <span className="text-sm text-gray-600">High</span>
        </div>

        {/* Heatmap */}
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-sm font-medium text-gray-700"></th>
              {hours.map(hour => (
                <th
                  key={hour}
                  className="p-1 text-xs font-medium text-gray-600 text-center"
                  style={{ width: cellSize }}
                >
                  {formatHour(hour)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day, dayIndex) => (
              <tr key={day}>
                <td className="p-2 text-sm font-medium text-gray-700 text-right pr-4">
                  {day}
                </td>
                {hours.map((hour, hourIndex) => {
                  const value = getValue(dayIndex, hour);
                  const color = getColor(value, minValue, maxValue);

                  return (
                    <td
                      key={`${day}-${hour}`}
                      className="relative group"
                      style={{ padding: cellPadding }}
                    >
                      <div
                        className="flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-md cursor-pointer"
                        style={{
                          backgroundColor: color,
                          width: cellSize - cellPadding * 2,
                          height: cellSize - cellPadding * 2,
                          borderRadius: '4px'
                        }}
                      >
                        <span className="text-xs font-medium text-gray-700">
                          {value !== null ? formatValue(value) : '-'}
                        </span>

                        {/* Tooltip on hover */}
                        {value !== null && (
                          <div className="absolute z-10 invisible group-hover:visible bg-gray-900 text-white text-xs rounded py-2 px-3 -top-12 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                            <div className="font-semibold">{day} at {formatHour(hour)}</div>
                            <div>{formatValue(value)} {metric.replace('_', ' ')}</div>
                            {/* Arrow */}
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                              <div className="border-4 border-transparent border-t-gray-900"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HeatmapChart;

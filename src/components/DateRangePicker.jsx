/**
 * Date Range Picker Component
 * Comprehensive date range selector with presets and custom range
 */
import React, { useState } from 'react';

const DateRangePicker = ({
  startDate,
  endDate,
  onDateChange,
  showComparison = false,
  onComparisonToggle
}) => {
  const [isCustom, setIsCustom] = useState(false);

  // Preset date ranges
  const presets = [
    { label: 'Today', days: 0 },
    { label: 'Yesterday', days: 1 },
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 90 days', days: 90 },
    { label: 'Last 6 months', days: 180 },
    { label: 'Last year', days: 365 }
  ];

  // Calculate date range from preset
  const calculateDateRange = (days) => {
    const end = new Date();
    const start = new Date();

    if (days === 0) {
      // Today
      return {
        start: formatDate(start),
        end: formatDate(end)
      };
    } else if (days === 1) {
      // Yesterday
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      return {
        start: formatDate(start),
        end: formatDate(end)
      };
    } else {
      // Last N days
      start.setDate(start.getDate() - days + 1);
      return {
        start: formatDate(start),
        end: formatDate(end)
      };
    }
  };

  // Format date to YYYY-MM-DD
  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  // Handle preset selection
  const handlePresetClick = (days) => {
    setIsCustom(false);
    const { start, end } = calculateDateRange(days);
    onDateChange(start, end);
  };

  // Handle custom date change
  const handleCustomDateChange = (type, value) => {
    if (type === 'start') {
      onDateChange(value, endDate);
    } else {
      onDateChange(startDate, value);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Preset buttons */}
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => {
            const { start, end } = calculateDateRange(preset.days);
            const isActive = !isCustom && start === startDate && end === endDate;

            return (
              <button
                key={preset.label}
                onClick={() => handlePresetClick(preset.days)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {preset.label}
              </button>
            );
          })}

          {/* Custom range button */}
          <button
            onClick={() => setIsCustom(!isCustom)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              isCustom
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Custom Range
          </button>
        </div>

        {/* Comparison toggle */}
        {showComparison !== undefined && (
          <div className="flex items-center ml-auto">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showComparison}
                onChange={(e) => onComparisonToggle?.(e.target.checked)}
                className="mr-2 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Compare with previous period</span>
            </label>
          </div>
        )}
      </div>

      {/* Custom date inputs */}
      {isCustom && (
        <div className="mt-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">From:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleCustomDateChange('start', e.target.value)}
              max={endDate}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">To:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleCustomDateChange('end', e.target.value)}
              min={startDate}
              max={formatDate(new Date())}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;

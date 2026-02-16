/**
 * Period Selector Component
 * Selector for ML prediction periods with data requirement indicators
 */
import React from 'react';

const PeriodSelector = ({
  selectedPeriod = '2_weeks',
  onPeriodChange,
  availableDays = 0,
  disabled = false
}) => {
  // Period configuration with requirements
  const periods = [
    {
      value: '1_week',
      label: '1 Week',
      days: 7,
      minDays: 60,
      description: '7-day forecast for weekly planning'
    },
    {
      value: '2_weeks',
      label: '2 Weeks',
      days: 14,
      minDays: 90,
      description: '14-day forecast for operational planning'
    },
    {
      value: '1_month',
      label: '1 Month',
      days: 30,
      minDays: 120,
      description: '30-day forecast for inventory planning'
    },
    {
      value: '3_months',
      label: '3 Months',
      days: 90,
      minDays: 180,
      description: '90-day forecast for quarterly planning'
    },
    {
      value: '6_months',
      label: '6 Months',
      days: 180,
      minDays: 365,
      description: '180-day forecast for strategic planning'
    },
    {
      value: '12_months',
      label: '12 Months',
      days: 365,
      minDays: 730,
      description: '365-day forecast for annual planning'
    }
  ];

  // Check if period is available based on historical data
  const isPeriodAvailable = (period) => {
    return availableDays >= period.minDays;
  };

  // Get status badge for period
  const getStatusBadge = (period) => {
    if (availableDays === 0) return null;

    const isAvailable = isPeriodAvailable(period);
    const daysShort = period.minDays - availableDays;

    if (isAvailable) {
      return (
        <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
          Available
        </span>
      );
    } else {
      return (
        <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
          Need {daysShort} more days
        </span>
      );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Prediction Period</h3>
        <p className="text-sm text-gray-600 mt-1">
          Select forecast period for demand predictions
        </p>
        {availableDays > 0 && (
          <p className="text-sm text-gray-500 mt-1">
            Available data: <span className="font-medium">{availableDays} days</span> of order history
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {periods.map((period) => {
          const isAvailable = isPeriodAvailable(period);
          const isSelected = selectedPeriod === period.value;
          const isDisabled = disabled || (availableDays > 0 && !isAvailable);

          return (
            <button
              key={period.value}
              onClick={() => !isDisabled && onPeriodChange(period.value)}
              disabled={isDisabled}
              className={`
                relative p-4 rounded-lg border-2 text-left transition-all
                ${isSelected
                  ? 'border-blue-600 bg-blue-50'
                  : isDisabled
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                }
              `}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className={`font-semibold ${
                    isSelected ? 'text-blue-700' : 'text-gray-900'
                  }`}>
                    {period.label}
                  </h4>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {period.days} days ahead
                  </p>
                </div>

                {/* Selection indicator */}
                {isSelected && (
                  <div className="flex-shrink-0">
                    <svg
                      className="w-6 h-6 text-blue-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-500 mb-2">
                {period.description}
              </p>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  Requires {period.minDays} days data
                </span>
                {getStatusBadge(period)}
              </div>

              {/* Disabled overlay message */}
              {isDisabled && availableDays > 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 rounded-lg">
                  <p className="text-sm font-medium text-gray-600">
                    Insufficient data
                  </p>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Info message */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              Longer prediction periods require more historical data for accurate forecasts.
              First-time predictions may take 10-90 seconds to train the ML model.
              Subsequent requests will be served from cache (under 100ms).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PeriodSelector;

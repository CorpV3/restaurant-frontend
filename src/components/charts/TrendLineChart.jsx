/**
 * Trend Line Chart Component
 * Line chart with trend analysis and confidence bands
 */
import React from 'react';
import {
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

const TrendLineChart = ({
  data = [],
  dataKey = 'value',
  name = 'Trend',
  showConfidenceBands = false,
  showTrendLine = true,
  height = 400,
  color = '#3b82f6'
}) => {
  // Calculate simple moving average for trend line
  const calculateMovingAverage = (data, window = 3) => {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      if (i < window - 1) {
        result.push(null);
      } else {
        const sum = data.slice(i - window + 1, i + 1)
          .reduce((acc, item) => acc + (item[dataKey] || 0), 0);
        result.push(sum / window);
      }
    }
    return result;
  };

  // Enhance data with moving average
  const enhancedData = showTrendLine
    ? data.map((item, index) => ({
        ...item,
        trend: calculateMovingAverage(data, 3)[index]
      }))
    : data;

  // Format value based on data type
  const formatValue = (value) => {
    if (dataKey.includes('revenue') || dataKey.includes('price')) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0
      }).format(value);
    }
    return value?.toLocaleString() || '0';
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded shadow-lg">
          <p className="font-semibold text-gray-800 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatValue(entry.value)}
            </p>
          ))}
          {payload[0]?.payload?.growth_rate !== undefined && (
            <p className={`text-sm font-medium mt-1 ${
              payload[0].payload.growth_rate > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              Growth: {payload[0].payload.growth_rate > 0 ? '+' : ''}
              {payload[0].payload.growth_rate?.toFixed(1)}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Calculate average for reference line
  const average = data.reduce((sum, item) => sum + (item[dataKey] || 0), 0) / (data.length || 1);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={enhancedData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis
          dataKey="period"
          tick={{ fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={formatValue}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ paddingTop: '20px' }}
        />

        {/* Average reference line */}
        <ReferenceLine
          y={average}
          stroke="#94a3b8"
          strokeDasharray="5 5"
          label={{ value: 'Average', position: 'right', fill: '#64748b', fontSize: 12 }}
        />

        {/* Confidence bands (if available) */}
        {showConfidenceBands && (
          <Area
            type="monotone"
            dataKey="confidence_upper"
            stroke="none"
            fill={color}
            fillOpacity={0.1}
          />
        )}

        {/* Main trend line */}
        <Line
          type="monotone"
          dataKey={dataKey}
          name={name}
          stroke={color}
          strokeWidth={3}
          dot={{ r: 5, fill: color }}
          activeDot={{ r: 7 }}
        />

        {/* Trend line (moving average) */}
        {showTrendLine && (
          <Line
            type="monotone"
            dataKey="trend"
            name="Trend"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default TrendLineChart;

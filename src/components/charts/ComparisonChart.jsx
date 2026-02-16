/**
 * Comparison Chart Component
 * Side-by-side comparison bars for current vs previous periods
 */
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

const ComparisonChart = ({
  currentData = {},
  previousData = {},
  metrics = ['revenue', 'orders', 'avg_order_value'],
  height = 400
}) => {
  // Prepare comparison data
  const comparisonData = metrics.map(metric => {
    const currentValue = currentData[`current_${metric}`] || 0;
    const previousValue = previousData[`previous_${metric}`] || currentData[`previous_${metric}`] || 0;
    const growth = previousValue > 0
      ? ((currentValue - previousValue) / previousValue) * 100
      : 0;

    return {
      metric: formatMetricName(metric),
      current: currentValue,
      previous: previousValue,
      growth: growth
    };
  });

  // Format metric name for display
  function formatMetricName(metric) {
    return metric
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  // Format value based on metric type
  const formatValue = (value, metric) => {
    if (metric.toLowerCase().includes('revenue') || metric.toLowerCase().includes('value')) {
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
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded shadow-lg">
          <p className="font-semibold text-gray-800 mb-2">{label}</p>
          <div className="space-y-1">
            {payload.map((entry, index) => (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {entry.name}: {formatValue(entry.value, label)}
              </p>
            ))}
            <p className={`text-sm font-medium mt-2 ${
              data.growth > 0 ? 'text-green-600' : data.growth < 0 ? 'text-red-600' : 'text-gray-600'
            }`}>
              Growth: {data.growth > 0 ? '+' : ''}{data.growth.toFixed(1)}%
              {data.growth > 0 ? ' ↑' : data.growth < 0 ? ' ↓' : ' →'}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom label showing growth percentage
  const renderCustomLabel = (props) => {
    const { x, y, width, value, index } = props;
    const data = comparisonData[index];

    if (!data || data.growth === 0) return null;

    return (
      <g>
        <text
          x={x + width / 2}
          y={y - 10}
          fill={data.growth > 0 ? '#10b981' : '#ef4444'}
          textAnchor="middle"
          fontSize="12"
          fontWeight="600"
        >
          {data.growth > 0 ? '+' : ''}{data.growth.toFixed(1)}%
        </text>
      </g>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={comparisonData} margin={{ top: 30, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis
          dataKey="metric"
          tick={{ fontSize: 12 }}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => formatValue(value, 'revenue')}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ paddingTop: '20px' }}
        />
        <Bar
          dataKey="previous"
          name="Previous Period"
          fill="#94a3b8"
          radius={[8, 8, 0, 0]}
        />
        <Bar
          dataKey="current"
          name="Current Period"
          fill="#3b82f6"
          radius={[8, 8, 0, 0]}
          label={renderCustomLabel}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default ComparisonChart;

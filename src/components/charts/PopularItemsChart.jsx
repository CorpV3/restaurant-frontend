/**
 * Popular Items Chart Component
 * Horizontal bar chart for displaying top-selling menu items
 */
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
  Legend
} from 'recharts';

const PopularItemsChart = ({
  data = [],
  rankBy = 'quantity_sold',
  height = 400,
  maxItems = 10
}) => {
  // Color palette for bars
  const COLORS = [
    '#3b82f6', // Blue - Top 1
    '#8b5cf6', // Purple - Top 2
    '#ec4899', // Pink - Top 3
    '#f59e0b', // Amber - Top 4-5
    '#f59e0b',
    '#10b981', // Green - Rest
    '#10b981',
    '#10b981',
    '#10b981',
    '#10b981'
  ];

  // Get color based on rank
  const getColor = (index) => {
    return COLORS[Math.min(index, COLORS.length - 1)];
  };

  // Format value based on ranking metric
  const formatValue = (value) => {
    if (rankBy === 'revenue') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0
      }).format(value);
    }
    return value.toLocaleString();
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded shadow-lg max-w-xs">
          <p className="font-semibold text-gray-800 mb-2">{data.item_name}</p>
          <div className="space-y-1 text-sm">
            <p className="text-gray-600">
              Quantity Sold: <span className="font-medium">{data.quantity_sold}</span>
            </p>
            <p className="text-gray-600">
              Revenue: <span className="font-medium">{formatValue(data.revenue)}</span>
            </p>
            <p className="text-gray-600">
              Orders: <span className="font-medium">{data.order_count}</span>
            </p>
            {data.trend && (
              <p className={`font-medium ${
                data.trend === 'up' ? 'text-green-600' :
                data.trend === 'down' ? 'text-red-600' :
                'text-gray-600'
              }`}>
                Trend: {data.trend === 'up' ? '↑' : data.trend === 'down' ? '↓' : '→'}
                {data.trend_percentage && ` ${Math.abs(data.trend_percentage)}%`}
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Truncate long item names
  const truncateName = (name, maxLength = 20) => {
    return name.length > maxLength ? name.substring(0, maxLength) + '...' : name;
  };

  // Prepare data with truncated names for Y-axis
  const chartData = data.slice(0, maxItems).map(item => ({
    ...item,
    displayName: truncateName(item.item_name, 25)
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 20, right: 30, left: 150, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis
          type="number"
          tick={{ fontSize: 12 }}
          tickFormatter={formatValue}
        />
        <YAxis
          type="category"
          dataKey="displayName"
          tick={{ fontSize: 11 }}
          width={140}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey={rankBy} radius={[0, 8, 8, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getColor(index)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default PopularItemsChart;

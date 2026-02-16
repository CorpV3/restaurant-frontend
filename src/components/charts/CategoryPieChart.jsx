/**
 * Category Pie Chart Component
 * Interactive pie/donut chart for category distribution
 */
import React, { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const CategoryPieChart = ({
  data = [],
  height = 400,
  innerRadius = 0,
  outerRadius = 120
}) => {
  const [activeIndex, setActiveIndex] = useState(null);

  // Color palette for categories
  const COLORS = {
    appetizer: '#f59e0b',
    main_course: '#3b82f6',
    dessert: '#ec4899',
    beverage: '#8b5cf6',
    side_dish: '#10b981',
    special: '#ef4444'
  };

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };

  // Calculate percentage
  const calculatePercentage = (value, total) => {
    return ((value / total) * 100).toFixed(1);
  };

  // Get total revenue
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);

  // Prepare chart data with percentages
  const chartData = data.map(item => ({
    ...item,
    percentage: calculatePercentage(item.revenue, totalRevenue)
  }));

  // Custom label for pie slices
  const renderLabel = (entry) => {
    return `${entry.percentage}%`;
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded shadow-lg">
          <p className="font-semibold text-gray-800 mb-2 capitalize">
            {data.category.replace('_', ' ')}
          </p>
          <div className="space-y-1 text-sm">
            <p className="text-gray-600">
              Revenue: <span className="font-medium">{formatCurrency(data.revenue)}</span>
            </p>
            <p className="text-gray-600">
              Orders: <span className="font-medium">{data.order_count}</span>
            </p>
            <p className="text-gray-600">
              Avg Price: <span className="font-medium">{formatCurrency(data.avg_price)}</span>
            </p>
            <p className="text-gray-600">
              Share: <span className="font-medium">{data.percentage}%</span>
            </p>
            {data.growth_percentage !== null && (
              <p className={`font-medium ${
                data.growth_percentage > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                Growth: {data.growth_percentage > 0 ? '+' : ''}{data.growth_percentage}%
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Mouse enter handler for hover effect
  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  // Custom legend formatter
  const renderLegend = (value, entry) => {
    const categoryName = value.replace('_', ' ');
    return (
      <span className="capitalize text-sm">
        {categoryName}
      </span>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderLabel}
          outerRadius={outerRadius}
          innerRadius={innerRadius}
          fill="#8884d8"
          dataKey="revenue"
          nameKey="category"
          onMouseEnter={onPieEnter}
          onMouseLeave={onPieLeave}
          animationBegin={0}
          animationDuration={800}
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[entry.category] || '#94a3b8'}
              opacity={activeIndex === null || activeIndex === index ? 1 : 0.6}
              stroke={activeIndex === index ? '#1f2937' : 'none'}
              strokeWidth={activeIndex === index ? 2 : 0}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          verticalAlign="bottom"
          height={36}
          formatter={renderLegend}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default CategoryPieChart;

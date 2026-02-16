import React, { useState, useEffect } from 'react';
import { FaClock } from 'react-icons/fa';

/**
 * Countdown timer showing elapsed time since order was received
 * Updates every second
 */
const OrderTimer = ({ createdAt, className = '' }) => {
  const [elapsedTime, setElapsedTime] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const orderTime = new Date(createdAt);
      const now = new Date();
      const diffMs = now - orderTime;

      // Calculate elapsed time
      const seconds = Math.floor(diffMs / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);

      const displaySeconds = seconds % 60;
      const displayMinutes = minutes % 60;

      let timeString = '';
      if (hours > 0) {
        timeString = `${hours}h ${displayMinutes}m`;
      } else if (minutes > 0) {
        timeString = `${displayMinutes}m ${displaySeconds}s`;
      } else {
        timeString = `${displaySeconds}s`;
      }

      setElapsedTime(timeString);

      // Mark as urgent if over 15 minutes
      setIsUrgent(minutes >= 15);
    };

    // Initial update
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [createdAt]);

  if (!createdAt) return null;

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <FaClock className={`${isUrgent ? 'text-red-500 animate-pulse' : 'text-gray-500'}`} />
      <span className={`font-mono font-semibold ${isUrgent ? 'text-red-600' : 'text-gray-700'}`}>
        {elapsedTime}
      </span>
    </div>
  );
};

export default OrderTimer;

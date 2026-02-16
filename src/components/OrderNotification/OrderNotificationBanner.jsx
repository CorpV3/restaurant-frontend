import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUber, FaTimes } from 'react-icons/fa';
import { MdDeliveryDining } from 'react-icons/md';

/**
 * Popup notification banner for new orders
 * Displays prominently at top of screen with animation
 */
const OrderNotificationBanner = ({ order, onClose, autoCloseDuration = 10000 }) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (autoCloseDuration && autoCloseDuration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, autoCloseDuration);

      return () => clearTimeout(timer);
    }
  }, [autoCloseDuration]);

  const handleClose = () => {
    setShow(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 300); // Wait for animation to complete
  };

  if (!order) return null;

  const getOrderTypeIcon = () => {
    if (order.order_type === 'UBER') {
      return <FaUber className="text-2xl" />;
    }
    return <MdDeliveryDining className="text-2xl" />;
  };

  const getOrderTypeLabel = () => {
    if (order.order_type === 'UBER') return 'Uber Eats';
    if (order.order_type === 'DELIVERY') return 'Delivery';
    return 'Online Order';
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl px-4"
        >
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg shadow-2xl border-2 border-white overflow-hidden">
            {/* Progress bar */}
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: autoCloseDuration / 1000, ease: 'linear' }}
              className="h-1 bg-white/30"
            />

            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  {/* Icon */}
                  <div className="flex-shrink-0 bg-white/20 p-3 rounded-full">
                    {getOrderTypeIcon()}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-xl font-bold">New Order Received!</h3>
                      <span className="px-2 py-1 bg-white/20 rounded-full text-xs font-semibold">
                        {getOrderTypeLabel()}
                      </span>
                    </div>

                    <div className="space-y-1 text-sm">
                      <p className="font-semibold">Order #{order.order_number}</p>
                      <p>Customer: {order.customer_name || 'N/A'}</p>
                      {order.total && (
                        <p className="text-lg font-bold">${parseFloat(order.total).toFixed(2)}</p>
                      )}
                    </div>

                    {/* Delivery address for Uber orders */}
                    {order.delivery_address && (
                      <div className="mt-2 p-2 bg-white/10 rounded text-xs">
                        <p className="font-semibold">Delivery Address:</p>
                        <p>{order.delivery_address}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Close button */}
                <button
                  onClick={handleClose}
                  className="flex-shrink-0 ml-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                  aria-label="Close notification"
                >
                  <FaTimes />
                </button>
              </div>

              {/* Action prompt */}
              <div className="mt-3 pt-3 border-t border-white/20">
                <p className="text-sm font-medium flex items-center">
                  <span className="animate-pulse mr-2">🔔</span>
                  Check the kitchen display to start preparing this order
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OrderNotificationBanner;

import { useState, useEffect } from 'react';
import { FiStar, FiTrash2 } from 'react-icons/fi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { feedbackAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function FeedbackView() {
  const { user } = useAuthStore();
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (user?.restaurant_id) {
      fetchFeedback();
    }
  }, [user, filter]);

  const fetchFeedback = async () => {
    try {
      const params = {};
      if (filter !== 'all') {
        params.min_rating = parseInt(filter);
        params.max_rating = parseInt(filter);
      }

      const response = await feedbackAPI.list(user.restaurant_id, params);
      setFeedback(response.data);
    } catch (error) {
      toast.error('Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (feedbackId) => {
    if (!confirm('Delete this feedback?')) return;

    try {
      await feedbackAPI.delete(user.restaurant_id, feedbackId);
      toast.success('Feedback deleted!');
      fetchFeedback();
    } catch (error) {
      toast.error('Failed to delete feedback');
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <FiStar
            key={i}
            className={`${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Customer Feedback</h1>

          {/* Filter Buttons */}
          <div className="flex gap-3">
            {['all', '5', '4', '3', '2', '1'].map((filterValue) => (
              <button
                key={filterValue}
                onClick={() => setFilter(filterValue)}
                className={`px-4 py-2 rounded-lg ${
                  filter === filterValue
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {filterValue === 'all' ? 'All' : `${filterValue} ⭐`}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        ) : feedback.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">No feedback yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {feedback.map((item) => (
              <div key={item.id} className="bg-white rounded-xl shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {item.customer_name || 'Anonymous'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(item.created_at), 'PPP')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <FiTrash2 />
                  </button>
                </div>

                {/* Rating */}
                <div className="mb-3">{renderStars(item.rating)}</div>

                {/* Comment */}
                {item.comment && (
                  <p className="text-gray-700 mb-3 border-l-4 border-blue-500 pl-4 py-2 bg-gray-50 rounded">
                    "{item.comment}"
                  </p>
                )}

                {/* Table Info */}
                {item.table_id && (
                  <p className="text-sm text-gray-600">Table: {item.table_id}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

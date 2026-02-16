import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiEdit, FiTrash2, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { menuAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import useRestaurantStore from '../../store/restaurantStore';
import toast from 'react-hot-toast';

export default function MenuManagement() {
  const { user } = useAuthStore();
  const { currencySymbol, fetchRestaurant } = useRestaurantStore();
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [imageUploadMethod, setImageUploadMethod] = useState('url'); // 'url' or 'upload'
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'main_course',
    image_url: '',
    is_vegetarian: false,
    is_vegan: false,
    is_gluten_free: false,
    preparation_time: '',
  });

  useEffect(() => {
    if (user?.restaurant_id) {
      fetchMenuItems();
      fetchRestaurant(user.restaurant_id);
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchMenuItems = async () => {
    try {
      const response = await menuAPI.list(user.restaurant_id);
      setMenuItems(response.data);
    } catch (error) {
      toast.error('Failed to load menu items');
      console.error('Menu fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let finalFormData = { ...formData };

      // Upload image file if one is selected
      if (imageFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', imageFile);

        const uploadResponse = await menuAPI.uploadImage(user.restaurant_id, uploadFormData);
        finalFormData.image_url = uploadResponse.data.image_url;
      }

      if (formData.id) {
        await menuAPI.update(user.restaurant_id, formData.id, finalFormData);
        toast.success('Menu item updated!');
      } else {
        await menuAPI.create(user.restaurant_id, finalFormData);
        toast.success('Menu item added!');
      }
      setShowModal(false);
      fetchMenuItems();
      resetForm();
      setImageFile(null);
      setImagePreview('');
    } catch (error) {
      toast.error('Failed to save menu item');
      console.error('Save error:', error);
    }
  };

  const handleDelete = async (itemId) => {
    if (!confirm('Delete this menu item?')) return;

    try {
      await menuAPI.delete(user.restaurant_id, itemId);
      toast.success('Item deleted!');
      fetchMenuItems();
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  const toggleAvailability = async (itemId) => {
    try {
      await menuAPI.toggleAvailability(user.restaurant_id, itemId);
      toast.success('Availability updated!');
      fetchMenuItems();
    } catch (error) {
      toast.error('Failed to update availability');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: 'main_course',
      image_url: '',
      is_vegetarian: false,
      is_vegan: false,
      is_gluten_free: false,
      preparation_time: '',
    });
  };

  const categories = [...new Set(menuItems.map((item) => item.category))];

  // Show message if no restaurant
  if (!loading && !user?.restaurant_id) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <div className="max-w-2xl mx-auto text-center py-20">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">No Restaurant Found</h1>
            <p className="text-gray-600 mb-8">
              Please create your restaurant first in Restaurant Management before managing menu items.
            </p>
            <Link to="/admin/restaurant" className="btn-primary inline-block">
              Go to Restaurant Management
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Menu Management</h1>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <FiPlus /> Add Menu Item
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        ) : menuItems.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">No menu items yet. Add your first item!</p>
          </div>
        ) : (
          categories.map((category) => {
            const categoryItems = menuItems.filter((item) => item.category === category);
            return (
              <div key={category} className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">{category}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryItems.map((item) => (
                    <div key={item.id} className="bg-white rounded-xl shadow-md overflow-hidden">
                      {/* Item Image */}
                      {item.image_url ? (
                        <div className="w-full h-40 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-40 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                          <span className="text-5xl">🍽️</span>
                        </div>
                      )}

                      <div className="p-6">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-lg font-bold">{item.name}</h3>
                          <span className="text-xl font-bold text-blue-600">{currencySymbol}{item.price.toFixed(2)}</span>
                        </div>

                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{item.description}</p>

                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className={`badge ${item.is_available ? 'badge-success' : 'badge-error'}`}>
                          {item.is_available ? 'Available' : 'Unavailable'}
                        </span>
                        {item.is_vegetarian && <span className="badge badge-success">🌱 Veg</span>}
                        {item.is_vegan && <span className="badge badge-success">🥬 Vegan</span>}
                        {item.preparation_time && (
                          <span className="badge badge-info">⏱️ {item.preparation_time}min</span>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setFormData(item);
                            setShowModal(true);
                          }}
                          className="flex-1 btn-secondary flex items-center justify-center gap-1 text-sm"
                        >
                          <FiEdit /> Edit
                        </button>
                        <button
                          onClick={() => toggleAvailability(item.id)}
                          className="flex-1 bg-yellow-100 text-yellow-700 px-3 py-2 rounded-lg hover:bg-yellow-200 flex items-center justify-center gap-1 text-sm"
                        >
                          {item.is_available ? <FiToggleRight /> : <FiToggleLeft />}
                          Toggle
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="bg-red-100 text-red-600 px-3 py-2 rounded-lg hover:bg-red-200"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full p-8">
              <h2 className="text-2xl font-bold mb-6">{formData.id ? 'Edit' : 'Add'} Menu Item</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Item Name</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                      className="input-field"
                      rows="3"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">🖼️ Menu Item Image</label>

                    {/* Tab Selection */}
                    <div className="flex gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => setImageUploadMethod('url')}
                        className={`px-4 py-2 rounded-lg font-medium ${
                          imageUploadMethod === 'url'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        🔗 URL
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageUploadMethod('upload')}
                        className={`px-4 py-2 rounded-lg font-medium ${
                          imageUploadMethod === 'upload'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        📤 Upload
                      </button>
                    </div>

                    {/* URL Input */}
                    {imageUploadMethod === 'url' && (
                      <div>
                        <input
                          type="url"
                          className="input-field"
                          placeholder="https://example.com/image.jpg"
                          value={formData.image_url || ''}
                          onChange={(e) => {
                            setFormData({ ...formData, image_url: e.target.value });
                            setImagePreview(e.target.value);
                            setImageFile(null);
                          }}
                        />
                        <p className="text-xs text-gray-500 mt-1">Paste an image URL from the web</p>
                      </div>
                    )}

                    {/* File Upload */}
                    {imageUploadMethod === 'upload' && (
                      <div>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                setImageFile(file);
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setImagePreview(reader.result);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="hidden"
                            id="image-upload"
                          />
                          <label
                            htmlFor="image-upload"
                            className="cursor-pointer inline-block"
                          >
                            <div className="text-4xl mb-2">📁</div>
                            <p className="text-sm font-medium text-gray-700">
                              Click to upload image
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              PNG, JPG, WEBP up to 5MB
                            </p>
                          </label>
                        </div>
                        {imageFile && (
                          <p className="text-sm text-green-600 mt-2">
                            ✓ Selected: {imageFile.name}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Image Preview */}
                    {(imagePreview || formData.image_url) && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-gray-700 mb-2">Preview:</p>
                        <img
                          src={imagePreview || formData.image_url}
                          alt="Preview"
                          className="h-40 w-40 object-cover rounded-lg border-2 border-gray-200 shadow-sm"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input-field"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <select
                      className="input-field"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      required
                    >
                      <option value="appetizer">Appetizer</option>
                      <option value="main_course">Main Course</option>
                      <option value="dessert">Dessert</option>
                      <option value="beverage">Beverage</option>
                      <option value="side_dish">Side Dish</option>
                      <option value="special">Special</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Prep Time (minutes)</label>
                    <input
                      type="number"
                      className="input-field"
                      value={formData.preparation_time}
                      onChange={(e) => setFormData({ ...formData, preparation_time: parseInt(e.target.value) })}
                    />
                  </div>

                  <div className="col-span-2">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.is_vegetarian}
                          onChange={(e) => setFormData({ ...formData, is_vegetarian: e.target.checked })}
                          className="w-4 h-4"
                        />
                        🌱 Vegetarian
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.is_vegan}
                          onChange={(e) => setFormData({ ...formData, is_vegan: e.target.checked })}
                          className="w-4 h-4"
                        />
                        🥬 Vegan
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.is_gluten_free}
                          onChange={(e) => setFormData({ ...formData, is_gluten_free: e.target.checked })}
                          className="w-4 h-4"
                        />
                        🌾 Gluten-Free
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="submit" className="btn-primary flex-1">
                    {formData.id ? 'Update' : 'Add'} Item
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

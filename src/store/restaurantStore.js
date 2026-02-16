import { create } from 'zustand';
import { restaurantAPI } from '../services/api';

const useRestaurantStore = create((set) => ({
  restaurant: null,
  currencySymbol: '$',
  currencyCode: 'USD',
  isLoading: false,

  fetchRestaurant: async (restaurantId) => {
    if (!restaurantId) return;

    set({ isLoading: true });
    try {
      const response = await restaurantAPI.get(restaurantId);
      const restaurant = response.data;
      set({
        restaurant,
        currencySymbol: restaurant.currency_symbol || '$',
        currencyCode: restaurant.currency_code || 'USD',
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch restaurant:', error);
      set({ isLoading: false });
    }
  },

  setRestaurant: (restaurant) => {
    set({
      restaurant,
      currencySymbol: restaurant?.currency_symbol || '$',
      currencyCode: restaurant?.currency_code || 'USD',
    });
  },

  clearRestaurant: () => {
    set({
      restaurant: null,
      currencySymbol: '$',
      currencyCode: 'USD',
    });
  },
}));

export default useRestaurantStore;

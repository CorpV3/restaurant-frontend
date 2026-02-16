import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      restaurantId: null,
      restaurantSlug: null,
      restaurantName: null,

      // Add item to cart
      addItem: (menuItem, quantity = 1) => {
        const { items, restaurantId } = get();

        // Check if switching restaurants
        if (restaurantId && restaurantId !== menuItem.restaurant_id) {
          const confirm = window.confirm(
            'You have items from another restaurant. Clear cart and start new order?'
          );
          if (!confirm) return;

          // Clear cart and start fresh
          set({
            items: [],
            restaurantId: menuItem.restaurant_id,
            restaurantSlug: menuItem.restaurant_slug,
            restaurantName: menuItem.restaurant_name
          });
        }

        // Check if item already in cart
        const existingIndex = items.findIndex(i => i.id === menuItem.id);

        if (existingIndex >= 0) {
          // Update quantity
          const updatedItems = [...items];
          updatedItems[existingIndex].quantity += quantity;
          set({ items: updatedItems });
        } else {
          // Add new item
          set({
            items: [...items, { ...menuItem, quantity }],
            restaurantId: menuItem.restaurant_id,
            restaurantSlug: menuItem.restaurant_slug,
            restaurantName: menuItem.restaurant_name
          });
        }
      },

      // Remove item from cart
      removeItem: (itemId) => {
        const items = get().items.filter(i => i.id !== itemId);
        set({ items });

        // Clear restaurant if cart is empty
        if (items.length === 0) {
          set({ restaurantId: null, restaurantSlug: null, restaurantName: null });
        }
      },

      // Update item quantity
      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }

        const items = get().items.map(item =>
          item.id === itemId ? { ...item, quantity } : item
        );
        set({ items });
      },

      // Update item special instructions
      updateInstructions: (itemId, instructions) => {
        const items = get().items.map(item =>
          item.id === itemId ? { ...item, special_instructions: instructions } : item
        );
        set({ items });
      },

      // Clear entire cart
      clearCart: () => {
        set({
          items: [],
          restaurantId: null,
          restaurantSlug: null,
          restaurantName: null
        });
      },

      // Get cart total
      getTotal: () => {
        return get().items.reduce(
          (sum, item) => sum + (parseFloat(item.price) * item.quantity),
          0
        );
      },

      // Get total item count
      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      // Get subtotal
      getSubtotal: () => {
        return get().getTotal();
      },

      // Calculate tax (10%)
      getTax: () => {
        return get().getTotal() * 0.1;
      },

      // Get grand total
      getGrandTotal: () => {
        const subtotal = get().getTotal();
        const tax = subtotal * 0.1;
        return subtotal + tax;
      }
    }),
    {
      name: 'restaurant-cart-storage',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          return str ? JSON.parse(str) : null;
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
        }
      }
    }
  )
);

export default useCartStore;

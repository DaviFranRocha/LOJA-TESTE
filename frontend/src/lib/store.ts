import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Types ──────────────────────────────────────────────────────
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
}

// ── Auth Store ─────────────────────────────────────────────────
interface AuthState {
  user: User | null;
  token: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      setToken: (token) => {
        if (token) localStorage.setItem('accessToken', token);
        else localStorage.removeItem('accessToken');
        set({ token });
      },
      logout: async () => {
        try {
          const { api } = await import('./api');
          await api.post('/auth/logout');
        } catch {}
        localStorage.removeItem('accessToken');
        set({ user: null, token: null });
        window.location.href = '/';
      },
    }),
    { name: 'auth-store', partialize: (s) => ({ user: s.user, token: s.token }) }
  )
);

// ── Cart Store ─────────────────────────────────────────────────
export interface CartItem {
  productId: string;
  quantity: number;
}
interface CartState {
  items: CartItem[];
  addItem: (productId: string, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, quantity: number) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (productId, quantity = 1) => {
        set((s) => {
          const ex = s.items.find(i => i.productId === productId);
          if (ex) return { items: s.items.map(i => i.productId === productId ? { ...i, quantity: i.quantity + quantity } : i) };
          return { items: [...s.items, { productId, quantity }] };
        });
      },
      removeItem: (productId) => set((s) => ({ items: s.items.filter(i => i.productId !== productId) })),
      updateQty: (productId, quantity) => {
        if (quantity < 1) { get().removeItem(productId); return; }
        set((s) => ({ items: s.items.map(i => i.productId === productId ? { ...i, quantity } : i) }));
      },
      clear: () => set({ items: [] }),
    }),
    { name: 'fs-cart-v2', version: 2 }
  )
);

// ── Wishlist Store (local + sync with server) ──────────────────
interface WishlistState {
  ids: string[];
  add: (id: string) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  has: (id: string) => boolean;
  setAll: (ids: string[]) => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      add:    (id) => set((s) => ({ ids: s.ids.includes(id) ? s.ids : [...s.ids, id] })),
      remove: (id) => set((s) => ({ ids: s.ids.filter(i => i !== id) })),
      toggle: (id) => {
        if (get().ids.includes(id)) get().remove(id);
        else get().add(id);
      },
      has:    (id) => get().ids.includes(id),
      setAll: (ids) => set({ ids }),
    }),
    { name: 'fs-wishlist-v1' }
  )
);

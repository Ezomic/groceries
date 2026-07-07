import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_URL = 'https://api.thijssensoftware.nl/api';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let onUnauthorized: (() => void) | null = null;

export function registerUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['token', 'user']);
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

export default api;

export interface Product {
  id: number;
  barcode: string;
  name: string;
  brand: string | null;
  category: string | null;
  image_url: string | null;
  quantity_unit: string | null;
}

export interface PantryItem {
  id: number;
  product_id: number;
  quantity: number;
  unit: string | null;
  notes: string | null;
  product: Product;
}

export interface ShoppingListItem {
  id: number;
  product_id: number;
  quantity: number;
  unit: string | null;
  notes: string | null;
  purchased_at: string | null;
  sort_order: number;
  product: Product;
}

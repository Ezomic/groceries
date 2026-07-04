import { useEffect, useRef } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import api from '../api';
import { dequeue, getAll } from '../store/offlineQueue';

export function useOfflineSync(onQueueChange: () => void): void {
  const wasConnected = useRef<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state: NetInfoState) => {
      const isConnected = state.isConnected ?? false;

      if (!isConnected) {
        wasConnected.current = false;
        return;
      }

      if (wasConnected.current === false) {
        await flushQueue(onQueueChange);
      }

      wasConnected.current = true;
    });

    return () => unsubscribe();
  }, [onQueueChange]);
}

async function flushQueue(onQueueChange: () => void): Promise<void> {
  const entries = await getAll();
  if (entries.length === 0) return;

  for (;;) {
    const entry = await dequeue();
    if (!entry) break;

    try {
      const { data: product } = await api.get(`/products/lookup/${entry.barcode}`);

      if (entry.action === 'pantry') {
        await api.post('/pantry', { product_id: product.id, quantity: 1 });
      } else {
        await api.post('/shopping-list', { product_id: product.id, quantity: 1 });
      }
    } catch {
      // If the replay fails for a non-network reason, discard and continue.
    }

    onQueueChange();
  }
}

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { AxiosError } from 'axios';
import api, { Product } from '../api';
import { Image } from 'react-native';
import { enqueue } from '../store/offlineQueue';
import { getAll } from '../store/offlineQueue';

type ScanMode = 'add-to-list' | 'add-to-pantry' | 'purchase';

interface Props {
  onQueueChange: () => void;
}

function isNetworkError(e: unknown): boolean {
  if (e instanceof AxiosError) {
    return !e.response;
  }
  return false;
}

export default function ScanScreen({ onQueueChange }: Props) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [mode, setMode] = useState<ScanMode>('add-to-list');
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    BarCodeScanner.requestPermissionsAsync().then(({ status }) => {
      setHasPermission(status === 'granted');
    });
  }, []);

  const refreshPending = useCallback(async () => {
    const queue = await getAll();
    setPendingCount(queue.length);
    onQueueChange();
  }, [onQueueChange]);

  useEffect(() => {
    refreshPending();
  }, [refreshPending]);

  async function handleBarCodeScanned({ data }: { type: string; data: string }) {
    setScanned(true);
    setLoading(true);
    try {
      const { data: product } = await api.get(`/products/lookup/${data}`);
      setProduct(product);
      setQuantity('1');
      setNotes('');
      setModalVisible(true);
    } catch (e) {
      if (isNetworkError(e)) {
        const action = mode === 'add-to-pantry' ? 'pantry' : 'shopping_list';
        await enqueue({ id: `${Date.now()}-${Math.random()}`, barcode: data, action, timestamp: Date.now() });
        await refreshPending();
        Alert.alert('Saved offline', 'Will sync when back online.');
      } else if (mode === 'purchase') {
        try {
          await api.post('/shopping-list/purchase-by-barcode', { barcode: data });
          Alert.alert('Purchased!', 'Item marked as purchased.');
        } catch {
          Alert.alert('Not found', 'This product is not on your shopping list.');
        }
      } else {
        Alert.alert('Not found', 'Could not identify this product.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function confirmAction() {
    if (!product) return;
    setLoading(true);
    try {
      if (mode === 'purchase') {
        await api.post('/shopping-list/purchase-by-barcode', { barcode: product.barcode });
        Alert.alert('Purchased!', `${product.name} marked as purchased.`);
      } else if (mode === 'add-to-pantry') {
        await api.post('/pantry', { product_id: product.id, quantity: parseFloat(quantity), notes });
        Alert.alert('Added!', `${product.name} added to pantry.`);
      } else {
        await api.post('/shopping-list', { product_id: product.id, quantity: parseFloat(quantity), notes });
        Alert.alert('Added!', `${product.name} added to shopping list.`);
      }
    } catch (e) {
      if (isNetworkError(e) && mode !== 'purchase') {
        const action = mode === 'add-to-pantry' ? 'pantry' : 'shopping_list';
        await enqueue({ id: `${Date.now()}-${Math.random()}`, barcode: product.barcode, action, timestamp: Date.now() });
        await refreshPending();
        Alert.alert('Saved offline', 'Will sync when back online.');
      } else {
        const err = e as AxiosError<{ message?: string }>;
        Alert.alert('Error', err?.response?.data?.message ?? 'Something went wrong.');
      }
    } finally {
      setModalVisible(false);
      setProduct(null);
      setScanned(false);
      setLoading(false);
    }
  }

  if (hasPermission === null) {
    return <View style={styles.center}><Text>Requesting camera permission…</Text></View>;
  }
  if (!hasPermission) {
    return <View style={styles.center}><Text>Camera access denied. Enable it in Settings.</Text></View>;
  }

  return (
    <View style={styles.container}>
      {pendingCount > 0 && (
        <View style={styles.syncBanner}>
          <Text style={styles.syncBannerText}>{pendingCount} scan{pendingCount > 1 ? 's' : ''} pending sync</Text>
        </View>
      )}

      <View style={styles.modeBar}>
        {(['add-to-list', 'add-to-pantry', 'purchase'] as ScanMode[]).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
            onPress={() => { setMode(m); setScanned(false); }}
          >
            <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
              {m === 'add-to-list' ? '+ List' : m === 'add-to-pantry' ? '+ Pantry' : '✓ Purchase'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={StyleSheet.absoluteFill}
      />

      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}

      {scanned && !loading && !modalVisible && (
        <TouchableOpacity style={styles.rescanBtn} onPress={() => setScanned(false)}>
          <Text style={styles.rescanText}>Tap to scan again</Text>
        </TouchableOpacity>
      )}

      <View style={styles.crosshair} pointerEvents="none">
        <View style={styles.crosshairBox} />
        <Text style={styles.crosshairHint}>
          {mode === 'purchase' ? 'Scan to mark purchased' : mode === 'add-to-pantry' ? 'Scan to add to pantry' : 'Scan to add to list'}
        </Text>
      </View>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          {product?.image_url && (
            <Image source={{ uri: product.image_url }} style={styles.productImage} resizeMode="contain" />
          )}
          <Text style={styles.productName}>{product?.name}</Text>
          {product?.brand && <Text style={styles.productBrand}>{product.brand}</Text>}
          {mode !== 'purchase' && (
            <>
              <Text style={styles.label}>Quantity</Text>
              <TextInput
                style={styles.input}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="decimal-pad"
              />
              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={styles.input}
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g. low-fat version"
              />
            </>
          )}
          <TouchableOpacity style={styles.confirmBtn} onPress={confirmAction} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.confirmBtnText}>
                  {mode === 'purchase' ? 'Mark as purchased' : mode === 'add-to-pantry' ? 'Add to pantry' : 'Add to list'}
                </Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => { setModalVisible(false); setScanned(false); }}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  syncBanner: { backgroundColor: '#f59e0b', paddingVertical: 6, paddingHorizontal: 16, alignItems: 'center', zIndex: 20 },
  syncBannerText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  modeBar: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 10, padding: 8, gap: 8 },
  modeBtn: { flex: 1, padding: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center' },
  modeBtnActive: { backgroundColor: '#16a34a' },
  modeBtnText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  modeBtnTextActive: { fontWeight: '700' },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  rescanBtn: { position: 'absolute', bottom: 60, alignSelf: 'center', backgroundColor: '#16a34a', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 30 },
  rescanText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  crosshair: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center' },
  crosshairBox: { width: 240, height: 160, borderWidth: 2, borderColor: '#16a34a', borderRadius: 12 },
  crosshairHint: { color: '#fff', marginTop: 12, fontSize: 13, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  modal: { flex: 1, padding: 24, backgroundColor: '#fff' },
  productImage: { width: '100%', height: 180, marginBottom: 16, borderRadius: 12 },
  productName: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  productBrand: { fontSize: 15, color: '#666', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 16 },
  confirmBtn: { backgroundColor: '#16a34a', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelBtn: { alignItems: 'center', padding: 12 },
  cancelBtnText: { color: '#ef4444', fontSize: 15 },
});

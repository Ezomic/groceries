import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api, { ShoppingListItem } from '../api';

export default function ShoppingListScreen() {
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/shopping-list');
      setItems(data);
    } catch {
      Alert.alert('Error', 'Could not load shopping list.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function purchase(item: ShoppingListItem) {
    try {
      await api.post(`/shopping-list/${item.id}/purchase`);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch {
      Alert.alert('Error', 'Could not mark as purchased.');
    }
  }

  async function remove(item: ShoppingListItem) {
    Alert.alert('Remove item', `Remove ${item.product.name} from list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          await api.delete(`/shopping-list/${item.id}`);
          setItems((prev) => prev.filter((i) => i.id !== item.id));
        },
      },
    ]);
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#16a34a" /></View>;
  }

  return (
    <View style={styles.container}>
      {items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>Your shopping list is empty.</Text>
          <Text style={styles.emptySub}>Scan a barcode to add items.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => String(i.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <TouchableOpacity style={styles.checkBtn} onPress={() => purchase(item)}>
                <Text style={styles.checkIcon}>○</Text>
              </TouchableOpacity>
              <View style={styles.info}>
                <Text style={styles.name}>{item.product.name}</Text>
                {item.product.brand && <Text style={styles.brand}>{item.product.brand}</Text>}
                <Text style={styles.qty}>{item.quantity} {item.unit ?? ''}</Text>
                {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
              </View>
              <TouchableOpacity onPress={() => remove(item)} style={styles.deleteBtn}>
                <Text style={styles.deleteIcon}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#6b7280' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  checkBtn: { marginRight: 12 },
  checkIcon: { fontSize: 22, color: '#16a34a' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#111827' },
  brand: { fontSize: 13, color: '#9ca3af' },
  qty: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  notes: { fontSize: 12, color: '#d97706', marginTop: 2 },
  deleteBtn: { padding: 8 },
  deleteIcon: { fontSize: 16, color: '#d1d5db' },
});

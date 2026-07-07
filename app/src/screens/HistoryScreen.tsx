import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api, { ShoppingListItem } from '../api';

export default function HistoryScreen() {
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/shopping-list/history');
      setItems(data);
    } catch {
      Alert.alert('Error', 'Could not load history.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function reAdd(item: ShoppingListItem) {
    try {
      await api.post('/shopping-list', { product_id: item.product_id, quantity: item.quantity });
      Alert.alert('Added!', `${item.product.name} added to shopping list.`);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Could not add.');
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#16a34a" /></View>;
  }

  return (
    <View style={styles.container}>
      {items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>No purchase history yet.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => String(i.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.info}>
                <Text style={styles.name}>{item.product.name}</Text>
                {item.product.brand && <Text style={styles.brand}>{item.product.brand}</Text>}
                <Text style={styles.date}>
                  {item.purchased_at ? new Date(item.purchased_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                </Text>
              </View>
              <TouchableOpacity style={styles.reAddBtn} onPress={() => reAdd(item)}>
                <Text style={styles.reAddText}>+ List</Text>
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
  empty: { fontSize: 18, fontWeight: '600', color: '#374151' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#111827' },
  brand: { fontSize: 13, color: '#9ca3af' },
  date: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  reAddBtn: { backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  reAddText: { fontSize: 13, fontWeight: '600', color: '#374151' },
});

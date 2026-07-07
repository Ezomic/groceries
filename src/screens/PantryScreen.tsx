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
  Modal,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api, { PantryItem } from '../api';

export default function PantryScreen() {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<PantryItem | null>(null);
  const [editQty, setEditQty] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/pantry');
      setItems(data);
    } catch {
      Alert.alert('Error', 'Could not load pantry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function openEdit(item: PantryItem) {
    setEditing(item);
    setEditQty(String(item.quantity));
    setEditNotes(item.notes ?? '');
  }

  async function saveEdit() {
    if (!editing) return;
    try {
      const { data } = await api.patch(`/pantry/${editing.id}`, {
        quantity: parseFloat(editQty),
        notes: editNotes || null,
      });
      setItems((prev) => prev.map((i) => (i.id === data.id ? data : i)));
    } catch {
      Alert.alert('Error', 'Could not update item.');
    } finally {
      setEditing(null);
    }
  }

  async function addToList(item: PantryItem) {
    try {
      await api.post('/shopping-list', { product_id: item.product_id, quantity: 1 });
      Alert.alert('Added!', `${item.product.name} added to shopping list.`);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message ?? 'Could not add to list.');
    }
  }

  async function remove(item: PantryItem) {
    Alert.alert('Remove from pantry', `Remove ${item.product.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          await api.delete(`/pantry/${item.id}`);
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
          <Text style={styles.empty}>Your pantry is empty.</Text>
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
              <View style={styles.info}>
                <Text style={styles.name}>{item.product.name}</Text>
                {item.product.brand && <Text style={styles.brand}>{item.product.brand}</Text>}
                <Text style={styles.qty}>{item.quantity} {item.unit ?? 'pcs'}</Text>
                {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
              </View>
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => addToList(item)} style={styles.actionBtn}>
                  <Text style={styles.actionBtnText}>+ List</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn}>
                  <Text style={styles.actionBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => remove(item)}>
                  <Text style={styles.deleteIcon}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={!!editing} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Edit {editing?.product.name}</Text>
          <Text style={styles.label}>Quantity</Text>
          <TextInput style={styles.input} value={editQty} onChangeText={setEditQty} keyboardType="decimal-pad" />
          <Text style={styles.label}>Notes</Text>
          <TextInput style={styles.input} value={editNotes} onChangeText={setEditNotes} placeholder="Optional note" />
          <TouchableOpacity style={styles.confirmBtn} onPress={saveEdit}>
            <Text style={styles.confirmBtnText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(null)}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#6b7280' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#111827' },
  brand: { fontSize: 13, color: '#9ca3af' },
  qty: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  notes: { fontSize: 12, color: '#d97706', marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtn: { backgroundColor: '#f3f4f6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  deleteIcon: { fontSize: 16, color: '#d1d5db', paddingLeft: 4 },
  modal: { flex: 1, padding: 24, backgroundColor: '#fff' },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 16 },
  confirmBtn: { backgroundColor: '#16a34a', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelBtn: { alignItems: 'center', padding: 12 },
  cancelBtnText: { color: '#ef4444', fontSize: 15 },
});

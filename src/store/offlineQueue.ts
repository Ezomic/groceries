import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@groceries/offline_queue';

export type ScanAction = 'pantry' | 'shopping_list';

export interface OfflineQueueEntry {
  id: string;
  barcode: string;
  action: ScanAction;
  timestamp: number;
}

async function readQueue(): Promise<OfflineQueueEntry[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as OfflineQueueEntry[];
}

async function writeQueue(entries: OfflineQueueEntry[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export async function enqueue(entry: OfflineQueueEntry): Promise<void> {
  const queue = await readQueue();
  queue.push(entry);
  await writeQueue(queue);
}

export async function dequeue(): Promise<OfflineQueueEntry | null> {
  const queue = await readQueue();
  if (queue.length === 0) return null;
  const [first, ...rest] = queue;
  await writeQueue(rest);
  return first;
}

export async function getAll(): Promise<OfflineQueueEntry[]> {
  return readQueue();
}

export async function clear(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

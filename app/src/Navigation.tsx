import React, { useState, useEffect, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, StyleSheet } from 'react-native';
import { useAuth } from './AuthContext';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ShoppingListScreen from './screens/ShoppingListScreen';
import PantryScreen from './screens/PantryScreen';
import ScanScreen from './screens/ScanScreen';
import HistoryScreen from './screens/HistoryScreen';
import { useOfflineSync } from './hooks/useOfflineSync';
import { getAll } from './store/offlineQueue';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function AppTabs() {
  const [pendingCount, setPendingCount] = useState(0);

  const refreshCount = useCallback(async () => {
    const queue = await getAll();
    setPendingCount(queue.length);
  }, []);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  useOfflineSync(refreshCount);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => {
          const icons: Record<string, string> = {
            List: focused ? '🛒' : '🛍️',
            Scan: focused ? '📷' : '📸',
            Pantry: focused ? '🥫' : '🥦',
            History: focused ? '📋' : '📄',
          };

          if (route.name === 'Scan' && pendingCount > 0) {
            return (
              <View>
                <Text style={{ fontSize: 22 }}>{icons[route.name]}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingCount}</Text>
                </View>
              </View>
            );
          }

          return <Text style={{ fontSize: 22 }}>{icons[route.name]}</Text>;
        },
        tabBarActiveTintColor: '#16a34a',
        tabBarInactiveTintColor: '#9ca3af',
        headerStyle: { backgroundColor: '#16a34a' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      })}
    >
      <Tab.Screen name="List" component={ShoppingListScreen} options={{ title: 'Shopping list' }} />
      <Tab.Screen
        name="Scan"
        options={{ title: 'Scan' }}
      >
        {() => <ScanScreen onQueueChange={refreshCount} />}
      </Tab.Screen>
      <Tab.Screen name="Pantry" component={PantryScreen} options={{ title: 'Pantry' }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ title: 'History' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: -6,
    top: -4,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});

export default function Navigation() {
  const { token } = useAuth();
  return (
    <NavigationContainer>
      {token ? <AppTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}

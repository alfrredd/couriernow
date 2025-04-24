import 'react-native-url-polyfill/auto'
import 'react-native-get-random-values'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import LandingPage from './components/LandingPage'
import Dashboard from './components/Dashboard'
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, Alert, Platform } from 'react-native'
import { Session } from '@supabase/supabase-js'
import * as Notifications from 'expo-notifications';

// Register for push notifications and get Expo token
async function registerForPushNotificationsAsync() {
  let token;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    Alert.alert('Failed to get push token for push notification!');
    return null;
  }
  token = (await Notifications.getExpoPushTokenAsync()).data;
  return token;
}

const Stack = createStackNavigator();

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [showAuth, setShowAuth] = useState(false);

  // Register for push notifications and save token on login
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])

  // Register push token and set up notification listener when session changes
  useEffect(() => {
    let notificationListener: Notifications.Subscription | undefined;
    if (session && session.user) {
      registerForPushNotificationsAsync().then(token => {
        if (token) {
          supabase.from('users').update({ expo_push_token: token }).eq('id', session.user.id);
        }
      });
      // Listen for foreground notifications
      notificationListener = Notifications.addNotificationReceivedListener(notification => {
        const title = notification.request.content.title || 'Notification';
        const body = notification.request.content.body || '';
        Alert.alert(title, body);
      });
    }
    // Cleanup listener on logout
    return () => {
      if (notificationListener) {
        notificationListener.remove();
      }
    };
  }, [session]);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          !showAuth ? (
            <Stack.Screen name="LandingPage">
              {() => <LandingPage onLoginPress={() => setShowAuth(true)} />}
            </Stack.Screen>
          ) : (
            <Stack.Screen name="Auth">
              {() => <Auth setShowAuth={setShowAuth} />}
            </Stack.Screen>
          )
        ) : (
          <Stack.Screen name="Dashboard" component={Dashboard} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
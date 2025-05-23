import 'react-native-url-polyfill/auto'
import 'react-native-get-random-values'
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
  console.log('[Push] Starting registration');
  let token;
  if (Platform.OS === 'android') {
    console.log('[Push] Setting Android notification channel');
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  console.log('[Push] Existing permission status:', existingStatus);
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
    console.log('[Push] Requested permission, final status:', finalStatus);
  }
  if (finalStatus !== 'granted') {
    console.log('[Push] Permission not granted');
    Alert.alert('Failed to get push token for push notification!');
    return null;
  }
  try {
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('[Push] Got Expo push token:', token);
  } catch (err) {
    console.log('[Push] Error getting Expo push token:', err);
  }
  return token;
}

const Stack = createStackNavigator();

export default function App() {
  console.log('App component rendered');
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
    let notificationListener: Notifications.EventSubscription | undefined;
    if (session && session.user) {
      registerForPushNotificationsAsync().then(token => {
        console.log('Expo Push Token:', token);
        if (token) {
          supabase
            .from('users')
            .update({ expo_push_token: token })
            .eq('id', session.user.id)
            .then(({ error }) => {
              if (error) {
                console.error('Failed to update push token:', error);
              } else {
                console.log('Push token saved to DB');
              }
            });
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
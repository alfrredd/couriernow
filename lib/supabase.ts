import { AppState } from 'react-native'
import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'
import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native';

let supabaseUrl = '';
let supabaseAnonKey = '';

if (Platform.OS === 'web') {
  supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
} else {
  const extra = Constants.expoConfig?.extra || Constants.manifest?.extra || {};
  supabaseUrl = extra.SUPABASE_URL || '';
  supabaseAnonKey = extra.SUPABASE_ANON_KEY || '';
}

export const supabase = createClient(supabaseUrl as string, supabaseAnonKey as string, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Tells Supabase Auth to continuously refresh the session automatically
// if the app is in the foreground. When this is added, you will continue
// to receive `onAuthStateChange` events with the `TOKEN_REFRESHED` or
// `SIGNED_OUT` event if the user's session is terminated. This should
// only be registered once.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})
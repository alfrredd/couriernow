import 'react-native-url-polyfill/auto'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import LandingPage from './components/LandingPage'
import Dashboard from './components/Dashboard'
import { View, Text } from 'react-native'
import { Session } from '@supabase/supabase-js'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])

  if (session) {
    return <Dashboard />;
  }

  let content;
  if (!session) {
    if (showAuth) {
      content = <Auth />;
    } else {
      content = <LandingPage onLoginPress={() => setShowAuth(true)} />;
    }
  }

  return (
    <View style={{ flex: 1 }}>
      {content}
    </View>
  );
}
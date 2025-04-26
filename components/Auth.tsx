import React, { useState, useEffect, useRef } from 'react'
import { Alert, StyleSheet, View, Text, BackHandler, Platform, TouchableOpacity } from 'react-native'
import { useNavigation, NavigationProp } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { Button, Input, Icon } from '@rneui/themed'

type RootStackParamList = {
  Dashboard: undefined;
  // add other routes here if needed
};

type AuthProps = {
  setShowAuth: (show: boolean) => void;
};

export default function Auth({ setShowAuth }: AuthProps) {
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const emailInputRef = useRef<any>(null);
  const passwordInputRef = useRef<any>(null);
  const nameInputRef = useRef<any>(null);

  useEffect(() => {
    if (emailInputRef.current && typeof emailInputRef.current.focus === 'function') {
      emailInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const backAction = () => {
        setShowAuth(false);
        return true;
      };
      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
      return () => backHandler.remove();
    }
  }, [setShowAuth]);
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showName, setShowName] = useState(false)
  const [loading, setLoading] = useState(false)

  // Error states for inline validation
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [nameError, setNameError] = useState('');

  async function signInWithEmail() {
    setShowName(false);
    // Simple required field checks
    let valid = true;
    setEmailError('');
    setPasswordError('');
    if (!email.trim()) {
      setEmailError('Email is required.');
      valid = false;
    }
    if (!password) {
      setPasswordError('Password is required.');
      valid = false;
    }
    if (!valid) return;
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (error) {
      setSnackbarMessage(error.message);
      setSnackbarVisible(true);
      if (Platform.OS !== 'web') Alert.alert(error.message);
    }
    setLoading(false)
  }

  function validateEmail(email: string) {
    // Simple email regex
    return /^\S+@\S+\.\S+$/.test(email);
  }

  async function signUpWithEmail() {
    if (!showName) {
      setShowName(true);
      return;
    }
    // Inline validation
    let valid = true;
    setNameError('');
    setEmailError('');
    setPasswordError('');
    if (!name.trim()) {
      setNameError('Name is required.');
      valid = false;
    }
    if (!validateEmail(email)) {
      setEmailError('Invalid email format.');
      valid = false;
    }
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      valid = false;
    } else if (!/\d/.test(password)) {
      setPasswordError('Password must contain at least one digit.');
      valid = false;
    }
    if (!valid) return;
    setLoading(true)
    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email: email,
      password: password,
    })

    if (error) {
      setSnackbarMessage(error.message);
      setSnackbarVisible(true);
      if (Platform.OS !== 'web') Alert.alert(error.message);
      setLoading(false);
      return;
    }

    // Insert into users table
    const { error: insertError } = await supabase.from('users').insert({ name, email });
    if (insertError) {
      Alert.alert('Sign up succeeded but failed to save user info', insertError.message);
    }

    if (!session) Alert.alert('Please check your inbox for email verification!')
    setLoading(false)
  }

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' && (
        <TouchableOpacity style={styles.backArrow} onPress={() => setShowAuth(false)}>
          <Text style={styles.backArrowText}>←</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.title}>CourierNow Account</Text>
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Input
          label="Email"
          leftIcon={
            <Icon
              type="font-awesome"
              name="envelope"
              {...((Platform.OS === 'web' ? { tabIndex: -1 } : {}) as any)}
            />
          }
          ref={emailInputRef}
          onChangeText={(text) => setEmail(text)}
          value={email}
          placeholder="email@address.com"
          autoCapitalize={'none'}
          errorMessage={emailError}
          inputContainerStyle={emailError ? { borderColor: '#E53E3E' } : {}}
          autoFocus
          returnKeyType={showName ? 'next' : 'done'}
          onSubmitEditing={() => {
            if (showName) {
              passwordInputRef.current?.focus();
            } else {
              signInWithEmail();
            }
          }}
        />
      </View>
      <View style={styles.verticallySpaced}>
        <Input
          label="Password"
          leftIcon={
            <Icon
              type="font-awesome"
              name="lock"
              {...((Platform.OS === 'web' ? { tabIndex: -1 } : {}) as any)}
            />
          }
          ref={passwordInputRef}
          onChangeText={(text) => setPassword(text)}
          value={password}
          secureTextEntry={true}
          placeholder="Password"
          autoCapitalize={'none'}
          errorMessage={passwordError}
          inputContainerStyle={passwordError ? { borderColor: '#E53E3E' } : {}}
          returnKeyType={showName ? 'next' : 'done'}
          onSubmitEditing={() => {
            if (showName) {
              nameInputRef.current?.focus();
            } else {
              signInWithEmail();
            }
          }}
        />
      </View>
      {showName && (
        <View style={styles.verticallySpaced}>
          <Input
            label="Name"
            leftIcon={
              <Icon
                type="font-awesome"
                name="user"
                {...((Platform.OS === 'web' ? { tabIndex: -1 } : {}) as any)}
              />
            }
            ref={nameInputRef}
            onChangeText={(text) => setName(text)}
            value={name}
            placeholder="Your Name"
            autoCapitalize={'words'}
            errorMessage={nameError}
            inputContainerStyle={nameError ? { borderColor: '#E53E3E' } : {}}
            returnKeyType="done"
            onSubmitEditing={signUpWithEmail}
          />
        </View>
      )}
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Button title="Sign in" disabled={loading} onPress={() => signInWithEmail()} />
      </View>
      <View style={styles.verticallySpaced}>
        <Button title="Sign up" disabled={loading} onPress={() => signUpWithEmail()} />
      </View>
      {/* Snackbar for error messages */}
      {snackbarVisible && (
        <View style={{ position: 'absolute', bottom: 32, left: 0, right: 0, alignItems: 'center', zIndex: 999 }}>
          <View style={{ backgroundColor: '#E53E3E', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24, minWidth: 200 }}>
            <Text style={{ color: 'white', fontSize: 16, textAlign: 'center' }}>{snackbarMessage}</Text>
            <TouchableOpacity onPress={() => setSnackbarVisible(false)} style={{ marginTop: 8, alignSelf: 'center' }}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  )
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 28,
    color: '#2D3748',
    textAlign: 'center',
  },
  verticallySpaced: {
    marginTop: 16,
    marginBottom: 8,
  },
  mt20: {
    marginTop: 20,
  },
  backArrow: {
    position: 'absolute',
    left: 10,
    top: 10,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(22, 31, 41, 0.1)',
  },
  backArrowText: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 40,
    color: 'rgb(49, 130, 206)',
  },
})
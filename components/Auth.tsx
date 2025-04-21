import React, { useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'
import { supabase } from '../lib/supabase'
import { Button, Input } from '@rneui/themed'

export default function Auth() {
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
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (error) Alert.alert(error.message)
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
      Alert.alert(error.message)
      setLoading(false)
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
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Input
          label="Email"
          leftIcon={{ type: 'font-awesome', name: 'envelope' }}
          onChangeText={(text) => setEmail(text)}
          value={email}
          placeholder="email@address.com"
          autoCapitalize={'none'}
          errorMessage={emailError}
          inputContainerStyle={emailError ? { borderColor: '#E53E3E' } : {}}
        />
      </View>
      <View style={styles.verticallySpaced}>
        <Input
          label="Password"
          leftIcon={{ type: 'font-awesome', name: 'lock' }}
          onChangeText={(text) => setPassword(text)}
          value={password}
          secureTextEntry={true}
          placeholder="Password"
          autoCapitalize={'none'}
          errorMessage={passwordError}
          inputContainerStyle={passwordError ? { borderColor: '#E53E3E' } : {}}
        />
      </View>
      {showName && (
        <View style={styles.verticallySpaced}>
          <Input
            label="Name"
            leftIcon={{ type: 'font-awesome', name: 'user' }}
            onChangeText={(text) => setName(text)}
            value={name}
            placeholder="Your Name"
            autoCapitalize={'words'}
            errorMessage={nameError}
            inputContainerStyle={nameError ? { borderColor: '#E53E3E' } : {}}
          />
        </View>
      )}
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Button title="Sign in" disabled={loading} onPress={() => signInWithEmail()} />
      </View>
      <View style={styles.verticallySpaced}>
        <Button title="Sign up" disabled={loading} onPress={() => signUpWithEmail()} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 40,
    padding: 12,
  },
  verticallySpaced: {
    paddingTop: 4,
    paddingBottom: 4,
    alignSelf: 'stretch',
  },
  mt20: {
    marginTop: 20,
  },
})
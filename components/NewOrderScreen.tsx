import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import Constants from 'expo-constants';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

const NewOrderScreen = () => {
  const [pickup, setPickup] = useState('');
  const [delivery, setDelivery] = useState('');
  const [items, setItems] = useState('');

  const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  const handleCreateOrder = () => {
    // For now, just show an alert with the input values
    Alert.alert('Order Created', `Pick Up: ${pickup}\nDelivery: ${delivery}\nItems: ${items}`);
    // In the future, you can send this data to your backend
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Create New Order</Text>
      <GooglePlacesAutocomplete
        placeholder="Pick Up Address"
        minLength={2}
        fetchDetails={true}
        onPress={(data, details = null) => {
          setPickup(data.description);
        }}
        query={{
          key: GOOGLE_MAPS_API_KEY,
          language: 'en',
        }}
        styles={{
          textInput: styles.input,
          container: { width: '100%', maxWidth: 400, marginBottom: 16 },
        }}
        enablePoweredByContainer={false}
        requestUrl={{
          useOnPlatform: 'web',
          url: 'https://corsproxy.io/?https://maps.googleapis.com/maps/api',
        }}
      />
      <GooglePlacesAutocomplete
        placeholder="Delivery Address"
        minLength={2}
        fetchDetails={true}
        onPress={(data, details = null) => {
          setDelivery(data.description);
        }}
        query={{
          key: GOOGLE_MAPS_API_KEY,
          language: 'en',
        }}
        styles={{
          textInput: styles.input,
          container: { width: '100%', maxWidth: 400, marginBottom: 16 },
        }}
        enablePoweredByContainer={false}
        requestUrl={{
          useOnPlatform: 'web',
          url: 'https://corsproxy.io/?https://maps.googleapis.com/maps/api',
        }}
      />
      <TextInput
        style={styles.input}
        placeholder="Items (comma separated)"
        value={items}
        onChangeText={setItems}
      />
      <Button title="Create Order" color="#3182CE" onPress={handleCreateOrder} />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#2D3748',
  },
  input: {
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#F7FAFC',
  },
});

export default NewOrderScreen;

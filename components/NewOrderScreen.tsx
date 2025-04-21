import React, { useState } from 'react';
import { Snackbar } from 'react-native-paper';
import { View, Text, StyleSheet, TextInput, Button, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import Constants from 'expo-constants';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

import { supabase } from '../lib/supabase';
import { Modal, TouchableOpacity } from 'react-native';

const generateOrderId = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const NewOrderScreen = () => {
  // Snackbar state
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarError, setSnackbarError] = useState(false);
  const [pickup, setPickup] = useState('');
  const [delivery, setDelivery] = useState('');
  const [items, setItems] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [sending, setSending] = useState(false);

  // Error states for validation
  const [pickupError, setPickupError] = useState('');
  const [deliveryError, setDeliveryError] = useState('');
  const [itemsError, setItemsError] = useState('');

  const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  const handleCreateOrder = () => {
    let valid = true;
    setPickupError('');
    setDeliveryError('');
    setItemsError('');
    if (!pickup.trim()) {
      setPickupError("This field can't be empty");
      valid = false;
    }
    if (!delivery.trim()) {
      setDeliveryError("This field can't be empty");
      valid = false;
    }
    if (!items.trim()) {
      setItemsError("This field can't be empty");
      valid = false;
    }
    if (!valid) return;
    setModalVisible(true);
  };

  const handleSendOrder = async () => {
    setSending(true);
    // Get user id
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setSending(false);
      setSnackbarMessage('Could not get user info.');
      setSnackbarError(true);
      setSnackbarVisible(true);
      return;
    }
    const orderId = generateOrderId();
    const itemListArr = items.split(',').map(item => item.trim()).filter(Boolean);
    const { error } = await supabase.from('orders').insert({
      id: orderId,
      pickup_address: pickup,
      delivery_address: delivery,
      customer_id: user.id,
      item_list: itemListArr,
      status: 'Awaiting Courier',
    });
    setSending(false);
    setModalVisible(false);
    if (error) {
      setSnackbarMessage('Failed to send order: ' + error.message);
      setSnackbarError(true);
      setSnackbarVisible(true);
    } else {
      setSnackbarMessage('Order Sent! Your order has been created.');
      setSnackbarError(false);
      setSnackbarVisible(true);
      setPickup('');
      setDelivery('');
      setItems('');
    }
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
          setPickupError('');
        }}
        query={{
          key: GOOGLE_MAPS_API_KEY,
          language: 'es',
          components: 'country:es',
        }}
        styles={{
          textInput: [styles.input, pickupError ? { borderColor: '#E53E3E' } : {}],
          container: { width: '100%', maxWidth: 400, marginBottom: 0 },
        }}
        enablePoweredByContainer={false}
        requestUrl={{
          useOnPlatform: 'web',
          url: 'https://corsproxy.io/?https://maps.googleapis.com/maps/api',
        }}
      />
      {pickupError ? <Text style={{ color: '#E53E3E', marginBottom: 8, marginLeft: 4 }}>{pickupError}</Text> : <View style={{ height: 8 }} />}

      <GooglePlacesAutocomplete
        placeholder="Delivery Address"
        minLength={2}
        fetchDetails={true}
        onPress={(data, details = null) => {
          setDelivery(data.description);
          setDeliveryError('');
        }}
        query={{
          key: GOOGLE_MAPS_API_KEY,
          language: 'es',
          components: 'country:es',
        }}
        styles={{
          textInput: [styles.input, deliveryError ? { borderColor: '#E53E3E' } : {}],
          container: { width: '100%', maxWidth: 400, marginBottom: 0 },
        }}
        enablePoweredByContainer={false}
        requestUrl={{
          useOnPlatform: 'web',
          url: 'https://corsproxy.io/?https://maps.googleapis.com/maps/api',
        }}
      />
      {deliveryError ? <Text style={{ color: '#E53E3E', marginBottom: 8, marginLeft: 4 }}>{deliveryError}</Text> : <View style={{ height: 8 }} />}

      <TextInput
        style={[styles.input, itemsError ? { borderColor: '#E53E3E' } : {}]}
        placeholder="Items (comma separated)"
        value={items}
        onChangeText={text => {
          setItems(text);
          setItemsError('');
        }}
      />
      {itemsError ? <Text style={{ color: '#E53E3E', marginBottom: 8, marginLeft: 4 }}>{itemsError}</Text> : <View style={{ height: 8 }} />}

      <Button title="Create Order" color="#3182CE" onPress={handleCreateOrder} />
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>Confirm Order</Text>
            <Text style={{ marginBottom: 8 }}><Text style={{ fontWeight: 'bold' }}>Pick Up:</Text> {pickup}</Text>
            <Text style={{ marginBottom: 8 }}><Text style={{ fontWeight: 'bold' }}>Delivery:</Text> {delivery}</Text>
            <Text style={{ marginBottom: 16 }}><Text style={{ fontWeight: 'bold' }}>Items:</Text> {items}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <Button title="Edit" color="#A0AEC0" onPress={() => setModalVisible(false)} />
              <View style={{ width: 12 }} />
              <Button title={sending ? 'Sending...' : 'Send Order'} color="#3182CE" onPress={handleSendOrder} disabled={sending} />
            </View>
          </View>
        </View>
      </Modal>
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3500}
        style={{ backgroundColor: snackbarError ? '#E53E3E' : '#38A169' }}
        action={{ label: 'OK', onPress: () => setSnackbarVisible(false) }}
      >
        {snackbarMessage}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

export default NewOrderScreen;

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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
});


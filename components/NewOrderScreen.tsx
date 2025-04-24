import React, { useState, useEffect } from 'react';
import { Snackbar } from 'react-native-paper';
import { View, Text, StyleSheet, TextInput, Button, Alert, KeyboardAvoidingView, Platform, Image, Dimensions } from 'react-native';
import ClearableTextInput from './ClearableTextInput';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
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
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [delivery, setDelivery] = useState('');
  const pickupRef = React.useRef<any>(null);
  const deliveryRef = React.useRef<any>(null);
  const [userAddresses, setUserAddresses] = useState<{ name: string; address: string }[]>([]);
  const [selectedAddressIdx, setSelectedAddressIdx] = useState<number | null>(null);
  const navigation = useNavigation<any>();

  useEffect(() => {
    const fetchAddresses = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;
      const { data, error } = await supabase.from('users').select('addresses').eq('id', user.id).single();
      if (!error && data && Array.isArray(data.addresses)) {
        const parsed = data.addresses.map((addr: any) => (typeof addr === 'string' ? JSON.parse(addr) : addr));
        setUserAddresses(parsed);
      }
    };
    fetchAddresses();
  }, []);

  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [items, setItems] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [sending, setSending] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [distanceError, setDistanceError] = useState<string | null>(null);
  const [routeMapUrl, setRouteMapUrl] = useState<string | null>(null);

  // Error states for validation
  const [pickupError, setPickupError] = useState('');
  const [deliveryError, setDeliveryError] = useState('');
  const [itemsError, setItemsError] = useState('');

  const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  const handleCreateOrder = async () => {
    let valid = true;
    setPickupError('');
    setDeliveryError('');
    setItemsError('');
    setDistanceError(null);
    setDistance(null);
    setPrice(null);
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

    // Ensure both coordinates are set
    if (!pickupCoords || !deliveryCoords) {
      setDistanceError('Could not get coordinates for both addresses. Please re-select the locations.');
      setSnackbarMessage('Could not get coordinates for both addresses. Please re-select the locations.');
      setSnackbarError(true);
      setSnackbarVisible(true);
      return;
    }

    // Calculate driving distance using Google Maps Directions API (lat/lng)
    try {
      const origin = `${pickupCoords.lat},${pickupCoords.lng}`;
      const destination = `${deliveryCoords.lat},${deliveryCoords.lng}`;
      const response = await fetch(
        `https://corsproxy.io/?https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      if (
        data.routes &&
        data.routes.length > 0 &&
        data.routes[0].legs &&
        data.routes[0].legs.length > 0
      ) {
        const meters = data.routes[0].legs[0].distance.value;
        const km = meters / 1000;
        setDistance(km);
        // Fetch pricing rule from Supabase
        const { data: pricingData, error: pricingError } = await supabase
          .from('pricing')
          .select('*')
          .eq('rule', 1)
          .single();
        let estPrice = 0;
        if (!pricingError && pricingData) {
          const pk = parseFloat(pricingData.pk);
          const base = parseFloat(pricingData.base);
          const multiplier = parseFloat(pricingData.multiplier);
          const basePrice = Math.max(km * pk, base);
          estPrice = parseFloat((basePrice * multiplier).toFixed(2));
        } else {
          // fallback if pricing fetch fails
          estPrice = parseFloat((km * 1.21).toFixed(2));
        }
        setPrice(estPrice);
        // Generate static map URL
        if (pickupCoords && deliveryCoords) {
          const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?size=320x180&path=color:0x3182CEFF|weight:5|${pickupCoords.lat},${pickupCoords.lng}|${deliveryCoords.lat},${deliveryCoords.lng}&markers=color:green%7Clabel:A%7C${pickupCoords.lat},${pickupCoords.lng}&markers=color:red%7Clabel:B%7C${deliveryCoords.lat},${deliveryCoords.lng}&key=${GOOGLE_MAPS_API_KEY}`;
          setRouteMapUrl(mapUrl);
        } else {
          setRouteMapUrl(null);
        }
        setModalVisible(true);
      } else {
        setDistanceError('Could not calculate distance. Please check the addresses.');
        setSnackbarMessage('Could not calculate distance. Please check the addresses.');
        setSnackbarError(true);
        setSnackbarVisible(true);
      }
    } catch (err) {
      setDistanceError('Error calculating distance.');
      setSnackbarMessage('Error calculating distance.');
      setSnackbarError(true);
      setSnackbarVisible(true);
    }
  };


  const handleSendOrder = async () => {
    if (distance == null || price == null) {
      setSnackbarMessage('Distance or estimated price missing. Please try again.');
      setSnackbarError(true);
      setSnackbarVisible(true);
      return;
    }
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
      pickup_coord: pickupCoords,
      delivery_coord: deliveryCoords,
      customer_id: user.id,
      item_list: itemListArr,
      distance,
      est_price: price,
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
      // Navigate to My Orders screen
      navigation.navigate('My Orders');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { justifyContent: 'flex-start' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={[
          { width: '100%', maxWidth: 400, alignSelf: 'center', marginTop: 24 },
          Platform.OS !== 'web' && {
            flex: 1,
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 18,
            minHeight: 320,
          },
        ]}
      >
        <Text style={styles.title}>Create New Order</Text>
        {React.useMemo(() => (
          <GooglePlacesAutocomplete
          ref={pickupRef}
          placeholder="Pick Up Address"
          renderRightButton={() =>
            pickup.length > 0 ? (
              <TouchableOpacity onPress={() => { setPickup(''); setPickupCoords(null); if (pickupRef.current) pickupRef.current.setAddressText(''); }} style={{ justifyContent: 'center', alignItems: 'center', height: '100%', paddingRight: 8 }}>
                <Ionicons name="close-circle" size={22} color="#A0AEC0" />
              </TouchableOpacity>
            ) : (
              <View />
            )
          }
          minLength={2}
          fetchDetails={true}
          onPress={(data, details = null) => {
            setPickup(data.description);
            setPickupCoords(details && details.geometry && details.geometry.location ? { lat: details.geometry.location.lat, lng: details.geometry.location.lng } : null);
            setPickupError('');
          }}
          query={{
            key: GOOGLE_MAPS_API_KEY,
            language: 'es',
            components: 'country:es',
          }}
          styles={{
            textInput: [styles.input, pickupError ? { borderColor: '#E53E3E' } : {}],
            container: [
              { width: '100%', maxWidth: 400 },
              Platform.OS !== 'web' && { flex: 1, marginBottom: 12 },
            ],
            listView: [
  { backgroundColor: '#fff', minHeight: 50, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 5, zIndex: 10 },
  Platform.OS !== 'web' && { maxHeight: Dimensions.get('window').height * 0.5 },
  Platform.OS === 'web' && { maxHeight: 220 }
],
          }}
          textInputProps={{
            value: pickup,
            onChangeText: text => {
              setPickup(text);
            },
          }}
          enablePoweredByContainer={false}
          requestUrl={{
            useOnPlatform: 'web',
            url: 'https://corsproxy.io/?https://maps.googleapis.com/maps/api',
          }}
        />
      ), [pickup, pickupError, GOOGLE_MAPS_API_KEY])}
      {pickupError ? <Text style={{ color: '#E53E3E', marginBottom: 8, marginLeft: 4 }}>{pickupError}</Text> : <View style={{ height: 8 }} />}

      {React.useMemo(() => (
        <GooglePlacesAutocomplete
          ref={deliveryRef}
          placeholder="Delivery Address"
          renderRightButton={() =>
            delivery.length > 0 ? (
              <TouchableOpacity onPress={() => { setDelivery(''); setDeliveryCoords(null); if (deliveryRef.current) deliveryRef.current.setAddressText(''); }} style={{ justifyContent: 'center', alignItems: 'center', height: '100%', paddingRight: 8 }}>
                <Ionicons name="close-circle" size={22} color="#A0AEC0" />
              </TouchableOpacity>
            ) : (
              <View />
            )
          }
          minLength={2}
          fetchDetails={true}
          onPress={(data, details = null) => {
            setDelivery(data.description);
            setDeliveryCoords(details && details.geometry && details.geometry.location ? { lat: details.geometry.location.lat, lng: details.geometry.location.lng } : null);
            setDeliveryError('');
            setSelectedAddressIdx(null);
          }}
          query={{
            key: GOOGLE_MAPS_API_KEY,
            language: 'es',
            components: 'country:es',
          }}
          styles={{
            textInput: [styles.input, deliveryError ? { borderColor: '#E53E3E' } : {}],
            container: [
              { width: '100%', maxWidth: 400 },
              Platform.OS !== 'web' && { flex: 1, marginBottom: 12 },
            ],
            listView: [
              { backgroundColor: '#fff', minHeight: 50, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 5, zIndex: 10 },
              Platform.OS !== 'web' && { maxHeight: Dimensions.get('window').height * 0.5 },
              Platform.OS === 'web' && { maxHeight: 220 }
            ],
          }}
          textInputProps={{
            value: delivery,
            onChangeText: text => {
              setSelectedAddressIdx(null);
              setDelivery(text);
            },
          }}
          enablePoweredByContainer={false}
          requestUrl={{
            useOnPlatform: 'web',
            url: 'https://corsproxy.io/?https://maps.googleapis.com/maps/api',
          }}
        />
      ), [delivery, deliveryError, GOOGLE_MAPS_API_KEY])}
      {deliveryError ? <Text style={{ color: '#E53E3E', marginBottom: 8, marginLeft: 4 }}>{deliveryError}</Text> : <View style={{ height: 8 }} />}
      {userAddresses.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, marginBottom: 8, maxWidth: 400, alignSelf: 'center' }}>
          {userAddresses.map((addr, idx) => {
            const isSelected = selectedAddressIdx === idx;
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => {
                  if (isSelected) {
                    setSelectedAddressIdx(null);
                    setDelivery('');
                    setDeliveryCoords(null);
                    if (deliveryRef.current) {
                      deliveryRef.current.setAddressText('');
                    }
                  } else {
                    setSelectedAddressIdx(idx);
                    setDelivery(addr.address);
                    setDeliveryCoords(null);
                    if (deliveryRef.current) {
                      deliveryRef.current.setAddressText(addr.address);
                    }
                  }
                }}
                style={{
                  backgroundColor: isSelected ? '#3182CE' : '#E2E8F0',
                  borderRadius: 18,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  marginRight: 8,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: isSelected ? '#3182CE' : '#CBD5E0',
                  minWidth: 60,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: isSelected ? '#fff' : '#2D3748', fontWeight: 'bold', fontSize: 15 }}>{addr.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <ClearableTextInput
        style={[styles.input, itemsError ? { borderColor: '#E53E3E' } : {}]}
        placeholder="Items (comma separated)"
        value={items}
        onChangeText={text => {
          setItems(text);
          setItemsError('');
        }}
        autoCorrect={false}
        autoCapitalize="none"
        onClear={() => setItems('')}
      />
      {itemsError ? <Text style={{ color: '#E53E3E', marginBottom: 8, marginLeft: 4 }}>{itemsError}</Text> : <View style={{ height: 8 }} />}

      <TouchableOpacity
        onPress={handleCreateOrder}
        style={{
          backgroundColor: '#3182CE',
          borderRadius: 24,
          paddingVertical: 12,
          paddingHorizontal: 28,
          alignItems: 'center',
          marginVertical: 10,
          alignSelf: 'center',
        }}
        accessibilityLabel="Create Order"
      >
        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 17 }}>Create Order</Text>
      </TouchableOpacity>
    </View>
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
            {distanceError ? (
              <Text style={{ color: '#E53E3E', marginBottom: 12 }}>{distanceError}</Text>
            ) : (
              distance !== null && price !== null && (
                <>
                  <Text style={{ marginBottom: 8 }}>
                    <Text style={{ fontWeight: 'bold' }}>Distance:</Text> {distance.toFixed(2)} km
                  </Text>
                  <Text style={{ marginBottom: 8 }}>
                    <Text style={{ fontWeight: 'bold' }}>Estimated Cost:</Text> {price.toFixed(2)} €
                  </Text>
                  {routeMapUrl && (
                    <View style={{ alignItems: 'center', marginBottom: 16 }}>
                      <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Route Preview</Text>
                      <Image
                        source={{ uri: routeMapUrl }}
                        style={{ width: 320, height: 180, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E0' }}
                        resizeMode="cover"
                      />
                    </View>
                  )}
                </>
              )
            )}

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
    boxShadow: '0px 2px 4px rgba(0,0,0,0.2)',
    elevation: 5,
  },
});


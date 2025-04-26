import React, { useState, useEffect } from 'react';
import { Snackbar } from 'react-native-paper';
import { View, Text, StyleSheet, Button, Alert, KeyboardAvoidingView, Platform, Image, Dimensions, FlatList, ScrollView } from 'react-native';
import { TextInput as PaperTextInput, ActivityIndicator } from 'react-native-paper';
import ClearableTextInput from './ClearableTextInput';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
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
  const [modalAddressValue, setModalAddressValue] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  // Fetch address suggestions from Google Places Autocomplete API
  const fetchAddressSuggestions = async (input: string) => {
    if (!input || input.length < 2) {
      setAddressSuggestions([]);
      setSuggestionError(null);
      return;
    }
    setLoadingSuggestions(true);
    setSuggestionError(null);
    try {
      const isWeb = Platform.OS === 'web';
      const corsPrefix = isWeb ? 'https://corsproxy.io/?' : '';
      const url = `${corsPrefix}https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${GOOGLE_MAPS_API_KEY}&language=es&components=country:es`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === 'OK') {
        setAddressSuggestions(data.predictions);
      } else {
        setAddressSuggestions([]);
        setSuggestionError(data.error_message || data.status || 'No suggestions found');
      }
    } catch (err: any) {
      setAddressSuggestions([]);
      setSuggestionError('Failed to fetch suggestions');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Debounce fetching suggestions on input change
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchAddressSuggestions(modalAddressValue);
    }, 300);
    return () => clearTimeout(handler);
  }, [modalAddressValue]);

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

  // Controls which address field is being edited (null, 'pickup', or 'delivery')
  const [editingField, setEditingField] = useState<null | 'pickup' | 'delivery'>(null);
  useEffect(() => {
    if (editingField === 'pickup') {
      setModalAddressValue(pickup);
    } else if (editingField === 'delivery') {
      setModalAddressValue(delivery);
    }
    if (editingField === null) {
      setModalAddressValue('');
    }
  }, [editingField]);

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
      const isWeb = Platform.OS === 'web';
      const corsPrefix = isWeb ? 'https://corsproxy.io/?' : '';
      const directionsUrl = `${corsPrefix}https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(directionsUrl);
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
      {Platform.OS === 'web' ? (
        <View
        style={[
          { width: '100%', maxWidth: 400, alignSelf: 'center', marginTop: 24 },
          Platform.OS !== 'web' && {
            flex: 1,
            flexDirection: 'column',
            justifyContent: 'flex-start',
            gap: 18,
            minHeight: 320,
          },
        ]}
      >
        <Text style={styles.title}>Create New Order</Text>
        {/* Pickup Field (read-only) */}
        <TouchableOpacity
          style={[
            styles.input,
            { justifyContent: 'center', backgroundColor: '#EDF2F7', marginBottom: 4 },
            pickupError ? { borderColor: '#E53E3E' } : {},
          ]}
          activeOpacity={0.7}
          onPress={() => {
            setEditingField('pickup');
          }}
        >
          <Text style={{ color: pickup ? '#2D3748' : '#A0AEC0', fontSize: 16 }}>
            {pickup || 'Pick Up Address'}
          </Text>
          {pickup && (
            <TouchableOpacity
              onPress={() => { setPickup(''); setPickupCoords(null); }}
              style={{ position: 'absolute', right: 8, top: 0, bottom: 0, justifyContent: 'center' }}
            >
              <Ionicons name="close-circle" size={22} color="#A0AEC0" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
        {pickupError ? <Text style={{ color: '#E53E3E', marginTop: 2, marginLeft: 4 }}>{pickupError}</Text> : <View style={{ height: 4 }}><Text>{' '}</Text></View>}

        {/* Delivery Field (read-only) */}
        <TouchableOpacity
          style={[
            styles.input,
            { justifyContent: 'center', backgroundColor: '#EDF2F7', marginBottom: 4 },
            deliveryError ? { borderColor: '#E53E3E' } : {},
          ]}
          activeOpacity={0.7}
          onPress={() => {
            setEditingField('delivery');
          }}
        >
          <Text style={{ color: delivery ? '#2D3748' : '#A0AEC0', fontSize: 16 }}>
            {delivery || 'Delivery Address'}
          </Text>
          {delivery && (
            <TouchableOpacity
              onPress={() => { setDelivery(''); setDeliveryCoords(null); setSelectedAddressIdx(null); }}
              style={{ position: 'absolute', right: 8, top: 0, bottom: 0, justifyContent: 'center' }}
            >
              <Ionicons name="close-circle" size={22} color="#A0AEC0" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
        {deliveryError ? <Text style={{ color: '#E53E3E', marginTop: 2, marginLeft: 4 }}>{deliveryError}</Text> : <View style={{ height: 4 }}><Text>{' '}</Text></View>}

        {/* Address Search Modal */}
        <Modal
          visible={!!editingField}
          transparent
          animationType="slide"
          onRequestClose={() => setEditingField(null)}
        >
          <View style={[styles.modalOverlay, Platform.OS !== 'web' ? { justifyContent: 'flex-start', paddingTop: 48 } : {}]}>
            <View style={[
              styles.modalContent,
              Platform.OS !== 'web'
                ? { width: '100%', alignSelf: 'flex-start', minHeight: 300, maxWidth: '100%' }
                : { width: '90%', maxWidth: 400 },
              { padding: 0, alignItems: 'stretch' },
            ]}> 
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderColor: '#E2E8F0' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 18 }}>
                  {editingField === 'pickup' ? 'Select Pick Up Address' : 'Select Delivery Address'}
                </Text>
                <TouchableOpacity onPress={() => setEditingField(null)}>
                  <Ionicons name="close-outline" size={28} color="#A0AEC0" />
                </TouchableOpacity>
              </View>
              <KeyboardAvoidingView
                style={{ flex: 1 }}
              >
                <PaperTextInput
                value={modalAddressValue}
                onChangeText={setModalAddressValue}
                placeholder="Full Address"
                style={[styles.input, { margin: 16, marginBottom: 0, width: '90%', padding: 0, }]}
                right={modalAddressValue ? <PaperTextInput.Icon icon="close" onPress={() => setModalAddressValue('')} /> : null}
                autoFocus={true}
                underlineColor="rgb(49, 130, 206)"
                activeUnderlineColor="rgb(49, 130, 206)"
                activeOutlineColor="rgb(49, 130, 206)"
                />
                {loadingSuggestions && (
                  <ActivityIndicator style={{ marginTop: 8, alignSelf: 'center' }} />
                )}
                {suggestionError && (
                  <Text style={{ color: '#E53E3E', marginTop: 8, alignSelf: 'center' }}>{suggestionError}</Text>
                )}
                <FlatList
                  data={addressSuggestions}
                  keyExtractor={(item: { place_id: string }) => item.place_id}
                  style={{ backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 8, maxHeight: 220, borderWidth: 1, borderColor: '#CBD5E0', marginTop: 4 }}
                  renderItem={({ item }: { item: { description: string; place_id: string } }) => (
                    <TouchableOpacity
                    style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}
                    onPress={async () => {
                      // Fetch place details for coordinates
                      try {
                        setLoadingSuggestions(true);
                        const isWeb = Platform.OS === 'web';
                        const corsPrefix = isWeb ? 'https://corsproxy.io/?' : '';
                        const detailsUrl = `${corsPrefix}https://maps.googleapis.com/maps/api/place/details/json?place_id=${item.place_id}&key=${GOOGLE_MAPS_API_KEY}&language=es`;
                        const detailsRes = await fetch(detailsUrl);
                        const detailsData = await detailsRes.json();
                        const details = detailsData.result;
                        if (editingField === 'pickup') {
                          setPickup(item.description);
                          setPickupCoords(details && details.geometry && details.geometry.location ? { lat: details.geometry.location.lat, lng: details.geometry.location.lng } : null);
                          setPickupError('');
                        } else if (editingField === 'delivery') {
                          setDelivery(item.description);
                          setDeliveryCoords(details && details.geometry && details.geometry.location ? { lat: details.geometry.location.lat, lng: details.geometry.location.lng } : null);
                          setDeliveryError('');
                          setSelectedAddressIdx(null);
                        }
                        setEditingField(null);
                        setModalAddressValue('');
                        setAddressSuggestions([]);
                      } catch (err) {
                        setSuggestionError('Failed to fetch address details');
                      } finally {
                        setLoadingSuggestions(false);
                      }
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>{item.description}</Text>
                  </TouchableOpacity>
                )}
              ListEmptyComponent={
                !loadingSuggestions && modalAddressValue.length > 1 && !suggestionError
                  ? <Text style={{ textAlign: 'center', margin: 12, color: '#A0AEC0' }}>No suggestions</Text>
                  : null
                }
                />
              </KeyboardAvoidingView>
            </View>
          </View>
        </Modal>

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
        {itemsError ? <Text style={{ color: '#E53E3E', marginBottom: 8, marginLeft: 4 }}>{itemsError}</Text> : <View style={{ height: 8 }}><Text>{' '}</Text></View>}

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
      ) : (
        <ScrollView
        contentContainerStyle={{
          alignItems: 'center',
          paddingTop: 24,
          paddingBottom: 32,
          minHeight: 320,
          flexGrow: 1,
        }}
        keyboardShouldPersistTaps="handled"
        >
        <View
          style={{
            flex: 1,
            alignSelf: 'stretch',
            maxWidth: '100%',
            paddingHorizontal: 0,
          }}
        >
        <Text style={styles.title}>Create New Order</Text>
        {/* Pickup Field (read-only) */}
        <TouchableOpacity
          style={[
            styles.input,
            { justifyContent: 'center', backgroundColor: '#EDF2F7', marginBottom: 4 },
            pickupError ? { borderColor: '#E53E3E' } : {},
          ]}
          activeOpacity={0.7}
          onPress={() => {
            setEditingField('pickup');
          }}
        >
          <Text style={{ color: pickup ? '#2D3748' : '#A0AEC0', fontSize: 16 }}>
            {pickup || 'Pick Up Address'}
          </Text>
          {pickup && (
            <TouchableOpacity
              onPress={() => { setPickup(''); setPickupCoords(null); }}
              style={{ position: 'absolute', right: 8, top: 0, bottom: 0, justifyContent: 'center' }}
            >
              <Ionicons name="close-circle" size={22} color="#A0AEC0" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
        {pickupError ? <Text style={{ color: '#E53E3E', marginTop: 2, marginLeft: 4 }}>{pickupError}</Text> : <View style={{ height: 4 }}><Text>{' '}</Text></View>}

        {/* Delivery Field (read-only) */}
        <TouchableOpacity
          style={[
            styles.input,
            { justifyContent: 'center', backgroundColor: '#EDF2F7', marginBottom: 4 },
            deliveryError ? { borderColor: '#E53E3E' } : {},
          ]}
          activeOpacity={0.7}
          onPress={() => {
            setEditingField('delivery');
          }}
        >
          <Text style={{ color: delivery ? '#2D3748' : '#A0AEC0', fontSize: 16 }}>
            {delivery || 'Delivery Address'}
          </Text>
          {delivery && (
            <TouchableOpacity
              onPress={() => { setDelivery(''); setDeliveryCoords(null); setSelectedAddressIdx(null); }}
              style={{ position: 'absolute', right: 8, top: 0, bottom: 0, justifyContent: 'center' }}
            >
              <Ionicons name="close-circle" size={22} color="#A0AEC0" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
        {deliveryError ? <Text style={{ color: '#E53E3E', marginTop: 2, marginLeft: 4 }}>{deliveryError}</Text> : <View style={{ height: 4 }}><Text>{' '}</Text></View>}

        {/* Address Search Modal */}
        <Modal
          visible={!!editingField}
          transparent
          animationType="slide"
          onRequestClose={() => setEditingField(null)}
        >
          <View style={[styles.modalOverlay, { justifyContent: 'flex-start', paddingTop: 48 }]}>
            <View style={[
              styles.modalContent,
              { width: '100%', alignSelf: 'flex-start', minHeight: 300, maxWidth: '100%' },
              { padding: 0, alignItems: 'stretch' },
            ]}> 
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderColor: '#E2E8F0' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 18 }}>
                  {editingField === 'pickup' ? 'Select Pick Up Address' : 'Select Delivery Address'}
                </Text>
                <TouchableOpacity onPress={() => setEditingField(null)}>
                  <Ionicons name="close-outline" size={28} color="#A0AEC0" />
                </TouchableOpacity>
              </View>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
              >
                <PaperTextInput
                value={modalAddressValue}
                onChangeText={setModalAddressValue}
                placeholder="Full Address"
                style={[styles.input, { margin: 16, marginBottom: 0, width: '90%', padding: 0, }]}
                right={modalAddressValue ? <PaperTextInput.Icon icon="close" onPress={() => setModalAddressValue('')} /> : null}
                autoFocus={true}
                underlineColor="rgb(49, 130, 206)"
                activeUnderlineColor="rgb(49, 130, 206)"
                activeOutlineColor="rgb(49, 130, 206)"
                />
                {loadingSuggestions && (
                  <ActivityIndicator style={{ marginTop: 8, alignSelf: 'center' }} />
                )}
                {suggestionError && (
                  <Text style={{ color: '#E53E3E', marginTop: 8, alignSelf: 'center' }}>{suggestionError}</Text>
                )}
                <FlatList
                  data={addressSuggestions}
                  keyExtractor={(item: { place_id: string }) => item.place_id}
                  style={{ backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 8, maxHeight: 220, borderWidth: 1, borderColor: '#CBD5E0', marginTop: 4 }}
                  renderItem={({ item }: { item: { description: string; place_id: string } }) => (
                    <TouchableOpacity
                    style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}
                    onPress={async () => {
                      // Fetch place details for coordinates
                      try {
                        setLoadingSuggestions(true);
                        const isWeb = Platform.OS === 'web';
                        const corsPrefix = isWeb ? 'https://corsproxy.io/?' : '';
                        const detailsUrl = `${corsPrefix}https://maps.googleapis.com/maps/api/place/details/json?place_id=${item.place_id}&key=${GOOGLE_MAPS_API_KEY}&language=es`;
                        const detailsRes = await fetch(detailsUrl);
                        const detailsData = await detailsRes.json();
                        const details = detailsData.result;
                        if (editingField === 'pickup') {
                          setPickup(item.description);
                          setPickupCoords(details && details.geometry && details.geometry.location ? { lat: details.geometry.location.lat, lng: details.geometry.location.lng } : null);
                          setPickupError('');
                        } else if (editingField === 'delivery') {
                          setDelivery(item.description);
                          setDeliveryCoords(details && details.geometry && details.geometry.location ? { lat: details.geometry.location.lat, lng: details.geometry.location.lng } : null);
                          setDeliveryError('');
                          setSelectedAddressIdx(null);
                        }
                        setEditingField(null);
                        setModalAddressValue('');
                        setAddressSuggestions([]);
                      } catch (err) {
                        setSuggestionError('Failed to fetch address details');
                      } finally {
                        setLoadingSuggestions(false);
                      }
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>{item.description}</Text>
                  </TouchableOpacity>
                )}
              ListEmptyComponent={
                !loadingSuggestions && modalAddressValue.length > 1 && !suggestionError
                  ? <Text style={{ textAlign: 'center', margin: 12, color: '#A0AEC0' }}>No suggestions</Text>
                  : null
                }
                />
              </KeyboardAvoidingView>
            </View>
          </View>
        </Modal>

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
        {itemsError ? <Text style={{ color: '#E53E3E', marginBottom: 8, marginLeft: 4 }}>{itemsError}</Text> : <View style={{ height: 8 }}><Text>{' '}</Text></View>}

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
        </ScrollView>
      )}
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


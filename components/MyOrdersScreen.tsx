
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

const MyOrdersScreen = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setLoading(false);
      setUserId(null);
      return;
    }
    setUserId(user.id);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setOrders(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.orderItem}
      onPress={() => {
        setSelectedOrder(item);
        setModalVisible(true);
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={styles.orderId}>#{item.id}</Text>
        <Text style={styles.status}>{item.status}</Text>
      </View>
      <Text style={styles.address}>From: {item.pickup_address}</Text>
      <Text style={styles.address}>To: {item.delivery_address}</Text>
      <View style={{ flexDirection: 'row', marginTop: 4 }}>
        <Text style={styles.meta}>Distance: {item.distance ? item.distance.toFixed(2) : '-'} km</Text>
        <Text style={styles.meta}>  |  Price: €{item.est_price ? item.est_price.toFixed(2) : '-'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <Text style={styles.title}>My Orders</Text>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 14, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, backgroundColor: '#EDF2F7' }}
          onPress={fetchOrders}
          disabled={loading}
        >
          <Ionicons name="refresh" size={20} color={loading ? '#A0AEC0' : '#3182CE'} style={{ marginRight: 4 }} />
          <Text style={{ color: loading ? '#A0AEC0' : '#3182CE', fontWeight: 'bold', fontSize: 15 }}>Refresh</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#3182CE" style={{ marginTop: 40 }} />
      ) : orders.length === 0 ? (
        <Text style={{ marginTop: 32, color: '#718096', fontSize: 16 }}>No orders found.</Text>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 16 }}
        />
      )}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedOrder && (
              <>
                <Text style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 12 }}>Order #{selectedOrder.id}</Text>
                <Text style={{ marginBottom: 4 }}><Text style={{ fontWeight: 'bold' }}>Pick Up:</Text> {selectedOrder.pickup_address}</Text>
                <Text style={{ marginBottom: 4 }}><Text style={{ fontWeight: 'bold' }}>Delivery:</Text> {selectedOrder.delivery_address}</Text>
                <Text style={{ marginBottom: 4 }}><Text style={{ fontWeight: 'bold' }}>Items:</Text> {Array.isArray(selectedOrder.item_list) ? selectedOrder.item_list.join(', ') : selectedOrder.item_list}</Text>
                <Text style={{ marginBottom: 4 }}><Text style={{ fontWeight: 'bold' }}>Distance:</Text> {selectedOrder.distance ? selectedOrder.distance.toFixed(2) : '-'} km</Text>
                <Text style={{ marginBottom: 4 }}><Text style={{ fontWeight: 'bold' }}>Estimated Price:</Text> €{selectedOrder.est_price ? selectedOrder.est_price.toFixed(2) : '-'}</Text>
                <Text style={{ marginBottom: 4 }}><Text style={{ fontWeight: 'bold' }}>Status:</Text> {selectedOrder.status}</Text>
                <Text style={{ marginBottom: 8, color: '#718096', fontSize: 12 }}>Created: {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString() : '-'}</Text>
                <TouchableOpacity
                  style={{ marginTop: 12, alignSelf: 'flex-end', backgroundColor: '#3182CE', paddingVertical: 8, paddingHorizontal: 18, borderRadius: 8 }}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2D3748',
    alignSelf: 'center',
  },
  orderItem: {
    backgroundColor: '#F7FAFC',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#CBD5E0',
  },
  orderId: {
    fontWeight: 'bold',
    color: '#3182CE',
    fontSize: 16,
  },
  status: {
    fontWeight: 'bold',
    color: '#4A5568',
    fontSize: 15,
  },
  address: {
    color: '#2D3748',
    fontSize: 15,
    marginTop: 4,
  },
  meta: {
    color: '#4A5568',
    fontSize: 13,
    marginRight: 8,
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

export default MyOrdersScreen;

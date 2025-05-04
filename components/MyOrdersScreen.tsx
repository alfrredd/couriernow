
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ActivityIndicator, ScrollView, Platform, RefreshControl, StatusBar } from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

const MyOrdersScreen = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  // Realtime badge state
  const [hasNewNotification, setHasNewNotification] = useState(false);

  // Realtime notification badge
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (!notifModalVisible) {
            setHasNewNotification(true);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, notifModalVisible]);

  // Open/close notification modal handlers
  const handleOpenNotifications = async () => {
    setNotifModalVisible(true);
    setHasNewNotification(false);
    await fetchNotifications();
  };
  const handleCloseNotifications = () => {
    setNotifModalVisible(false);
    fetchOrders();
  };


  // Fetch notifications for the user
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    setNotifLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setNotifications(data);
    }
    setNotifLoading(false);
  }, [userId]);

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

  // Refresh orders when tab is focused
  require('@react-navigation/native').useFocusEffect(
    require('react').useCallback(() => {
      fetchOrders();
    }, [fetchOrders])
  );

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
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, ...(Platform.OS === 'web' ? { marginTop: 16 } : {}) }}>
        <View style={{ flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
          <Text style={styles.title}>My Orders</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {Platform.OS === 'web' && (
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, backgroundColor: '#EDF2F7' }}
              onPress={fetchOrders}
              disabled={loading}
            >
              <Ionicons name="refresh" size={20} color={loading ? '#A0AEC0' : '#3182CE'} style={{ marginRight: 4 }} />
              <Text style={{ color: loading ? '#A0AEC0' : '#3182CE', fontWeight: 'bold', fontSize: 15 }}>Refresh</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 24, backgroundColor: '#EDF2F7', marginRight: 8 }}
            onPress={handleOpenNotifications}
          >
            <View style={{ position: 'relative', marginRight: 7 }}>
              <Ionicons name="notifications-outline" size={22} color="#3182CE" />
              {hasNewNotification && (
                <View style={{
                  position: 'absolute',
                  right: -2,
                  top: -2,
                  backgroundColor: 'red',
                  borderRadius: 6,
                  width: 12,
                  height: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <View style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'white',
                  }} />
                </View>
              )}
            </View>
            <Text style={{ fontSize: 16, color: '#3182CE', fontWeight: hasNewNotification ? 'bold' : 'normal' }}>Notifications</Text>
          </TouchableOpacity>
        </View>
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
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator size="large" color="#3182CE" style={{ marginTop: 32 }} />
            ) : (
              <Text style={{ color: '#A0AEC0', fontSize: 16, textAlign: 'center', marginTop: 24 }}>No orders found.</Text>
            )
          }
          {...(Platform.OS !== 'web' ? {
            refreshControl: (
              <RefreshControl refreshing={loading} onRefresh={fetchOrders} colors={["#3182CE"]} />
            )
          } : {})}
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
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                  {selectedOrder.status === 'Awaiting Courier' && (
                    <TouchableOpacity
                      style={{ backgroundColor: '#E53E3E', paddingVertical: 8, paddingHorizontal: 18, borderRadius: 8 }}
                      onPress={async () => {
                        if (!userId) return;
                        // Update order status
                        await supabase.from('orders').update({ active: false, status: 'Cancelled by User' }).eq('id', selectedOrder.id);
                        // Insert into orders_changelog
                        const { error: changelogError } = await supabase.from('orders_changelog').insert({
                          order_id: selectedOrder.id,
                          status: 'Cancelled by User',
                          message: 'user cancelled',
                          author_id: userId
                        });
                        if (changelogError) {
                          console.log('orders_changelog insert error:', changelogError);
                        }
                        // Call Edge Function to notify order status
                        try {
                          const { data: { session } } = await supabase.auth.getSession();
                          await fetch('https://lvshbizilwcxeaojsrvo.functions.supabase.co/notify_order_status', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              ...(session && session.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
                            },
                            body: JSON.stringify({
                              order_id: selectedOrder.id,
                              user_id: userId,
                              status: 'Cancelled by User',
                              message: 'Your order status is now: Cancelled by User'
                            })
                          });
                        } catch (e) {
                          console.log('Edge Function notify_order_status error:', e);
                        }
                        setModalVisible(false);
                        fetchOrders();
                      }}
                    >
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancel Order</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={{ backgroundColor: '#3182CE', paddingVertical: 8, paddingHorizontal: 18, borderRadius: 8 }}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    {/* Notifications Modal */}
    <Modal
      visible={notifModalVisible}
      transparent
      animationType="fade"
      onRequestClose={handleCloseNotifications}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: 430, width: 350 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18 }}>Notifications</Text>
            <TouchableOpacity onPress={() => setNotifModalVisible(false)}>
              <Ionicons name="close-outline" size={24} color="#A0AEC0" />
            </TouchableOpacity>
          </View>
          {notifLoading ? (
            <ActivityIndicator size="small" color="#3182CE" style={{ marginTop: 20 }} />
          ) : notifications.length === 0 ? (
            <Text style={{ color: '#718096', fontSize: 15, textAlign: 'center', marginTop: 18 }}>No notifications yet.</Text>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <View style={{ marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 8 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#3182CE' }}>{item.title}</Text>
                  <Text style={{ color: '#2D3748', fontSize: 14, marginTop: 2 }}>{item.body}</Text>
                  <Text style={{ color: '#A0AEC0', fontSize: 12, marginTop: 2 }}>{item.created_at ? new Date(item.created_at).toLocaleString() : ''}</Text>
                </View>
              )}
              style={{ marginTop: 4 }}
            />
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

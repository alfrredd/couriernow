import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Platform, StatusBar } from 'react-native';
import { View, Text, StyleSheet, Button, Alert, Modal, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

const ProfileScreen = () => {
  const [addresses, setAddresses] = useState<{ name: string; address: string }[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [addressError, setAddressError] = useState('');

  // Fetch addresses on mount
  useEffect(() => {
    const fetchAddresses = async () => {
      setLoadingAddresses(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setLoadingAddresses(false);
        return;
      }
      const { data, error } = await supabase.from('users').select('addresses').eq('id', user.id).single();
      if (!error && data && Array.isArray(data.addresses)) {
        // Parse each address string as JSON
        const parsed = data.addresses
          .slice(0, 5)
          .map((addr: any) => (typeof addr === 'string' ? JSON.parse(addr) : addr));
        setAddresses(parsed);
      }
      setLoadingAddresses(false);
    };
    fetchAddresses();
  }, []);

  // Edit address
  const handleEditAddress = (idx: number) => {
    setEditName(addresses[idx].name);
    setEditAddress(addresses[idx].address);
    setEditingIndex(idx);
    setShowEditModal(true);
    setAddressError('');
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || !editAddress.trim()) {
      setAddressError('Both fields are required.');
      return;
    }
    const updated = [...addresses];
    updated[editingIndex!] = { name: editName.trim(), address: editAddress.trim() };
    await saveAddresses(updated);
    setShowEditModal(false);
    setEditingIndex(null);
  };

  // New address
  const handleAddNew = () => {
    setEditName('');
    setEditAddress('');
    setShowNewModal(true);
    setAddressError('');
  };

  const handleSaveNew = async () => {
    if (!editName.trim() || !editAddress.trim()) {
      setAddressError('Both fields are required.');
      return;
    }
    if (addresses.length >= 5) {
      setAddressError('You can only save up to 5 addresses.');
      return;
    }
    const updated = [...addresses, { name: editName.trim(), address: editAddress.trim() }];
    await saveAddresses(updated);
    setShowNewModal(false);
  };

  // Save to users table
  const saveAddresses = async (updated: { name: string; address: string }[]) => {
    setLoadingAddresses(true);
    setAddressError('');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setAddressError('User error');
      setLoadingAddresses(false);
      return;
    }
    // Stringify each address before saving
    const toSave = updated.map(addr => JSON.stringify(addr));
    const { error } = await supabase.from('users').update({ addresses: toSave }).eq('id', user.id);
    if (!error) setAddresses(updated);
    else setAddressError('Failed to save addresses.');
    setLoadingAddresses(false);
  };

  const navigation = useNavigation();
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editProfileName, setEditProfileName] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setLoading(false);
        Alert.alert('Error', 'Could not get user info.');
        return;
      }
      setUserId(user.id);
      setUserEmail(user.email || '');
      // Fetch name from users table
      const { data, error } = await supabase.from('users').select('name').eq('id', user.id).single();
      if (error) {
        setUserName('');
      } else {
        setUserName(data.name || '');
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Logout failed', error.message);
    }
  };

  const openEditModal = () => {
    setEditProfileName(userName);
    setEditModalVisible(true);
  };

  const handleConfirmEdit = async () => {
    if (!editProfileName.trim()) {
      setEditModalVisible(false);
      return;
    }
    setUpdating(true);
    const { error } = await supabase.from('users').update({ name: editProfileName }).eq('id', userId!);
    setUpdating(false);
    setEditModalVisible(false);
    if (error) {
      Alert.alert('Failed to update name', error.message);
      return;
    }
    setUserName(editProfileName);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3182CE" />
      </View>
    );
  }

  // Add extra top padding for mobile
  const extraTopPadding = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 24;

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ alignItems: 'center', marginBottom: 32 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Text style={styles.text}>{userName}</Text>
          <TouchableOpacity onPress={openEditModal} style={{ marginLeft: 8 }}>
            <Ionicons name="pencil" size={20} color="#3182CE" />
          </TouchableOpacity>
        </View>
        <Text style={{ color: '#4A5568', fontSize: 16 }}>{userEmail}</Text>
      </View>
      <TouchableOpacity
        onPress={handleLogout}
        style={{ position: 'absolute', top: extraTopPadding, right: 24, zIndex: 100 }}
        accessibilityLabel="Log Out"
      >
        <View style={{ backgroundColor: '#3182CE', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 18 }}>
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>Log Out</Text>
        </View>
      </TouchableOpacity>
      {/* My Addresses Section */}
      <View style={{ marginTop: 32, width: '80%', alignItems: 'stretch' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginRight: 16 }}>My Addresses</Text>
          <TouchableOpacity
            onPress={handleAddNew}
            disabled={addresses.length >= 5}
            style={{ backgroundColor: addresses.length < 5 ? '#3182CE' : '#A0AEC0', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8 }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>New Address</Text>
          </TouchableOpacity>
        </View>
        {addresses.length === 0 ? (
          <Text style={{ color: '#718096', fontSize: 15, marginVertical: 10, textAlign: 'center' }}>
            No addresses saved. Click 'New Address' to add one!
          </Text>
        ) : (
          addresses.map((addr, idx) => (
            <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#E2E8F0' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{addr.name}</Text>
                <Text style={{ color: '#4A5568', fontSize: 15 }}>{addr.address}</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleEditAddress(idx)}
                style={{ backgroundColor: '#A0AEC0', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 8, marginLeft: 12 }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Edit</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={{ fontSize: 18, marginBottom: 12 }}>Edit Name</Text>
            <TextInput
              style={styles.input}
              value={editProfileName}
              onChangeText={setEditProfileName}
              autoFocus
              placeholder="Your Name"
              autoCapitalize="words"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
              <Button title="Cancel" color="#A0AEC0" onPress={() => setEditModalVisible(false)} />
              <View style={{ width: 12 }} />
              <Button title={updating ? 'Updating...' : 'Confirm Change'} color="#3182CE" onPress={handleConfirmEdit} disabled={updating} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Address Modal */}
      <Modal visible={showEditModal} transparent animationType="fade" onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Close Icon */}
            <TouchableOpacity
              onPress={() => setShowEditModal(false)}
              style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={24} color="#A0AEC0" />
            </TouchableOpacity>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12, textAlign: 'center' }}>Edit Address</Text>
            <Text style={{ marginBottom: 4 }}>Name</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="e.g. Home, Work"
              maxLength={20}
            />
            <Text style={{ marginBottom: 4, marginTop: 8 }}>Address</Text>
            <TextInput
              style={styles.input}
              value={editAddress}
              onChangeText={setEditAddress}
              placeholder="Enter address"
              maxLength={100}
            />
            {addressError ? <Text style={{ color: '#E53E3E', marginTop: 8 }}>{addressError}</Text> : null}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 18, alignItems: 'center' }}>
              <TouchableOpacity
                onPress={async () => {
                  // Delete address
                  if (editingIndex !== null && editingIndex >= 0) {
                    const updated = addresses.filter((_, idx) => idx !== editingIndex);
                    await saveAddresses(updated);
                    setShowEditModal(false);
                  }
                }}
                style={{ backgroundColor: '#E53E3E', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, marginRight: 12 }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveEdit}
                style={{ backgroundColor: '#3182CE', paddingVertical: 8, paddingHorizontal: 18, borderRadius: 8 }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* New Address Modal */}
      <Modal
        visible={showNewModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>New Address</Text>
            <Text style={{ marginBottom: 4 }}>Name</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="e.g. Home, Work"
              maxLength={20}
            />
            <Text style={{ marginBottom: 4, marginTop: 8 }}>Address</Text>
            <TextInput
              style={styles.input}
              value={editAddress}
              onChangeText={setEditAddress}
              placeholder="Enter address"
              maxLength={100}
            />
            {addressError ? <Text style={{ color: '#E53E3E', marginTop: 8 }}>{addressError}</Text> : null}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end',alignItems: 'center', marginTop: 18 }}>
              <TouchableOpacity
                onPress={() => setShowNewModal(false)}
                style={{ marginRight: 12 }}
              >
                <Text style={{ color: '#3182CE', fontWeight: 'bold', fontSize: 16, textAlignVertical: 'center', textAlign: 'center' }}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveNew}
                style={{ backgroundColor: '#3182CE', paddingVertical: 8, paddingHorizontal: 18, borderRadius: 8, justifyContent: 'center', alignItems: 'center', height: 40, minWidth: 70 }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, textAlignVertical: 'center', textAlign: 'center' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 22,
    color: '#2D3748',
    fontWeight: 'bold',
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
    width: 320,
    boxShadow: '0px 2px 4px rgba(0,0,0,0.2)',
    elevation: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F7FAFC',
  },
});

export default ProfileScreen;

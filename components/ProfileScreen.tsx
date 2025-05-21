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
  const [userTelephone, setUserTelephone] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfileTelephone, setEditProfileTelephone] = useState('');
  const [updating, setUpdating] = useState(false);
  const [supportModalVisible, setSupportModalVisible] = useState(false);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [editError, setEditError] = useState('');

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
      // Fetch name and telephone from users table
      const { data, error } = await supabase.from('users').select('name, telephone').eq('id', user.id).single();
      if (error) {
        setUserName('');
        setUserTelephone('');
      } else {
        setUserName(data.name || '');
        setUserTelephone(data.telephone || '');
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
    setEditProfileTelephone(userTelephone);
    setEditModalVisible(true);
  };

  const handleConfirmEdit = async () => {
    if (!editProfileName.trim()) {
      setEditError('Name is required');
      return;
    }
    if (!editProfileTelephone.trim()) {
      setEditError('Phone number is required');
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase.from('users').update({ 
        name: editProfileName,
        telephone: editProfileTelephone
      }).eq('id', userId!);
      setUpdating(false);
      setEditModalVisible(false);
      setEditError('');
      if (error) {
        Alert.alert('Failed to update profile', error.message);
        return;
      }
      setUserName(editProfileName);
      setUserTelephone(editProfileTelephone);
    } catch (error) {
      setUpdating(false);
      Alert.alert('Failed to update profile', error instanceof Error ? error.message : 'An unexpected error occurred');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3182CE" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topSection}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            onPress={() => setSupportModalVisible(true)}
            style={styles.supportButton}
          >
            <Text style={styles.supportButtonText}>Contact Support</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleLogout}
            accessibilityLabel="Log Out"
          >
            <View style={styles.logoutButton}>
              <Text style={styles.logoutButtonText}>Log Out</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.userInfoCard}>
        <View style={styles.userInfoContainer}>
          <View style={styles.iconTextContainer}>
            <Ionicons name="person" size={20} color="#3182CE" style={{ marginRight: 8 }} />
            <Text style={styles.name}>{userName}</Text>
          </View>
          {userTelephone && (
            <View style={styles.iconTextContainer}>
              <Ionicons name="call" size={20} color="#3182CE" style={{ marginRight: 8 }} />
              <Text style={styles.telephone}>{userTelephone}</Text>
            </View>
          )}
          <View style={styles.iconTextContainer}>
            <Ionicons name="mail" size={20} color="#3182CE" style={{ marginRight: 8 }} />
            <Text style={styles.email}>{userEmail}</Text>
          </View>
        </View>
        <TouchableOpacity 
          onPress={openEditModal} 
          style={styles.editButton}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>
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
        visible={supportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSupportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={{ fontSize: 18, marginBottom: 16 }}>Contact Support</Text>
            <TextInput
              style={styles.input}
              value={supportSubject}
              onChangeText={setSupportSubject}
              placeholder="Subject"
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              value={supportMessage}
              onChangeText={setSupportMessage}
              placeholder="Write your message"
              multiline
              numberOfLines={4}
            />
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setSupportModalVisible(false);
                  setSupportSubject('');
                  setSupportMessage('');
                }}
              >
                <Text style={styles.buttonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => {
                  // TODO: Implement support message sending
                  setSupportModalVisible(false);
                  setSupportSubject('');
                  setSupportMessage('');
                }}
              >
                <Text style={styles.buttonText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={{ fontSize: 18, marginBottom: 16 }}>Edit Profile</Text>
            <TextInput
              style={styles.input}
              value={editProfileName}
              onChangeText={setEditProfileName}
              placeholder="Your Name"
              autoCapitalize="words"
            />
            <TextInput
              style={[styles.input, { marginBottom: 2 }]}
              value={editProfileTelephone}
              onChangeText={setEditProfileTelephone}
              placeholder="Your Phone Number"
              keyboardType="phone-pad"
            />
            <Text style={styles.telephoneNote}>
              Couriers will contact you using this number
            </Text>
            {editError && (
              <Text style={styles.errorText}>{editError}</Text>
            )}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleConfirmEdit}
                disabled={updating}
              >
                <Text style={styles.buttonText}>
                  {updating ? 'Updating...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
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
    backgroundColor: '#fff',
    padding: 20,
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
    padding: 20,
  },
  contentSection: {
    flex: 1,
    padding: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutButtonContainer: {
    marginLeft: 16,
  },
  logoutButton: {
    backgroundColor: '#3182CE',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  supportButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3182CE',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 18,
    marginRight: 16,
  },
  errorText: {
    color: '#E53E3E',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  telephoneNote: {
    color: '#718096',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
    textAlign: 'center',
  },
  supportButtonText: {
    color: '#3182CE',
    fontWeight: 'bold',
    fontSize: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  userInfoCard: {
    backgroundColor: '#f0f7ff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    marginBottom: 20,
  },
  userInfoContainer: {
    marginBottom: 16,
  },
  name: {
    fontSize: 20,
    color: '#2D3748',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  telephone: {
    fontSize: 16,
    color: '#2D3748',
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
    color: '#2D3748',
  },
  iconTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  editButton: {
    backgroundColor: '#3182CE',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    elevation: 4
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    width: '100%',
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
  },
  cancelButton: {
    backgroundColor: '#A0AEC0',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginRight: 12,
  },
  saveButton: {
    backgroundColor: '#3182CE',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  }
});

export default ProfileScreen;

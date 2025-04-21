import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, Alert, Modal, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
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
    setEditName(userName);
    setEditModalVisible(true);
  };

  const handleConfirmEdit = async () => {
    if (!editName.trim()) {
      setEditModalVisible(false);
      return;
    }
    setUpdating(true);
    const { error } = await supabase.from('users').update({ name: editName }).eq('id', userId!);
    setUpdating(false);
    setEditModalVisible(false);
    if (error) {
      Alert.alert('Failed to update name', error.message);
      return;
    }
    setUserName(editName);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3182CE" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={{ alignItems: 'center', marginBottom: 32 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Text style={styles.text}>{userName}</Text>
          <TouchableOpacity onPress={openEditModal} style={{ marginLeft: 8 }}>
            <Ionicons name="pencil" size={20} color="#3182CE" />
          </TouchableOpacity>
        </View>
        <Text style={{ color: '#4A5568', fontSize: 16 }}>{userEmail}</Text>
      </View>
      <Button title="Log Out" onPress={handleLogout} color="#3182CE" />
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
              value={editName}
              onChangeText={setEditName}
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
    </View>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
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

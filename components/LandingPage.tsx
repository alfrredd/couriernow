import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface LandingPageProps {
  onLoginPress: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginPress }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>CourierNow</Text>
      <Text style={styles.subtitle}>Login to order now from couriers in your area</Text>
      <TouchableOpacity style={styles.button} onPress={onLoginPress}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
    </View>
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
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2D3748',
  },
  subtitle: {
    fontSize: 18,
    color: '#4A5568',
    marginBottom: 32,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#3182CE',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default LandingPage;

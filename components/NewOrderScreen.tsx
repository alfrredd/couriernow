import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const NewOrderScreen = () => (
  <View style={styles.container}>
    <Text style={styles.text}>New Order Page</Text>
  </View>
);

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
  },
});

export default NewOrderScreen;

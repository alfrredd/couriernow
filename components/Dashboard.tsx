import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import NewOrderScreen from './NewOrderScreen';
import MyOrdersScreen from './MyOrdersScreen';
import ProfileScreen from './ProfileScreen';
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

const Dashboard = () => (
  <Tab.Navigator
    initialRouteName="New Order"
    screenOptions={({ route }) => ({
      tabBarIcon: ({ color, size }) => {
        let iconName;
        if (route.name === 'New Order') {
          iconName = 'add-circle-outline';
        } else if (route.name === 'My Orders') {
          iconName = 'list-outline';
        } else if (route.name === 'Profile') {
          iconName = 'person-outline';
        }
        // @ts-ignore
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#3182CE',
      tabBarInactiveTintColor: 'gray',
    })}
  >
    <Tab.Screen name="New Order" component={NewOrderScreen} options={{ headerShown: false }} />
    <Tab.Screen name="My Orders" component={MyOrdersScreen} options={{ headerShown: false }} />
    <Tab.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
  </Tab.Navigator>
);

export default Dashboard;

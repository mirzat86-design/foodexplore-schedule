import 'react-native-gesture-handler';
import EmployeeMyScheduleScreen from './src/screens/EmployeeMyScheduleScreen';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import WelcomeScreen from './src/screens/WelcomeScreen';
import EmployeePinScreen from './src/screens/EmployeePinScreen';
import AdminLoginScreen from './src/screens/AdminLoginScreen';
import ScheduleScreen from './src/screens/ScheduleScreen';
import PositionCalendarScreen from './src/screens/PositionCalendarScreen';
import AnnouncementScreen from './src/screens/AnnouncementScreen';
import AdminHomeScreen from './src/screens/AdminHomeScreen';
import EmployeePoolScreen from './src/screens/EmployeePoolScreen';
import { ScheduleProvider } from './src/context/ScheduleContext';
import { Alert, TouchableOpacity, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { View, StyleSheet } from 'react-native';

// --- Prevent iOS Safari zoom on input focus ---
if (Platform.OS === 'web') {
  const metaViewport = document.querySelector('meta[name=viewport]');
  if (metaViewport) {
    metaViewport.setAttribute(
      'content',
      'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
    );
  } else {
    const newMeta = document.createElement('meta');
    newMeta.name = 'viewport';
    newMeta.content =
      'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
    document.head.appendChild(newMeta);
  }
  // Inject global CSS for full height and viewport stability on web
  const style = document.createElement('style');
  style.innerHTML = `
    :root, html, body { height: 100%; }
    #root { min-height: 100dvh; }
    @supports (height: 100dvh) {
      html, body, #root { height: 100dvh; }
    }
  `;
  document.head.appendChild(style);
}

// Prevent mobile web auto-zoom on inputs by loading a small web-only CSS
if (Platform.OS === 'web') {
  // @ts-ignore - CSS only exists/loads on web
  require('./global.css');
}

export type RootStackParamList = {
  Welcome: undefined;
  EmployeePin: undefined;
  EmployeeMySchedule: undefined;
  AdminLogin: undefined;
  AdminHome: undefined;         // 新增：管理员入口首页
  Schedule: undefined;
  PositionCalendar: { positionKey: string; positionName: string };
  Announcement: undefined;
  EmployeePool: undefined;       // 新增：员工池
};

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <ScheduleProvider>
      <SafeAreaProvider>
        <SafeAreaView
          style={[
            styles.appContainer,
            Platform.OS === 'web' ? ({ minHeight: '100dvh' } as any) : null,
          ]}
          edges={['top', 'bottom']}
        >
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName="Welcome"
              screenOptions={({ navigation }) => ({
                headerShown: true,
                headerStyle: { backgroundColor: '#173B88' },
                headerTitleStyle: { color: '#fff', fontWeight: '700' },
                headerTintColor: '#fff',
                headerLeft: () => (
                  <TouchableOpacity
                    onPress={() =>
                      navigation.canGoBack()
                        ? navigation.goBack()
                        : navigation.navigate('Welcome')
                    }
                    style={{ paddingHorizontal: 12, paddingVertical: 6 }}
                  >
                    <MaterialCommunityIcons name="chevron-left" size={26} color="#fff" />
                  </TouchableOpacity>
                ),
                headerRight: () => (
                  <TouchableOpacity
                    onPress={() =>
                      Alert.alert('Language / 语言', 'Choose a language / 选择语言', [
                        { text: 'Nederlands' },
                        { text: '中文' },
                        { text: 'Cancel', style: 'cancel' },
                      ])
                    }
                    style={{ paddingHorizontal: 12, paddingVertical: 6 }}
                  >
                    <MaterialCommunityIcons name="translate" size={22} color="#fff" />
                  </TouchableOpacity>
                ),
              })}
            >
              <Stack.Screen
                name="Welcome"
                component={WelcomeScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen name="EmployeePin" component={EmployeePinScreen} />
              <Stack.Screen name="EmployeeMySchedule" component={EmployeeMyScheduleScreen} />
              <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
              <Stack.Screen name="AdminHome" component={AdminHomeScreen} />
              <Stack.Screen name="Schedule" component={ScheduleScreen} />
              <Stack.Screen name="PositionCalendar" component={PositionCalendarScreen} />
              <Stack.Screen name="Announcement" component={AnnouncementScreen} />
              <Stack.Screen name="EmployeePool" component={EmployeePoolScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaView>
      </SafeAreaProvider>
    </ScheduleProvider>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#173B88',
    ...(Platform.OS === 'web' ? {} : { height: '100%' }),
  },
});
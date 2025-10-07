import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { positions } from '../constants/positions';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';

export default function ScheduleScreen({ navigation }: { navigation: StackNavigationProp<RootStackParamList, 'Schedule'> }) {
  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={positions}
        keyExtractor={(item) => item.key}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() =>
              navigation.navigate('PositionCalendar', {
                positionKey: item.key,
                positionName: item.name,
              })
            }>
            <Text style={styles.rowText}>{item.name}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ padding: 16 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: '#173B88',
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
  },
});
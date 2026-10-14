import React, { useRef } from 'react';
import { View } from 'react-native';
import MapView, { Marker, type MapPressEvent } from 'react-native-maps';
import type { FoundItem } from '../types';

export const SEOUL = { latitude: 37.5665, longitude: 126.9780, latitudeDelta: 0.035, longitudeDelta: 0.035 };

interface Props {
  items: FoundItem[];
  selectedId?: string | null;
  onSelect?: (item: FoundItem) => void;
  onPick?: (latitude: number, longitude: number) => void;
  picked?: { latitude: number; longitude: number } | null;
}

export default function MapCanvas({ items, selectedId, onSelect, onPick, picked }: Props) {
  const ref = useRef<MapView>(null);
  return (
    <View style={{ flex: 1, overflow: 'hidden' }}>
      <MapView ref={ref} style={{ flex: 1 }} initialRegion={SEOUL}
        showsCompass={false} showsPointsOfInterests={false} showsUserLocation={false}
        onPress={(event: MapPressEvent) => onPick?.(event.nativeEvent.coordinate.latitude, event.nativeEvent.coordinate.longitude)}>
        {items.map(item => (
          <Marker key={item.id} coordinate={{ latitude: item.latitude, longitude: item.longitude }}
            pinColor={selectedId === item.id ? '#006F68' : '#00A99B'} onPress={() => onSelect?.(item)}
            title={item.title} description={item.place} />
        ))}
        {picked && <Marker coordinate={picked} pinColor="#006F68" title="등록 위치" />}
      </MapView>
    </View>
  );
}

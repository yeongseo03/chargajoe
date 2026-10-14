import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { FoundItem } from '../types';

interface Props {
  items: FoundItem[];
  selectedId?: string | null;
  onSelect?: (item: FoundItem) => void;
  onPick?: (latitude: number, longitude: number) => void;
  picked?: { latitude: number; longitude: number } | null;
}

const bounds = { west: 126.952, east: 127.006, south: 37.543, north: 37.589 };
const mapUrl = 'https://www.openstreetmap.org/export/embed.html?bbox=126.952%2C37.543%2C127.006%2C37.589&layer=mapnik';
const position = (lat: number, lng: number) => ({
  left: `${Math.max(4, Math.min(90, ((lng - bounds.west) / (bounds.east - bounds.west)) * 100))}%` as `${number}%`,
  top: `${Math.max(4, Math.min(86, (1 - (lat - bounds.south) / (bounds.north - bounds.south)) * 100))}%` as `${number}%`,
});

export default function MapCanvas({ items, selectedId, onSelect, onPick, picked }: Props) {
  const [size, setSize] = useState({ width: 1, height: 1 });
  return <View onLayout={e => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
    style={{ flex: 1, overflow: 'hidden', backgroundColor: '#EBF2EE' }}>
    <View pointerEvents="none" style={{ flex: 1 }}>
      <WebView source={{ uri: mapUrl }} style={{ flex: 1, opacity: 0.88 }} scrollEnabled={false} />
    </View>
    {onPick && <Pressable onPress={e => {
      const x = Math.max(0, Math.min(1, e.nativeEvent.locationX / size.width));
      const y = Math.max(0, Math.min(1, e.nativeEvent.locationY / size.height));
      onPick(bounds.north - y * (bounds.north - bounds.south), bounds.west + x * (bounds.east - bounds.west));
    }} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} />}
    {items.map(item => <Pressable key={item.id} onPress={() => onSelect?.(item)}
      style={{ position: 'absolute', ...position(item.latitude, item.longitude), width: selectedId === item.id ? 42 : 36,
        height: selectedId === item.id ? 42 : 36, borderRadius: 22, backgroundColor: selectedId === item.id ? '#006F68' : '#00A99B',
        borderWidth: 3, borderColor: 'white', alignItems: 'center', justifyContent: 'center', elevation: 4 }}>
      <Text style={{ color: 'white', fontSize: 16 }}>⌕</Text>
    </Pressable>)}
    {picked && <View style={{ position: 'absolute', ...position(picked.latitude, picked.longitude), width: 18, height: 18,
      borderRadius: 9, backgroundColor: '#006F68', borderWidth: 3, borderColor: 'white' }} />}
  </View>;
}

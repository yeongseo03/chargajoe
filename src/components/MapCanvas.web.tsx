import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { FoundItem } from '../types';

interface Props {
  items: FoundItem[];
  selectedId?: string | null;
  onSelect?: (item: FoundItem) => void;
  onPick?: (latitude: number, longitude: number) => void;
  picked?: { latitude: number; longitude: number } | null;
}

const SEOUL: L.LatLngExpression = [37.5665, 126.978];

export default function MapCanvas({ items, selectedId, onSelect, onPick, picked }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemLayerRef = useRef<L.LayerGroup | null>(null);
  const pickedLayerRef = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  const onPickRef = useRef(onPick);

  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { onPickRef.current = onPick; }, [onPick]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = L.map(container, {
      zoomControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      dragging: true,
      touchZoom: true,
    }).setView(SEOUL, 13);
    map.attributionControl?.setPosition('topright');

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    }).addTo(map);

    itemLayerRef.current = L.layerGroup().addTo(map);
    pickedLayerRef.current = L.layerGroup().addTo(map);
    map.on('click', event => onPickRef.current?.(event.latlng.lat, event.latlng.lng));

    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(container);
    map.invalidateSize();

    return () => {
      resizeObserver.disconnect();
      map.remove();
      itemLayerRef.current = null;
      pickedLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const layer = itemLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    items.forEach(item => {
      const selected = item.id === selectedId;
      const marker = L.circleMarker([item.latitude, item.longitude], {
        radius: selected ? 19 : 16,
        weight: 3,
        color: '#FFFFFF',
        fillColor: selected ? '#006F68' : '#00A99B',
        fillOpacity: 1,
        bubblingMouseEvents: false,
      });
      marker.on('click', () => onSelectRef.current?.(item));
      marker.addTo(layer);
    });
  }, [items, selectedId]);

  useEffect(() => {
    const layer = pickedLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (picked) {
      L.circleMarker([picked.latitude, picked.longitude], {
        radius: 9,
        weight: 3,
        color: '#FFFFFF',
        fillColor: '#006F68',
        fillOpacity: 1,
        bubblingMouseEvents: false,
      }).addTo(layer);
    }
  }, [picked]);

  return (
    <View style={{ flex: 1, overflow: 'hidden', backgroundColor: '#EBF2EE' }}>
      <div ref={containerRef} aria-label="습득물 지도" style={{ width: '100%', height: '100%', position: 'relative', zIndex: 0 }} />
    </View>
  );
}

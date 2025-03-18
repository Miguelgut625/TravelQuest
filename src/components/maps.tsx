import React from 'react';
import { Platform } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

interface MapProps {
  initialRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  markers?: Array<{
    coordinate: {
      latitude: number;
      longitude: number;
    };
    title?: string;
    description?: string;
  }>;
  onMarkerPress?: (marker: any) => void;
}

const Map: React.FC<MapProps> = ({ initialRegion, markers, onMarkerPress }) => {
  return (
    <MapView
      style={{ flex: 1 }}
      initialRegion={initialRegion}
      showsUserLocation
      showsMyLocationButton
    >
      {markers?.map((marker, index) => (
        <Marker
          key={index}
          coordinate={marker.coordinate}
          title={marker.title}
          description={marker.description}
          onPress={() => onMarkerPress?.(marker)}
        />
      ))}
    </MapView>
  );
};

export default Map;

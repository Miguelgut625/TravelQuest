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
  console.log('Map render - initialRegion:', initialRegion);
  console.log('Map render - markers:', markers);

  return (
    <MapView
      style={{ flex: 1 }}
      initialRegion={initialRegion}
      showsUserLocation
      showsMyLocationButton
      onPress={(event) => {
        console.log('Map pressed:', event.nativeEvent);
        onMarkerPress?.(event.nativeEvent);
      }}
    >
      {markers?.map((marker, index) => {
        console.log('Rendering marker:', marker);
        return (
          <Marker
            key={index}
            coordinate={marker.coordinate}
            title={marker.title}
            description={marker.description}
            onPress={() => {
              console.log('Marker pressed:', marker);
              onMarkerPress?.(marker);
            }}
          />
        );
      })}
    </MapView>
  );
};

export default Map;

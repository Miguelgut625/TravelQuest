import React from 'react';
import { Platform, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

export const MapMarker = Marker;

interface MapProps {
  children?: React.ReactNode;
  style?: any;
  region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  onRegionChangeComplete?: (region: any) => void;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
}

const Map = ({ 
  children, 
  style, 
  region, 
  onRegionChangeComplete, 
  initialRegion, 
  showsUserLocation, 
  showsMyLocationButton 
}: MapProps) => {
  if (Platform.OS === 'web') {
    return (
      <View style={[{ width: '100%', height: '100%', overflow: 'hidden' }, style]}>
        <MapView
          style={{ width: '100%', height: '100%' }}
          region={region}
          onRegionChangeComplete={onRegionChangeComplete}
          initialRegion={initialRegion}
          showsUserLocation={showsUserLocation}
          showsMyLocationButton={showsMyLocationButton}
          provider={PROVIDER_GOOGLE}
          mapType="standard"
        >
          {children}
        </MapView>
      </View>
    );
  }

  return (
    <MapView
      style={[{ width: '100%', height: '100%' }, style]}
      region={region}
      onRegionChangeComplete={onRegionChangeComplete}
      initialRegion={initialRegion}
      showsUserLocation={showsUserLocation}
      showsMyLocationButton={showsMyLocationButton}
    >
      {children}
    </MapView>
  );
};

export default Map; 
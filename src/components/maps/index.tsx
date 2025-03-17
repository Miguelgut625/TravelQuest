import React from 'react';
import { Platform, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

interface MapMarkerProps {
  coordinate: {
    latitude: number;
    longitude: number;
  };
  title: string;
  description: string;
  [key: string]: any;
}

export const MapMarker: React.FC<MapMarkerProps> = ({ coordinate, title, description, ...props }) => (
  <Marker
    coordinate={coordinate}
    title={title}
    description={description}
    pinColor="#4CAF50"
    {...props}
  />
);

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
  onPress?: (event: any) => void;
}

const Map = ({ 
  children, 
  style, 
  region, 
  onRegionChangeComplete, 
  initialRegion, 
  showsUserLocation, 
  showsMyLocationButton,
  onPress 
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
          onPress={onPress}
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
      onPress={onPress}
    >
      {children}
    </MapView>
  );
};

export default Map; 
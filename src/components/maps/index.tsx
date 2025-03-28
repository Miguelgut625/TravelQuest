import React, { useState, useRef } from 'react';
import { Platform, View, StyleProp, ViewStyle, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView from 'react-native-maps';
import { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';

export const MapMarker = Marker;

export interface MapProps {
  region?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  userLocation?: {
    latitude: number;
    longitude: number;
  } | null;
  onRegionChangeComplete?: (region: any) => void;
}

const commonMapProps = {
  showsUserLocation: true,
  showsMyLocationButton: true,
  followsUserLocation: true,
  showsCompass: true,
  loadingEnabled: true,
  zoomEnabled: true,
  rotateEnabled: true,
  toolbarEnabled: true,
  moveOnMarkerPress: true,
};

const LocationButton = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity
    style={{
      position: 'absolute',
      right: 16,
      bottom: 16,
      backgroundColor: 'white',
      borderRadius: 8,
      padding: 12,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    }}
    onPress={onPress}
  >
    <Ionicons name="locate" size={24} color="#666" />
  </TouchableOpacity>
);

export const Map: React.FC<MapProps> = ({ 
  region, 
  style, 
  children,
  showsUserLocation = true,
  showsMyLocationButton = true,
  userLocation,
  onRegionChangeComplete,
}) => {
  const mapRef = useRef<any>(null);

  const handleLocationButtonPress = () => {
    if (mapRef.current && userLocation) {
      mapRef.current.animateToRegion({
        ...userLocation,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }, 1000);
    }
  };

  const renderUserMarker = () => {
    if (!showsUserLocation || !userLocation) return null;

    if (Platform.OS === 'web') {
      return (
        <View
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: [{ translateX: -8 }, { translateY: -8 }],
            height: 16,
            width: 16,
            backgroundColor: '#4285F4',
            borderRadius: 8,
            borderWidth: 3,
            borderColor: '#fff',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 2,
          }}
        />
      );
    }

    return (
      <>
        <Marker
          coordinate={userLocation}
          title="Tu ubicación"
        >
          <View
            style={{
              height: 16,
              width: 16,
              backgroundColor: '#4285F4',
              borderRadius: 8,
              borderWidth: 3,
              borderColor: '#fff',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 2,
            }}
          />
        </Marker>
        <Circle
          center={userLocation}
          radius={100}
          fillColor="rgba(66, 133, 244, 0.2)"
          strokeColor="rgba(66, 133, 244, 0.5)"
          strokeWidth={1}
        />
      </>
    );
  };

  if (Platform.OS === 'web') {
    return (
      <View style={[{ flex: 1, position: 'relative' }, style]}>
        <MapView
          {...commonMapProps}
          ref={mapRef}
          style={{ width: '100%', height: '100%' }}
          initialRegion={region}
          showsUserLocation={false}
          showsMyLocationButton={false}
          onRegionChangeComplete={onRegionChangeComplete}
        >
          {renderUserMarker()}
          {children}
        </MapView>
        {showsMyLocationButton && (
          <LocationButton onPress={handleLocationButtonPress} />
        )}
      </View>
    );
  }

  return (
    <View style={[{ flex: 1 }, style]}>
      <MapView
        {...commonMapProps}
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{ width: '100%', height: '100%' }}
        initialRegion={region}
        showsUserLocation={showsUserLocation}
        showsMyLocationButton={showsMyLocationButton}
        onRegionChangeComplete={onRegionChangeComplete}
      >
        {renderUserMarker()}
        {children}
      </MapView>
    </View>
  );
};

export default Map; 
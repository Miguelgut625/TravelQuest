// @ts-nocheck - Ignorar todos los errores de TypeScript en este archivo
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';

interface MapProps {
  children?: React.ReactNode;
  style?: any;
  region?: Region;
  onRegionChangeComplete?: (region: Region) => void;
  initialRegion?: Region;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  mapType?: 'standard' | 'satellite' | 'hybrid' | 'terrain';
}

const Map: React.FC<MapProps> = ({ 
  children, 
  style, 
  region, 
  onRegionChangeComplete, 
  initialRegion, 
  showsUserLocation, 
  showsMyLocationButton,
  mapType = 'standard'
}) => {
  const [mapError, setMapError] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    console.log('Map Props:', { region, initialRegion, showsUserLocation });
    
    // Inicialización específica para Android
    if (Platform.OS === 'android') {
      console.log('Inicializando mapa para Android');
    }
  }, []);

  const handleMapError = (error: any) => {
    console.error('Error en el mapa:', error);
    setMapError('No se pudo cargar el mapa correctamente');
  };

  // Manejo de errores en el mapa
  if (mapError) {
    return (
      <View style={[styles.errorContainer, style]}>
        <Text style={styles.errorText}>{mapError}</Text>
      </View>
    );
  }

  // Implementación específica para la web
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, style]}>
        <MapView
          style={styles.map}
          region={region}
          onRegionChangeComplete={onRegionChangeComplete}
          initialRegion={initialRegion}
          showsUserLocation={showsUserLocation}
          mapType={mapType}
          onError={handleMapError}
          onMapReady={() => setIsMapReady(true)}
        >
          {children}
        </MapView>
      </View>
    );
  }

  // Implementación para plataformas nativas (iOS/Android)
  return (
    <MapView
      style={[styles.map, style]}
      region={region}
      onRegionChangeComplete={onRegionChangeComplete}
      initialRegion={initialRegion}
      showsUserLocation={showsUserLocation}
      showsMyLocationButton={showsMyLocationButton}
      mapType={mapType}
      onError={handleMapError}
      onMapReady={() => setIsMapReady(true)}
    >
      {children}
    </MapView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8d7da',
    padding: 20,
  },
  errorText: {
    color: '#721c24',
    textAlign: 'center',
    fontSize: 16,
  }
});

export default Map;

import React, { useState, useEffect } from 'react';
import { Platform, View, StyleSheet, Text } from 'react-native';
import MapView, { Marker, MapViewProps, PROVIDER_GOOGLE, Region } from 'react-native-maps';

const Map = (props: MapViewProps) => {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    // Log para verificar qué propiedades se están pasando al mapa
    console.log('Map props:', JSON.stringify(props, null, 2));
    
    // En Android, podemos necesitar inicializar el mapa de una manera específica
    if (Platform.OS === 'android') {
      console.log('Inicializando mapa en Android...');
      
      // Esto puede ayudar a resolver problemas con la visualización del mapa en Android
      const timeoutId = setTimeout(() => {
        if (!mapReady) {
          console.log('El mapa no está listo después del tiempo de espera, intentando refrescar...');
        }
      }, 5000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [props, mapReady]);

  if (Platform.OS === 'web') {
    return (
      <View style={{ height: '100%', width: '100%' }}>
        <MapView
          {...props}
          style={[{ height: '100%', width: '100%' }, props.style]}
        />
      </View>
    );
  }

  // Usamos un componente envoltorio para capturar errores
  try {
    // Si ya tenemos un error, mostramos el fallback
    if (hasError) {
      return (
        <View style={[styles.container, styles.errorContainer]}>
          <Text style={styles.errorText}>
            {errorMessage || 'Error al cargar el mapa. Por favor, verifica tu conexión.'}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <MapView
          provider={PROVIDER_GOOGLE}
          showsUserLocation={true}
          showsMyLocationButton={true}
          loadingEnabled={true}
          loadingIndicatorColor="#4CAF50"
          loadingBackgroundColor="rgba(255, 255, 255, 0.5)"
          zoomControlEnabled={true}
          zoomEnabled={true}
          {...props}
          style={[styles.map, props.style]}
          onMapReady={() => {
            console.log('Mapa cargado correctamente');
            setMapReady(true);
          }}
          onRegionChangeComplete={(region: Region) => {
            console.log('Región cambiada:', region);
            if (props.onRegionChangeComplete) {
              // @ts-ignore: Manejar la diferencia en la definición de tipo
              props.onRegionChangeComplete(region);
            }
          }}
          // Configuración específica para Android para mejorar rendimiento
          moveOnMarkerPress={false}
          pitchEnabled={false}
          toolbarEnabled={false}
        />
      </View>
    );
  } catch (error: any) {
    console.error('Error renderizando el mapa:', error);
    // Fallback si hay un error con el mapa
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Text style={styles.errorText}>
          Error en renderizado del mapa: {error.message || 'Desconocido'}
        </Text>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    height: '100%',
    width: '100%',
  },
  map: {
    height: '100%',
    width: '100%',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    color: '#f44336',
    textAlign: 'center',
    padding: 20,
  },
});

export const MapMarker = Marker;

export default Map;

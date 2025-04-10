// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, Switch, TouchableOpacity, Alert } from 'react-native';
import GlobeView, { GlobeViewRef } from '../GlobeView';
import type { Region } from '../types/map';
import FallbackView from '../FallbackView';
import { Ionicons } from '@expo/vector-icons';

export interface MapProps {
  style?: any;
  region?: Region;
  onRegionChange?: (region: Region) => void;
  showsUserLocation?: boolean;
  children?: React.ReactNode;
  onLoadingChange?: (loading: boolean) => void;
}

const Map = (props: MapProps) => {
  // Estado para controlar si hubo un error al cargar Cesium
  const [cesiumError, setCesiumError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loadAttempts, setLoadAttempts] = useState(0);
  const [useBasicMap, setUseBasicMap] = useState(false);
  const [showCenterButton, setShowCenterButton] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false); // Estado para controlar la transición
  
  // Referencia al componente GlobeView
  const globeRef = useRef<GlobeViewRef>(null);

  // Manejador de errores de Cesium
  const handleCesiumError = useCallback((error: string) => {
    console.error("Error cargando Globo Terráqueo:", error);
    setCesiumError(error);
    
    // Si es un timeout, ofrecer al usuario la opción de usar un mapa básico
    if (error.includes('Timeout')) {
      Alert.alert(
        "Problema al cargar el mapa 3D",
        "¿Deseas intentar cargar una versión básica del mapa?",
        [
          {
            text: "Cancelar",
            style: "cancel"
          },
          { 
            text: "Usar mapa básico", 
            onPress: () => {
              setUseBasicMap(true);
              setCesiumError(null);
            }
          }
        ]
      );
    }
  }, []);
  
  // Mostrar el botón de centrar después de un tiempo
  useEffect(() => {
    if (!isLoading && !cesiumError) {
      const timer = setTimeout(() => {
        setShowCenterButton(true);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, cesiumError]);

  // Manejar cuando Cesium termina de cargar
  const handleLoadEnd = useCallback(() => {
    console.log("Map: GlobeView terminó de cargar correctamente");
    setIsLoading(false);
    setIsTransitioning(false); // Asegurar que no estamos en transición al inicio
    if (props.onLoadingChange) {
      props.onLoadingChange(false);
    }
  }, [props.onLoadingChange]);

  // Manejar cambio de modo oscuro
  const toggleDarkMode = useCallback(() => {
    const newMode = !isDarkMode;
    console.log('Cambiando a modo oscuro:', newMode);
    setIsDarkMode(newMode);
    if (globeRef.current) {
      globeRef.current.setDarkMode(newMode);
    }
  }, [isDarkMode]);
  
  // Alternar entre mapa 3D y 2D
  const handleToggleMapMode = useCallback(() => {
    if (isTransitioning) return; // No permitir múltiples transiciones
    
    setIsTransitioning(true);
    console.log("Map: Iniciando transición entre modos de mapa");
    
    if (globeRef.current) {
      console.log("Map: Llamando a toggleMapMode en GlobeView");
      
      // Ocultar botones de control durante la transición
      if (showCenterButton) {
        setShowCenterButton(false);
      }
      
      // Llamar a la función de cambio de modo en GlobeView
      globeRef.current.toggleMapMode();
      
      // Tiempo prolongado para asegurar que la transición se complete
      const transitionTimeout = 10000; // 10 segundos
      
      console.log(`Map: Estableciendo timer de ${transitionTimeout/1000} segundos para completar transición`);
      setTimeout(() => {
        setIsTransitioning(false);
        setShowCenterButton(true);
        console.log("Map: Transición entre modos completada");
      }, transitionTimeout);
    }
  }, [showCenterButton, isTransitioning]);

  // Efecto para monitorear el estado
  useEffect(() => {
    console.log("Map: Componente montado, isLoading:", isLoading, "cesiumError:", cesiumError);
    
    return () => {
      console.log("Map: Componente desmontado");
    };
  }, [isLoading, cesiumError]);
  
  // Función para reintentar cargar el mapa
  const handleRetry = useCallback(() => {
    console.log("Reintentando cargar el mapa...");
    setCesiumError(null);
    setLoadAttempts(prev => prev + 1);
  }, []);

  // Si hay un error, mostrar un mensaje de error
  if (cesiumError) {
    return (
      <FallbackView 
        error={`Error al cargar el Globo Terráqueo de Cesium: ${cesiumError}`}
        onRetry={handleRetry}
      />
    );
  }

  console.log('Map: Cargando GlobeView...');
  
  return (
    <View style={[styles.container, props.style]}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#F57C00" />
          <Text style={styles.loadingText}>Inicializando vista 3D...</Text>
          {loadAttempts > 0 && 
            <Text style={styles.loadingSubtext}>Intento {loadAttempts + 1}...</Text>
          }
        </View>
      )}
      
      <GlobeView
        ref={globeRef}
        style={styles.map}
        region={props.region}
        onRegionChange={props.onRegionChange}
        showsUserLocation={props.showsUserLocation}
        onLoadingChange={(loading) => {
          console.log("Map: onLoadingChange desde GlobeView:", loading);
          setIsLoading(loading);
          if (props.onLoadingChange) {
            props.onLoadingChange(loading);
          }
        }}
        followsUserLocation={true}
        useFallbackGlobe={useBasicMap}
        onError={handleCesiumError}
        onLoadEnd={handleLoadEnd}
        key={`globe-view-${loadAttempts}`}
      />
      
      {!isLoading && (
        <View style={styles.controlsContainer}>
          {showCenterButton && (
            <TouchableOpacity 
              style={[
                styles.controlButton, 
                isTransitioning && styles.controlButtonDisabled
              ]}
              onPress={handleToggleMapMode}
              disabled={isTransitioning}
            >
              <Ionicons 
                name="map" 
                size={24} 
                color={isTransitioning ? "#999" : "#333"} 
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[
              styles.controlButton, 
              isDarkMode && styles.controlButtonActive,
              isTransitioning && styles.controlButtonDisabled
            ]} 
            onPress={toggleDarkMode}
            disabled={isTransitioning}
          >
            <Ionicons 
              name={isDarkMode ? "moon" : "moon-outline"} 
              size={24} 
              color={isDarkMode ? "#fff" : (isTransitioning ? "#999" : "#333")} 
            />
          </TouchableOpacity>
        </View>
      )}
      
      {!isLoading && !showCenterButton && (
        <View style={styles.startupOverlay}>
          <Text style={styles.startupText}>
            Desliza para explorar el globo terráqueo
          </Text>
        </View>
      )}
      
      {props.children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
  },
  loadingSubtext: {
    color: '#ddd',
    marginTop: 5,
    fontSize: 12,
  },
  controlsContainer: {
    position: 'absolute',
    right: 10,
    bottom: 40,
    zIndex: 5,
  },
  controlButton: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  controlButtonActive: {
    backgroundColor: 'rgba(50,50,50,0.9)',
  },
  controlButtonDisabled: {
    backgroundColor: 'rgba(200,200,200,0.5)',
  },
  startupOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 4,
  },
  startupText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
  }
});

export default Map; 
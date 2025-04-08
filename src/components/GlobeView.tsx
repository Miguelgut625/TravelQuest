import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, Platform, Animated, Easing, Dimensions, PanResponder, TouchableOpacity } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import MapView, { PROVIDER_GOOGLE, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';

// Declaración de tipos para Cesium
declare global {
  interface Window {
    Cesium: any;
    rotationInterval: any;
    rotationCounter: number;
    viewer: any;
  }
}

// Bandera para usar el globo de respaldo si hay problemas con WebView
const USE_FALLBACK = false; // Intentaremos usar Cesium a través de WebView
const TIMEOUT_SECONDS = 120; // Aumentar tiempo de espera a 2 minutos para carga completa

// Distancias para cambio de vista
const MAP_VIEW_DISTANCE_THRESHOLD = 2000000; // Mostrar mapa 2D cuando se acerca a menos de 2000 km
const GLOBE_VIEW_DISTANCE_THRESHOLD = 3000000; // Volver a globo 3D cuando se aleja a más de 3000 km

const GlobeView = (props: { style?: any }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useFallbackView, setUseFallbackView] = useState(USE_FALLBACK);
  const [showMapView, setShowMapView] = useState(false); // Estado para controlar qué vista mostrar
  const [currentPosition, setCurrentPosition] = useState({
    latitude: 0,
    longitude: 0,
    altitude: 15000000,
    zoom: 2
  });
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState<boolean>(true);
  
  const webViewRef = useRef<WebView>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cesiumContainerRef = useRef<HTMLDivElement>(null);
  const mapViewRef = useRef<MapView>(null);

  // Función para obtener la ubicación del usuario
  const getUserLocation = async () => {
    try {
      console.log("Iniciando obtención de ubicación en segundo plano");
      
      // Solicitar permisos
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      
      if (status === 'granted') {
        // Obtenemos la ubicación del usuario en segundo plano sin bloquear la UI
        console.log("Permiso concedido, obteniendo ubicación en segundo plano");
        
        // Primero intentamos con una precisión alta pero con un timeout bajo
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
          // Opciones avanzadas solo disponibles en algunas plataformas
          // Estas opciones podrían no estar disponibles en todas las plataformas
          // maximumAge: 10000,
          // timeout: 5000
        }).then(location => {
          console.log("Ubicación obtenida (primera llamada):", location);
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          });
          setIsLoadingLocation(false);
        }).catch(err => {
          console.log("Error en primera llamada de ubicación, intentando con menor precisión:", err);
          
          // Si falla, intentamos con precisión más baja para obtener una ubicación rápida
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            // Opciones avanzadas
            // maximumAge: 30000,
            // timeout: 10000
          }).then(location => {
            console.log("Ubicación obtenida (segunda llamada):", location);
            setUserLocation({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude
            });
            setIsLoadingLocation(false);
          }).catch(secondErr => {
            console.error("Error obteniendo ubicación incluso con menor precisión:", secondErr);
            setIsLoadingLocation(false);
          });
        });
      } else {
        console.log('Permiso de ubicación denegado');
        setIsLoadingLocation(false);
      }
    } catch (err) {
      console.error('Error al obtener la ubicación:', err);
      setIsLoadingLocation(false);
    }
  };

  // Función para ir a la ubicación del usuario
  const goToUserLocation = () => {
    console.log("goToUserLocation llamada con userLocation:", userLocation);
    
    if (!userLocation) {
      console.log("No hay ubicación disponible, intentando obtener ubicación ahora");
      // Intentar obtener la ubicación nuevamente
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest
      }).then(location => {
        console.log("Ubicación obtenida después de solicitarla:", location);
        const newLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        };
        
        setUserLocation(newLocation);
        
        // Llamar recursivamente a la función después de obtener la ubicación
        setTimeout(() => goToUserLocation(), 500);
      }).catch(err => {
        console.error("Error obteniendo ubicación en demanda:", err);
      });
      return;
    }
    
    // Si estamos en la vista de globo, cambiamos a la vista de mapa con zoom
    if (!showMapView) {
      console.log("Cambiando de globo a mapa. userLocation:", userLocation);
      
      // Primero animamos el globo hacia la ubicación antes de cambiar a la vista de mapa
      if (webViewRef.current) {
        console.log("Animando globo hacia la ubicación del usuario");
        webViewRef.current.injectJavaScript(`
          (function() {
            try {
              if (window.viewer) {
                // Primero hacemos zoom out para una transición más suave
                window.viewer.camera.flyTo({
                  destination: Cesium.Cartesian3.fromDegrees(
                    ${userLocation.longitude},
                    ${userLocation.latitude},
                    5000000 // Altura intermedia para iniciar el acercamiento
                  ),
                  orientation: {
                    heading: 0.0,
                    pitch: -Cesium.Math.PI_OVER_TWO,
                    roll: 0.0
                  },
                  duration: 1.0,
                  complete: function() {
                    // Luego hacemos zoom in más cercano
                    window.viewer.camera.flyTo({
                      destination: Cesium.Cartesian3.fromDegrees(
                        ${userLocation.longitude},
                        ${userLocation.latitude},
                        1000000 // Altura más cercana
                      ),
                      orientation: {
                        heading: 0.0,
                        pitch: -Cesium.Math.PI_OVER_TWO,
                        roll: 0.0
                      },
                      duration: 1.0
                    });
                  }
                });
                console.log('Animación de cámara iniciada hacia la ubicación del usuario');
              }
            } catch(e) {
              console.error('Error al animar el globo:', e);
            }
            return true;
          })();
        `);
      }
      
      // Actualizamos la posición para que el WebView sepa dónde mirar
      setCurrentPosition(prevState => {
        console.log("Actualizando currentPosition a:", {
          ...prevState,
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          altitude: 1000000,
          zoom: 12
        });
        return {
          ...prevState,
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          altitude: 1000000, // Altura para iniciar la transición
          zoom: 12
        };
      });
      
      // Añadimos un mayor retraso para permitir que la animación del globo termine
      setTimeout(() => {
        setShowMapView(true);
        console.log("Vista de mapa activada");
        
        // Animamos el mapa a la ubicación del usuario
        if (mapViewRef.current) {
          console.log("Animando mapa a:", userLocation);
          setTimeout(() => {
            try {
              mapViewRef.current?.animateToRegion({
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: 0.01, // Zoom cercano
                longitudeDelta: 0.01
              }, 1000);
              console.log("Animación de mapa iniciada");
            } catch (err) {
              console.error("Error en animateToRegion:", err);
            }
          }, 1000); // Aumentamos el retraso para asegurar que el mapa está listo
        } else {
          console.log("mapViewRef.current es null");
        }
      }, 2000); // 2 segundos para permitir que termine la animación del globo
      
      // Detenemos rotación en el WebView
      if (webViewRef.current) {
        console.log("Deteniendo rotación del WebView");
        webViewRef.current.injectJavaScript(`
          (function() {
            try {
              autoRotate = false;
              console.log('Rotación automática detenida al ir a la ubicación');
            } catch(e) {
              console.error('Error al detener rotación:', e);
            }
            return true;
          })();
        `);
      } else {
        console.log("webViewRef.current es null");
      }
    } else {
      console.log("Ya estamos en vista de mapa, haciendo zoom a:", userLocation);
      // Si ya estamos en el mapa, solo hacemos zoom a la ubicación
      if (mapViewRef.current) {
        try {
          mapViewRef.current.animateToRegion({
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.01, // Zoom cercano
            longitudeDelta: 0.01
          }, 1000);
          console.log("Zoom en mapa iniciado");
        } catch (err) {
          console.error("Error en animateToRegion (modo mapa):", err);
        }
      } else {
        console.log("mapViewRef.current es null en modo mapa");
      }
    }
  };

  // Efecto para obtener la ubicación del usuario al inicio
  useEffect(() => {
    // Indicamos inmediatamente que el globo está cargado
    // para que se muestre sin esperar a la ubicación
    setLoading(false);
    
    // Obtenemos la ubicación del usuario en paralelo
    getUserLocation();
    
    // Opcionalmente, intentar obtener la ubicación periódicamente si no se obtiene la primera vez
    const locationInterval = setInterval(() => {
      if (!userLocation && locationPermission) {
        console.log("Reintentando obtener ubicación...");
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        }).then(location => {
          console.log("Ubicación obtenida después de reintentos:", location);
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          });
          // Una vez que tenemos la ubicación, podemos detener los reintentos
          clearInterval(locationInterval);
          setIsLoadingLocation(false);
        }).catch(err => {
          console.log("Error en reintento de ubicación:", err);
          // No actualizamos isLoadingLocation para seguir mostrando que estamos buscando
        });
      } else if (userLocation) {
        // Si ya tenemos ubicación, detener los reintentos
        clearInterval(locationInterval);
      }
    }, 10000); // Reintentar cada 10 segundos

    // Limpiar el intervalo cuando el componente se desmonte
    return () => {
      clearInterval(locationInterval);
    };
  }, [locationPermission, userLocation]);

  // Efecto para configurar un timeout para cambiar a la vista de respaldo si tarda demasiado
  useEffect(() => {
    if (!useFallbackView && Platform.OS !== 'web') {
      // Configurar timeout más largo
      loadTimeoutRef.current = setTimeout(() => {
        console.warn('Timeout en carga de Cesium, intentando recuperar automáticamente');
        if (webViewRef.current) {
          // Intentar recargar antes de cambiar a la vista de respaldo
          webViewRef.current.reload();
          
          // Si aún hay problemas después de recargar, entonces cambiar a vista de respaldo
          setTimeout(() => {
            if (loading) {
              console.warn('Cesium sigue sin cargar, cambiando a vista alternativa');
              setUseFallbackView(true);
            }
          }, 30000); // 30 segundos adicionales después de recargar
        } else {
          setUseFallbackView(true);
        }
      }, TIMEOUT_SECONDS * 1000); // 120 segundos de espera para cargar Cesium

      return () => {
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
        }
      };
    }
    return undefined;
  }, [useFallbackView]);

  // Efecto para manejar cambios de orientación
  useEffect(() => {
    if (Platform.OS !== 'web') {
      // Obtener dimensiones iniciales
      const initialDimensions = Dimensions.get('window');
      
      // Función para manejar cambios de dimensiones
      const dimensionsChangeHandler = ({ window }: { window: { width: number; height: number } }) => {
        // Si estamos en el mapa, actualizar la región
        if (showMapView && mapViewRef.current) {
          setTimeout(() => {
            mapViewRef.current?.animateToRegion({
              latitude: currentPosition.latitude,
              longitude: currentPosition.longitude,
              latitudeDelta: 0.0922 * (10 / Math.max(1, currentPosition.zoom)),
              longitudeDelta: 0.0421 * (10 / Math.max(1, currentPosition.zoom))
            }, 300);
          }, 300);
        }
      };
      
      // Añadir listener para cambios de dimensiones
      const subscription = Dimensions.addEventListener('change', dimensionsChangeHandler);
      
      // Limpiar listener cuando el componente se desmonte
      return () => {
        subscription.remove();
      };
    }
    return undefined;
  }, [showMapView, currentPosition]);

  // Función para manejar errores y cambiar a la vista de respaldo
  const handleError = (errorMsg: string) => {
    // Ignorar errores específicos de Web Workers que sabemos que no son críticos
    if (
      errorMsg.includes('importScripts') || 
      errorMsg.includes('WorkerGlobalScope') ||
      errorMsg.includes('transferTypedArrayTest') ||
      errorMsg.includes('createVerticesFromHeightmap')
    ) {
      console.warn('Ignorando error no crítico de Web Worker:', errorMsg);
      return;
    }
    
    // Ignorar errores de normalización o propiedades de solo lectura
    if (
      errorMsg.includes('Cannot assign to read only property') ||
      errorMsg.includes('normalize')
    ) {
      console.warn('Ignorando error de asignación a propiedad de solo lectura:', errorMsg);
      // Intentar recargar el contenido del WebView sin cambiar a la vista de respaldo
      if (webViewRef.current) {
        console.log('Recargando WebView después de error...');
        webViewRef.current.reload();
      }
      return;
    }
    
    console.error('Error en GlobeView:', errorMsg);
    setError(errorMsg);
    // Cambiar a la vista de respaldo después de un breve retraso
    setTimeout(() => {
      setUseFallbackView(true);
    }, 1000);
  };

  // Si estamos en web, usamos el componente Cesium directamente
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, props.style]}>
        <div style={{ width: '100%', height: '100%' }} id="cesiumContainer"></div>
      </View>
    );
  }
  
  // Si hay problemas con WebView o estamos en modo fallback, usamos el globo alternativo
  if (useFallbackView) {
    return (
      <View style={[styles.container, props.style]}>
        <ActivityIndicator size="large" color="#4CAF50" style={{flex: 1}} />
        <Text style={styles.errorText}>Cargando vista alternativa...</Text>
      </View>
    );
  }

  // Crear versión optimizada del HTML para móviles con solución para errores de workers
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>Cesium Globe</title>
      <style>
        html, body {
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
          overflow: hidden;
          background-color: black;
          touch-action: manipulation;
          position: fixed;
        }
        #cesiumContainer {
          width: 100%;
          height: 100%;
          position: absolute;
          top: 0;
          left: 0;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .cesium-widget-credits, .cesium-viewer-bottom, .cesium-viewer-toolbar {
          display: none !important;
        }
        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0,0,0,0.8);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          color: white;
          font-family: Arial, sans-serif;
        }
        .loading-indicator {
          text-align: center;
        }
        .loading-spinner {
          width: 60px;
          height: 60px;
          border: 5px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: #4CAF50;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .button {
          position: absolute;
          padding: 8px;
          background-color: #4CAF50;
          color: white;
          border: none;
          border-radius: 4px;
          font-weight: bold;
          z-index: 1000;
          cursor: pointer;
        }
        .center-button {
          bottom: 20px;
          left: 10px;
        }
        .location-button {
          bottom: 20px;
          right: 10px;
        }
      </style>
    </head>
    <body>
      <div id="cesiumContainer">
        <!-- Eliminamos el div de depuración visible -->
      </div>
      <div id="loadingOverlay" class="loading-overlay">
        <div class="loading-indicator">
          <div class="loading-spinner"></div>
          <div style="font-size: 18px; font-weight: bold;">Cargando globo terráqueo</div>
          <div id="loading-progress" style="margin-top: 15px; font-size: 14px;">Inicializando mapa...</div>
        </div>
      </div>
      
      <script>
        // Configurar base URL para Cesium ANTES de cargar la biblioteca
        window.CESIUM_BASE_URL = 'https://cesium.com/downloads/cesiumjs/releases/1.81/Build/Cesium/';
        
        // Variable para controlar el nivel de detalle según el rendimiento
        let isLowPerformanceDevice = false;
        
        // Detectar rendimiento del dispositivo
        try {
          const canvas = document.createElement('canvas');
          const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
          
          if (!gl) {
            isLowPerformanceDevice = true;
          } else {
            // Verificar capacidades básicas
            const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
            const maxTextureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
            
            // Si las capacidades son limitadas, considerarlo dispositivo de rendimiento bajo
            if (maxTextureSize < 4096 || maxTextureUnits < 8) {
              isLowPerformanceDevice = true;
            }
          }
        } catch(e) {
          console.warn('Error detectando rendimiento del dispositivo:', e);
          isLowPerformanceDevice = true; // Asumir bajo rendimiento por seguridad
        }
        
        // Actualizar el progreso de carga
        function updateProgress(text) {
          document.getElementById('loading-progress').textContent = text;
        }
        
        // Cargar scripts y estilos
        function loadScript(url, callback) {
          var script = document.createElement('script');
          script.type = 'text/javascript';
          script.src = url;
          script.onload = callback;
          script.onerror = function() {
            window.ReactNativeWebView.postMessage('error:No se pudo cargar Cesium. Verifica tu conexión a Internet.');
          };
          document.head.appendChild(script);
        }
        
        function loadStyles(url) {
          var link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = url;
          document.head.appendChild(link);
        }

        // Iniciar la carga de Cesium (versión 1.83 más compatible con WebView)
        updateProgress('Inicializando...');
        // Primero configuramos el entorno para evitar errores de workers
        window.BUILD_WORKER = function(){return null;};
        window.CESIUM_ON_WORKER_BOOT = function(){};
        
        // Cargamos una versión más antigua de Cesium que funciona mejor en WebView
        loadScript('https://cesium.com/downloads/cesiumjs/releases/1.81/Build/Cesium/Cesium.js', function() {
          updateProgress('Cesium cargado. Preparando globo...');
          loadStyles('https://cesium.com/downloads/cesiumjs/releases/1.81/Build/Cesium/Widgets/widgets.css');
          
          // Pequeño retraso para asegurar que Cesium esté listo
          setTimeout(function() {
            try {
              initCesium();
              
              // Forzar una actualización del tamaño del canvas después de la inicialización
              setTimeout(function() {
                if (window.viewer) {
                  // Llamar de nuevo a centerGlobe después de la carga para asegurar la posición
                  if (typeof window.centerGlobe === 'function') {
                    window.centerGlobe();
                  }
                  
                  // Asegurar que el globo es visible
                  window.viewer.scene.globe.show = true;
                  
                  // Forzar renderizado
                  window.viewer.scene.requestRender();
                }
              }, 2000);
            } catch(e) {
              console.error('Error al inicializar Cesium:', e);
              window.ReactNativeWebView.postMessage('error:' + e);
            }
          }, 500);
        });
        
        function initCesium() {
          try {
            console.log('Inicializando Cesium...');
            
            // Token de Cesium Ion
            Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlNmY5ZTNmZS1hMGRkLTQyZjQtYWQ1NS1lODYwZTcxNTRiMjMiLCJpZCI6MjAxNDM5LCJpYXQiOjE3MTMxODg0Njd9.ckUMa1Nb8MvXb2EYMy01bIPBOhrYmFbSw0RPiBP70oI';
            
            updateProgress('Creando visor...');
            
            // Desactivar Web Workers completamente para evitar los errores
            Cesium.FeatureDetection.supportsWebWorkers = function() { return false; };
            
            // Inicialización del visor de Cesium con opciones simplificadas
            window.viewer = new Cesium.Viewer('cesiumContainer', {
              animation: false,
              baseLayerPicker: false,
              fullscreenButton: false,
              geocoder: false,
              homeButton: false,
              infoBox: false,
              sceneModePicker: false,
              selectionIndicator: false,
              timeline: false,
              navigationHelpButton: false,
              navigationInstructionsInitiallyVisible: false,
              scene3DOnly: true,
              requestRenderMode: false, // Desactivar requestRenderMode para asegurar renderizado continuo
              maximumRenderTimeChange: Infinity,
              terrainProvider: new Cesium.EllipsoidTerrainProvider(), // Usar terreno simple desde el inicio
              imageryProvider: false, // Sin imagen inicial, las añadiremos manualmente
              contextOptions: {
                webgl: {
                  alpha: false, // Usar fondo opaco
                  antialias: true, // Mejorar calidad visual
                  failIfMajorPerformanceCaveat: false
                }
              }
            });
            
            // Guardar variable local para uso interno
            const viewer = window.viewer;
            
            // Verificar que el visor se creó correctamente
            if (!viewer || !viewer.scene) {
              throw new Error('No se pudo crear el visor Cesium');
            }
            
            // Eliminar la extensión de CesiumInspector
            // Forzar renderizado de frames incluso sin cambios
            viewer.scene.requestRenderMode = false;
            
            // Ocultar créditos
            viewer.cesiumWidget.creditContainer.style.display = 'none';
            
            // Eliminar toda la parte de depuración móvil
            updateProgress('Aplicando configuración...');
            
            // Aplicar optimizaciones extremas para móviles
            viewer.scene.fog.enabled = false;
            viewer.scene.globe.maximumScreenSpaceError = isLowPerformanceDevice ? 12 : 8; 
            viewer.targetFrameRate = isLowPerformanceDevice ? 24 : 30;
            viewer.resolutionScale = isLowPerformanceDevice ? 0.5 : 0.7;
            
            // Hacer visible el globo
            viewer.scene.globe.show = true;
            viewer.scene.globe.baseColor = Cesium.Color.BLUE;
            viewer.scene.backgroundColor = Cesium.Color.BLACK;
            
            // Ajustar el tamaño y posición de la escena para centrar el globo
            function centerGlobe() {
              try {
                // Forzar que el canvas tenga el tamaño correcto
                const canvas = viewer.scene.canvas;
                if (canvas) {
                  canvas.width = window.innerWidth;
                  canvas.height = window.innerHeight;
                  canvas.style.width = '100%';
                  canvas.style.height = '100%';
                  
                  // Actualizar la matriz de proyección
                  viewer.scene.camera.frustum.aspectRatio = canvas.clientWidth / canvas.clientHeight;
                }
                
                // Utilizar flyTo en lugar de lookAt para evitar problemas con vectores
                viewer.camera.flyTo({
                  destination: Cesium.Cartesian3.fromDegrees(0.0, 0.0, 15000000.0),
                  orientation: {
                    heading: Cesium.Math.toRadians(0.0),
                    pitch: Cesium.Math.toRadians(-90.0),
                    roll: 0.0
                  },
                  duration: 0.5, // Más rápido para respuesta inmediata
                  complete: function() {
                    // Forzar un repintado después de centrar
                    viewer.scene.requestRender();
                  }
                });
              } catch (e) {
                console.warn('Error al centrar el globo:', e);
              }
            }
            
            // Exponer la función globalmente
            window.centerGlobe = centerGlobe;
            
            // Llamar a centrarlo inicialmente
            centerGlobe();
            
            // Centrar cuando cambie el tamaño de la ventana
            window.addEventListener('resize', centerGlobe);
            
            // Función para cargar textura directa si todo lo demás falla
            function loadDirectTexture() {
              updateProgress('Cargando textura directa...');
              
              // Intentar cargar una textura de la Tierra directamente
              const earthTexture = new Image();
              earthTexture.crossOrigin = 'anonymous';
              earthTexture.onload = function() {
                try {
                  // Crear material con la textura
                  const material = new Cesium.Material({
                    fabric: {
                      type: 'DiffuseMap',
                      uniforms: {
                        image: earthTexture
                      }
                    }
                  });
                  
                  // Aplicar al globo
                  viewer.scene.globe.material = material;
                  updateProgress('Textura cargada con éxito');
                } catch (e) {
                  console.error('Error al aplicar textura:', e);
                }
              };
              
              earthTexture.onerror = function() {
                console.error('Error al cargar la textura de la Tierra');
              };
              
              // Usar una URL de imagen pública de la Tierra
              earthTexture.src = 'https://eoimages.gsfc.nasa.gov/images/imagerecords/74000/74218/world.200412.3x5400x2700.jpg';
            }
            
            // Desactivar efectos exigentes
            viewer.scene.skyAtmosphere.show = false;
            viewer.scene.globe.showGroundAtmosphere = false;
            
            updateProgress('Cargando imágenes...');
            
            // Usar mapas naturales de la Tierra sin fronteras políticas
            let imageLoadSuccess = false;
            
            try {
              // Cargar solo mapas naturales de la Tierra
              const naturalEarthII = new Cesium.TileMapServiceImageryProvider({
                url: Cesium.buildModuleUrl('Assets/Textures/NaturalEarthII')
              });
              viewer.imageryLayers.addImageryProvider(naturalEarthII);
              imageLoadSuccess = true;
              
              // No añadimos capas de fronteras políticas
            } catch (e) {
              console.warn('Error cargando mapas NaturalEarth:', e);
              try {
                // Alternativa: mapas físicos de Bing
                const bing = new Cesium.BingMapsImageryProvider({
                  url: 'https://dev.virtualearth.net',
                  key: 'AipIE-pEoKccx-kC8G3D-45V3hl9hZxC-5vSXbMamybYjvJTXvoOYT7QeMqvFMGQ',
                  mapStyle: Cesium.BingMapsStyle.AERIAL // Vista satélite sin fronteras
                });
                viewer.imageryLayers.addImageryProvider(bing);
                imageLoadSuccess = true;
              } catch (e2) {
                console.warn('Error cargando mapas de Bing:', e2);
                try {
                  // Alternativa: mapas de Ion (imágenes de satélite)
                  const ion = new Cesium.IonImageryProvider({ 
                    assetId: 3 // World Imagery
                  });
                  viewer.imageryLayers.addImageryProvider(ion);
                  imageLoadSuccess = true;
                } catch (e3) {
                  console.error('Error cargando todas las opciones de imágenes:', e3);
                  
                  // Último recurso: cargar textura directa
                  loadDirectTexture();
                }
              }
            }
            
            // Si después de todo no tenemos imágenes, cargar la textura directamente
            if (!imageLoadSuccess && viewer.imageryLayers.length === 0) {
              loadDirectTexture();
            }
            
            updateProgress('Configurando cámara...');
            
            // Configurar la cámara para una vista más centrada
            setTimeout(function() {
              try {
                // Configurar una vista inicial simple y directa
                viewer.camera.setView({
                  destination: Cesium.Cartesian3.fromDegrees(0.0, 0.0, 15000000.0),
                  orientation: {
                    heading: 0.0,
                    pitch: -Cesium.Math.PI_OVER_TWO,
                    roll: 0.0
                  }
                });
                
                updateProgress('Activando características...');
                
                // Configurar sin rotación automática
                setTimeout(function() {
                  // Solo iniciamos monitoreo de posición, sin rotación automática
                  try {
                    // Desactivar rotación automática desde el principio
                    autoRotate = false;
                    
                    // Iniciar comprobación periódica de estabilidad del globo
                    startStabilityCheck();
                    
                    // Iniciar monitoreo de posición de cámara
                    startCameraPositionMonitoring();
                    
                    // Informar que la carga básica está completa
                    window.ReactNativeWebView.postMessage('loaded');
                    
                    // Ocultar overlay de carga
                    document.getElementById('loadingOverlay').style.display = 'none';
                  } catch (e) {
                    console.error('Error al iniciar características:', e);
                    // Seguimos mostrando el globo aunque falle
                    window.ReactNativeWebView.postMessage('loaded');
                    document.getElementById('loadingOverlay').style.display = 'none';
                  }
                }, 1000);
              } catch (e) {
                console.error('Error al configurar vista inicial:', e);
                // Informar que se completó de todos modos
                window.ReactNativeWebView.postMessage('loaded');
                document.getElementById('loadingOverlay').style.display = 'none';
              }
            }, 1000);
            
            // Configurar interacción para móviles
            viewer.scene.screenSpaceCameraController.minimumZoomDistance = 1000000; // 1000 km mínimo
            viewer.scene.screenSpaceCameraController.maximumZoomDistance = 25000000; // 25000 km máximo
            
            // Configuración adicional para evitar saltos
            viewer.scene.screenSpaceCameraController.inertiaSpin = 0.5; // Reducir inercia de giro
            viewer.scene.screenSpaceCameraController.inertiaTranslate = 0.5; // Reducir inercia de desplazamiento
            viewer.scene.screenSpaceCameraController.inertiaZoom = 0.5; // Reducir inercia de zoom
            
            // Evitar que ciertas regiones "atraigan" la cámara
            viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;
            
            // Limitar la velocidad de rotación
            viewer.scene.screenSpaceCameraController.maximumMovementRatio = 0.1;
            
            // Desactivar efectos que podrían causar problemas
            viewer.scene.globe.enableLighting = false;
            viewer.scene.fog.enabled = false;
            viewer.scene.globe.showGroundAtmosphere = false;
            
            // Forzar modo 3D estricto
            viewer.scene.mode = Cesium.SceneMode.SCENE3D;
            viewer.scene.morphComplete.addEventListener(function() {
              viewer.scene.mode = Cesium.SceneMode.SCENE3D;
            });
            
            // Configurar manipulación manual más suave
            viewer.scene.screenSpaceCameraController.tiltEventTypes = [
              Cesium.CameraEventType.MIDDLE_DRAG, 
              Cesium.CameraEventType.PINCH,
              {
                eventType: Cesium.CameraEventType.LEFT_DRAG,
                modifier: Cesium.KeyboardEventModifier.CTRL
              }
            ];
            
            // Configurar rotación manual más suave
            viewer.scene.screenSpaceCameraController.rotateEventTypes = [
              Cesium.CameraEventType.LEFT_DRAG
            ];
            
            // Configurar rotación automática
            let autoRotate = false; // Inicialmente desactivada
            const rotationAxis = new Cesium.Cartesian3(0, 0, 1); // Eje Z (vertical)
            let lastTime = Date.now();
            
            // Función para verificar periódicamente la estabilidad del globo
            function startStabilityCheck() {
              // Ejecutar cada 10 segundos
              setInterval(function() {
                try {
                  // Verificar si el globo sigue visible
                  if (!viewer.scene.globe.show) {
                    viewer.scene.globe.show = true;
                  }
                } catch (e) {
                  console.error('Error en verificación de estabilidad:', e);
                }
              }, 10000);
            }
            
            // Función para monitorear la posición de la cámara y enviarla al componente React Native
            function startCameraPositionMonitoring() {
              setInterval(function() {
                try {
                  if (!viewer || !viewer.scene || !viewer.camera) return;
                  
                  // Obtener la posición de la cámara en coordenadas geográficas
                  const position = viewer.camera.positionCartographic;
                  const longitude = Cesium.Math.toDegrees(position.longitude);
                  const latitude = Cesium.Math.toDegrees(position.latitude);
                  const altitude = position.height;
                  
                  // Calcular un valor aproximado de zoom basado en la altura
                  // Valores aproximados: 20000000 = zoom 1, 5000000 = zoom 4, 1000000 = zoom 8
                  const zoom = Math.max(1, Math.log(20000000 / Math.max(altitude, 10000)) * 2);
                  
                  // Crear objeto con la información de posición
                  const positionData = {
                    longitude: longitude,
                    latitude: latitude,
                    altitude: altitude,
                    zoom: zoom,
                    heading: viewer.camera.heading,
                    pitch: viewer.camera.pitch,
                    roll: viewer.camera.roll
                  };
                  
                  // Enviar al componente React Native
                  window.ReactNativeWebView.postMessage('position:' + JSON.stringify(positionData));
                } catch (e) {
                  console.error('Error al monitorear posición de cámara:', e);
                }
              }, 500); // Actualizar cada 500ms
            }
            
            // Timeout para verificar si realmente tenemos un globo visible
            setTimeout(function() {
              // Verificar si tenemos capas de imagen o si el globo está visible
              if ((viewer.imageryLayers.length === 0 || !viewer.scene.globe.show) && 
                  document.getElementById('loadingOverlay').style.display !== 'none') {
                
                console.warn('No se ha detectado un globo visible, aplicando soluciones de respaldo');
                
                // Asegurar que el globo es visible
                viewer.scene.globe.show = true;
                
                // Usar color azul y cargar textura directa
                viewer.scene.globe.baseColor = Cesium.Color.BLUE;
                loadDirectTexture();
                
                // Ocultar overlay después de intentarlo todo
                setTimeout(function() {
                  document.getElementById('loadingOverlay').style.display = 'none';
                  window.ReactNativeWebView.postMessage('loaded');
                }, 3000);
              }
            }, 10000);
            
            // Manejar interacción del usuario
            let touchStarted = false;
            
            // Eventos táctiles simplificados, sin rotación automática
            viewer.screenSpaceEventHandler.setInputAction(function() {
              touchStarted = true;
            }, Cesium.ScreenSpaceEventType.LEFT_DOWN);
            
            viewer.screenSpaceEventHandler.setInputAction(function() {
              touchStarted = false;
            }, Cesium.ScreenSpaceEventType.LEFT_UP);
          } catch (error) {
            console.error('Error al inicializar Cesium:', error);
            window.ReactNativeWebView.postMessage('error:' + error);
          }
        }
        
        // Timeout de seguridad para asegurar que se muestra algo
        setTimeout(function() {
          if (document.getElementById('loadingOverlay').style.display !== 'none') {
            updateProgress('Carga completa (timeout)');
            document.getElementById('loadingOverlay').style.display = 'none';
            window.ReactNativeWebView.postMessage('loaded');
          }
        }, 30000);
        
        // Manejo de errores global
        window.onerror = function(message, source, lineno, colno, error) {
          console.error('Error:', message);
          
          // Manejar errores de propiedad de solo lectura
          if (message && (
            message.includes('Cannot assign to read only property') || 
            message.toString().includes('normalize') ||
            message.toString().includes('Cartesian3')
          )) {
            console.warn('Detectado error de propiedades de solo lectura, intentando recuperar...');
            
            // Reiniciar la vista de la cámara de forma segura
            try {
              if (window.viewer) {
                window.viewer.camera.flyTo({
                  destination: Cesium.Cartesian3.fromDegrees(0.0, 0.0, 15000000.0),
                  orientation: {
                    heading: 0,
                    pitch: -Cesium.Math.PI_OVER_TWO,
                    roll: 0
                  },
                  duration: 0.5
                });
              }
            } catch(e) {
              console.error('Error al recuperar la vista:', e);
            }
            
            return true; // Evita propagar el error
          }
          
          // Solo reportar errores significativos que no sean de workers
          if (!message.includes('Worker') && !message.includes('importScripts')) {
            window.ReactNativeWebView.postMessage('error:' + message);
          }
          return true;
        };
      </script>
    </body>
    </html>
  `;

  // Manejador de mensajes desde el WebView
  const handleWebViewMessage = (event: WebViewMessageEvent) => {
    const message = event.nativeEvent.data;
    
    // Verificar si el mensaje contiene datos de posición
    if (message.startsWith('position:')) {
      try {
        const positionData = JSON.parse(message.substring(9));
        setCurrentPosition(positionData);
       
      } catch (e) {
        console.error('Error al procesar datos de posición:', e);
      }
    } else if (message === 'loaded') {
      console.log('Cesium cargado correctamente');
      setLoading(false);
      
      // Limpiar el timeout cuando se carga correctamente
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    } else if (message.startsWith('error:')) {
      console.error('Error en Cesium WebView:', message.substring(6));
      setError(message.substring(6));
      handleError(message.substring(6));
    } else if (message === 'goToUserLocation') {
      // Procesar solicitud para ir a la ubicación del usuario desde el WebView
      console.log("Recibida solicitud de ir a ubicación desde WebView");
      goToUserLocation();
    }
  };

  return (
    <View style={[styles.container, props.style]}>
      {!useFallbackView && (
        <>
          {/* Mostrar WebView con Cesium cuando showMapView es false */}
          <WebView
            ref={webViewRef}
            style={[styles.webview, showMapView ? styles.hiddenView : null]}
            originWhitelist={['*']}
            source={{ html: htmlContent }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowFileAccess={true}
            allowUniversalAccessFromFileURLs={true}
            allowFileAccessFromFileURLs={true}
            cacheEnabled={true}
            javaScriptCanOpenWindowsAutomatically={true}
            scrollEnabled={false}
            bounces={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            onShouldStartLoadWithRequest={() => true}
            startInLoadingState={true}
            renderLoading={() => <View />}
            onMessage={handleWebViewMessage}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('WebView error:', nativeEvent);
              handleError(`WebView error: ${nativeEvent.description}`);
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('WebView HTTP error:', nativeEvent);
              handleError(`WebView HTTP error: ${nativeEvent.statusCode}`);
            }}
            onContentProcessDidTerminate={() => {
              console.warn('WebView process terminated, falling back to simple globe');
              handleError('La visualización 3D se cerró inesperadamente');
            }}
          />
          
          {/* Mostrar MapView cuando showMapView es true */}
          {showMapView && (
            <View style={styles.mapContainer}>
              <MapView
                ref={mapViewRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                mapType="standard" 
                initialRegion={{
                  latitude: currentPosition.latitude,
                  longitude: currentPosition.longitude,
                  latitudeDelta: 0.0922 * (10 / Math.max(1, currentPosition.zoom)),
                  longitudeDelta: 0.0421 * (10 / Math.max(1, currentPosition.zoom)),
                }}
                showsUserLocation={true}
                showsMyLocationButton={false}
                followsUserLocation={false}
                onMapReady={() => {
                  // Asegurar que el mapa se actualiza con la posición actual
                  if (mapViewRef.current) {
                    mapViewRef.current.animateToRegion({
                      latitude: currentPosition.latitude,
                      longitude: currentPosition.longitude,
                      latitudeDelta: 0.0922 * (10 / Math.max(1, currentPosition.zoom)),
                      longitudeDelta: 0.0421 * (10 / Math.max(1, currentPosition.zoom)),
                    }, 500);
                  }
                }}
                onRegionChangeComplete={(region) => {
                  // Actualizar la posición actual para mantener sincronización
                  setCurrentPosition(prevState => ({
                    ...prevState,
                    latitude: region.latitude,
                    longitude: region.longitude,
                    // Calcular un zoom aproximado desde la región
                    zoom: calculateZoomFromRegion(region)
                  }));
                  
                  // Ya no cambiamos automáticamente al hacer zoom para evitar cambios inesperados
                }}
              >
                {/* Eliminamos el marcador personalizado */}
              </MapView>
              
              {/* Botón para volver al globo */}
              <TouchableOpacity 
                style={styles.backToGlobeButton}
                onPress={() => {
                  // Primero animamos desde el mapa hacia afuera
                  if (mapViewRef.current) {
                    const currentRegion = {
                      latitude: currentPosition.latitude,
                      longitude: currentPosition.longitude,
                      latitudeDelta: 0.0922,
                      longitudeDelta: 0.0421
                    };
                    
                    try {
                      // Animamos el mapa hacia afuera para dar efecto de transición
                      mapViewRef.current.animateToRegion({
                        ...currentRegion,
                        latitudeDelta: 45, // Zoom muy alejado
                        longitudeDelta: 45
                      }, 800);
                      
                      console.log("Animando mapa hacia afuera antes de volver al globo");
                    } catch (err) {
                      console.error("Error al animar zoom out en mapa:", err);
                    }
                  }
                  
                  // Luego actualizamos la vista del globo con la posición actual del mapa
                  setTimeout(() => {
                    if (webViewRef.current && mapViewRef.current) {
                      mapViewRef.current.getCamera().then(camera => {
                        if (camera && webViewRef.current) {
                          // Primero preparamos el WebView para que esté listo
                          webViewRef.current.injectJavaScript(`
                            (function() {
                              try {
                                if (window.viewer) {
                                  // Asegurar que el globo esté visible
                                  window.viewer.scene.globe.show = true;
                                  
                                  // Forzar renderizado para que esté listo
                                  window.viewer.scene.requestRender();
                                }
                              } catch(e) {
                                console.error('Error al preparar el globo:', e);
                              }
                              return true;
                            })();
                          `);
                          
                          // Esperar un pequeño momento para asegurar que el WebView está listo
                          setTimeout(() => {
                            // Quitar la vista del mapa
                            setShowMapView(false);
                            console.log("Volviendo al globo terráqueo");
                            
                            // Animar el vuelo del globo después de cambiar la vista
                            setTimeout(() => {
                              webViewRef.current?.injectJavaScript(`
                                (function() {
                                  try {
                                    if (window.viewer) {
                                      window.viewer.camera.flyTo({
                                        destination: Cesium.Cartesian3.fromDegrees(
                                          ${camera.center.longitude}, 
                                          ${camera.center.latitude}, 
                                          ${GLOBE_VIEW_DISTANCE_THRESHOLD}
                                        ),
                                        orientation: {
                                          heading: 0.0,
                                          pitch: -Cesium.Math.PI_OVER_TWO,
                                          roll: 0.0
                                        },
                                        duration: 2.0,
                                        complete: function() {
                                          // Asegurar renderizado después de la animación
                                          window.viewer.scene.requestRender();
                                        }
                                      });
                                      console.log('Animación de vuelo del globo iniciada');
                                    }
                                  } catch(e) {
                                    console.error('Error al animar la vista del globo:', e);
                                  }
                                  return true;
                                })();
                              `);
                            }, 300);
                          }, 300);
                        }
                      }).catch(err => {
                        console.error('Error al obtener la cámara de MapView:', err);
                        // Si hay error, intentamos volver al globo de todos modos
                        setShowMapView(false);
                      });
                    }
                  }, 800); // Permitir que termine la animación de zoom out
                }}
              >
                <Text style={styles.backToGlobeButtonText}>Volver al Globo</Text>
              </TouchableOpacity>
              
              {/* Botón para ir a la ubicación del usuario */}
              <TouchableOpacity 
                style={styles.myLocationButton}
                onPress={() => {
                  console.log("Botón de ubicación en mapa presionado");
                  if (mapViewRef.current && userLocation) {
                    mapViewRef.current.animateToRegion({
                      latitude: userLocation.latitude,
                      longitude: userLocation.longitude,
                      latitudeDelta: 0.01, // Zoom cercano
                      longitudeDelta: 0.01
                    }, 1000);
                  }
                }}
                disabled={!userLocation}
              >
                <MaterialIcons name="my-location" size={24} color="white" />
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
      
      {/* Botón para ir a ubicación en vista de globo 3D */}
      {!showMapView && !useFallbackView && (
        <>
          <TouchableOpacity 
            style={styles.globe3DLocationButton}
            onPress={() => {
              console.log("Botón de ubicación en globo 3D presionado");
              goToUserLocation();
            }}
          >
            <MaterialIcons name="my-location" size={24} color="white" />
          </TouchableOpacity>
          
          {/* Botón para centrar el globo */}
          <TouchableOpacity 
            style={styles.centerGlobeButton}
            onPress={() => {
              console.log("Centrando globo terráqueo");
              if (webViewRef.current) {
                webViewRef.current.injectJavaScript(`
                  (function() {
                    try {
                      if (typeof window.centerGlobe === 'function') {
                        window.centerGlobe();
                        console.log('Globo centrado correctamente');
                      }
                    } catch(e) {
                      console.error('Error al centrar globo:', e);
                    }
                    return true;
                  })();
                `);
              }
            }}
          >
            <MaterialIcons name="explore" size={24} color="white" />
          </TouchableOpacity>
        </>
      )}
      
      {useFallbackView && (
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#4CAF50" style={{flex: 1}} />
          <Text style={{...styles.errorText, position: 'absolute', top: '50%', left: 0, right: 0, textAlign: 'center'}}>
            Cargando vista alternativa...
          </Text>
        </View>
      )}
      
      {error && !useFallbackView && (
        <View style={styles.errorContainer}>
          <ActivityIndicator size="large" color="#4CAF50" style={{marginBottom: 20}} />
          <Text style={{...styles.errorSubtext, marginTop: 10}}>
            Intentando recuperar visualización...
          </Text>
        </View>
      )}
    </View>
  );
};

// Función para calcular el nivel de zoom a partir de la región
const calculateZoomFromRegion = (region: { latitudeDelta: number; longitudeDelta: number; }) => {
  // Fórmula aproximada para convertir delta a nivel de zoom
  const latDelta = region.latitudeDelta;
  const lngDelta = region.longitudeDelta;
  const zoomLat = Math.log(360 / latDelta) / Math.LN2;
  const zoomLng = Math.log(360 / lngDelta) / Math.LN2;
  return Math.min(zoomLat, zoomLng);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 18,
    marginBottom: 10,
    textAlign: 'center',
  },
  errorSubtext: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  fallbackButtonContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1000,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  mapContainer: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  map: {
    flex: 1,
  },
  backToGlobeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1000,
    padding: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 5,
  },
  backToGlobeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  myLocationButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    zIndex: 1000,
    padding: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 50, // Hacerlo circular
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  globe3DLocationButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    zIndex: 1000,
    padding: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 50,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  centerGlobeButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 1000,
    padding: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 50, // Hacerlo circular
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  hiddenView: {
    display: 'none',
  },
});

export default GlobeView; 
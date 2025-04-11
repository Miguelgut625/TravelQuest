// @ts-nocheck
import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator, Text, Dimensions, Linking } from 'react-native';
import WebView from 'react-native-webview';
import * as Location from 'expo-location';
import { Region } from '../types/map';
import { FAB, Button } from 'react-native-paper';
import FallbackView from './FallbackView';
import MapView, { Marker } from 'react-native-maps';

// Token de Cesium
const CESIUM_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiNGNjYzBhOS0wYzA1LTRiNTQtYWJhYi01YjEwNTZiZmJhNDQiLCJpZCI6MjkwMjQyLCJpYXQiOjE3NDM1ODE4NTB9.M05o3luP4BS1qlxa46iP5PWBPIos1RpFjsXhqj8Xl0Q';

// HTML simplificado sin eventos complejos ni Web Workers
const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no">
  <title>TravelQuest - Globo 3D</title>
      <style>
        html, body, #cesiumContainer {
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
          overflow: hidden;
          background-color: #000;
          font-family: sans-serif;
        }
        #loadingOverlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.7);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        #loadingText {
          color: white;
          font-size: 18px;
          margin-top: 20px;
          text-align: center;
        }
        #errorOverlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.8);
          display: none;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          color: white;
          padding: 20px;
          text-align: center;
        }
        .spinner {
          border: 5px solid #f3f3f3;
          border-top: 5px solid #F57C00;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 2s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
  <script>
    // Variable global para desactivar Web Workers
    window.CESIUM_NO_WORKERS = true;
    
    // Función para comunicarse con React Native
    function sendToReactNative(message) {
      if (window.ReactNativeWebView) {
        console.log('Enviando mensaje a React Native:', JSON.stringify(message));
        try {
          window.ReactNativeWebView.postMessage(JSON.stringify(message));
        } catch (error) {
          console.error('Error enviando mensaje a React Native:', error);
        }
      } else {
        console.warn('ReactNativeWebView no disponible para enviar mensajes');
      }
    }
    
    // Notificar que el HTML ha cargado
    window.onload = function() {
      console.log('HTML cargado, notificando a React Native');
      sendToReactNative({ type: 'htmlLoaded' });
      
      // Iniciar carga del globo después de un breve retraso
      setTimeout(initMap, 500);
    };
  </script>
    </head>
    <body>
      <div id="cesiumContainer"></div>
      <div id="loadingOverlay">
        <div class="spinner"></div>
        <div id="loadingText">Iniciando globo terráqueo...</div>
      </div>
      <div id="errorOverlay">
        <h3 style="color: #ff5252;">Error al cargar el mapa</h3>
        <p id="errorMessage"></p>
      </div>

      <!-- Cargar Cesium de forma simplificada -->
      <script src="https://cesium.com/downloads/cesiumjs/releases/1.83/Build/Cesium/Cesium.js"></script>
      <link href="https://cesium.com/downloads/cesiumjs/releases/1.83/Build/Cesium/Widgets/widgets.css" rel="stylesheet">

      <script>
        let viewer;
        let isInitialized = false;
        
        // Función para manejar errores
        function showError(message) {
          document.getElementById('loadingOverlay').style.display = 'none';
          document.getElementById('errorOverlay').style.display = 'flex';
          document.getElementById('errorMessage').textContent = message;
          sendToReactNative({ type: 'error', data: message });
        }
        
        // Función para actualizar estado de carga
        function updateLoadingStatus(message) {
          document.getElementById('loadingText').textContent = message;
          sendToReactNative({ type: 'loadingStatus', message: message });
        }
        
        // Inicializar mapa básico sin eventos complejos
        function initMap() {
          try {
            console.log('Iniciando creación del mapa...');
            updateLoadingStatus('Cargando Cesium...');
            
            if (typeof Cesium === 'undefined') {
              showError('La biblioteca Cesium no está disponible');
              return;
            }
            
            // Configurar token de Cesium
            Cesium.Ion.defaultAccessToken = '${CESIUM_TOKEN}';
            updateLoadingStatus('Configurando visor...');
            
            // Opciones mínimas de visualización
            const options = {
              animation: false,
              baseLayerPicker: false,
              fullscreenButton: false,
              geocoder: false,
              homeButton: false,
              infoBox: false,
              sceneModePicker: false,
              timeline: false,
              navigationHelpButton: false,
              scene3DOnly: true,
              requestRenderMode: true,
              contextOptions: {
                webgl: {
                  alpha: false,
                  antialias: false,
                  preserveDrawingBuffer: true,
                  failIfMajorPerformanceCaveat: false,
                  powerPreference: "high-performance"
                }
              }
            };
            
            // Crear visor sin eventos complejos
            updateLoadingStatus('Creando visor...');
            viewer = new Cesium.Viewer('cesiumContainer', options);
            console.log('Visor creado con éxito');
            
            if (!viewer) {
              showError('No se pudo crear el visor de Cesium');
              return;
            }
            
            // Configurar vista inicial básica
            if (viewer.camera) {
              viewer.camera.setView({
                destination: Cesium.Cartesian3.fromDegrees(0, 0, 20000000)
              });
            }
            
            // Ocultar capa de carga
            document.getElementById('loadingOverlay').style.display = 'none';
            
            // Notificar que está listo
            isInitialized = true;
            console.log('Visor inicializado correctamente, notificando a React Native');
            sendToReactNative({ type: 'viewerReady' });
            
          } catch (error) {
            console.error('Error inicializando mapa:', error);
            showError((error && error.message) || 'Error al inicializar el mapa');
          }
        }
        
        // Función para procesar mensajes desde React Native
        function handleMessage(messageData) {
          try {
            // No hacer nada si no está inicializado
            if (!isInitialized || !viewer) {
              console.warn('Recibido mensaje pero el visor no está inicializado');
              return;
            }
            
            let message;
            if (typeof messageData === 'string') {
              try {
                message = JSON.parse(messageData);
              } catch (e) {
                console.error('Error parseando mensaje:', e);
                return;
              }
            } else {
              message = messageData;
            }
            
            console.log('Procesando mensaje:', message.type);
            
            // Solo implementar la navegación básica por ahora
            if (message.type === 'flyTo' && viewer.camera) {
              const { longitude, latitude, height } = message;
              viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(
                  longitude || 0, 
                  latitude || 0, 
                  height || 10000000
                ),
                duration: 1.5
              });
            }
            // Implementar transición suave para cambio a 2D
            else if (message.type === 'transitionTo2D' && viewer.camera) {
              console.log('Iniciando transición a 2D');
              const { longitude, latitude, height, duration } = message;
              
              // Definir la posición de destino
              const destination = Cesium.Cartesian3.fromDegrees(
                longitude || 0,
                latitude || 0,
                height || 2000
              );
              
              // Definir la orientación para mirar hacia abajo
              const orientation = {
                heading: Cesium.Math.toRadians(0),
                pitch: Cesium.Math.toRadians(-90), // Mirando directamente hacia abajo
                roll: 0
              };
              
              try {
                // Ejecutar la animación y notificar cuando termine
                viewer.camera.flyTo({
                  destination: destination,
                  orientation: orientation,
                  duration: duration || 3.0,
                  complete: function() {
                    try {
                      // Notificar que la transición ha terminado
                      console.log('Transición a 2D completada');
                      sendToReactNative({ type: 'transitionComplete' });
                    } catch (err) {
                      console.error('Error notificando finalización de transición a 2D:', err);
                    }
                  }
                });
              } catch (err) {
                console.error('Error en transición a 2D:', err);
                // Notificar el error pero también enviar la señal de completado para no bloquear la interfaz
                sendToReactNative({ type: 'error', data: 'Error en transición a 2D: ' + err.message });
                sendToReactNative({ type: 'transitionComplete' });
              }
            }
            // Implementar transición desde 2D a 3D (inversa)
            else if (message.type === 'transitionFrom2D' && viewer.camera) {
              console.log('Iniciando transición desde 2D a 3D');
              const { latitude, longitude, initialHeight, finalHeight, duration, centerView, viewAngle } = message;
              
              try {
                // Desactivar cualquier rotación previa que pudiera estar activa
                stopGlobeRotation();
                
                // Usar ángulo de inclinación que asegure que la Tierra sea visible (más cercano a 0)
                const pitchAngle = -90; // Ángulo más elevado para ver la Tierra desde arriba
                
                // Primero posicionamos la cámara directamente en la ubicación mirando hacia abajo
                viewer.camera.setView({
                  destination: Cesium.Cartesian3.fromDegrees(
                    longitude || 0, 
                    latitude || 0, 
                    initialHeight || 5000
                  ),
                  orientation: {
                    heading: Cesium.Math.toRadians(0),
                    pitch: Cesium.Math.toRadians(-90), // Mirando directamente hacia abajo
                    roll: 0
                  }
                });
                
                // Verificar si debemos centrar automáticamente el globo al final
                const shouldCenterView = centerView !== false; // true por defecto si no se especifica
                
                // Después de un breve retraso, comenzamos una transición directa
                setTimeout(() => {
                  try {
                    // Usar la altura recibida desde React Native o un valor predeterminado
                    console.log('Altura final recibida:', finalHeight);
                    // Usar el valor exacto del parámetro, sin ninguna modificación adicional
                    const finalAltitude = finalHeight || 30000000; 
                    
                    // Una única transición para evitar saltos
                    viewer.camera.flyTo({
                      destination: Cesium.Cartesian3.fromDegrees(
                        0, // Centrado en longitud 0
                        0, // Centrado en latitud 0
                        finalAltitude // Usar exactamente la altura recibida
                      ),
                      orientation: {
                        heading: Cesium.Math.toRadians(0),
                        pitch: Cesium.Math.toRadians(pitchAngle),
                        roll: 0
                      },
                      duration: duration, // Usar la duración completa
                      complete: function() {
                        try {
                          // No cambiamos la posición de la cámara al finalizar para evitar saltos
                          console.log('Manteniendo la posición final de la transición sin cambios bruscos');
                          // Configurar el entorno para mantener la Tierra visible
                          if (viewer.scene) {
                            // Limitar el zoom y la inclinación
                            if (viewer.scene.screenSpaceCameraController) {
                              viewer.scene.screenSpaceCameraController.minimumZoomDistance = 3000000; // No permitir acercarse demasiado
                              viewer.scene.screenSpaceCameraController.maximumZoomDistance = 500000000; // Limitar la distancia máxima
                              
                              // Limitar el rango de inclinación para que siempre se vea la Tierra
                              viewer.scene.screenSpaceCameraController.minimumPitch = Cesium.Math.toRadians(-75);
                              viewer.scene.screenSpaceCameraController.maximumPitch = Cesium.Math.toRadians(-15);
                            }
                            
                            // Mejorar la visibilidad de la Tierra
                            if (viewer.scene.globe) {
                              viewer.scene.globe.baseColor = Cesium.Color.BLUE;
                              viewer.scene.globe.enableLighting = true;
                              viewer.scene.globe.showGroundAtmosphere = true; // Mostrar atmósfera
                              
                              // Hacer que la Tierra sea el centro de atención
                              if (viewer.scene.skyAtmosphere) {
                                viewer.scene.skyAtmosphere.show = true;
                                viewer.scene.skyAtmosphere.brightnessShift = 0.5;
                              }
                            }
                          }
                          
                          // Iniciar rotación con un ligero retraso
                          setTimeout(() => {
                            try {
                              startGlobeRotation();
                              console.log('Transición desde 2D a 3D completada correctamente');
                              sendToReactNative({ type: 'transitionFrom2DComplete' });
                            } catch (e) {
                              console.error('Error al finalizar la transición:', e);
                              sendToReactNative({ type: 'transitionFrom2DComplete' });
                            }
                          }, 300);
                        } catch (e) {
                          console.error('Error en la etapa final de la transición:', e);
                          sendToReactNative({ type: 'transitionFrom2DComplete' });
                        }
                      }
                    });
                  } catch (e) {
                    console.error('Error en la transición:', e);
                    // Método alternativo directo en caso de fallo
                    try {
                      viewer.camera.setView({
                        destination: Cesium.Cartesian3.fromDegrees(0, 0, 8000000),
                        orientation: {
                          heading: Cesium.Math.toRadians(0),
                          pitch: Cesium.Math.toRadians(pitchAngle),
                          roll: 0
                        }
                      });
                      
                      startGlobeRotation();
                      sendToReactNative({ type: 'transitionFrom2DComplete' });
                    } catch (e2) {
                      console.error('Error en el método alternativo:', e2);
                      sendToReactNative({ type: 'transitionFrom2DComplete' });
                    }
                  }
                }, 500);
              } catch (e) {
                console.error('Error configurando vista inicial para transición 2D a 3D:', e);
                sendToReactNative({ type: 'transitionFrom2DComplete' });
              }
            }
            // Implementar modo oscuro/claro
            else if (message.type === 'setDarkMode') {
              const { enabled } = message;
              if (enabled) {
                // Modo oscuro
                viewer.scene.globe.baseColor = Cesium.Color.BLACK;
                viewer.scene.backgroundColor = Cesium.Color.BLACK;
                } else {
                // Modo normal
                viewer.scene.globe.baseColor = Cesium.Color.BLUE;
                viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#1B1B1B');
              }
            }
          } catch (e) {
            console.error('Error procesando mensaje:', e);
          }
        }
        
        // Función para iniciar rotación automática del globo
        let globeRotationActive = false;
        function startGlobeRotation() {
          if (globeRotationActive) return;
          
          console.log('Iniciando rotación automática del globo');
          globeRotationActive = true;
          let lastTime = Date.now();
          
          function rotateGlobe() {
            if (!globeRotationActive || !viewer) return;
            
            const currentTime = Date.now();
            const delta = currentTime - lastTime;
            lastTime = currentTime;
            
            // Rotar el globo lentamente
            try {
              viewer.scene.camera.rotate(Cesium.Cartesian3.UNIT_Z, -delta / 100000); // Rotación mucho más lenta
              
              // Asegurar que la Tierra siempre sea visible durante la rotación
              const cameraHeight = viewer.scene.camera.positionCartographic.height;
              if (cameraHeight > 15000000) {
                // Si la cámara está demasiado lejos, acercarla
                viewer.scene.camera.zoomIn(50000);
              }
            } catch (e) {
              console.error('Error durante la rotación del globo:', e);
              globeRotationActive = false;
              return;
            }
            
            // Continuar la rotación
            requestAnimationFrame(rotateGlobe);
          }
          
          // Iniciar rotación
          requestAnimationFrame(rotateGlobe);
        }
        
        // Detener rotación
        function stopGlobeRotation() {
          globeRotationActive = false;
        }
        
        // Configurar recepción de mensajes
        window.addEventListener('message', function(event) {
          console.log('Mensaje recibido por window.addEventListener:', event.data);
          handleMessage(event.data);
        });
        
        document.addEventListener('message', function(event) {
          console.log('Mensaje recibido por document.addEventListener:', event.data);
          handleMessage(event.data);
        });
      </script>
    </body>
</html>
`;

/**
 * Interfaz para la ubicación del usuario
 */
interface UserLocation {
  latitude: number;
  longitude: number;
  altitude: number;
  accuracy?: number;
}

/**
 * Interfaz para los métodos expuestos a componentes padres
 */
export interface GlobeViewRef {
  getUserLocation: () => Promise<Location.LocationObject | null>;
  flyTo: (latitude: number, longitude: number, options?: any) => void;
  reloadViewer: () => void;
  setDarkMode: (enabled: boolean) => void;
  toggleMapMode: () => void;
}

// Props del componente GlobeView
export interface Props {
  style?: any;
  region?: Region;
  initialRegion?: Region;
  showsUserLocation?: boolean;
  followsUserLocation?: boolean;
  useFallbackGlobe?: boolean;
  onRegionChange?: (region: Region) => void;
  onRegionChangeComplete?: (region: Region) => void;
  onLoadingChange?: (loading: boolean) => void;
  webViewRef?: React.RefObject<WebView>;
  onError?: (error: string) => void;
  onLoadEnd?: () => void;
}

// Componente para mostrar el globo en 3D
const GlobeView = forwardRef<GlobeViewRef, Props>((props, ref) => {
  console.log("GlobeView: Inicializando componente");
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingPhase, setLoadingPhase] = useState('Iniciando...');
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isWebViewReady, setIsWebViewReady] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [performanceMode, setPerformanceMode] = useState(true); // Modo rendimiento por defecto
  const [is3DMode, setIs3DMode] = useState(true); // Por defecto en modo 3D
  const [mapRegion, setMapRegion] = useState<Region | null>(null);

  // Efecto para logging del ciclo de vida
  useEffect(() => {
    console.log("GlobeView: Componente montado");
    return () => {
      console.log("GlobeView: Componente desmontado");
    };
  }, []);

  // Efecto para asegurar que el WebView siempre esté inicializado
  useEffect(() => {
    // Iniciar temprano para que el WebView esté listo cuando se necesite
    if (!isWebViewReady && webViewRef.current) {
      console.log("GlobeView: Inicializando WebView precargado");
      
      // Si el WebView aún no está listo, asegurarnos de que esté cargado
      // No hacemos nada activamente porque la carga ocurre automáticamente
      // al montar el componente WebView
    }
    
    // Verificar periódicamente si el WebView está listo
    const checkInterval = setInterval(() => {
      if (!isWebViewReady && webViewRef.current) {
        console.log("GlobeView: Verificando estado del WebView precargado");
      } else if (isWebViewReady) {
        console.log("GlobeView: WebView precargado está listo");
        clearInterval(checkInterval);
      }
    }, 2000);
    
    return () => {
      clearInterval(checkInterval);
    };
  }, [isWebViewReady]);

  // Cambiar entre mapa 3D y 2D
  const toggleMapMode = async () => {
    console.log('GlobeView: Iniciando toggleMapMode, modo actual:', is3DMode ? '3D' : '2D');
    
    if (is3DMode) {
      setIsLocating(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          console.log('GlobeView: Permiso de ubicación denegado');
          setIsLocating(false);
          return;
        }
        
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });
        
        console.log('GlobeView: Ubicación obtenida para transición a 2D:', location.coords);
        setUserLocation(location);
        
        // Configurar la región para el mapa 2D
        setMapRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01
        });
        
        console.log('GlobeView: Iniciando transición a mapa 2D en ubicación:', location.coords);
        
        // Primero hacemos zoom a la ubicación actual antes de cambiar a 2D
        if (isWebViewReady && webViewRef.current) {
          try {
            // Enviamos mensaje al WebView para hacer zoom
            const transitionMessage = {
              type: 'transitionTo2D',
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              height: 2000, // Altura final en metros 
              duration: 4.0  // Duración de la animación en segundos
            };
            
            console.log('GlobeView: Enviando mensaje de transición:', transitionMessage);
            webViewRef.current.postMessage(JSON.stringify(transitionMessage));
            
            // No cambiamos el modo aquí - esperamos el mensaje 'transitionComplete' del WebView
            // que será manejado en la función handleMessage
            console.log('GlobeView: Esperando mensaje de transición completada desde WebView');
            return;
          } catch (error) {
            console.error('GlobeView: Error en la transición a 2D:', error);
            // Si hay algún error en la transición, procedemos al cambio directo
          }
        } else {
          console.log('GlobeView: WebView no está listo, cambiando directamente a 2D');
        }
      } catch (error) {
        console.error('GlobeView: Error al obtener ubicación:', error);
      } finally {
        if (!(isWebViewReady && webViewRef.current)) {
          console.log('GlobeView: Cambiando directamente a 2D sin animación');
          setIsLocating(false);
          // Cambiamos el modo directamente si no se pudo hacer la animación
          setIs3DMode(false);
        }
      }
    } else {
      // Transición de 2D a 3D
      console.log('GlobeView: Iniciando transición de mapa 2D a 3D');
      
      // Cambiar inmediatamente a modo 3D, el WebView ya está precargado
      setIs3DMode(true);
      
      // Usamos la posición actual como punto inicial pero aseguramos transición a vista centrada
      const currentRegion = mapRegion || {
        latitude: 0,
        longitude: 0,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      };
      
      // Calculamos una altura adecuada para la vista inicial
      const initialHeight = 5000; // altura inicial en metros para la vista de transición
      
      // Verificamos una sola vez si el WebView está listo
      if (isWebViewReady && webViewRef.current) {
        console.log('GlobeView: WebView listo para transición inmediata 2D a 3D');
        
        // Pequeño retraso para asegurar que la UI se actualice antes de la transición
        setTimeout(() => {
          if (webViewRef.current) {
            try {
              const initialPositionMessage = {
                type: 'transitionFrom2D',
                // Punto de partida (ubicación actual)
                latitude: currentRegion.latitude,
                longitude: currentRegion.longitude,
                // Parámetros de la transición
                initialHeight: initialHeight,
                finalHeight: 30000000, // Altura reducida para una mejor visualización
                duration: 8.0, // Duración de la transición
                // Añadir parámetro para forzar el centrado final
                centerView: true,
                // Añadir ángulo de inclinación para mantener la Tierra visible
                viewAngle: -70 // Ángulo de vista inclinado para una mejor perspectiva de la Tierra
              };
              
              console.log('GlobeView: Enviando mensaje de transición 2D a 3D:', initialPositionMessage);
              webViewRef.current.postMessage(JSON.stringify(initialPositionMessage));
          } catch (error) {
              console.error('GlobeView: Error al enviar mensaje de transición:', error);
            }
          }
        }, 300); // Reducir tiempo antes de iniciar la transición, ya que WebView está precargado
      } else {
        console.warn('GlobeView: WebView no está listo para la transición, esto no debería ocurrir con precarga');
      }
    }
  };

  // Exponer funciones a los componentes padres
  useImperativeHandle(ref, () => ({
    getUserLocation: async () => {
      console.log('GlobeView: Solicitando permisos de ubicación...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('GlobeView: Permiso de ubicación denegado');
        return null;
      }
      
      console.log('GlobeView: Obteniendo ubicación actual...');
      const location = await Location.getCurrentPositionAsync({});
      console.log('GlobeView: Ubicación obtenida:', location);
      setUserLocation(location);
      
      // Si estamos en modo 2D, actualizar la región del mapa
      if (!is3DMode && location) {
        setMapRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01
        });
      }
      
      // Enviar la ubicación al WebView si está listo y en modo 3D
      if (is3DMode && isWebViewReady && webViewRef.current) {
        const message = {
          type: 'updateUserLocation',
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy
        };
        console.log('GlobeView: Enviando ubicación al WebView:', message);
        webViewRef.current.postMessage(JSON.stringify(message));
      } else {
        console.log('GlobeView: WebView no está listo para recibir la ubicación');
      }
      
      return location;
    },
    flyTo: async (latitude: number, longitude: number, options?: any) => {
      console.log('GlobeView: Llamada a método flyTo', latitude, longitude, options);
      
      if (is3DMode && isWebViewReady && webViewRef.current) {
        const message = {
          type: 'flyTo',
          latitude,
          longitude,
          height: options?.height || 10000,
          duration: options?.duration || 2
        };
        console.log('GlobeView: Enviando comando flyTo al WebView:', message);
        webViewRef.current.postMessage(JSON.stringify(message));
      } else if (!is3DMode) {
        // En modo 2D, actualizar la región del mapa
        setMapRegion({
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01
        });
      } else {
        console.warn("GlobeView: WebView no disponible para flyTo");
      }
    },
    reloadViewer: () => {
      console.log('GlobeView: Recargando visor');
      if (is3DMode && webViewRef.current) {
        webViewRef.current.reload();
      } else if (!is3DMode) {
        // Recargar en modo 2D
        getUserLocation();
      }
    },
    setDarkMode: (enabled: boolean) => {
      console.log('GlobeView: Cambiando modo oscuro:', enabled);
      if (is3DMode && isWebViewReady && webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({ 
          type: 'setDarkMode', 
          enabled 
        }));
      }
    },
    toggleMapMode
  }));

  // Manejar mensajes del WebView
  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('GlobeView: Mensaje recibido del WebView:', data);
      
      switch (data.type) {
        case 'htmlLoaded':
          console.log('GlobeView: HTML cargado en WebView');
          setLoadingPhase('HTML cargado');
          break;
        case 'viewerReady':
          console.log('GlobeView: Visor Cesium listo');
          setIsWebViewReady(true);
          setIsLoading(false);
          setLoadingPhase('Completado');
          if (props.onLoadingChange) {
            props.onLoadingChange(false);
          }
          if (props.onLoadEnd) {
            console.log('GlobeView: Llamando a onLoadEnd del padre');
            props.onLoadEnd();
          }
          break;
        case 'loadingStatus':
          console.log('GlobeView: Actualizando estado de carga:', data.message);
          setLoadingPhase(data.message);
          break;
        case 'error':
          console.error('GlobeView: Error reportado por WebView:', data.data);
          setHasError(true);
          setErrorMessage(data.data);
          if (props.onError) {
            props.onError(data.data);
          }
          break;
        case 'transitionComplete':
          console.log('GlobeView: Transición a 2D completada');
          // Verificamos que estamos en proceso de transición a 2D
          if (is3DMode) {
            console.log('GlobeView: Completando transición a 2D, cambiando modo');
            setIs3DMode(false);
            setIsLocating(false);
          }
          break;
        case 'transitionFrom2DComplete':
          console.log('GlobeView: Transición desde 2D a 3D completada');
          // Verificamos si debemos actualizar algún estado después de la transición 3D
          if (!is3DMode) {
            console.log('GlobeView: Asegurando modo 3D después de transición');
            setIs3DMode(true);
          }
          break;
        case 'message':
          console.log('GlobeView: Mensaje:', data.data);
          break;
        default:
          console.log('GlobeView: Tipo de mensaje no manejado:', data.type);
      }
          } catch (error) {
      console.error('GlobeView: Error al procesar mensaje del WebView:', error);
    }
  }, [is3DMode, props]);

  // Obtener la ubicación del usuario
  const getUserLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('Permiso de ubicación denegado');
        setIsLocating(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest
      });

      const userLocation: UserLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: 10000, // Altura en metros para la vista
        accuracy: location.coords.accuracy
      };

      console.log('Ubicación del usuario:', userLocation);

      // Actualizar la ubicación según el modo
      if (is3DMode && webViewRef.current) {
        // Enviar ubicación al WebView en modo 3D
        const message = {
          type: 'flyTo',
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          height: 5000
        };
        webViewRef.current.postMessage(JSON.stringify(message));
        } else {
        // Actualizar región en modo 2D
        setMapRegion({
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01
        });
      }

      setUserLocation(location);
      setIsLocating(false);
    } catch (error) {
      console.error('Error al obtener la ubicación:', error);
      setIsLocating(false);
    }
  };

  // Reiniciar WebView en caso de error
  const handleRetry = () => {
    setRetryCount(prevCount => prevCount + 1);
    setHasError(false);
    setErrorMessage('');
    setIsLoading(true);
    
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  // Cambiar modo de rendimiento
  const togglePerformanceMode = () => {
    const newMode = !performanceMode;
    setPerformanceMode(newMode);
    
    // Enviar mensaje al WebView si está listo
    if (is3DMode && isWebViewReady && webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'setPerformanceMode',
        enabled: newMode
      }));
    }
  };

  // Efecto para retry automático
  useEffect(() => {
    // Reiniciar si hay error
    if (hasError && retryCount < 3) {
      console.log(`GlobeView: Reintentando después de error (${retryCount + 1}/3)...`);
      const timer = setTimeout(handleRetry, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasError, retryCount]);

  // Renderización del componente
  return (
    <View style={styles.container}>
      {/* Para debug */}
      {__DEV__ && true && (
        <View style={styles.debugView}>
          <Text style={styles.debugText}>
            Estado: {isLoading ? 'Cargando' : hasError ? 'Error' : 'Listo'}
            {'\n'}WebView: {isWebViewReady ? 'Listo' : 'No listo'}
            {'\n'}Modo: {is3DMode ? '3D' : '2D'}
          </Text>
        </View>
      )}

      {/* Usar fallback o mostrar error incorregible */}
      {(hasError && retryCount >= 3) || (props.useFallbackGlobe === true) ? (
        <FallbackView 
          error={errorMessage || "No se pudo cargar el Globo 3D"}
          onRetry={() => {
            setRetryCount(0);
            setHasError(false);
            setErrorMessage('');
            handleRetry();
          }}
        />
      ) : (
        <>
          {/* WebView siempre presente, visible u oculta según el modo */}
        <WebView
          ref={webViewRef}
            source={{ html: htmlContent }}
            style={[
              styles.webview,
              // Visible solo en modo 3D, pero siempre presente
              !is3DMode && { opacity: 0, position: 'absolute', width: 1, height: 1, top: -1000 }
            ]}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
            onMessage={handleMessage}
            onLoadEnd={() => {
              console.log('GlobeView: WebView onLoadEnd nativo');
            }}
            onError={(e) => {
              console.error('GlobeView: WebView onError:', e.nativeEvent);
              // Actualizar el estado con el error
              setHasError(true);
              setErrorMessage('Error al cargar el WebView: ' + e.nativeEvent.description);
            }}
          />
          
          {/* MapView para modo 2D (solo visible en modo 2D) */}
          {!is3DMode && (
            <MapView
              style={styles.map}
              region={mapRegion || {
                latitude: 0,
                longitude: 0,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01
              }}
              showsUserLocation={true}
              showsMyLocationButton={true}
              showsCompass={true}
              showsScale={true}
              mapType="hybrid"
            />
          )}
        </>
      )}

      {isLoading && is3DMode && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F57C00" />
          <Text style={styles.loadingText}>Cargando el globo...</Text>
          <Text style={styles.loadingPhaseText}>{loadingPhase}</Text>
          <View style={styles.progressBarContainer}>
            <View 
              style={[
                styles.progressBar, 
                { width: `${getLoadingProgress(loadingPhase)}%` }
              ]} 
            />
          </View>
            </View>
      )}
      
      {hasError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {errorMessage}</Text>
          <Text style={styles.errorDescription}>
            Esto puede deberse a problemas de red o de rendimiento. 
            Intente nuevamente o active el modo de rendimiento.
          </Text>
          <View style={styles.buttonRow}>
          <Button 
            mode="contained" 
              onPress={handleRetry}
              style={styles.retryButton}
            >
              Intentar de nuevo
            </Button>
            <Button 
              mode="outlined" 
              onPress={togglePerformanceMode}
              style={styles.performanceButton}
            >
              {performanceMode ? 'Desactivar' : 'Activar'} modo rendimiento
          </Button>
        </View>
        </View>
      )}
      
      {props.showsUserLocation && !isLoading && !hasError && (
        <View style={styles.buttonContainer}>
      <FAB
        style={styles.fab}
            icon={is3DMode ? "map" : "earth"}
            color="#fff"
            loading={isLocating}
            onPress={toggleMapMode}
          />
          {is3DMode && (
            <FAB
              style={[styles.fab, styles.performanceFab]}
              icon={performanceMode ? "flash-off" : "flash"}
              color="#fff"
              onPress={togglePerformanceMode}
            />
          )}
        </View>
      )}
    </View>
  );
});

// Función para calcular el progreso de carga
function getLoadingProgress(phase: string): number {
  switch (phase) {
    case 'Iniciando...': return 10;
    case 'Cargando HTML...': return 20;
    case 'HTML cargado': return 30;
    case 'Cargando Cesium...': return 50;
    case 'Iniciando terreno...': return 70;
    case 'Cargando capas...': return 85;
    case 'Completado': return 100;
    default: return 50;
  }
}

// Estilos para el componente
const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative'
  },
  webview: {
    backgroundColor: '#000',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingPhaseText: {
    color: '#ddd',
    marginTop: 5,
    fontSize: 14,
  },
  progressBarContainer: {
    width: '80%',
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    marginTop: 15,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#F57C00',
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ff5252',
    marginBottom: 10,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  errorDescription: {
    color: '#eee',
    marginBottom: 20,
    fontSize: 14,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  retryButton: {
    backgroundColor: '#F57C00',
    marginHorizontal: 5,
    marginTop: 10,
  },
  performanceButton: {
    borderColor: '#F57C00',
    marginHorizontal: 5,
    marginTop: 10,
  },
  buttonContainer: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  fab: {
    backgroundColor: '#F57C00',
    marginBottom: 8,
  },
  performanceFab: {
    backgroundColor: '#8e24aa',
  },
  debugView: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    zIndex: 1000,
  },
  debugText: {
    color: 'white',
    fontSize: 10,
  },
}); 

export default GlobeView; 
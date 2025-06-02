// @ts-nocheck
import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator, Text, Dimensions, Linking, Alert, Modal, ScrollView, TouchableOpacity, Image } from 'react-native';
import WebView, { WebViewMessageEvent } from 'react-native-webview';
import * as Location from 'expo-location';
import { Region } from '../types/map';
import { FAB, Button, Divider, Card } from 'react-native-paper';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useSelector } from 'react-redux';
import { getWeatherByCity, getWeatherByCoordinates, getUserJourneyCities, getForecastByCity, getForecastByCoordinates } from '../services/weatherService';
import FallbackView from './FallbackView';

// Token de Cesium
const CESIUM_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiNGNjYzBhOS0wYzA1LTRiNTQtYWJhYi01YjEwNTZiZmJhNDQiLCJpZCI6MjkwMjQyLCJpYXQiOjE3NDM1ODE4NTB9.M05o3luP4BS1qlxa46iP5PWBPIos1RpFjsXhqj8Xl0Q';

// API key de OpenWeatherMap
const OPENWEATHERMAP_API_KEY = Constants.expoConfig?.extra?.openWeatherMapApiKey || '7b4032296ff42f3251c5b97a5eff8ef7';

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
 * Interfaz para los datos del clima
 */
interface WeatherData {
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  wind: {
    speed: number;
    deg: number;
  };
  name: string;
  sys: {
    country: string;
  };
  coord?: {
    lat: number;
    lon: number;
  };
}

/**
 * Interfaz para un día del pronóstico
 */
interface ForecastDay {
  dt: number;
  date: Date;
  temp: {
    day: number;
    min: number;
    max: number;
  };
  feels_like: {
    day: number;
  };
  pressure: number;
  humidity: number;
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  speed: number;
  deg: number;
  clouds: number;
  pop: number;
  rain?: number;
}

/**
 * Interfaz para los datos del pronóstico de 7 días
 */
interface ForecastData {
  lat: number;
  lon: number;
  timezone: number;
  timezone_offset: number;
  city_name: string;
  country: string;
  daily: ForecastDay[];
}

interface City {
  id: string;
  name: string;
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
  getWeatherData: () => Promise<void>;
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
  const [is3DMode, setIs3DMode] = useState(true);
  const [mapRegion, setMapRegion] = useState<Region | null>(null);

  // Estados para el clima
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [weatherModalVisible, setWeatherModalVisible] = useState(false);
  const [userCities, setUserCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [cityDropdownVisible, setCityDropdownVisible] = useState(false);
  const [showForecast, setShowForecast] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingCities, setIsLoadingCities] = useState(false);

  const userId = useSelector((state: any) => state.auth?.user?.id);

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

  // Cargar ciudades del usuario cuando se abre el modal
  useEffect(() => {
    if (weatherModalVisible && userId) {
      loadUserCities();
    }
  }, [weatherModalVisible, userId]);

  // Función para cargar las ciudades del usuario
  const loadUserCities = async () => {
    if (!userId) return;
    
    try {
      setIsLoadingCities(true);
      const cities = await getUserJourneyCities(userId);
      console.log('Ciudades cargadas:', cities);
      setUserCities(cities);
    } catch (error) {
      console.error('Error al cargar ciudades:', error);
      setError('Error al cargar las ciudades');
    } finally {
      setIsLoadingCities(false);
    }
  };

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
        }, 300);
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
    toggleMapMode,
    getWeatherData
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

  // Efecto para retry automático
  useEffect(() => {
    // Reiniciar si hay error
    if (hasError && retryCount < 3) {
      console.log(`GlobeView: Reintentando después de error (${retryCount + 1}/3)...`);
      const timer = setTimeout(handleRetry, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasError, retryCount]);

  // Efecto para monitorear cambios en selectedCity
  useEffect(() => {
    console.log('Estado selectedCity actualizado:', selectedCity);
  }, [selectedCity]);

  // Efecto para mostrar información de depuración cuando se abre el modal
  useEffect(() => {
    if (weatherModalVisible) {
      console.log('Modal del clima abierto');
      console.log('Ciudad seleccionada:', selectedCity || 'Ubicación actual');
      console.log('Datos del clima:', weatherData ? `Disponibles para ${weatherData.name}` : 'No disponibles');
      console.log('Datos del pronóstico:', forecastData ? 'Disponibles' : 'No disponibles');
    }
  }, [weatherModalVisible, selectedCity, weatherData, forecastData]);

  // Función para obtener datos del clima sin abrir modal
  const fetchWeatherData = async (city: string | null) => {
    try {
      setError(null);
      
      if (city) {
        console.log('Obteniendo clima para ciudad específica:', city);
        try {
          // Usar el nombre exacto de la ciudad seleccionada
          const weatherResponse = await getWeatherByCity(city, OPENWEATHERMAP_API_KEY);
          console.log('Respuesta del clima recibida para ciudad:', weatherResponse);
          setWeatherData(weatherResponse);
          
          const forecastResponse = await getForecastByCity(city, OPENWEATHERMAP_API_KEY);
          console.log('Respuesta del pronóstico recibida para ciudad:', forecastResponse);
          setForecastData(forecastResponse);
        } catch (cityError) {
          console.error('Error obteniendo clima para ciudad:', cityError);
          setError(`No se pudo obtener el clima para ${city}: ${cityError.message}`);
        }
      } else {
        console.log('Obteniendo clima para ubicación actual');
        let location = userLocation;
        if (!location) {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            throw new Error('Permiso de ubicación denegado');
          }
          location = await Location.getCurrentPositionAsync({});
          setUserLocation(location);
        }
        const weatherResponse = await getWeatherByCoordinates(
          location.coords.latitude,
          location.coords.longitude,
          OPENWEATHERMAP_API_KEY
        );
        setWeatherData(weatherResponse);
        const forecastResponse = await getForecastByCoordinates(
          location.coords.latitude,
          location.coords.longitude,
          OPENWEATHERMAP_API_KEY
        );
        setForecastData(forecastResponse);
      }
    } catch (error) {
      console.error('Error obteniendo datos del clima:', error);
      setError(error.message);
    } finally {
      setIsLoadingWeather(false);
    }
  };

  // Función para obtener datos del clima y abrir el modal
  const getWeatherData = async () => {
    try {
      // Evitar abrir el modal si ya está abierto
      if (!weatherModalVisible) {
        // Abrir el modal primero
        setWeatherModalVisible(true);
      }
      
      setIsLoadingWeather(true);
      setError(null);

      // Usar la función para obtener datos según la ciudad seleccionada
      await fetchWeatherData(selectedCity);
    } catch (error) {
      console.error('Error en getWeatherData:', error);
      setError(error.message);
      setIsLoadingWeather(false);
    }
  };

  // Modal para mostrar los datos del clima
  const WeatherModal = () => {
    // Función para convertir timestamp a día de la semana
    const getDayOfWeek = (date: Date) => {
      const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      return days[date.getDay()];
    };

    // Función para formatear fecha completa
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long'
      });
    };

    const selectCity = (cityName: string) => {
      console.log('Seleccionando ciudad:', cityName);
      
      // Cerrar el dropdown primero
      setCityDropdownVisible(false);
      
      // No cerrar el modal, solo actualizar la selección
      if (cityName === 'Mi ubicación actual') {
        console.log('Cambiando a ubicación actual');
        setSelectedCity(null);
      } else {
        console.log('Cambiando a ciudad específica:', cityName);
        setSelectedCity(cityName);
      }
      
      // Limpiar datos anteriores
      setWeatherData(null);
      setForecastData(null);
      
      // Iniciar la carga inmediatamente
      setIsLoadingWeather(true);
      
      // Usar setTimeout para asegurar que el estado se actualice antes de obtener los datos
      setTimeout(() => {
        console.log('Obteniendo datos del clima después de seleccionar ciudad:', cityName === 'Mi ubicación actual' ? 'ubicación actual' : cityName);
        fetchWeatherData(cityName === 'Mi ubicación actual' ? null : cityName);
      }, 100);
    };

    return (
      <Modal
        visible={weatherModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setWeatherModalVisible(false)}
      >
        <View style={styles.weatherModalOverlay}>
          <View style={styles.weatherModalContent}>
            <View style={styles.weatherModalHeader}>
              <Text style={styles.weatherModalTitle}>
                {selectedCity ? `Clima en ${selectedCity}` : 'Clima en tu ubicación'}
                {isLoadingWeather && <Text style={styles.loadingIndicatorText}> (Cargando...)</Text>}
              </Text>
              <TouchableOpacity onPress={() => setWeatherModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Pestañas para alternar entre clima actual y pronóstico */}
            <View style={styles.weatherTabs}>
              <TouchableOpacity
                style={[styles.weatherTab, !showForecast && styles.weatherTabActive]}
                onPress={() => setShowForecast(false)}
              >
                <Text style={[styles.weatherTabText, !showForecast && styles.weatherTabTextActive]}>
                  Actual
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.weatherTab, showForecast && styles.weatherTabActive]}
                onPress={() => setShowForecast(true)}
              >
                <Text style={[styles.weatherTabText, showForecast && styles.weatherTabTextActive]}>
                  Próximos 7 días
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.weatherModalBody}>
              {isLoadingWeather ? (
                <View style={styles.weatherLoading}>
                  <ActivityIndicator size="large" color="#005F9E" />
                  <Text style={styles.weatherLoadingText}>Cargando información del clima...</Text>
                </View>
              ) : showForecast ? (
                // Vista de pronóstico de 7 días
                forecastData ? (
                  <View style={styles.forecastContainer}>
                    <Text style={styles.forecastTitle}>
                      Pronóstico para {forecastData.city_name || weatherData?.name || 'la ubicación seleccionada'}
                    </Text>
                    {forecastData.daily.slice(0, 7).map((day, index) => (
                      <Card key={index} style={styles.forecastCard}>
                        <Card.Content>
                          <View style={styles.forecastDayHeader}>
                            <Text style={styles.forecastDay}>
                              {index === 0 ? 'Hoy' : getDayOfWeek(day.date)}
                            </Text>
                            <Text style={styles.forecastDate}>
                              {formatDate(day.date)}
                            </Text>
                          </View>

                          <View style={styles.forecastRow}>
                            <View style={styles.forecastIconContainer}>
                              <Image
                                source={{ uri: `https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png` }}
                                style={styles.forecastIcon}
                              />
                              <Text style={styles.forecastDescription}>
                                {day.weather[0].description}
                              </Text>
                            </View>

                            <View style={styles.forecastTemps}>
                              <Text style={styles.forecastTempMax}>
                                <Ionicons name="arrow-up" size={16} color="#FF5722" />
                                {Math.round(day.temp.max)}°C
                              </Text>
                              <Text style={styles.forecastTempMin}>
                                <Ionicons name="arrow-down" size={16} color="#2196F3" />
                                {Math.round(day.temp.min)}°C
                              </Text>
                            </View>
                          </View>

                          <View style={styles.forecastDetails}>
                            <View style={styles.forecastDetailItem}>
                              <Ionicons name="water-outline" size={18} color="#005F9E" />
                              <Text style={styles.forecastDetailText}>{day.humidity}%</Text>
                            </View>

                            <View style={styles.forecastDetailItem}>
                              <Ionicons name="umbrella-outline" size={18} color="#005F9E" />
                              <Text style={styles.forecastDetailText}>{Math.round(day.pop * 100)}%</Text>
                            </View>

                            <View style={styles.forecastDetailItem}>
                              <Ionicons name="compass-outline" size={18} color="#005F9E" />
                              <Text style={styles.forecastDetailText}>{Math.round(day.speed * 3.6)} km/h</Text>
                            </View>
                          </View>
                        </Card.Content>
                      </Card>
                    ))}
                  </View>
                ) : (
                  <View style={styles.weatherLoading}>
                    <Text style={styles.weatherErrorText}>No hay datos de pronóstico disponibles</Text>
                  </View>
                )
              ) : (
                // Vista de clima actual
                weatherData ? (
                  <>
                    <View style={styles.weatherMainInfo}>
                      <TouchableOpacity
                        style={styles.citySelector}
                        onPress={() => setCityDropdownVisible(!cityDropdownVisible)}
                      >
                        <Text style={styles.weatherLocation}>
                          {weatherData?.name || 'Ubicación desconocida'}
                          {weatherData?.sys?.country ? `, ${weatherData.sys.country}` : ''}
                        </Text>
                        <Ionicons name={cityDropdownVisible ? "chevron-up" : "chevron-down"} size={18} color="#005F9E" />
                      </TouchableOpacity>

                      {cityDropdownVisible && (
                        <View style={styles.citiesDropdown}>
                          <TouchableOpacity
                            style={[
                              styles.cityItem, 
                              !selectedCity && styles.selectedCityItem
                            ]}
                            onPress={() => {
                              console.log('Seleccionando Mi ubicación actual');
                              selectCity('Mi ubicación actual');
                            }}
                          >
                            <Ionicons 
                              name={!selectedCity ? "locate" : "locate-outline"} 
                              size={16} 
                              color={!selectedCity ? "#FF5722" : "#005F9E"} 
                            />
                            <Text 
                              style={[
                                styles.cityItemText,
                                !selectedCity && styles.selectedCityItemText
                              ]}
                            >
                              Mi ubicación actual
                            </Text>
                          </TouchableOpacity>

                          {isLoadingCities ? (
                            <View style={styles.loadingCitiesContainer}>
                              <ActivityIndicator size="small" color="#005F9E" />
                              <Text style={styles.loadingCitiesText}>Cargando ciudades...</Text>
                            </View>
                          ) : userCities.length > 0 ? (
                            userCities.map(city => (
                              <TouchableOpacity
                                key={city.id}
                                style={[
                                  styles.cityItem,
                                  selectedCity === city.name && styles.selectedCityItem
                                ]}
                                onPress={() => {
                                  console.log('Seleccionando ciudad desde lista:', city.name);
                                  selectCity(city.name);
                                }}
                              >
                                <Ionicons 
                                  name={selectedCity === city.name ? "location" : "location-outline"} 
                                  size={16} 
                                  color={selectedCity === city.name ? "#FF5722" : "#005F9E"} 
                                />
                                <Text 
                                  style={[
                                    styles.cityItemText,
                                    selectedCity === city.name && styles.selectedCityItemText
                                  ]}
                                >
                                  {city.name}
                                </Text>
                              </TouchableOpacity>
                            ))
                          ) : (
                            <Text style={styles.noCitiesText}>No tienes viajes guardados</Text>
                          )}
                          
                          <TouchableOpacity 
                            style={styles.refreshCitiesButton}
                            onPress={loadUserCities}
                          >
                            <Ionicons name="refresh" size={16} color="#005F9E" />
                            <Text style={styles.refreshCitiesText}>Actualizar ciudades</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      <View style={styles.weatherMainRow}>
                        <Text style={styles.weatherTemp}>{Math.round(weatherData?.main?.temp || 0)}°C</Text>
                        {weatherData?.weather?.[0]?.icon && (
                          <View style={styles.weatherIconContainer}>
                            <Image
                              source={{ uri: `https://openweathermap.org/img/wn/${weatherData.weather[0].icon}@2x.png` }}
                              style={styles.weatherIcon}
                            />
                          </View>
                        )}
                      </View>
                      <Text style={styles.weatherDescription}>
                        {weatherData?.weather?.[0]?.description || 'Información no disponible'}
                      </Text>
                    </View>

                    <View style={styles.weatherDetails}>
                      <View style={styles.weatherDetailRow}>
                        <View style={styles.weatherDetailItem}>
                          <Ionicons name="thermometer-outline" size={24} color="#005F9E" />
                          <Text style={styles.weatherDetailLabel}>Sensación</Text>
                          <Text style={styles.weatherDetailValue}>{Math.round(weatherData?.main?.feels_like || 0)}°C</Text>
                        </View>
                        <View style={styles.weatherDetailItem}>
                          <Ionicons name="water-outline" size={24} color="#005F9E" />
                          <Text style={styles.weatherDetailLabel}>Humedad</Text>
                          <Text style={styles.weatherDetailValue}>{weatherData?.main?.humidity || 0}%</Text>
                        </View>
                      </View>

                      <View style={styles.weatherDetailRow}>
                        <View style={styles.weatherDetailItem}>
                          <Ionicons name="speedometer-outline" size={24} color="#005F9E" />
                          <Text style={styles.weatherDetailLabel}>Presión</Text>
                          <Text style={styles.weatherDetailValue}>{weatherData?.main?.pressure || 0} hPa</Text>
                        </View>
                        <View style={styles.weatherDetailItem}>
                          <Ionicons name="compass-outline" size={24} color="#005F9E" />
                          <Text style={styles.weatherDetailLabel}>Viento</Text>
                          <Text style={styles.weatherDetailValue}>{Math.round((weatherData?.wind?.speed || 0) * 3.6)} km/h</Text>
                        </View>
                      </View>
                    </View>
                  </>
                ) : (
                  <View style={styles.weatherLoading}>
                    <Text style={styles.weatherErrorText}>No hay datos del clima disponibles</Text>
                  </View>
                )
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // Renderización del componente
  return (
    <View style={styles.container}>
      {/* Usar respaldo o mostrar error incorregible */}
      {(hasError && retryCount >= 3) ? (
        <ErrorView
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
              // mantener vacío tras eliminar console.log
            }}
            onError={(e) => {
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
            Intente nuevamente.
          </Text>
          <View style={styles.buttonRow}>
            <Button
              mode="contained"
              onPress={handleRetry}
              style={styles.retryButton}
            >
              Intentar de nuevo
            </Button>
          </View>
        </View>
      )}

      {props.showsUserLocation && !isLoading && !hasError && (
        <View style={styles.buttonContainer}>
          <FAB
            style={styles.fab}
            icon="weather-partly-cloudy"
            color="#fff"
            loading={isLoadingWeather}
            onPress={() => {
              console.log("Botón de clima presionado desde buttonContainer");
              getWeatherData();
            }}
          />
          <FAB
            style={styles.fab}
            icon={is3DMode ? "map" : "earth"}
            color="#fff"
            loading={isLocating}
            onPress={toggleMapMode}
          />
        </View>
      )}

      {/* Modal para mostrar datos del clima */}
      <WeatherModal />
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
  buttonContainer: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  fab: {
    backgroundColor: '#F57C00',
    marginBottom: 8,
  },
  weatherModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  weatherModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  weatherModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  weatherModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  weatherModalBody: {
    padding: 16,
  },
  weatherMainInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  weatherLocation: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  weatherMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weatherTemp: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#005F9E',
  },
  weatherIconContainer: {
    marginLeft: 10,
  },
  weatherIcon: {
    width: 80,
    height: 80,
  },
  weatherDescription: {
    fontSize: 18,
    color: '#666',
    textTransform: 'capitalize',
    textAlign: 'center',
  },
  weatherDetails: {
    marginTop: 20,
  },
  weatherDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  weatherDetailItem: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  weatherDetailLabel: {
    fontSize: 14,
    color: '#666',
    marginVertical: 4,
  },
  weatherDetailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  weatherLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  weatherLoadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  citySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8
  },
  citiesDropdown: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginTop: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignSelf: 'stretch',
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cityItemText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  noCitiesText: {
    textAlign: 'center',
    paddingVertical: 10,
    color: '#777',
    fontStyle: 'italic',
  },
  weatherTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  weatherTab: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
  },
  weatherTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#005F9E',
  },
  weatherTabText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    textAlign: 'center',
  },
  weatherTabTextActive: {
    color: '#005F9E',
  },
  forecastContainer: {
    padding: 10,
  },
  forecastCard: {
    marginBottom: 10,
    elevation: 2,
  },
  forecastDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  forecastDay: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  forecastDate: {
    fontSize: 14,
    color: '#666',
  },
  forecastRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  forecastIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
  },
  forecastIcon: {
    width: 50,
    height: 50,
  },
  forecastDescription: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
    flex: 1,
    flexWrap: 'wrap',
  },
  forecastTemps: {
    alignItems: 'flex-end',
    flex: 1,
  },
  forecastTempMax: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF5722',
    marginBottom: 4,
  },
  forecastTempMin: {
    fontSize: 16,
    color: '#2196F3',
  },
  forecastDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 8,
  },
  forecastDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  forecastDetailText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  weatherErrorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#ff5252',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingCitiesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  loadingCitiesText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  refreshCitiesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  refreshCitiesText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#005F9E',
  },
  loadingIndicatorText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  selectedCityItem: {
    backgroundColor: '#f0f0f0',
  },
  selectedCityItemText: {
    fontWeight: 'bold',
  },
  forecastTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
});

export default GlobeView; 
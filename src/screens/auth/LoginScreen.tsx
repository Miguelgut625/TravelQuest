// @ts-nocheck - Ignorar todos los errores de TypeScript en este archivo
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform, Linking, AppState, Modal } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { setUser, setAuthState, setError } from '../../features/authSlice';
import { supabase } from '../../services/supabase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import { WebView } from 'react-native-webview';

// Asegurar que la redirección de autenticación en web se maneje correctamente
WebBrowser.maybeCompleteAuthSession();

// Detectar si estamos en desarrollo web o en dispositivo móvil
const isNative = Platform.OS !== 'web';
const isMobileDevice = isNative || (Platform.OS === 'web' && /Mobi|Android/i.test(navigator.userAgent));

// Solo configuramos URL para desarrollo web
let redirectUrl = '';
if (!isNative && !isMobileDevice) {
  // URL para desarrollo web (localhost)
  redirectUrl = 'http://localhost:3000';
}

console.log('Plataforma:', Platform.OS, 'Es dispositivo móvil:', isMobileDevice);
console.log('URL de redirección configurada:', redirectUrl || 'Usando config por defecto');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authUrl, setAuthUrl] = useState('');
  const [showWebView, setShowWebView] = useState(false);
  const webViewRef = useRef(null);
  const dispatch = useDispatch();
  const navigation = useNavigation<NavigationProp>();
  const error = useSelector((state: any) => state.auth.error);

  // Configurar Google Auth nativo con Expo
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: '867203082977-v6lt7u50bc1geniog48vcv4mt51obo0g.apps.googleusercontent.com',
    // Puedes añadir también estos si los necesitas:
    // iosClientId: 'TU_ID_PARA_IOS.apps.googleusercontent.com',
    // webClientId: 'TU_ID_PARA_WEB.apps.googleusercontent.com',
    // expoClientId: 'TU_ID_PARA_EXPO.apps.googleusercontent.com',
  });

  // Procesar respuesta de Google Auth
  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      
      if (authentication?.accessToken) {
        handleGoogleToken(authentication.accessToken);
      }
    }
  }, [response]);

  // Función para manejar el token de Google y autenticar con Supabase
  const handleGoogleToken = async (accessToken) => {
    try {
      setLoading(true);
      console.log('Token de Google obtenido, autenticando con Supabase...');
      
      // Autenticar con Supabase usando el token de Google
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: accessToken,
      });
      
      if (error) {
        console.error('Error al autenticar con Supabase:', error);
        dispatch(setError('Error al autenticar con Google: ' + error.message));
        return;
      }
      
      if (data?.user) {
        console.log('Autenticación exitosa:', data.user.email);
        
        // Actualizar el estado con los datos del usuario
        dispatch(setUser({
          email: data.user.email || '',
          id: data.user.id,
          username: data.user.user_metadata?.name || data.user.email?.split('@')[0]
        }));
        
        dispatch(setAuthState('authenticated'));
        navigation.navigate('Main');
      } else {
        console.log('No se pudo obtener los datos del usuario');
        dispatch(setError('No se pudo completar la autenticación'));
      }
    } catch (error) {
      console.error('Error inesperado en autenticación con Google:', error);
      dispatch(setError('Ocurrió un error al conectar con Google'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      dispatch(setError('Por favor ingresa email y contraseña'));
      return;
    }

    try {
      setLoading(true);
      dispatch(setAuthState('loading'));
      dispatch(setError(null));

      console.log('Iniciando sesión para:', email);

      // Intentar iniciar sesión directamente
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      });

      if (error) {
        console.error('Error de autenticación:', error);
        if (error.message.includes('Invalid login credentials')) {
          dispatch(setError('Email o contraseña incorrectos.'));
        } else if (error.message.includes('User not allowed') || error.message.includes('Email not confirmed')) {
          dispatch(setError('Necesitas verificar tu correo electrónico antes de iniciar sesión'));
          // Redirigir a la pantalla de verificación
          navigation.navigate('VerifyEmail', { email: email.trim() });
          return;
        } else {
          dispatch(setError('Error al iniciar sesión: ' + error.message));
        }
        dispatch(setAuthState('unauthenticated'));
        return;
      }

      if (!data.user) {
        dispatch(setError('No se encontró el usuario'));
        dispatch(setAuthState('unauthenticated'));
        return;
      }

      console.log('Login exitoso:', data.user.email);

      // Obtener datos adicionales del usuario
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('username')
        .eq('id', data.user.id)
        .single();

      if (userError) {
        console.error('Error obteniendo datos del usuario:', userError);
      }

      // Actualizar el estado con los datos del usuario
      dispatch(setUser({
        email: data.user.email || '',
        id: data.user.id,
        username: userData?.username
      }));
      dispatch(setAuthState('authenticated'));
      navigation.navigate('Main');

    } catch (error) {
      console.error('Error inesperado durante el login:', error);
      dispatch(setError('Ocurrió un error inesperado'));
      dispatch(setAuthState('unauthenticated'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  // Añadir un listener para Deep Linking
  useEffect(() => {
    // Función para manejar deep links
    const handleDeepLink = async (event) => {
      const url = event?.url || '';
      console.log('Deep link recibido:', url);
      
      if (url.startsWith('deep://auth-callback')) {
        console.log('Deep link de autenticación detectado');
        
        // Verificar sesión inmediatamente
        checkAndSetSession();
      }
    };

    // Registrar listener para cuando la app está en primer plano
    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    // Verificar si la app fue abierta con un deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('App abierta con URL inicial:', url);
        handleDeepLink({ url });
      }
    });

    // Limpiar listener al desmontar
    return () => {
      subscription.remove();
    };
  }, [dispatch, navigation]);

  // Función centralizada para verificar y establecer la sesión
  const checkAndSetSession = async (retryCount = 0, maxRetries = 5) => {
    try {
      console.log(`Verificando sesión (intento ${retryCount + 1}/${maxRetries + 1})...`);
      
      // Verificar si hay una sesión activa
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error al obtener sesión:', error);
        return false;
      }
      
      if (data?.session?.user) {
        console.log('¡Sesión detectada!', data.session.user.email);
        
        // Actualizar el estado con los datos del usuario
        dispatch(setUser({
          email: data.session.user.email || '',
          id: data.session.user.id,
          username: data.session.user.user_metadata?.name || data.session.user.email?.split('@')[0]
        }));
        
        dispatch(setAuthState('authenticated'));
        navigation.navigate('Main');
        return true;
      } else if (retryCount < maxRetries) {
        // Si no hay sesión pero quedan intentos, esperar y reintentar
        console.log('Sesión no detectada, reintentando en 2 segundos...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return checkAndSetSession(retryCount + 1, maxRetries);
      } else {
        console.log('No se pudo detectar la sesión después de múltiples intentos');
        return false;
      }
    } catch (e) {
      console.error('Error en checkAndSetSession:', e);
      return false;
    }
  };

  // Verificar si hay una sesión activa cuando la pantalla se carga
  useEffect(() => {
    checkAndSetSession();
  }, []);

  // Añadir un listener para eventos de autenticación con reintentos
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Evento de autenticación:', event);
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          console.log('Evento de inicio de sesión detectado');
          
          if (session?.user) {
            console.log('Usuario ha iniciado sesión:', session.user.email);
            dispatch(setUser({
              email: session.user.email || '',
              id: session.user.id,
              username: session.user.user_metadata?.name || session.user.email?.split('@')[0]
            }));
            dispatch(setAuthState('authenticated'));
            navigation.navigate('Main');
          } else {
            // Intenta verificar la sesión con reintentos si el evento no trae los datos
            checkAndSetSession();
          }
        } else if (event === 'INITIAL_SESSION') {
          // También verificamos si ya hay una sesión inicial
          console.log('Verificando sesión inicial...');
          
          if (session?.user) {
            console.log('Sesión inicial detectada:', session.user.email);
            dispatch(setUser({
              email: session.user.email || '',
              id: session.user.id,
              username: session.user.user_metadata?.name || session.user.email?.split('@')[0]
            }));
            dispatch(setAuthState('authenticated'));
            navigation.navigate('Main');
          }
        }
      }
    );

    // Limpiar listener al desmontar
    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [dispatch, navigation]);

  // Agregar un efecto cuando la app vuelve a primer plano
  useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('App volvió a primer plano, verificando sesión...');
        checkAndSetSession();
      }
    };

    // Registrar para eventos de cambio de estado de la app
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Limpiar al desmontar
    return () => {
      subscription.remove();
    };
  }, []);

  // Implementación para iniciar sesión con Google usando Auth API nativa
  const signUpGoogle = async () => {
    try {
      setLoading(true);
      dispatch(setError(null));
      
      console.log('Iniciando autenticación con Google nativo...');
      
      if (!request) {
        console.log('Esperando la configuración de Google Auth...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Usar el mecanismo nativo de Google Auth
      await promptAsync();
      
    } catch (error) {
      console.error('Error al iniciar autenticación con Google:', error);
      dispatch(setError('Error al conectar con Google: ' + (error.message || 'Intente nuevamente')));
      setLoading(false);
    }
  };

  // Manejar la navegación dentro del WebView con mejor detección
  const handleWebViewNavigation = (navState) => {
    console.log('WebView navegando a:', navState.url);
    
    // Verificar si la URL contiene signos de autenticación exitosa o error
    const url = navState.url || '';
    
    // Lista expandida de patrones para detectar finalización
    if (url.includes('access_token=') || 
        url.includes('id_token=') ||
        url.includes('deep://auth-callback') || 
        url.includes('supabase.co/auth/v1/callback') || 
        url.includes('localhost:3000') ||
        url.includes('callback') ||
        url.includes('google') && url.includes('error')) {
      
      console.log('Detectada URL de finalización en WebView:', url);
      
      // Cerrar WebView después de una autenticación exitosa o fallida
      setShowWebView(false);
      setLoading(false);
      
      // Verificar la sesión varias veces para asegurar detección
      checkAndSetSession(0, 10);
    }
  };

  // Manejar errores en el WebView
  const handleWebViewError = (error) => {
    console.error('Error en WebView:', error);
    setShowWebView(false);
    setLoading(false);
    dispatch(setError('Error al cargar la página de autenticación'));
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.title}>TravelQuest</Text>
      </View>

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Iniciar Sesión</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.forgotPasswordButton}
          onPress={handleForgotPassword}
          disabled={loading}
        >
          <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.googleButton}
          onPress={signUpGoogle}
          disabled={loading}
        >
          {loading && !showWebView ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="white" />
              <Text style={styles.loadingText}>Conectando con Google...</Text>
            </View>
          ) : (
            <Text style={styles.googleButtonText}>Iniciar sesión con Google</Text>
          )}
        </TouchableOpacity>

        {loading && !showWebView && (
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => setLoading(false)}
          >
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>¿No tienes cuenta? Regístrate</Text>
        </TouchableOpacity>
      </View>

      {/* WebView para autenticación integrada con soporte mejorado */}
      <Modal
        visible={showWebView}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setShowWebView(false);
          setLoading(false);
        }}
      >
        <View style={styles.webViewContainer}>
          <View style={styles.webViewHeader}>
            <Text style={styles.webViewTitle}>Iniciar sesión con Google</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => {
                setShowWebView(false);
                setLoading(false);
              }}
            >
              <Text style={styles.closeButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
          
          <WebView
            ref={webViewRef}
            source={{ uri: authUrl }}
            onNavigationStateChange={handleWebViewNavigation}
            onLoadProgress={(event) => {
              // Registro adicional para depuración
              if (event.nativeEvent.progress > 0.9) {
                console.log('WebView casi completó la carga');
              }
            }}
            onError={handleWebViewError}
            startInLoadingState={true}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            userAgent="Mozilla/5.0 (Linux; Android 10; Android SDK built for x86) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
            renderLoading={() => (
              <View style={styles.webViewLoading}>
                <ActivityIndicator size="large" color="#005F9E" />
                <Text style={styles.webViewLoadingText}>Cargando...</Text>
              </View>
            )}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#005F9E',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#005F9E',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  googleButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#4285F4',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  googleButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  forgotPasswordButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: '#005F9E',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  link: {
    marginTop: 20,
    color: '#005F9E',
    textAlign: 'center'
  },
  errorText: {
    color: '#f44336',
    marginBottom: 10,
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: 'white',
    marginLeft: 10,
    fontSize: 14,
  },
  cancelButton: {
    marginTop: 15,
    padding: 8,
  },
  cancelText: {
    color: '#ff6b6b',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webViewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#005F9E',
  },
  webViewTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  webViewLoadingText: {
    marginTop: 10,
    color: '#005F9E',
    fontSize: 16,
  },
});

export default LoginScreen; 
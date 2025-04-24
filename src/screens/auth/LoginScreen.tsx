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
import Constants from 'expo-constants';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
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
  const dispatch = useDispatch();
  const navigation = useNavigation<NavigationProp>();
  const error = useSelector((state: any) => state.auth.error);

  // Verificar si hay una sesión activa cuando la pantalla se carga
  useEffect(() => {
    checkAndSetSession();
  }, []);

  // Configurar petición de Google Auth usando AuthSession
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId: '867203082977-v6lt7u50bc1geniog48vcv4mt51obo0g.apps.googleusercontent.com', // Android OAuth Client ID
    iosClientId: '867203082977-v6lt7u50bc1geniog48vcv4mt51obo0g.apps.googleusercontent.com', // opcional para iOS
    redirectUri: makeRedirectUri({ scheme: 'com.travelquest.app' }), // custom scheme nativo
  });

  // Escuchar la respuesta de Google
  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      if (id_token) {
        handleGoogleToken(id_token);
      } else {
        dispatch(setError('No se recibió ID token de Google'));
      }
    }
  }, [response]);

  // Función para lanzar la petición de login
  const signInWithGoogle = () => {
    promptAsync();
  };

  // Función para manejar el token y autenticar con Supabase
  const handleGoogleToken = async (idToken) => {
    try {
      setLoading(true);
      console.log('ID Token de Google obtenido, autenticando con Supabase...');
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      
      if (error) {
        console.error('Error al autenticar con Supabase:', error);
        dispatch(setError('Error al autenticar con Google: ' + error.message));
        return;
      }
      
      if (data?.user) {
        console.log('Autenticación exitosa con Supabase:', data.user.email);
        
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
      console.error('Error al autenticar con Google:', error);
      dispatch(setError('Error al conectar con Google: ' + (error.message || 'Intente nuevamente')));
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
          onPress={signInWithGoogle}
          disabled={!request || loading}
        >
          <Text style={styles.googleButtonText}>Iniciar sesión con Google</Text>
        </TouchableOpacity>

        {loading && (
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
});

export default LoginScreen; 
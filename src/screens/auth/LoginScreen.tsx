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
import axios from 'axios';
import { API_URL } from '../../config/api';

// URL base de la API
// Configuración de Axios
axios.defaults.timeout = 10000; // 10 segundos de timeout
axios.defaults.headers.common['Content-Type'] = 'application/json';


type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigation = useNavigation<NavigationProp>();
  const error = useSelector((state: any) => state.auth.error);


 
  const handleLogin = async () => {
    if (!email || !password) {
      dispatch(setError('Por favor ingresa email y contraseña'));
      return;
    }

    try {
      setLoading(true);
      dispatch(setAuthState('loading'));
      dispatch(setError(null));
      // Llamada a la API para iniciar sesión
      const response = await axios.post(`${API_URL}/users/login`, {
        email: email.trim(),
        password: password.trim()
      });
      // Actualizar el estado con los datos del usuario
      dispatch(setUser({
        email: response.data.user.email || '',
        id: response.data.user.id,
        username: response.data.user.username
      }));
      
      dispatch(setAuthState('authenticated'));
      navigation.navigate('Main');

    } catch (error) {
      console.error('Error durante el login:', error);
      
      // Manejar errores específicos según la respuesta del servidor
      if (error.response) {
        const { status, data } = error.response;
        
        if (status === 401) {
          dispatch(setError('Email o contraseña incorrectos.'));
        } else if (status === 403 && data.needsVerification) {
          dispatch(setError('Necesitas verificar tu correo electrónico antes de iniciar sesión'));
          // Redirigir a la pantalla de verificación
          navigation.navigate('VerifyEmail', { email: email.trim() });
          return;
        } else {
          dispatch(setError('Error al iniciar sesión: ' + (data.error || 'Intente nuevamente')));
        }
      } else {
        // Error de red o conexión
        dispatch(setError('No se pudo conectar con el servidor. Verifica tu conexión a internet.'));
      }
      
      dispatch(setAuthState('unauthenticated'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
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
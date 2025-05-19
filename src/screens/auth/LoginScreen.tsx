// @ts-nocheck - Ignorar todos los errores de TypeScript en este archivo
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { setUser, setAuthState, setError } from '../../features/authSlice';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import axios from 'axios';
import { API_URL } from '../../config/api';

axios.defaults.timeout = 10000;
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

      const response = await axios.post(`${API_URL}/users/login`, {
        email: email.trim(),
        password: password.trim()
      });

      dispatch(setUser({
        email: response.data.user.email || '',
        id: response.data.user.id,
        username: response.data.user.username
      }));

      dispatch(setAuthState('authenticated'));
    } catch (error) {
      if (error.response) {
        const { status, data } = error.response;
        if (status === 401) {
          dispatch(setError('Email o contraseña incorrectos.'));
        } else if (status === 403 && data.needsVerification) {
          dispatch(setError('Necesitas verificar tu correo electrónico antes de iniciar sesión'));
          navigation.navigate('VerifyEmail', { email: email.trim() });
          return;
        } else {
          dispatch(setError('Error al iniciar sesión: ' + (data.error || 'Intente nuevamente')));
        }
      } else {
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

        {error && <Text style={styles.errorText}>{error}</Text>}

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
